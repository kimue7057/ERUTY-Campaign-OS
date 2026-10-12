import "dotenv/config";
import { db } from "../lib/db";
import { toDate } from "../lib/validation";

export const DEMO_CAMPAIGN_ID = "10000000-0000-4000-8000-000000000001";
export async function seedDemo() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_DEMO_AUTH !== "true"
  )
    throw new Error(
      "DEMO seed는 명시적으로 허용한 개발 DB에서만 실행할 수 있습니다.",
    );
  const existing = await db.campaign.findUnique({
    where: { id: DEMO_CAMPAIGN_ID },
  });
  if (existing) {
    if (!existing.isDemo)
      throw new Error("DEMO 식별자가 실데이터와 충돌했습니다.");
    return; // Repeat seed preserves all user edits; no upsert overwrite.
  }
  await db.$transaction(async (tx) => {
    const admin = await tx.appUser.upsert({
      where: { authSubject: "demo-admin" },
      update: {},
      create: {
        authSubject: "demo-admin",
        name: "데모 운영자",
        role: "ADMIN",
        isDemo: true,
      },
    });
    const editor = await tx.appUser.upsert({
      where: { authSubject: "demo-editor" },
      update: {},
      create: {
        authSubject: "demo-editor",
        name: "데모 담당자",
        role: "MEMBER",
        isDemo: true,
      },
    });
    if (!admin.isDemo || !editor.isDemo)
      throw new Error("DEMO 계정과 기존 계정이 충돌했습니다.");
    const brand = await tx.brand.upsert({
      where: { name: "DEMO 뷰티 브랜드" },
      update: {},
      create: { name: "DEMO 뷰티 브랜드", isDemo: true },
    });
    if (!brand.isDemo)
      throw new Error("DEMO 브랜드가 기존 실데이터와 충돌했습니다.");
    const country = await tx.brandCountry.upsert({
      where: { brandId_countryCode: { brandId: brand.id, countryCode: "VN" } },
      update: {},
      create: { brandId: brand.id, countryCode: "VN", countryName: "베트남" },
    });
    await tx.campaign.create({
      data: {
        id: DEMO_CAMPAIGN_ID,
        brandCountryId: country.id,
        name: "베트남 뷰티 Q4 론칭",
        ownerId: admin.id,
        planStart: toDate("2026-10-01"),
        planEnd: toDate("2026-12-31"),
        budgetCeilingKrw: 15000000n,
        targetNetSalesKrw: 60000000n,
        targetErutyRevenueKrw: 12000000n,
        vatPolicy: "INCLUDED",
        status: "ACTIVE",
        isDemo: true,
        members: {
          create: [
            { userId: admin.id, role: "EDITOR" },
            { userId: editor.id, role: "EDITOR" },
          ],
        },
      },
    });
    const groups = [
      {
        name: "바이럴 확산",
        activities: [
          ["커뮤니티 댓글 운영", 1000000n],
          ["콘텐츠 부스팅", 2500000n],
          ["제품 시딩", 1500000n],
        ] as const,
      },
      {
        name: "인플루언서 협업",
        activities: [
          ["크리에이터 리스트업", 500000n],
          ["크리에이터 제안", 1000000n],
          ["인플루언서 계약 · 콘텐츠", 3500000n],
        ] as const,
      },
      {
        name: "구매 전환",
        activities: [
          ["상품 상세페이지 준비", 1500000n],
          ["프로모션 운영", 3500000n],
        ] as const,
      },
    ];
    for (const [i, group] of groups.entries()) {
      const strategy = await tx.strategy.create({
        data: { campaignId: DEMO_CAMPAIGN_ID, name: group.name, sortOrder: i },
      });
      for (const [j, [name, amount]] of group.activities.entries()) {
        const work = await tx.workItem.create({
          data: {
            campaignId: DEMO_CAMPAIGN_ID,
            strategyId: strategy.id,
            kind: "ACTIVITY",
            name,
            ownerId: editor.id,
            plannedStart: toDate(j === 0 ? "2026-10-01" : "2026-10-15"),
            plannedEnd: toDate(j === 0 ? "2026-10-10" : "2026-11-30"),
            sortOrder: j,
            status: j === 0 ? "COMPLETED" : "IN_PROGRESS",
          },
        });
        await tx.budgetLine.create({
          data: {
            campaignId: DEMO_CAMPAIGN_ID,
            activityId: work.id,
            description: "DEMO 활동 기본 계획 예산",
            plannedAmountKrw: amount,
          },
        });
        if (i === 1 && j === 2) {
          for (const [k, sub] of [
            "조건 협의",
            "계약 서명",
            "크리에이터 콘텐츠 제작",
          ].entries()) {
            await tx.workItem.create({
              data: {
                campaignId: DEMO_CAMPAIGN_ID,
                strategyId: strategy.id,
                parentId: work.id,
                kind: "SUBTASK",
                name: sub,
                ownerId: editor.id,
                plannedStart: toDate("2026-10-15"),
                plannedEnd: toDate("2026-11-15"),
                sortOrder: k,
              },
            });
          }
        }
      }
    }
  });
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("prisma/seed.ts")) {
  seedDemo()
    .then(() =>
      console.log("DEMO 예시 준비 완료. 실제 성과 데이터가 아닙니다."),
    )
    .finally(() => db.$disconnect());
}
