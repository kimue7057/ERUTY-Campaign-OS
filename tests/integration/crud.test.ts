import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { db } from "../../lib/db";
import * as svc from "../../lib/service";
import { authorizeCampaign, type Actor } from "../../lib/auth";
import { toDate } from "../../lib/validation";
import { GET, POST, PATCH, DELETE } from "../../app/api/[...segments]/route";

const runId = randomUUID();
let admin: Actor, editor: Actor, viewer: Actor, outsider: Actor;
let countryId: string,
  campaignId: string,
  otherCampaignId: string,
  strategyId: string,
  otherStrategyId: string;
let activityId: string, subtaskId: string;
const secret = "integration-test-only-signing-key-never-deploy";
const campaignInput = (name: string) => ({
  name,
  brandCountryId: countryId,
  ownerId: admin.id,
  status: "DRAFT",
  planStart: "2026-10-01",
  planEnd: "2026-10-31",
  budgetCeilingKrw: "15000000",
  targetNetSalesKrw: "60000000",
  targetErutyRevenueKrw: "12000000",
  vatPolicy: "EXCLUDED",
});
const workInput = (name: string) => ({
  strategyId,
  parentId: null,
  kind: "ACTIVITY",
  name,
  ownerId: editor.id,
  status: "PLANNED",
  plannedStart: "2026-10-01",
  plannedEnd: "2026-10-05",
  sortOrder: 0,
  plannedBudgetKrw: "3500000",
});
async function request(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  data?: unknown,
  actor: Actor = admin,
  headers: Record<string, string> = {},
) {
  const user = await db.appUser.findUniqueOrThrow({ where: { id: actor.id } });
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.authSubject)
    .setIssuer("test-proxy")
    .setAudience("campaign-os")
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(new TextEncoder().encode(secret));
  const req = new NextRequest(`http://127.0.0.1:3000/api/${path}`, {
    method,
    headers: {
      "x-eruty-assertion": jwt,
      "content-type": "application/json",
      ...headers,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const handler = { GET, POST, PATCH, DELETE }[method];
  const response = await handler(req, {
    params: Promise.resolve({ segments: path.split("?")[0].split("/") }),
  });
  return { status: response.status, body: await response.json() };
}
beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    !new URL(process.env.DATABASE_URL ?? "").pathname.endsWith("/eruty_test")
  )
    throw new Error("전용 eruty_test DB가 필요합니다.");
  process.env.AUTH_MODE = "proxy";
  process.env.AUTH_PROXY_SECRET = secret;
  process.env.AUTH_ISSUER = "test-proxy";
  process.env.AUTH_AUDIENCE = "campaign-os";
  const users = await Promise.all(
    ["admin", "editor", "viewer", "outsider"].map((name, index) =>
      db.appUser.create({
        data: {
          authSubject: `test-${runId}-${name}`,
          name: `TEST ${name}`,
          role: index === 0 ? "ADMIN" : "MEMBER",
        },
      }),
    ),
  );
  [admin, editor, viewer, outsider] = users;
  const brand = await svc.saveBrand(admin, { name: `TEST ${runId}` });
  const country = await svc.saveCountry(admin, {
    brandId: brand.id,
    countryCode: "KR",
    countryName: "대한민국",
  });
  countryId = country.id;
  const campaign = await svc.saveCampaign(
    admin,
    campaignInput(`TEST 캠페인 ${runId}`),
  );
  campaignId = campaign.id;
  const other = await svc.saveCampaign(
    admin,
    campaignInput(`TEST 다른 캠페인 ${runId}`),
  );
  otherCampaignId = other.id;
  await db.campaignMember.createMany({
    data: [
      { campaignId, userId: editor.id, role: "EDITOR" },
      { campaignId, userId: viewer.id, role: "VIEWER" },
    ],
  });
  strategyId = (
    await svc.saveStrategy(admin, campaignId, {
      name: "TEST 전략",
      sortOrder: 0,
    })
  ).id;
  otherStrategyId = (
    await svc.saveStrategy(admin, otherCampaignId, {
      name: "TEST 다른 전략",
      sortOrder: 0,
    })
  ).id;
});
afterAll(async () => {
  await db.$disconnect();
});

