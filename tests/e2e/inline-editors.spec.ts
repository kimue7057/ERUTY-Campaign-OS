import { test, expect, type Locator } from "@playwright/test";
import { mkdirSync } from "node:fs";

test.use({ actionTimeout: 15000 });
async function below(button: Locator, form: Locator) {
  const trigger = await button.boundingBox();
  const editor = await form.boundingBox();
  expect(trigger).not.toBeNull(); expect(editor).not.toBeNull();
  expect(editor!.y).toBeGreaterThanOrEqual(trigger!.y + trigger!.height - 2);
  expect(editor!.y - trigger!.y - trigger!.height).toBeLessThan(160);
}

test("캠페인 목록 작성과 버튼·행 바로 아래 편집·취소·저장·모바일", async ({ page }) => {
  const name = `DEMO 인라인 검증 ${Date.now()}`;
  let id = "";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  mkdirSync("docs/screenshots", { recursive: true });
  try {
    await page.goto("/");
    const create = page.getByRole("button", { name: "+ 캠페인 만들기", exact: true });
    await create.click();
    const campaignForm = page.getByRole("region", { name: "캠페인 기본 정보", exact: true });
    await below(create, campaignForm);
    await expect(page).toHaveURL("http://127.0.0.1:3100/");
    await expect(campaignForm.getByLabel("캠페인명", { exact: true })).toBeFocused();
    await campaignForm.getByLabel("캠페인명", { exact: true }).fill("취소할 초안");
    await campaignForm.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(create).toBeFocused();
    await create.click();
    await expect(campaignForm.getByLabel("캠페인명", { exact: true })).toHaveValue("");
    await campaignForm.getByLabel("캠페인명", { exact: true }).fill(name);
    await campaignForm.getByLabel("브랜드 · 국가", { exact: true }).selectOption({ label: "DEMO 뷰티 브랜드 / 베트남 (VN)" });
    await campaignForm.getByLabel("계획 시작일", { exact: true }).fill("2026-10-01");
    await campaignForm.getByLabel("계획 종료일", { exact: true }).fill("2026-10-31");
    await campaignForm.getByLabel("부가세 정책", { exact: true }).selectOption("EXCLUDED");
    await page.screenshot({ path: "docs/screenshots/22-inline-campaign-create.png", fullPage: true });
    await campaignForm.getByRole("button", { name: "저장", exact: true }).click();
    await expect(campaignForm).toHaveCount(0);
    await expect(page).toHaveURL("http://127.0.0.1:3100/");
    await expect(create).toBeFocused();
    const campaigns = (await (await page.request.get("/api/campaigns")).json()).data;
    id = campaigns.find((item: { name: string }) => item.name === name).id;
    await page.getByRole("heading", { name, exact: true }).click();
    const editCampaign = page.getByRole("button", { name: "캠페인 수정", exact: true });
    await editCampaign.click();
    const campaignEdit = page.getByRole("region", { name: "캠페인 수정", exact: true });
    await below(editCampaign, campaignEdit);
    await campaignEdit.getByLabel("캠페인명", { exact: true }).fill("저장하지 않은 변경");
    await campaignEdit.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(editCampaign).toBeFocused();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    const addStrategy = page.getByRole("button", { name: "+ 전략 추가", exact: true });
    await addStrategy.click();
    const strategyForm = page.getByRole("region", { name: "전략 추가", exact: true });
    await below(addStrategy, strategyForm);
    await strategyForm.getByLabel("전략명", { exact: true }).fill("앞쪽 전략");
    await strategyForm.getByRole("button", { name: "저장", exact: true }).click();
    const later = (await (await page.request.post(`/api/campaigns/${id}/strategies`, { data: { name: "아래쪽 전략", sortOrder: 1 } })).json()).data;
    const current = (await (await page.request.get(`/api/campaigns/${id}`)).json()).data;
    const first = current.strategies.find((item: { name: string }) => item.name === "앞쪽 전략");
    for (let index = 0; index < 8; index++) {
      expect((await page.request.post(`/api/campaigns/${id}/work-items`, { data: {
        strategyId: first.id, parentId: null, kind: "ACTIVITY", name: `앞쪽 활동 ${index}`, ownerId: null,
        status: "PLANNED", plannedStart: "2026-10-01", plannedEnd: "2026-10-05", sortOrder: index, plannedBudgetKrw: "0",
      } })).status()).toBe(201);
    }
    await page.reload();
    const panel = page.locator(".strategy-panel").filter({ hasText: "아래쪽 전략" });
    const addWork = panel.getByRole("button", { name: "아래쪽 전략 활동 추가", exact: true });
    await addWork.scrollIntoViewIfNeeded();
    const beforeScroll = await page.evaluate(() => scrollY);
    expect(beforeScroll).toBeGreaterThan(400);
    await addWork.click();
    const activityForm = panel.getByRole("region", { name: "활동 추가", exact: true });
    await below(addWork, activityForm);
    expect(Math.abs(await page.evaluate(() => scrollY) - beforeScroll)).toBeLessThan(4);
    await expect(page.locator(".editor")).toHaveCount(1);
    await activityForm.getByLabel("활동명", { exact: true }).fill("입력 위치 확인 활동");
    await activityForm.getByLabel("활동 기본 계획 예산 (원)", { exact: true }).fill("123000");
    await activityForm.getByRole("button", { name: "저장", exact: true }).click();
    const editWork = panel.getByRole("button", { name: "입력 위치 확인 활동 수정", exact: true });
    await editWork.scrollIntoViewIfNeeded();
    await editWork.click();
    const workEditor = panel.getByRole("region", { name: "활동 수정", exact: true });
    await below(editWork, workEditor);
    expect(await workEditor.evaluate(node => node.closest("tr")?.previousElementSibling?.textContent)).toContain("입력 위치 확인 활동");
    await workEditor.getByLabel("활동명", { exact: true }).fill("취소할 활동 수정");
    await workEditor.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(editWork).toBeFocused();
    await editWork.click();
    await workEditor.getByLabel("작업 상태", { exact: true }).selectOption("IN_PROGRESS");
    await panel.screenshot({ path: "docs/screenshots/23-inline-activity-edit.png" });
    await workEditor.getByRole("button", { name: "저장", exact: true }).click();
    await expect(workEditor).toHaveCount(0);
    const addSubtask = panel.getByRole("button", { name: "입력 위치 확인 활동 세부 작업 추가", exact: true });
    await addSubtask.click();
    const subForm = panel.getByRole("region", { name: "세부 작업 추가", exact: true });
    await below(addSubtask, subForm);
    await subForm.getByLabel("세부 작업명", { exact: true }).fill("바로 아래 세부 작업");
    await subForm.getByRole("button", { name: "저장", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    const subEditButton = panel.getByRole("button", { name: "바로 아래 세부 작업 수정", exact: true });
    await subEditButton.click();
    const subEdit = panel.getByRole("region", { name: "세부 작업 수정", exact: true });
    expect(await subEdit.evaluate(node => node.getBoundingClientRect().width)).toBeLessThan(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await panel.screenshot({ path: "docs/screenshots/24-inline-subtask-mobile.png" });
    await subEdit.getByRole("button", { name: "닫기", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await editWork.click();
    await expect(workEditor).toBeVisible();
    await page.getByRole("link", { name: "일정", exact: true }).click();
    await expect(page.locator(".editor")).toHaveCount(0);
    const ganttAdd = page.getByRole("button", { name: "아래쪽 전략 일정 활동 추가", exact: true });
    await ganttAdd.click();
    const ganttForm = page.getByRole("region", { name: "활동 추가", exact: true });
    await below(ganttAdd, ganttForm);
    await expect(page.getByLabel("전략 필터", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("작업 상태 필터", { exact: true })).toBeDisabled();
    expect(await ganttForm.evaluate(node => node.closest("tr")?.previousElementSibling?.textContent)).toContain("아래쪽 전략");
    await ganttForm.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(page.getByLabel("전략 필터", { exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "입력 위치 확인 활동 상세 보기", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "입력 위치 확인 활동", exact: true });
    const drawerEdit = drawer.getByRole("button", { name: "상태·일정·예산 수정", exact: true });
    await drawerEdit.click();
    const drawerForm = drawer.getByRole("region", { name: "활동 수정", exact: true });
    await below(drawerEdit, drawerForm);
    await drawerForm.getByLabel("계획 종료일", { exact: true }).fill("2026-10-30");
    await drawerForm.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(drawerEdit).toBeFocused();
    await expect(drawer).toBeVisible();
    await drawerEdit.click();
    await expect(drawerForm.getByLabel("계획 종료일", { exact: true })).toHaveValue("2026-10-31");
    await drawerForm.getByLabel("계획 종료일", { exact: true }).fill("2026-10-30");
    await drawer.screenshot({ path: "docs/screenshots/25-inline-drawer-edit.png" });
    await drawerForm.getByRole("button", { name: "저장", exact: true }).click();
    await expect(drawerForm).toHaveCount(0);
    await expect(drawer).toContainText("2026-10-30");
    const saved = (await (await page.request.get(`/api/campaigns/${id}`)).json()).data;
    const work = saved.workItems.find((item: { name: string }) => item.name === "입력 위치 확인 활동");
    expect(work.status).toBe("IN_PROGRESS");
    expect(work.budgetLines[0].plannedAmountKrw).toBe("123000");
    expect(saved.strategies.find((item: { id: string }) => item.id === later.id)).toBeTruthy();
    expect(errors).toEqual([]);
  } finally {
    test.setTimeout(test.info().timeout + 15000);
    if (id) {
      const base = `/api/campaigns/${id}`;
      const current = (await (await page.request.get(base)).json()).data;
      for (const work of [...current.workItems].sort((a, b) => Number(!!b.parentId) - Number(!!a.parentId))) expect((await page.request.delete(`${base}/work-items/${work.id}?revision=${work.revision}`)).status()).toBe(200);
      for (const strategy of current.strategies) expect((await page.request.delete(`${base}/strategies/${strategy.id}?revision=${strategy.revision}`)).status()).toBe(200);
      expect((await page.request.delete(`${base}?revision=${current.revision}`)).status()).toBe(200);
    }
  }
});
