export default async function setup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ALLOW_DEMO_AUTH = "true";
  const { seedDemo } = await import("../../prisma/seed");
  const { db } = await import("../../lib/db");
  await seedDemo();
  const { remove } = await import("../../lib/service");
  const actor = await db.appUser.findUniqueOrThrow({
    where: { authSubject: "demo-admin" },
  });
  // Clean only this suite's labelled DEMO fixtures in the dedicated test DB.
  const fixtures = await db.campaign.findMany({
    where: { isDemo: true, name: { startsWith: "DEMO 화면 검증 " } },
    include: { workItems: true, strategies: true },
  });
  for (const c of fixtures) {
    for (const w of [
      ...c.workItems.filter((w) => w.kind === "SUBTASK"),
      ...c.workItems.filter((w) => w.kind === "ACTIVITY"),
    ])
      await remove(actor, "work", w.id, w.revision, c.id);
    for (const s of c.strategies)
      await remove(actor, "strategy", s.id, s.revision, c.id);
    await remove(actor, "campaign", c.id, c.revision, c.id);
  }
  await db.$disconnect();
  // Compile each dev route once before browser navigation/prefetch requests.
  const campaign = "/campaigns/10000000-0000-4000-8000-000000000001";
  for (const path of [
    "/api/bootstrap",
    "/api/campaigns",
    "/",
    "/brands",
    "/campaigns/new",
    campaign,
    `${campaign}/schedule`,
    `${campaign}/budget`,
  ]) {
    const response = await fetch(`http://127.0.0.1:3100${path}`);
    await response.text();
    if (!response.ok)
      throw new Error(`테스트 준비 중 ${path} 응답 실패: ${response.status}`);
  }
}
