import { db } from "./db";
import { authorizeCampaign, requireAdmin, scope, type Actor } from "./auth";
import { ensure } from "./errors";
import { campaignSummary, serialize } from "./domain";
import { brandSchema, countrySchema, campaignSchema, strategySchema, workSchema, toDate } from "./validation";
import { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;
const transaction = <T>(fn: (tx: Tx) => Promise<T>) => db.$transaction(fn, { isolationLevel: "Serializable" });
function version(input: { revision?: number }, current: { revision: number }) {
  ensure(input.revision === current.revision, 409, "다른 사용자가 수정했습니다. 새로고침 후 다시 시도해 주세요.");
}
async function audit(tx: Tx, actor: Actor, entityType: string, entityId: string, action: string, before: unknown, after: unknown) {
  await tx.auditEvent.create({ data: {
    actorId: actor.id, entityType, entityId, action,
    before: before === null ? Prisma.DbNull : serialize(before) as Prisma.InputJsonValue,
    after: after === null ? Prisma.DbNull : serialize(after) as Prisma.InputJsonValue,
  } });
}
async function owner(tx: Tx, actor: Actor, id: string | null, campaignId?: string) {
  if (!id) return;
  const user = await tx.appUser.findFirst({ where: { id, active: true, isDemo: actor.isDemo } });
  ensure(user, 422, "담당자는 등록된 활성 내부 계정이어야 합니다.");
  if (user.role !== "ADMIN" && campaignId) {
    ensure(await tx.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId: id } } }), 422, "담당자가 캠페인에 소속되어 있지 않습니다.");
  }
}
export async function bootstrap(actor: Actor) {
  const [brands, countries, users] = await Promise.all([
    db.brand.findMany({ where: { isDemo: actor.isDemo, ...(actor.role === "ADMIN" ? {} : { countries: { some: { campaigns: { some: scope(actor) } } } }) }, orderBy: { name: "asc" } }),
    db.brandCountry.findMany({ where: { brand: { isDemo: actor.isDemo }, ...(actor.role === "ADMIN" ? {} : { campaigns: { some: scope(actor) } }) }, include: { brand: true }, orderBy: { countryName: "asc" } }),
    db.appUser.findMany({ where: { active: true, isDemo: actor.isDemo, ...(actor.role === "ADMIN" ? {} : { OR: [{ id: actor.id }, { memberships: { some: { campaign: { members: { some: { userId: actor.id } } } } } }] }) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { actor, brands, countries, users };
}
const includeCampaign = {
  brandCountry: { include: { brand: true } }, owner: { select: { id: true, name: true } },
  strategies: { orderBy: { sortOrder: "asc" as const } },
  workItems: { include: { owner: { select: { id: true, name: true } }, budgetLines: true }, orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  budgetLines: true,
};
export async function campaigns(actor: Actor, id?: string) {
  if (id) await authorizeCampaign(actor, id);
  const rows = await db.campaign.findMany({ where: { ...scope(actor), ...(id ? { id } : {}) }, include: includeCampaign, orderBy: { createdAt: "desc" } });
  return rows.map(row => ({ ...row, summary: campaignSummary(row), canEdit: actor.role === "ADMIN" }));
}
export async function detail(actor: Actor, id: string) {
  const authorized = await authorizeCampaign(actor, id);
  const [row] = await campaigns(actor, id);
  ensure(row, 404, "캠페인을 찾을 수 없습니다.");
  return { ...row, canEdit: actor.role === "ADMIN" || authorized.members.some(m => m.role === "EDITOR") };
}

export async function saveBrand(actor: Actor, input: unknown, id?: string) {
  requireAdmin(actor);
  const data = brandSchema.parse(input);
  return transaction(async tx => {
    const before = id ? await tx.brand.findFirst({ where: { id, isDemo: actor.isDemo } }) : null;
    if (id) { ensure(before, 404, "브랜드를 찾을 수 없습니다."); version(data, before); }
    const after = id ? await tx.brand.update({ where: { id }, data: { name: data.name, revision: { increment: 1 } } })
      : await tx.brand.create({ data: { name: data.name, isDemo: actor.isDemo } });
    await audit(tx, actor, "Brand", after.id, id ? "UPDATE" : "CREATE", before, after);
    return after;
  });
}
export async function saveCountry(actor: Actor, input: unknown, id?: string) {
  requireAdmin(actor);
  const { revision, ...data } = countrySchema.parse(input);
  return transaction(async tx => {
    ensure(await tx.brand.findFirst({ where: { id: data.brandId, isDemo: actor.isDemo } }), 422, "선택한 브랜드를 찾을 수 없습니다.");
    const before = id ? await tx.brandCountry.findFirst({ where: { id, brand: { isDemo: actor.isDemo } } }) : null;
    if (id) { ensure(before, 404, "국가 운영을 찾을 수 없습니다."); version({ revision }, before); ensure(before.brandId === data.brandId, 422, "국가 운영의 브랜드 소속은 변경할 수 없습니다."); }
    const after = id ? await tx.brandCountry.update({ where: { id }, data: { ...data, revision: { increment: 1 } } }) : await tx.brandCountry.create({ data });
    await audit(tx, actor, "BrandCountry", after.id, id ? "UPDATE" : "CREATE", before, after);
    return after;
  });
}
export async function saveCampaign(actor: Actor, input: unknown, id?: string) {
  if (id) await authorizeCampaign(actor, id, true); else requireAdmin(actor);
  const parsed = campaignSchema.parse(input);
  return transaction(async tx => {
    ensure(await tx.brandCountry.findFirst({ where: { id: parsed.brandCountryId, brand: { isDemo: actor.isDemo } } }), 422, "선택한 브랜드 국가 운영을 찾을 수 없습니다.");
    await owner(tx, actor, parsed.ownerId, id);
    const before = id ? await tx.campaign.findUnique({ where: { id } }) : null;
    if (id) { ensure(before, 404, "캠페인을 찾을 수 없습니다."); version(parsed, before); ensure(before.brandCountryId === parsed.brandCountryId, 422, "캠페인의 브랜드·국가 소속은 변경할 수 없습니다."); }
    const { revision: _revision, ...fields } = parsed;
    const data = { ...fields, planStart: toDate(fields.planStart), planEnd: toDate(fields.planEnd), budgetCeilingKrw: BigInt(fields.budgetCeilingKrw), targetNetSalesKrw: BigInt(fields.targetNetSalesKrw), targetErutyRevenueKrw: BigInt(fields.targetErutyRevenueKrw) };
    const after = id ? await tx.campaign.update({ where: { id }, data: { ...data, revision: { increment: 1 } } }) : await tx.campaign.create({ data: { ...data, isDemo: actor.isDemo } });
    if (!id) {
      await tx.campaignMember.create({ data: { campaignId: after.id, userId: actor.id, role: "EDITOR" } });
      if (after.ownerId && after.ownerId !== actor.id) await tx.campaignMember.create({ data: { campaignId: after.id, userId: after.ownerId, role: "EDITOR" } });
    }
    await audit(tx, actor, "Campaign", after.id, id ? "UPDATE" : "CREATE", before, after);
    return after;
  });
}
export async function saveStrategy(actor: Actor, campaignId: string, input: unknown, id?: string) {
  await authorizeCampaign(actor, campaignId, true);
  const { revision, ...data } = strategySchema.parse(input);
  return transaction(async tx => {
    const before = id ? await tx.strategy.findFirst({ where: { id, campaignId } }) : null;
    if (id) { ensure(before, 404, "이 캠페인의 전략을 찾을 수 없습니다."); version({ revision }, before); }
    const after = id ? await tx.strategy.update({ where: { id }, data: { ...data, revision: { increment: 1 } } }) : await tx.strategy.create({ data: { ...data, campaignId } });
    await audit(tx, actor, "Strategy", after.id, id ? "UPDATE" : "CREATE", before, after);
    return after;
  });
}
export async function saveWork(actor: Actor, campaignId: string, input: unknown, id?: string) {
  await authorizeCampaign(actor, campaignId, true);
  const parsed = workSchema.parse(input);
  return transaction(async tx => {
    ensure(await tx.strategy.findFirst({ where: { id: parsed.strategyId, campaignId } }), 422, "전략이 이 캠페인에 소속되어 있지 않습니다.");
    if (parsed.parentId) {
      ensure(await tx.workItem.findFirst({ where: { id: parsed.parentId, campaignId, strategyId: parsed.strategyId, kind: "ACTIVITY" } }), 422, "세부 작업의 상위 작업은 같은 전략의 활동이어야 합니다.");
    }
    await owner(tx, actor, parsed.ownerId, campaignId);
    const before = id ? await tx.workItem.findFirst({ where: { id, campaignId }, include: { budgetLines: true } }) : null;
    if (id) {
      ensure(before, 404, "이 캠페인의 작업을 찾을 수 없습니다."); version(parsed, before);
      ensure(before.kind === parsed.kind && before.strategyId === parsed.strategyId && before.parentId === parsed.parentId, 422, "기존 작업의 유형과 계층 소속은 변경할 수 없습니다.");
    }
    const { revision: _revision, plannedBudgetKrw, ...fields } = parsed;
    const data = { ...fields, plannedStart: toDate(fields.plannedStart), plannedEnd: toDate(fields.plannedEnd) };
    const after = id ? await tx.workItem.update({ where: { id }, data: { ...data, revision: { increment: 1 } } }) : await tx.workItem.create({ data: { ...data, campaignId } });
    if (after.kind === "ACTIVITY" && plannedBudgetKrw !== undefined) {
      await tx.budgetLine.upsert({ where: { activityId_category: { activityId: after.id, category: "INITIAL" } },
        create: { campaignId, activityId: after.id, description: "활동 기본 계획 예산", plannedAmountKrw: BigInt(plannedBudgetKrw) },
        update: { plannedAmountKrw: BigInt(plannedBudgetKrw), version: { increment: 1 } },
      });
    }
    const result = await tx.workItem.findUniqueOrThrow({ where: { id: after.id }, include: { budgetLines: true } });
    await audit(tx, actor, "WorkItem", after.id, id ? "UPDATE" : "CREATE", before, result);
    return result;
  });
}

export async function remove(actor: Actor, kind: "brand" | "country" | "campaign" | "strategy" | "work", id: string, revision: number, campaignId?: string) {
  if (campaignId) await authorizeCampaign(actor, campaignId, true); else requireAdmin(actor);
  return transaction(async tx => {
    if (kind === "brand") {
      const before = await tx.brand.findFirst({ where: { id, isDemo: actor.isDemo } }); ensure(before, 404, "브랜드를 찾을 수 없습니다."); version({ revision }, before);
      ensure(await tx.brandCountry.count({ where: { brandId: id } }) === 0, 409, "소속 국가 운영을 먼저 삭제해 주세요.");
      await tx.brand.delete({ where: { id } }); await audit(tx, actor, "Brand", id, "DELETE", before, null);
    } else if (kind === "country") {
      const before = await tx.brandCountry.findFirst({ where: { id, brand: { isDemo: actor.isDemo } } }); ensure(before, 404, "국가 운영을 찾을 수 없습니다."); version({ revision }, before);
      ensure(await tx.campaign.count({ where: { brandCountryId: id } }) === 0, 409, "소속 캠페인을 먼저 삭제해 주세요.");
      await tx.brandCountry.delete({ where: { id } }); await audit(tx, actor, "BrandCountry", id, "DELETE", before, null);
    } else if (kind === "campaign") {
      const before = await tx.campaign.findFirst({ where: { id, ...scope(actor) } }); ensure(before, 404, "캠페인을 찾을 수 없습니다."); version({ revision }, before);
      ensure(await tx.strategy.count({ where: { campaignId: id } }) === 0 && await tx.budgetLine.count({ where: { campaignId: id } }) === 0, 409, "소속 전략과 예산을 먼저 삭제해 주세요. 보존할 캠페인은 보관 상태로 변경할 수 있습니다.");
      await tx.campaign.delete({ where: { id } }); await audit(tx, actor, "Campaign", id, "DELETE", before, null);
    } else if (kind === "strategy") {
      const before = await tx.strategy.findFirst({ where: { id, campaignId } }); ensure(before, 404, "전략을 찾을 수 없습니다."); version({ revision }, before);
      ensure(await tx.workItem.count({ where: { strategyId: id } }) === 0, 409, "소속 활동을 먼저 삭제해 주세요.");
      await tx.strategy.delete({ where: { id } }); await audit(tx, actor, "Strategy", id, "DELETE", before, null);
    } else {
      const before = await tx.workItem.findFirst({ where: { id, campaignId }, include: { budgetLines: true } }); ensure(before, 404, "작업을 찾을 수 없습니다."); version({ revision }, before);
      ensure(await tx.workItem.count({ where: { parentId: id } }) === 0, 409, "소속 세부 작업을 먼저 삭제해 주세요.");
      await tx.budgetLine.deleteMany({ where: { activityId: id } });
      await tx.workItem.delete({ where: { id } }); await audit(tx, actor, "WorkItem", id, "DELETE", before, null);
    }
    return { deleted: true };
  });
}
