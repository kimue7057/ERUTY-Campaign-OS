import { test, expect } from "@playwright/test";

test("활동 상세 내용·업무일지·수정 이력·자동 변경 이력과 모바일·키보드", async ({ page }) => {
  const bootstrap = (await (await page.request.get("/api/bootstrap")).json()).data;
  const country = bootstrap.countries.find((c: { brand: { isDemo: boolean } }) => c.brand.isDemo);
  const title = `DEMO 일지 검증 ${Date.now()}`;
  const created = await page.request.post("/api/campaigns", { data: {
    brandCountryId: country.id, name: title, ownerId: bootstrap.actor.id, status: "DRAFT",
    planStart: "2026-10-01", planEnd: "2026-10-31", budgetCeilingKrw: "2500000", targetNetSalesKrw: "0", targetErutyRevenueKrw: "0", vatPolicy: "EXCLUDED",
  } });
  expect(created.status()).toBe(201);
  const campaign = (await created.json()).data;
  const strategy = (await (await page.request.post(`/api/campaigns/${campaign.id}/strategies`, { data: { name: "DEMO 기록 전략", sortOrder: 0, budgetCeilingKrw: "1000000" } })).json()).data;
  let workId = "";
  try {
    await page.goto(`/campaigns/${campaign.id}`);
    await page.getByRole("button", { name: "DEMO 기록 전략 활동 추가", exact: true }).click();
    await page.getByLabel("활동명", { exact: true }).fill("DEMO 박스 구매");
    await page.getByLabel("활동 내용", { exact: true }).fill("500개 발주\n완료 기준: 입고 검수");
    await page.getByLabel("계획 시작일", { exact: true }).fill("2026-10-14");
    await page.getByLabel("계획 종료일", { exact: true }).fill("2026-10-18");
    await page.getByLabel("활동 기본 계획 예산 (원)", { exact: true }).fill("500000");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    const opener = page.getByRole("button", { name: "DEMO 박스 구매 상세 보기", exact: true });
    await opener.click();
    const drawer = page.getByRole("dialog", { name: "DEMO 박스 구매", exact: true });
    await expect(drawer).toContainText("완료 기준: 입고 검수");
    await drawer.getByRole("button", { name: "내용 수정", exact: true }).click();
    await drawer.getByLabel("활동 내용 작성", { exact: true }).fill("500개 발주\n완료 기준: 입고 수량 및 인쇄 검수");
    await drawer.getByRole("button", { name: "내용 저장", exact: true }).click();
    await expect(drawer).toContainText("활동 내용을 저장했습니다.");
    await page.screenshot({ path: "docs/screenshots/13-activity-content.png" });
    await drawer.getByRole("tab", { name: "업무일지", exact: true }).click();
    await drawer.getByLabel("업무일지 내용", { exact: true }).fill("업체에 샘플 확인 요청\n내일 회신 예정");
    await drawer.getByRole("button", { name: "일지 추가", exact: true }).click();
    await expect(drawer.locator(".record-list")).toContainText("내일 회신 예정");
    await drawer.getByRole("button", { name: /^업무일지 .* 수정$/ }).click();
    await drawer.getByLabel("업무일지 수정 내용", { exact: true }).fill("샘플 확인 완료\n발주 진행");
    await drawer.getByRole("button", { name: "일지 수정 저장", exact: true }).click();
    await expect(drawer).toContainText("수정됨 (2번째 버전)");
    await drawer.getByRole("button", { name: /^업무일지 .* 수정 이력$/ }).click();
    await expect(drawer).toContainText("업체에 샘플 확인 요청");
    await expect(drawer).toContainText("발주 진행");
    await expect(drawer).toContainText(bootstrap.actor.name);
    await page.screenshot({ path: "docs/screenshots/14-activity-journal.png" });
    await drawer.getByRole("button", { name: "활동 상세 닫기", exact: true }).click();
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(drawer).toContainText("인쇄 검수");
    await drawer.getByRole("tab", { name: "업무일지", exact: true }).click();
    await expect(drawer).toContainText("샘플 확인 완료");
    await drawer.getByRole("button", { name: "상태·일정·예산 수정", exact: true }).click();
    await page.getByLabel("작업 상태", { exact: true }).selectOption("IN_PROGRESS");
    await page.getByLabel("계획 종료일", { exact: true }).fill("2026-10-20");
    await page.getByLabel("활동 기본 계획 예산 (원)", { exact: true }).fill("600000");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await opener.click();
    await drawer.getByRole("tab", { name: "변경 이력", exact: true }).click();
    await expect(drawer).toContainText("500,000원 → 600,000원");
    await expect(drawer).toContainText("2026-10-18 → 2026-10-20");
    await expect(drawer).toContainText("예정 → 진행 중");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(drawer).toBeVisible();
    expect(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: "docs/screenshots/15-activity-history-mobile.png" });
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    const read = (await (await page.request.get(`/api/campaigns/${campaign.id}`)).json()).data;
    workId = read.workItems[0].id;
    const removed = await page.request.delete(`/api/campaigns/${campaign.id}/work-items/${workId}?revision=${read.workItems[0].revision}`);
    expect(removed.status()).toBe(409);
  } finally {
    // Never applies to production; fixture rows are removed directly only in eruty_test.
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !new URL(url).pathname.endsWith("/eruty_test")) throw new Error("테스트 DB만 정리할 수 있습니다.");
    process.env.DATABASE_URL = url;
    const { db } = await import("../../lib/db");
    const owned = await db.campaign.findFirst({ where: { id: campaign.id, name: title, isDemo: true } });
    if (owned) {
      await db.workJournal.deleteMany({ where: { campaignId: owned.id } });
      await db.budgetLine.deleteMany({ where: { campaignId: owned.id } });
      await db.workItem.deleteMany({ where: { campaignId: owned.id } });
      await db.strategy.delete({ where: { id: strategy.id } });
      await db.campaign.delete({ where: { id: owned.id } });
    }
    await db.$disconnect();
  }
});
