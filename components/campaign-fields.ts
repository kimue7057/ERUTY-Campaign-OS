import type { Bootstrap } from "./types";
import { campaignStatuses, workStatuses } from "./types";
import type { Field } from "./entity-form";
const options = (values: Record<string, string>) =>
  Object.entries(values).map(([value, label]) => ({ value, label }));
export function campaignFields(b: Bootstrap, editing = false): Field[] {
  return [
    { key: "name", label: "캠페인명" },
    {
      key: "brandCountryId",
      label: "브랜드 · 국가",
      type: "select",
      disabled: editing,
      options: b.countries.map((c) => ({
        value: c.id,
        label: `${c.brand.name} / ${c.countryName} (${c.countryCode})`,
      })),
    },
    {
      key: "ownerId",
      label: "캠페인 담당자",
      type: "select",
      nullable: true,
      options: b.users.map((u) => ({ value: u.id, label: u.name })),
    },
    {
      key: "status",
      label: "캠페인 상태",
      type: "select",
      options: options(campaignStatuses),
    },
    { key: "planStart", label: "계획 시작일", type: "date" },
    { key: "planEnd", label: "계획 종료일", type: "date" },
    { key: "budgetCeilingKrw", label: "캠페인 예산 한도 (원)", type: "money" },
    {
      key: "vatPolicy",
      label: "부가세 정책",
      type: "select",
      options: [
        { value: "INCLUDED", label: "부가세 포함" },
        { value: "EXCLUDED", label: "부가세 별도" },
      ],
    },
    { key: "targetNetSalesKrw", label: "순판매액 목표 (원)", type: "money" },
    {
      key: "targetErutyRevenueKrw",
      label: "이루티 매출 목표 (원)",
      type: "money",
    },
  ];
}
export function workFields(b: Bootstrap, activity: boolean): Field[] {
  return [
    { key: "name", label: activity ? "활동명" : "세부 작업명" },
    { key: "description", label: activity ? "활동 내용" : "세부 작업 내용", type: "textarea", nullable: true },
    {
      key: "ownerId",
      label: "담당자",
      type: "select",
      nullable: true,
      options: b.users.map((u) => ({ value: u.id, label: u.name })),
    },
    {
      key: "status",
      label: "작업 상태",
      type: "select",
      options: options(workStatuses),
    },
    { key: "sortOrder", label: "정렬 순서", type: "number" },
    { key: "plannedStart", label: "계획 시작일", type: "date" },
    { key: "plannedEnd", label: "계획 종료일", type: "date" },
    ...(activity
      ? [
          {
            key: "plannedBudgetKrw",
            label: "활동 기본 계획 예산 (원)",
            type: "money" as const,
          },
        ]
      : []),
  ];
}
