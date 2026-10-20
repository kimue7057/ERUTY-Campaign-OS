import { test, expect } from "@playwright/test";
test("캠페인 실제 매출·발생 비용 입력 수정과 대시보드·이력·모바일", async ({ page }) => {
  const bootstrap = (await (await page.request.get("/api/bootstrap")).json()).data;
  const country = bootstrap.countries.find((c: { brand: { isDemo: boolean } }) => c.brand.isDemo);
  const baseline = (await (await page.request.get("/api/dashboard-summary")).json()).data;
  const name = `DEMO 실적 검증 ${Date.now()}`;
  const campaign = (await (await page.request.post("/api/campaigns", { data: { brandCountryId: country.id, name, ownerId: bootstrap.actor.id, status: "DRAFT", planStart: "2026-10-01", planEnd: "2026-10-31", budgetCeilingKrw: "2500000", targetNetSalesKrw: "60000000", targetErutyRevenueKrw: "12000000", vatPolicy: "EXCLUDED" } })).json()).data;
  try {
    await page.goto(`/campaigns/${campaign.id}`);
    const panel = page.getByRole("region", { name: "캠페인 실제 매출·발생 비용" });
    await expect(panel.locator(".metric").filter({ hasText: "실제 순판매액" })).toContainText("미입력");
    await panel.getByRole("button", { name: "실제 매출·비용 입력", exact: true }).click();
    await page.getByLabel("실제 순판매액 (원)", { exact: true }).fill("9000000");
    await page.getByLabel("실제 이루티 매출 (원)", { exact: true }).fill("1500000");
    await page.getByLabel("실제 발생 비용 (원)", { exact: true }).fill("700000");
    await page.getByLabel("집계 메모", { exact: true }).fill("DEMO 수기 집계\n반품·할인 확인 완료");
    await page.getByLabel("집계 기준일", { exact: true }).fill("");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.locator(".editor").getByRole("alert")).toContainText("집계 기준일");
    await page.getByLabel("집계 기준일", { exact: true }).fill("2026-10-15");
    await page.screenshot({ path: "docs/screenshots/16-campaign-actuals-input.png", fullPage: true });
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(panel.locator(".metric").filter({ hasText: "실제 순판매액" })).toContainText("9,000,000원");
    await expect(panel.locator(".metric").filter({ hasText: "실제 이루티 매출" })).toContainText("1,500,000원");
    await expect(panel.locator(".metric").filter({ hasText: "실제 발생 비용" })).toContainText("700,000원");
    await panel.getByRole("button", { name: "실제 매출·비용 입력", exact: true }).click();
    await expect(page.getByLabel("실제 순판매액 (원)", { exact: true })).toHaveValue("9000000");
    await page.getByLabel("실제 순판매액 (원)", { exact: true }).fill("10000000");
    await page.getByLabel("실제 이루티 매출 (원)", { exact: true }).fill("2000000");
    await page.getByLabel("실제 발생 비용 (원)", { exact: true }).fill("800000");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(panel).toContainText("10,000,000원");
    await page.reload();
    await expect(panel).toContainText("2,000,000원");
    await expect(page.locator(".metric").filter({ hasText: "순판매액 목표" })).toContainText("60,000,000원");
    await panel.getByText("입력·수정 이력", { exact: true }).click();
    await expect(panel).toContainText("9,000,000원 → 10,000,000원");
    await expect(panel).toContainText("700,000원 → 800,000원");
    await expect(panel).toContainText(bootstrap.actor.name);
    await page.setViewportSize({ width: 390, height: 844 });
    await panel.scrollIntoViewIfNeeded();
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: "docs/screenshots/17-campaign-actuals-mobile.png" });
    await page.getByRole("link", { name: "예산 · 비용", exact: true }).click();
    await expect(panel).toContainText("800,000원");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    const actuals = page.getByLabel("실제 매출·발생 비용 합계");
    const won = (base: string, added: bigint) => `${(BigInt(base) + added).toLocaleString("ko-KR")}원`;
    await expect(actuals.locator(".metric").filter({ hasText: "실제 순판매액" })).toContainText(won(baseline.actualNetSalesKrw.totalKrw, 10000000n));
    await expect(actuals.locator(".metric").filter({ hasText: "실제 이루티 매출" })).toContainText(won(baseline.actualErutyRevenueKrw.totalKrw, 2000000n));
    await expect(actuals.locator(".metric").filter({ hasText: "실제 발생 비용" })).toContainText(won(baseline.actualIncurredCostKrw.totalKrw, 800000n));
    await page.screenshot({ path: "docs/screenshots/18-dashboard-actuals.png", fullPage: true });
  } finally {
    const response = await page.request.get(`/api/campaigns/${campaign.id}`);
    if (response.ok()) {
      const current = (await response.json()).data;
      expect((await page.request.delete(`/api/campaigns/${campaign.id}?revision=${current.revision}`)).ok()).toBe(true);
    }
  }
});
