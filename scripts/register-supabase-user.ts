import "dotenv/config";
import { parseArgs } from "node:util";
import { z } from "zod";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Administrator-only local operation. No signup endpoint or email-based role grant.
const { values } = parseArgs({ options: {
  id: { type: "string" }, name: { type: "string" }, role: { type: "string", default: "MEMBER" },
} });
const input = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(100), role: z.enum(["ADMIN", "MEMBER"]) }).parse(values);
const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL, max: 1 }) });
try {
  await database.$transaction(async (tx) => {
    const accounts = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM auth.users WHERE id = ${input.id}::uuid AND email_confirmed_at IS NOT NULL AND is_anonymous IS NOT TRUE AND deleted_at IS NULL`;
    if (accounts.length !== 1) throw new Error("확인된 Supabase 내부 계정이 필요합니다.");
    const subject = `supabase:${input.id}`;
    if (await tx.appUser.findUnique({ where: { authSubject: subject } }))
      throw new Error("이미 등록된 계정입니다. 기존 권한은 변경하지 않았습니다.");
    const user = await tx.appUser.create({ data: { authSubject: subject, name: input.name, role: input.role, isDemo: false, active: true } });
    await tx.auditEvent.create({ data: { actorId: user.id, entityId: user.id, entityType: "AppUser", action: "REGISTER_INTERNAL_USER", after: { authSubject: subject, role: input.role } } });
  });
  console.log("내부 계정을 등록했습니다. 캠페인 소속은 별도로 설정해 주세요.");
} catch {
  console.error("계정 등록에 실패했습니다. 확인된 Auth 사용자 ID, 기존 등록 여부와 관리자 DB 연결 권한을 확인해 주세요.");
  process.exitCode = 1;
} finally { await database.$disconnect(); }
