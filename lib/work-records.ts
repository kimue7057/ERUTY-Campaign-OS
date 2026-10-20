import { db } from "./db";
import { authorizeCampaign, type Actor } from "./auth";
import { ensure } from "./errors";
import { descriptionSchema, journalSchema } from "./validation";
import { audit, transaction } from "./service";
import { workChanges } from "./work-history";

const workInclude = { owner: { select: { id: true, name: true } }, budgetLines: true };
export async function workDetail(actor: Actor, campaignId: string, workId: string, write = false) {
  const campaign = await authorizeCampaign(actor, campaignId, write);
  const work = await db.workItem.findFirst({ where: { id: workId, campaignId }, include: workInclude });
  ensure(work, 404, "이 캠페인의 활동을 찾을 수 없습니다.");
  return { work, actorId: actor.id, canEdit: actor.role === "ADMIN" || campaign.members.some(m => m.role === "EDITOR") };
}
export async function saveDescription(actor: Actor, campaignId: string, workId: string, input: unknown) {
  await workDetail(actor, campaignId, workId, true);
  const data = descriptionSchema.parse(input);
  return transaction(async tx => {
    const before = await tx.workItem.findFirst({ where: { id: workId, campaignId }, include: workInclude });
    ensure(before, 404, "이 캠페인의 활동을 찾을 수 없습니다.");
    ensure(before.revision === data.revision, 409, "다른 사용자가 수정했습니다. 새로고침 후 다시 시도해 주세요.");
    const after = await tx.workItem.update({ where: { id: workId }, data: { description: data.description || null, revision: { increment: 1 } }, include: workInclude });
    await audit(tx, actor, "WorkItem", workId, "UPDATE", before, after);
    return after;
  });
}
export async function saveJournal(actor: Actor, campaignId: string, workId: string, input: unknown, journalId?: string) {
  await workDetail(actor, campaignId, workId, true);
  const data = journalSchema.parse(input);
  return transaction(async tx => {
    const before = journalId ? await tx.workJournal.findFirst({ where: { id: journalId, campaignId, workItemId: workId } }) : null;
    if (journalId) {
      ensure(before, 404, "이 활동의 업무일지를 찾을 수 없습니다.");
      ensure(before.authorId === actor.id, 403, "본인이 작성한 업무일지만 수정할 수 있습니다.");
      ensure(before.revision === data.revision, 409, "다른 수정이 저장되었습니다. 새로고침 후 다시 시도해 주세요.");
    }
    const after = journalId
      ? await tx.workJournal.update({ where: { id: journalId }, data: { body: data.body, revision: { increment: 1 } } })
      : await tx.workJournal.create({ data: { campaignId, workItemId: workId, authorId: actor.id, body: data.body } });
    await audit(tx, actor, "WorkJournal", after.id, journalId ? "UPDATE" : "CREATE", before, after);
    return after;
  });
}
export async function journals(actor: Actor, campaignId: string, workId: string, cursor?: string) {
  const { canEdit } = await workDetail(actor, campaignId, workId);
  if (cursor) ensure(await db.workJournal.findFirst({ where: { id: cursor, campaignId, workItemId: workId } }), 422, "올바른 이전 기록 위치가 필요합니다.");
  const rows = await db.workJournal.findMany({
    where: { campaignId, workItemId: workId }, include: { author: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return { items: rows.slice(0, 50).map(row => ({ ...row, canEdit: canEdit && row.authorId === actor.id })), nextCursor: rows.length > 50 ? rows[49].id : null };
}
export async function workHistory(actor: Actor, campaignId: string, workId: string, cursor?: string, journalId?: string) {
  await workDetail(actor, campaignId, workId);
  if (journalId) ensure(await db.workJournal.findFirst({ where: { id: journalId, campaignId, workItemId: workId } }), 404, "이 활동의 업무일지를 찾을 수 없습니다.");
  const where = { entityType: journalId ? "WorkJournal" : "WorkItem", entityId: journalId ?? workId };
  if (cursor) ensure(await db.auditEvent.findFirst({ where: { ...where, id: cursor } }), 422, "올바른 이전 기록 위치가 필요합니다.");
  const rows = await db.auditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  // Names only; authentication identifiers never enter the response.
  const ownerIds = rows.flatMap(row => [row.before, row.after].flatMap(value => value && typeof value === "object" && !Array.isArray(value) && typeof value.ownerId === "string" ? [value.ownerId] : []));
  const users = await db.appUser.findMany({ where: { id: { in: [...rows.map(r => r.actorId), ...ownerIds] } }, select: { id: true, name: true } });
  const names = Object.fromEntries(users.map(u => [u.id, u.name]));
  return { items: rows.slice(0, 50).map(row => ({ id: row.id, createdAt: row.createdAt, action: row.action, actorName: names[row.actorId] ?? "이전 작성자", changes: workChanges(row.before, row.after, names) })), nextCursor: rows.length > 50 ? rows[49].id : null };
}
