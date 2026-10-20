import { db } from "./db";
import { authorizeCampaign, scope, type Actor } from "./auth";
import { ensure } from "./errors";
import { actualsSchema, toDate } from "./validation";
import { audit, transaction } from "./service";
import { actualChanges, actualTotals } from "./actuals";

export async function dashboardActuals(actor: Actor) {
  const rows = await db.campaign.findMany({ where: scope(actor), select: { actualNetSalesKrw: true, actualErutyRevenueKrw: true, actualIncurredCostKrw: true } });
  return actualTotals(rows);
}
export async function saveActuals(actor: Actor, campaignId: string, input: unknown) {
  await authorizeCampaign(actor, campaignId, true);
  const parsed = actualsSchema.parse(input);
  return transaction(async tx => {
    const before = await tx.campaign.findUnique({ where: { id: campaignId } });
    ensure(before, 404, "캠페인을 찾을 수 없습니다.");
    ensure(before.revision === parsed.revision, 409, "다른 사용자가 수정했습니다. 새로고침 후 다시 시도해 주세요.");
    const after = await tx.campaign.update({ where: { id: campaignId }, data: {
      actualNetSalesKrw: parsed.actualNetSalesKrw === null ? null : BigInt(parsed.actualNetSalesKrw),
      actualErutyRevenueKrw: parsed.actualErutyRevenueKrw === null ? null : BigInt(parsed.actualErutyRevenueKrw),
      actualIncurredCostKrw: parsed.actualIncurredCostKrw === null ? null : BigInt(parsed.actualIncurredCostKrw),
      actualsAsOfDate: parsed.actualsAsOfDate ? toDate(parsed.actualsAsOfDate) : null,
      actualsNote: parsed.actualsNote || null, revision: { increment: 1 },
    } });
    const values = (row: typeof before) => ({ actualNetSalesKrw: row.actualNetSalesKrw, actualErutyRevenueKrw: row.actualErutyRevenueKrw, actualIncurredCostKrw: row.actualIncurredCostKrw, actualsAsOfDate: row.actualsAsOfDate, actualsNote: row.actualsNote });
    await audit(tx, actor, "CampaignActuals", campaignId, "UPDATE", values(before), values(after));
    return after;
  });
}
export async function actualsHistory(actor: Actor, campaignId: string, cursor?: string) {
  await authorizeCampaign(actor, campaignId);
  const where = { entityType: "CampaignActuals", entityId: campaignId };
  if (cursor) ensure(await db.auditEvent.findFirst({ where: { ...where, id: cursor } }), 422, "올바른 이전 기록 위치가 필요합니다.");
  const rows = await db.auditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const users = await db.appUser.findMany({ where: { id: { in: rows.map(r => r.actorId) } }, select: { id: true, name: true } });
  const names = Object.fromEntries(users.map(u => [u.id, u.name]));
  return { items: rows.slice(0, 50).map(row => ({ id: row.id, createdAt: row.createdAt, actorName: names[row.actorId] ?? "이전 작성자", changes: actualChanges(row.before, row.after) })), nextCursor: rows.length > 50 ? rows[49].id : null };
}