describe("실제 PostgreSQL / Prisma CRUD", () => {
  it("전략 기간·한도 저장 후 활동 배정·수정·삭제는 캠페인 잔여에서 차감·복원한다", async () => {
    const campaign = await svc.saveCampaign(admin, { ...campaignInput(`TEST 전략 계획 ${runId}`), budgetCeilingKrw: "1000000" });
    let strategy = await svc.saveStrategy(admin, campaign.id, { name: "TEST 계획 전략", sortOrder: 0, planStart: "2026-10-02", planEnd: "2026-10-20", budgetCeilingKrw: "500000" });
    expect((await svc.detail(admin, campaign.id)).summary.unallocatedPlanKrw).toBe("1000000");
    expect((await svc.detail(admin, campaign.id)).summary).toMatchObject({ allocatedStrategyKrw: "500000", unallocatedStrategyKrw: "500000" });
    strategy = await svc.saveStrategy(admin, campaign.id, { name: "TEST 계획 전략 수정", sortOrder: 0, revision: strategy.revision }, strategy.id);
    expect(strategy.planStart?.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(strategy.budgetCeilingKrw).toBe(500000n);
    await expect(db.strategy.update({ where: { id: strategy.id }, data: { budgetCeilingKrw: -1n } })).rejects.toThrow();
    await expect(db.strategy.update({ where: { id: strategy.id }, data: { planEnd: toDate("2026-10-01") } })).rejects.toThrow();
    const input = { ...workInput("TEST 예산 차감"), strategyId: strategy.id, ownerId: admin.id, plannedBudgetKrw: "200000" };
    let activity = await svc.saveWork(admin, campaign.id, input);
    expect((await svc.detail(admin, campaign.id)).summary.unallocatedPlanKrw).toBe("800000");
    activity = await svc.saveWork(admin, campaign.id, { ...input, plannedBudgetKrw: "300000", revision: activity.revision }, activity.id);
    const result = await svc.detail(admin, campaign.id);
    expect(result.budgetCeilingKrw).toBe(1000000n);
    expect(result.summary.unallocatedPlanKrw).toBe("700000");
    expect(result.summary).toMatchObject({ allocatedStrategyKrw: "500000", unallocatedStrategyKrw: "500000" });
    expect(result.strategies[0].budgetCeilingKrw).toBe(500000n);
    await svc.remove(admin, "work", activity.id, activity.revision, campaign.id);
    expect((await svc.detail(admin, campaign.id)).summary.unallocatedPlanKrw).toBe("1000000");
    await svc.remove(admin, "strategy", strategy.id, strategy.revision, campaign.id);
    await svc.remove(admin, "campaign", campaign.id, campaign.revision, campaign.id);
  });
  it("활동 생성 후 조회, 독립 활동과 원화 저장", async () => {
    const res = await request(
      "POST",
      `campaigns/${campaignId}/work-items`,
      workInput("TEST 독립 활동"),
      editor,
    );
    expect(res.status).toBe(201);
    activityId = res.body.data.id;
    expect(res.body.data).toMatchObject({
      parentId: null,
      plannedStart: "2026-10-01T00:00:00.000Z",
      budgetLines: [{ plannedAmountKrw: "3500000" }],
    });
    const row = await svc.detail(editor, campaignId);
    expect(row.summary.allocatedPlanKrw).toBe("3500000");
    expect(row.targetNetSalesKrw).toBe(60000000n);
    expect(row.targetErutyRevenueKrw).toBe(12000000n);
  });
  it("선택적 세부 작업 생성과 완료는 상위 상태/예산을 바꾸지 않는다", async () => {
    const { plannedBudgetKrw: _budget, ...input } =
      workInput("TEST 선택적 세부 작업");
    const res = await request("POST", `campaigns/${campaignId}/work-items`, {
      ...input,
      parentId: activityId,
      kind: "SUBTASK",
      status: "COMPLETED",
    });
    expect(res.status).toBe(201);
    subtaskId = res.body.data.id;
    expect(
      (await db.workItem.findUniqueOrThrow({ where: { id: activityId } }))
        .status,
    ).toBe("PLANNED");
    expect((await svc.detail(admin, campaignId)).summary.allocatedPlanKrw).toBe(
      "3500000",
    );
  });
  it("날짜·상태·담당자·예산 수정, 감사 기록과 충돌 차단", async () => {
    await db.workItem.update({
      where: { id: activityId },
      data: {
        actualStart: toDate("2026-10-02"),
        actualEnd: toDate("2026-10-03"),
      },
    });
    const input = {
      ...workInput("TEST 수정 활동"),
      revision: 1,
      plannedStart: "2026-10-04",
      plannedEnd: "2026-10-08",
      plannedBudgetKrw: "9007199254740993",
      status: "IN_PROGRESS",
      ownerId: null,
    };
    const res = await request(
      "PATCH",
      `campaigns/${campaignId}/work-items/${activityId}`,
      input,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.revision).toBe(2);
    expect(res.body.data.actualStart).toBe("2026-10-02T00:00:00.000Z");
    expect(res.body.data.actualEnd).toBe("2026-10-03T00:00:00.000Z");
    expect((await svc.detail(admin, campaignId)).summary.allocatedPlanKrw).toBe(
      "9007199254740993",
    );
    const stale = await request(
      "PATCH",
      `campaigns/${campaignId}/work-items/${activityId}`,
      input,
    );
    expect(stale.status).toBe(409);
    const audits = await db.auditEvent.findMany({
      where: { entityId: activityId },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.map((a) => a.action)).toEqual(["CREATE", "UPDATE"]);
    expect(audits[1].before).toHaveProperty(
      "plannedStart",
      "2026-10-01T00:00:00.000Z",
    );
    expect(audits[1].after).toHaveProperty(
      "plannedStart",
      "2026-10-04T00:00:00.000Z",
    );
  });
  it("역전된 일정과 다른 캠페인·전략 소속 요청은 서버에서 차단", async () => {
    expect(
      (
        await request("POST", `campaigns/${campaignId}/work-items`, {
          ...workInput("오류"),
          plannedEnd: "2026-09-30",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request("POST", `campaigns/${campaignId}/work-items`, {
          ...workInput("오류"),
          strategyId: otherStrategyId,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request("POST", `campaigns/${otherCampaignId}/work-items`, {
          ...workInput("오류"),
          strategyId: otherStrategyId,
          parentId: activityId,
          kind: "SUBTASK",
          plannedBudgetKrw: undefined,
          ownerId: null,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request("POST", `campaigns/${campaignId}/work-items`, {
          ...workInput("오류"),
          parentId: subtaskId,
          kind: "SUBTASK",
          plannedBudgetKrw: undefined,
        })
      ).status,
    ).toBe(422);
  });
  it("동시에 같은 버전을 수정하면 하나만 반영한다", async () => {
    const work = await svc.saveWork(
      admin,
      campaignId,
      workInput("TEST 동시 수정"),
    );
    const responses = await Promise.all(
      ["수정 A", "수정 B"].map((name) =>
        request("PATCH", `campaigns/${campaignId}/work-items/${work.id}`, {
          ...workInput(name),
          revision: 1,
        }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await db.auditEvent.count({
        where: { entityId: work.id, action: "UPDATE" },
      }),
    ).toBe(1);
    await svc.remove(admin, "work", work.id, 2, campaignId);
  });
  it("직접 DB 쓰기도 3단계 계층·교차 캠페인·세부 작업 예산 차단", async () => {
    const base = {
      campaignId,
      strategyId,
      kind: "SUBTASK" as const,
      name: "TEST 잘못된 계층",
      plannedStart: toDate("2026-10-01"),
      plannedEnd: toDate("2026-10-05"),
    };
    await expect(
      db.workItem.create({ data: { ...base, parentId: subtaskId } }),
    ).rejects.toThrow();
    await expect(
      db.workItem.create({
        data: {
          ...base,
          parentId: activityId,
          campaignId: otherCampaignId,
          strategyId: otherStrategyId,
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.workItem.create({
        data: { ...base, kind: "ACTIVITY", parentId: activityId },
      }),
    ).rejects.toThrow();
    await expect(
      db.budgetLine.create({
        data: {
          campaignId,
          activityId: subtaskId,
          description: "불가",
          plannedAmountKrw: 10n,
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.budgetLine.create({
        data: { campaignId, description: "음수 불가", plannedAmountKrw: -1n },
      }),
    ).rejects.toThrow();
    await expect(
      db.workItem.create({
        data: { ...base, kind: "ACTIVITY", plannedEnd: toDate("2026-09-30") },
      }),
    ).rejects.toThrow();
  });
  it("미소속 사용자 조회/쓰기를 차단하고 VIEWER는 읽기만 허용", async () => {
    await expect(authorizeCampaign(outsider, campaignId)).rejects.toMatchObject(
      { status: 404 },
    );
    expect(
      (await request("GET", `campaigns/${campaignId}`, undefined, viewer))
        .status,
    ).toBe(200);
    expect(
      (
        await request(
          "POST",
          `campaigns/${campaignId}/strategies`,
          { name: "권한 없음", sortOrder: 0 },
          viewer,
        )
      ).status,
    ).toBe(403);
    const list = await request("GET", "campaigns", undefined, viewer);
    expect(list.body.data.map((c: { id: string }) => c.id)).toEqual([
      campaignId,
    ]);
    expect(
      (await request("GET", `campaigns/${otherCampaignId}`, undefined, editor))
        .status,
    ).toBe(404);
    expect(
      (await request("POST", "campaigns", campaignInput("생성 불가"), editor))
        .status,
    ).toBe(403);
  });
  it("담당자 미소속, 임의 집계 입력, 교차 출처와 잘못된 경로 차단", async () => {
    expect(
      (
        await request("POST", `campaigns/${campaignId}/work-items`, {
          ...workInput("미소속"),
          ownerId: outsider.id,
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request("POST", `campaigns/${campaignId}/work-items`, {
          ...workInput("위조 집계"),
          allocatedPlanKrw: "0",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(
          "POST",
          `campaigns/${campaignId}/strategies`,
          { name: "외부", sortOrder: 0 },
          admin,
          { origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect((await request("GET", "campaigns/not-a-uuid")).status).toBe(422);
  });
  it("캠페인·전략·브랜드·국가 수정 버전과 목표 분리 보존", async () => {
    const res = await request("PATCH", `campaigns/${campaignId}`, {
      ...campaignInput("TEST 수정 캠페인"),
      revision: 1,
      targetNetSalesKrw: "77",
      targetErutyRevenueKrw: "5",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.targetNetSalesKrw).toBe("77");
    expect(res.body.data.targetErutyRevenueKrw).toBe("5");
    expect(
      (
        await request(
          "PATCH",
          `campaigns/${campaignId}/strategies/${strategyId}`,
          { name: "TEST 수정 전략", sortOrder: 1, revision: 1 },
        )
      ).status,
    ).toBe(200);
    const country = await db.brandCountry.findUniqueOrThrow({
      where: { id: countryId },
    });
    expect(
      (
        await request("PATCH", `brand-countries/${countryId}`, {
          brandId: country.brandId,
          countryCode: "KR",
          countryName: "한국",
          revision: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request("PATCH", `brands/${country.brandId}`, {
          name: `TEST 수정 ${runId}`,
          revision: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (await request("DELETE", `brand-countries/${countryId}?revision=2`))
        .status,
    ).toBe(409);
  });
  it("자식 있는 부모 삭제를 막고 역순 삭제 후 감사 기록 보존", async () => {
    expect(
      (
        await request(
          "DELETE",
          `campaigns/${campaignId}/work-items/${activityId}?revision=2`,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          "DELETE",
          `campaigns/${campaignId}/work-items/${subtaskId}?revision=1`,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await request(
          "DELETE",
          `campaigns/${campaignId}/work-items/${activityId}?revision=2`,
        )
      ).status,
    ).toBe(200);
    expect(await db.budgetLine.count({ where: { activityId } })).toBe(0);
    expect(
      (
        await request(
          "DELETE",
          `campaigns/${campaignId}/strategies/${strategyId}?revision=2`,
        )
      ).status,
    ).toBe(200);
    expect(
      (await request("DELETE", `campaigns/${campaignId}?revision=2`)).status,
    ).toBe(200);
    const event = await db.auditEvent.findFirstOrThrow({
      where: { entityId: activityId, action: "DELETE" },
    });
    await expect(
      db.auditEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow();
    await expect(
      db.auditEvent.update({
        where: { id: event.id },
        data: { action: "ALTER" },
      }),
    ).rejects.toThrow();
  });
  it("인증 미설정, 위조·누락 서명은 거절", async () => {
    const missing = await GET(
      new NextRequest("http://127.0.0.1:3000/api/campaigns"),
      { params: Promise.resolve({ segments: ["campaigns"] }) },
    );
    expect(missing.status).toBe(401);
    expect(
      (
        await request("GET", "campaigns", undefined, admin, {
          "x-eruty-assertion": "invalid",
        })
      ).status,
    ).toBe(401);
    process.env.AUTH_MODE = "disabled";
    expect((await request("GET", "campaigns")).status).toBe(503);
    process.env.AUTH_MODE = "proxy";
  });
});
