import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
const DEMO = "10000000-0000-4000-8000-000000000001";
const screenshots = "docs/screenshots";

test("DEMO 목록·개요·일정·예산·브랜드·입력 화면과 모바일 표시", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync(screenshots, { recursive: true });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "베트남 뷰티 Q4 론칭" }),
  ).toBeVisible();
  await expect(
    page.locator(".campaign-card").filter({ hasText: "베트남 뷰티 Q4 론칭" }),
  ).toContainText("DEMO");
  await page.screenshot({
    path: `${screenshots}/01-campaign-list-desktop.png`,
    fullPage: true,
  });
  await page.goto(`/campaigns/${DEMO}`);
  await expect(
    page.getByRole("heading", { name: "전략과 활동" }),
  ).toBeVisible();
  await expect(
    page.locator(".metric").filter({ hasText: "순판매액 목표" }),
  ).toContainText("60,000,000원");
  await expect(
    page.locator(".metric").filter({ hasText: "이루티 매출 목표" }),
  ).toContainText("12,000,000원");
  await expect(
    page
      .getByRole("cell")
      .filter({ hasText: "크리에이터 콘텐츠 제작" })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/02-campaign-overview-desktop.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "일정", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "계획 일정 목록" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/03-schedule-foundation.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "예산 · 비용", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "활동별 계획 예산" }),
  ).toBeVisible();
  await expect(page.locator("tfoot")).toContainText("15,000,000원");
  await expect(page.locator("tfoot")).toContainText("미연결");
  await page.screenshot({
    path: `${screenshots}/04-budget-foundation.png`,
    fullPage: true,
  });
  await page.goto("/brands");
  await expect(
    page.getByRole("heading", { name: "브랜드 · 국가 관리" }),
  ).toBeVisible();
  await expect(page.locator(".brand-grid")).toContainText("베트남");
  await page.screenshot({
    path: `${screenshots}/05-brand-country.png`,
    fullPage: true,
  });
  await page.goto("/campaigns/new");
  await expect(
    page.getByRole("heading", { name: "캠페인 기본 정보" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${screenshots}/06-create-campaign.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/campaigns/${DEMO}`);
  await expect(
    page.getByRole("heading", { name: "전략과 활동" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  const scroll = page.locator(".table-scroll").first();
  await scroll.focus();
  await expect(scroll).toBeFocused();
  expect(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `${screenshots}/07-campaign-overview-mobile.png`,
    fullPage: true,
  });
  await expect(page.getByRole("link", { name: "내 업무" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("캠페인·전략·활동·선택적 세부 작업 생성 수정 조회 삭제", async ({
  page,
}) => {
  const title = `DEMO 화면 검증 ${Date.now()}`;
  await page.goto("/campaigns/new");
  await page.getByLabel("캠페인명", { exact: true }).fill(title);
  await page
    .getByLabel("브랜드 · 국가", { exact: true })
    .selectOption({ label: "DEMO 뷰티 브랜드 / 베트남 (VN)" });
  await page
    .getByLabel("캠페인 담당자", { exact: true })
    .selectOption({ label: "데모 운영자" });
  await page.getByLabel("계획 시작일", { exact: true }).fill("2026-10-01");
  await page.getByLabel("계획 종료일", { exact: true }).fill("2026-10-31");
  await page
    .getByLabel("캠페인 예산 한도 (원)", { exact: true })
    .fill("15000000");
  await page.getByLabel("순판매액 목표 (원)", { exact: true }).fill("60000000");
  await page
    .getByLabel("이루티 매출 목표 (원)", { exact: true })
    .fill("12000000");
  await page
    .getByLabel("부가세 정책", { exact: true })
    .selectOption("EXCLUDED");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const campaignUrl = page.url();
  await page.getByRole("button", { name: "+ 전략 추가", exact: true }).click();
  await page.getByLabel("전략명", { exact: true }).fill("테스트 전략");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page
    .getByRole("button", { name: "테스트 전략 활동 추가", exact: true })
    .click();
  await page.getByLabel("활동명", { exact: true }).fill("독립 활동");
  await page
    .getByLabel("담당자", { exact: true })
    .selectOption({ label: "데모 운영자" });
  await page.getByLabel("계획 시작일", { exact: true }).fill("2026-10-05");
  await page.getByLabel("계획 종료일", { exact: true }).fill("2026-10-04");
  await page
    .getByLabel("활동 기본 계획 예산 (원)", { exact: true })
    .fill("3500000");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator(".editor").getByRole("alert")).toContainText(
    "계획 종료일은 시작일보다 빠를 수 없습니다.",
  );
  await page.getByLabel("계획 종료일", { exact: true }).fill("2026-10-10");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.locator("table")).toContainText("독립 활동");
  await page
    .getByRole("button", { name: "독립 활동 세부 작업 추가", exact: true })
    .click();
  await page.getByLabel("세부 작업명", { exact: true }).fill("선택적 작업");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(
    page.locator(".metric").filter({ hasText: "활동 계획 예산" }),
  ).toContainText("3,500,000원");
  await page
    .getByRole("button", { name: "독립 활동 수정", exact: true })
    .click();
  await page.getByLabel("계획 종료일", { exact: true }).fill("2026-10-12");
  await page
    .getByLabel("작업 상태", { exact: true })
    .selectOption("IN_PROGRESS");
  await page
    .getByLabel("활동 기본 계획 예산 (원)", { exact: true })
    .fill("4000000");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "독립 활동" });
  await expect(row).toContainText("2026-10-12");
  await page.reload();
  await expect(row).toContainText("2026-10-12");
  await expect(row).toContainText("진행 중");
  await expect(row).toContainText("4,000,000원");
  await page.getByRole("button", { name: "캠페인 수정", exact: true }).click();
  await page
    .getByLabel("이루티 매출 목표 (원)", { exact: true })
    .fill("13000000");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(
    page.locator(".metric").filter({ hasText: "이루티 매출 목표" }),
  ).toContainText("13,000,000원");
  await expect(
    page.locator(".metric").filter({ hasText: "순판매액 목표" }),
  ).toContainText("60,000,000원");
  await page.getByRole("link", { name: "일정", exact: true }).click();
  await expect(page.locator("table")).toContainText("2026-10-12");
  await page.goto(campaignUrl);
  await expect(page.locator("table")).toContainText("독립 활동");
  for (const name of ["선택적 작업", "독립 활동", "테스트 전략", title]) {
    await page
      .getByRole("button", { name: `${name} 삭제`, exact: true })
      .click();
    await page
      .getByRole("button", { name: `${name} 삭제 확인`, exact: true })
      .click();
    if (["선택적 작업", "독립 활동"].includes(name))
      await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(
        0,
      );
    else if (name !== title)
      await expect(
        page.getByRole("heading", { name, exact: true }),
      ).toHaveCount(0);
  }
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(0);
});

test("브랜드와 국가 운영 CRUD", async ({ page }) => {
  const brandName = `DEMO 브랜드 검증 ${Date.now()}`;
  await page.goto("/brands");
  await page
    .getByRole("button", { name: "+ 브랜드 등록", exact: true })
    .click();
  await page.getByLabel("브랜드명", { exact: true }).fill(brandName);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  const panel = page.locator(".panel").filter({ hasText: brandName });
  await panel
    .getByRole("button", { name: "+ 국가 운영 등록", exact: true })
    .click();
  await page.getByLabel("국가 코드 (예: VN)", { exact: true }).fill("JP");
  await page.getByLabel("국가명", { exact: true }).fill("일본");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(panel).toContainText("일본");
  await panel.getByRole("button", { name: "일본 수정", exact: true }).click();
  await page.getByLabel("국가명", { exact: true }).fill("일본 운영");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(panel).toContainText("일본 운영");
  await panel
    .getByRole("button", { name: "일본 운영 삭제", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "일본 운영 삭제 확인", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "일본 운영 삭제", exact: true }),
  ).toHaveCount(0);
  await panel
    .getByRole("button", { name: `${brandName} 수정`, exact: true })
    .click();
  await page.getByLabel("브랜드명", { exact: true }).fill(`${brandName} 수정`);
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page
    .getByRole("button", { name: `${brandName} 수정 삭제`, exact: true })
    .click();
  await page
    .getByRole("button", { name: `${brandName} 수정 삭제 확인`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `${brandName} 수정` }),
  ).toHaveCount(0);
});
