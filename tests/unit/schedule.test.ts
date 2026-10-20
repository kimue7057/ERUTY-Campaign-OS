import { describe, expect, it } from "vitest";
import { barPosition, calendarDays, matchesSchedule, scheduleActivities, scheduleBounds, scheduleTicks, validScheduleDate } from "../../lib/schedule";

describe("일정 간트의 날짜 전용 계산", () => {
  it("잘못된 조회 날짜로 차트가 깨지지 않도록 검사한다", () => {
    expect(validScheduleDate("2026-02-30")).toBe(false);
    expect(validScheduleDate("10000-01-01")).toBe(false);
    expect(validScheduleDate("2028-02-29")).toBe(true);
    expect(scheduleTicks({ start: "invalid", end: "2026-10-31" }, "month")).toEqual([]);
  });
  it("하루 일정과 윤년을 양끝 포함으로 표시하며 겹치는 활동을 더하지 않는다", () => {
    expect(calendarDays("2028-02-28", "2028-03-01")).toBe(3);
    expect(calendarDays("2026-10-01", "2026-10-01")).toBe(1);
    expect(scheduleBounds({ start: "2026-10-01", end: "2026-10-31" }, [
      { start: "2026-09-29T00:00:00.000Z", end: "2026-10-08" },
      { start: "2026-10-02", end: "2026-11-02" },
    ])).toEqual({ start: "2026-09-29", end: "2026-11-02" });
  });
  it("캠페인 밖 일정과 조회 범위 잘림을 처리하고 하루 막대를 남긴다", () => {
    const range = { start: "2026-10-01", end: "2026-10-10" };
    expect(barPosition("2026-10-01", "2026-10-01", range)).toEqual({ left: 0, width: 10, clipped: false });
    expect(barPosition("2026-09-29", "2026-10-02", range)).toEqual({ left: 0, width: 20, clipped: true });
    expect(barPosition("2026-10-10", "2026-11-02", range)).toEqual({ left: 90, width: 10, clipped: true });
    expect(barPosition("2026-11-01", "2026-11-02", range)).toBeNull();
    expect(barPosition("2026-10-01", "2026-10-02", { start: range.end, end: range.start })).toBeNull();
  });
  it("월요일·월 경계를 넘는 축과 장기간 눈금 수를 제한한다", () => {
    expect(scheduleTicks({ start: "2026-10-01", end: "2026-10-10" }, "week").map(t => t.date)).toEqual(["2026-10-01", "2026-10-05"]);
    expect(scheduleTicks({ start: "2026-12-20", end: "2027-02-01" }, "month").map(t => t.date)).toEqual(["2026-12-20", "2027-01-01", "2027-02-01"]);
    for (const zoom of ["week", "month"] as const) {
      const ticks = scheduleTicks({ start: "0100-01-01", end: "9999-12-31" }, zoom);
      expect(ticks.length).toBeLessThanOrEqual(82);
      expect(ticks.every(tick => tick.left >= 0 && tick.left < 100)).toBe(true);
    }
  });
});

describe("일정 계층 필터", () => {
  const parent = { id: "a", parentId: null, strategyId: "s", kind: "ACTIVITY", status: "PLANNED", plannedStart: "2026-10-01", plannedEnd: "2026-10-05" };
  const child = { ...parent, id: "b", parentId: "a", kind: "SUBTASK", status: "COMPLETED" };
  const filters = { strategy: "", status: "", start: "", end: "" };
  it("날짜 범위와 겹치는 일정을 포함하고 정확한 끝점을 보존한다", () => {
    expect(matchesSchedule(parent, { ...filters, start: "2026-10-05", end: "2026-10-08" })).toBe(true);
    expect(matchesSchedule(parent, { ...filters, start: "2026-10-06" })).toBe(false);
    expect(matchesSchedule(parent, { ...filters, end: "2026-09-30" })).toBe(false);
    expect(matchesSchedule(parent, { ...filters, strategy: "other" })).toBe(false);
  });
  it("상태가 다른 부모도 일치하는 세부 작업의 문맥으로 보존한다", () => {
    const original = structuredClone([parent, child]);
    expect(scheduleActivities(original, { ...filters, status: "COMPLETED" })).toEqual([{ activity: parent, matches: false, children: [child] }]);
    expect(scheduleActivities(original, { ...filters, status: "ON_HOLD" })).toEqual([]);
    expect(original).toEqual([parent, child]);
  });
});
