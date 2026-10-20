import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test.use({ actionTimeout: 15000 });

test("일정 간트의 필터·계층·상세·모바일 조회와 기존 날짜 수정", async ({ page }) => {
  const bootstrap = (await (await page.request.get("/api/bootstrap")).json()).data;
  const created = await page.request.post("/api/campaigns", { data: {
    brandCountryId: bootstrap.countries[0].id, name: `DEMO 간트 검증 ${Date.now()}`, ownerId: bootstrap.actor.id,
    status: "DRAFT", planStart: "2026-10-01", planEnd: "2026-10-31", budgetCeilingKrw: "2500000",
    targetNetSalesKrw: "0", targetErutyRevenueKrw: "0", vatPolicy: "EXCLUDED",
  } });
  expect(created.status()).toBe(201);
  const campaign = (await created.json()).data;
  const base = `/api/campaigns/${campaign.id}`;
  try {
    const strategy = (await (await page.request.post(`${base}/strategies`, { data: { name: "간트 검증 전략", sortOrder: 0, planStart: "2026-10-01", planEnd: "2026-10-31", budgetCeilingKrw: "1000000" } })).json()).data;
    const other = (await (await page.request.post(`${base}/strategies`, { data: { name: "다른 검증 전략", sortOrder: 1 } })).json()).data;
    const input = { strategyId: strategy.id, parentId: null, kind: "ACTIVITY", name: "기간 밖 활동", ownerId: null, status: "PLANNED", plannedStart: "2026-09-28", plannedEnd: "2026-10-05", sortOrder: 0, plannedBudgetKrw: "100000" };
    const activity = (await (await page.request.post(`${base}/work-items`, { data: input })).json()).data;
    const { plannedBudgetKrw: _budget, ...childInput } = input;
    await page.request.post(`${base}/work-items`, { data: { ...childInput, parentId: activity.id, kind: "SUBTASK", name: "완료된 세부 작업", status: "COMPLETED", plannedStart: "2026-10-06", plannedEnd: "2026-10-08", sortOrder: 1 } });
    await page.request.post(`${base}/work-items`, { data: { ...input, strategyId: other.id, name: "하루 활동", plannedStart: "2026-10-20", plannedEnd: "2026-10-20", sortOrder: 2 } });
    const before = (await (await page.request.get(base)).json()).data;
    const writes: string[] = [];
    page.on("request", request => { if (request.url().includes("/api/") && request.method() !== "GET") writes.push(request.method()); });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/campaigns/${campaign.id}/schedule`);
    const chart = page.getByRole("region", { name: "일정 간트", exact: true });
    await expect(chart.getByRole("status")).toHaveText("활동 2개 · 세부 작업 1개");
    await expect(chart).toContainText("2026-09-28 ~ 2026-10-31");
    await expect(chart).toContainText("캠페인 기간 밖");
    await expect(chart.getByRole("rowheader").filter({ hasText: "하루 활동" })).toContainText("1일");
    await chart.getByRole("button", { name: "기간 밖 활동 세부 작업 접기", exact: true }).click();
    await expect(chart.getByRole("button", { name: "완료된 세부 작업 상세 보기", exact: true })).toHaveCount(0);
    await chart.getByRole("button", { name: "기간 밖 활동 세부 작업 펼치기", exact: true }).click();
    await chart.getByLabel("작업 상태 필터", { exact: true }).selectOption("COMPLETED");
    await expect(chart.getByRole("status")).toHaveText("활동 0개 · 세부 작업 1개");
    await expect(chart).toContainText("하위 작업의 상위 활동");
    await expect(chart.getByRole("button", { name: "하루 활동 상세 보기", exact: true })).toHaveCount(0);
    await chart.getByLabel("전략 필터", { exact: true }).selectOption(other.id);
    await expect(chart).toContainText("조건에 맞는 활동·세부 작업이 없습니다.");
    await chart.getByRole("button", { name: "필터 초기화", exact: true }).click();
    await chart.getByLabel("조회 시작일", { exact: true }).fill("2026-10-01");
    await chart.getByLabel("조회 종료일", { exact: true }).fill("2026-10-02");
    await expect(chart.getByRole("status")).toHaveText("활동 1개 · 세부 작업 0개");
    await expect(chart.getByRole("rowheader").filter({ hasText: "기간 밖 활동" })).toContainText("2026-09-28 ~ 2026-10-05");
    await chart.getByLabel("조회 시작일", { exact: true }).fill("2026-10-03");
    await expect(chart.getByRole("alert")).toHaveText("조회 종료일은 시작일보다 빠를 수 없습니다.");
    await chart.getByRole("button", { name: "필터 초기화", exact: true }).click();
    await chart.getByRole("button", { name: "월 단위", exact: true }).click();
    await expect(chart.getByRole("button", { name: "월 단위", exact: true })).toHaveAttribute("aria-pressed", "true");
    await chart.getByRole("button", { name: "모두 접기", exact: true }).click();
    await expect(chart.getByRole("button", { name: "기간 밖 활동 상세 보기", exact: true })).toHaveCount(0);
    await chart.getByRole("button", { name: "모두 펼치기", exact: true }).click();
    mkdirSync("docs/screenshots", { recursive: true });
    await chart.screenshot({ path: "docs/screenshots/19-schedule-gantt-desktop.png" });
    const opener = chart.getByRole("button", { name: "기간 밖 활동 상세 보기", exact: true });
    await opener.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "기간 밖 활동", exact: true });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    const afterRead = (await (await page.request.get(base)).json()).data;
    expect(afterRead).toEqual(before);
    expect(writes).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const scroll = chart.getByRole("region", { name: "계획 일정 표", exact: true });
    await scroll.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => scroll.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    await scroll.evaluate(node => { node.scrollLeft = 0; });
    await chart.screenshot({ path: "docs/screenshots/20-schedule-gantt-mobile.png" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await chart.getByRole("button", { name: "하루 활동 상세 보기", exact: true }).click();
    await page.getByRole("dialog", { name: "하루 활동", exact: true }).getByRole("button", { name: "상태·일정·예산 수정", exact: true }).click();
    await page.getByLabel("계획 종료일", { exact: true }).fill("2026-10-22");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(chart.getByRole("rowheader").filter({ hasText: "하루 활동" })).toContainText("2026-10-20 ~ 2026-10-22 · 3일");
    const afterEdit = (await (await page.request.get(base)).json()).data;
    expect(afterEdit.summary.allocatedPlanKrw).toBe(before.summary.allocatedPlanKrw);
    expect(afterEdit.budgetCeilingKrw).toBe(before.budgetCeilingKrw);
    expect(errors).toEqual([]);
  } finally {
    test.setTimeout(test.info().timeout + 15000);
    // Remove only this fixture through normal, revision-checked APIs.
    const current = (await (await page.request.get(base)).json()).data;
    for (const work of [...current.workItems].sort((a, b) => Number(!!b.parentId) - Number(!!a.parentId))) {
      expect((await page.request.delete(`${base}/work-items/${work.id}?revision=${work.revision}`)).status()).toBe(200);
    }
    for (const strategy of current.strategies) expect((await page.request.delete(`${base}/strategies/${strategy.id}?revision=${strategy.revision}`)).status()).toBe(200);
    expect((await page.request.delete(`${base}?revision=${current.revision}`)).status()).toBe(200);
  }
});
