import { describe, expect, it, vi } from "vitest";
import {
  moneySchema,
  dateSchema,
  campaignSchema,
  workSchema,
  toDate,
} from "../../lib/validation";
import { campaignSummary, seoulToday, serialize } from "../../lib/domain";
import { SignJWT } from "jose";
import { demoEnabled, verifyAssertion } from "../../lib/auth";

describe("기초 데이터 검증", () => {
  it.each(["2026-02-30", "2026-13-01", "2026-1-01", "1899-01-01"])(
    "존재하지 않거나 지원하지 않는 날짜 %s 차단",
    (value) => expect(dateSchema.safeParse(value).success).toBe(false),
  );
  it("윤년과 날짜 전용 값을 보존한다", () =>
    expect(dateSchema.parse("2028-02-29")).toBe("2028-02-29"));
  it.each(["-1", "1.5", "1e3", "01", "9223372036854775808"])(
    "잘못된 원화 %s 차단",
    (value) => expect(moneySchema.safeParse(value).success).toBe(false),
  );
  it("JS 안전 정수보다 큰 원화를 문자열로 검증한다", () =>
    expect(moneySchema.parse("9007199254740993")).toBe("9007199254740993"));
  it("두 매출 목표를 독립적으로 받으며 역전된 기간을 거절한다", () => {
    const data = {
      brandCountryId: crypto.randomUUID(),
      name: "목표 분리",
      ownerId: null,
      status: "DRAFT",
      planStart: "2026-10-01",
      planEnd: "2026-11-01",
      budgetCeilingKrw: "100",
      targetNetSalesKrw: "999",
      targetErutyRevenueKrw: "77",
      vatPolicy: "EXCLUDED",
    };
    expect(campaignSchema.parse(data).targetErutyRevenueKrw).toBe("77");
    expect(
      campaignSchema.safeParse({ ...data, planEnd: "2026-09-30" }).success,
    ).toBe(false);
    expect(
      campaignSchema.safeParse({ ...data, vatPolicy: undefined }).success,
    ).toBe(false);
  });
  it("활동은 parent가 선택적이며 세부 작업은 상위 활동이 필요하다", () => {
    const data = {
      strategyId: crypto.randomUUID(),
      parentId: null,
      kind: "ACTIVITY",
      name: "독립 활동",
      ownerId: null,
      status: "PLANNED",
      plannedStart: "2026-10-01",
      plannedEnd: "2026-10-05",
      sortOrder: 0,
      plannedBudgetKrw: "10",
    };
    expect(workSchema.safeParse(data).success).toBe(true);
    expect(workSchema.safeParse({ ...data, kind: "SUBTASK" }).success).toBe(
      false,
    );
    expect(
      workSchema.safeParse({
        ...data,
        kind: "SUBTASK",
        parentId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
});
describe("정확한 계획 집계", () => {
  it("겹치는 활동 기간을 더하지 않고 예산 항목만 한 번 더한다", () => {
    const result = campaignSummary(
      {
        planStart: toDate("2026-10-01"),
        planEnd: toDate("2026-10-10"),
        budgetCeilingKrw: 15n,
        budgetLines: [{ plannedAmountKrw: 10n }, { plannedAmountKrw: 8n }],
        workItems: [
          {
            id: "a",
            kind: "ACTIVITY",
            status: "PLANNED",
            plannedStart: toDate("2026-10-01"),
            plannedEnd: toDate("2026-10-07"),
          },
          {
            id: "b",
            kind: "ACTIVITY",
            status: "COMPLETED",
            plannedStart: toDate("2026-10-01"),
            plannedEnd: toDate("2026-10-07"),
          },
          {
            id: "c",
            kind: "SUBTASK",
            status: "PLANNED",
            plannedStart: toDate("2026-10-01"),
            plannedEnd: toDate("2026-10-11"),
          },
        ],
      },
      "2026-10-08",
    );
    expect(result).toMatchObject({
      allocatedPlanKrw: "18",
      unallocatedPlanKrw: "-3",
      overBudget: true,
      activityCount: 2,
      overdueCount: 1,
      calendarDays: 10,
    });
    expect(result.outsideWindowIds).toEqual(["c"]);
  });
  it("시간대 경계는 Asia/Seoul 날짜로 비교한다", () =>
    expect(seoulToday(new Date("2026-10-11T15:01:00Z"))).toBe("2026-10-12"));
  it("BigInt를 반올림 없이 JSON 문자열로 전송한다", () =>
    expect(serialize({ amount: 9007199254740993n })).toEqual({
      amount: "9007199254740993",
    }));
});
describe("운영 인증", () => {
  const key = "unit-test-only-key-not-a-production-secret";
  const token = () =>
    new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("test-user")
      .setIssuedAt()
      .setIssuer("test-proxy")
      .setAudience("campaign-os")
      .setExpirationTime("2m")
      .sign(new TextEncoder().encode(key));
  it("서명, 발급자, 수신자가 일치하는 인증만 허용한다", async () => {
    const jwt = await token();
    await expect(
      verifyAssertion(jwt, key, "test-proxy", "campaign-os"),
    ).resolves.toBe("test-user");
    await expect(
      verifyAssertion(jwt, key, "other-proxy", "campaign-os"),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      verifyAssertion(jwt, `${key}-wrong`, "test-proxy", "campaign-os"),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("운영 환경에서 DEMO 인증은 강제로 꺼진다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_MODE", "demo");
    vi.stubEnv("ALLOW_DEMO_AUTH", "true");
    expect(demoEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
