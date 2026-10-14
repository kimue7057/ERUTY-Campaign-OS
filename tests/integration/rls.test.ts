import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "../../lib/db";

const role = `eruty_rls_test_${randomUUID().replaceAll("-", "")}`;
const tables = ["AppUser", "Brand", "BrandCountry", "Campaign", "CampaignMember", "Strategy", "WorkItem", "BudgetLine", "AuditEvent", "WorkJournal"];
const quotedTables = tables.map((name) => `"${name}"`).join(", ");
let created = false;
let brandId: string;
beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL || !new URL(process.env.DATABASE_URL ?? "").pathname.endsWith("/eruty_test"))
    throw new Error("RLS 검증은 전용 eruty_test DB에서만 실행할 수 있습니다.");
  await db.$executeRawUnsafe(`CREATE ROLE "${role}" NOLOGIN`);
  created = true;
  await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`);
  await db.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${quotedTables} TO "${role}"`);
  const brand = await db.brand.create({ data: { name: role, isDemo: false } });
  brandId = brand.id;
});
afterAll(async () => {
  if (brandId) await db.brand.delete({ where: { id: brandId } });
  if (created) {
    await db.$executeRawUnsafe(`REVOKE ALL ON ${quotedTables} FROM "${role}"`);
    await db.$executeRawUnsafe(`REVOKE ALL ON SCHEMA public FROM "${role}"`);
    await db.$executeRawUnsafe(`DROP ROLE "${role}"`);
  }
  await db.$disconnect();
});

describe("Data API 우회 방지", () => {
  it("테이블 권한을 받은 비소유자도 RLS 때문에 모든 업무 데이터를 읽지 못한다", async () => {
    expect(await db.brand.count({ where: { id: brandId } })).toBe(1);
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`);
      for (const table of tables) {
        const rows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*) FROM "${table}"`);
        expect(rows[0].count).toBe(0n);
      }
    });
  });
  it("테이블 INSERT 권한만으로 업무 데이터를 생성할 수 없다", async () => {
    await expect(db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`);
      await tx.$executeRaw`INSERT INTO "Brand" (id, name, "updatedAt") VALUES (${randomUUID()}::uuid, 'RLS 차단 확인', now())`;
    })).rejects.toMatchObject({ code: "P2010" });
    expect(await db.brand.count({ where: { name: "RLS 차단 확인" } })).toBe(0);
  });
});
