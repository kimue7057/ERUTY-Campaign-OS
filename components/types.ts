export type Brand = {
  id: string;
  name: string;
  isDemo: boolean;
  revision: number;
};
export type Country = {
  id: string;
  brandId: string;
  countryCode: string;
  countryName: string;
  revision: number;
  brand: Brand;
};
export type Person = { id: string; name: string };
export type Strategy = {
  id: string;
  name: string;
  sortOrder: number;
  revision: number;
  planStart: string | null;
  planEnd: string | null;
  budgetCeilingKrw: string | null;
};
export type Work = {
  id: string;
  strategyId: string;
  parentId: string | null;
  kind: "ACTIVITY" | "SUBTASK";
  name: string;
  description: string | null;
  ownerId: string | null;
  owner: Person | null;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  sortOrder: number;
  revision: number;
  budgetLines: { id: string; category: string; plannedAmountKrw: string }[];
};
export type Campaign = {
  id: string;
  brandCountryId: string;
  brandCountry: Country;
  name: string;
  ownerId: string | null;
  owner: Person | null;
  planStart: string;
  planEnd: string;
  status: string;
  budgetCeilingKrw: string;
  targetNetSalesKrw: string;
  targetErutyRevenueKrw: string;
  actualNetSalesKrw: string | null;
  actualErutyRevenueKrw: string | null;
  actualIncurredCostKrw: string | null;
  actualsAsOfDate: string | null;
  actualsNote: string | null;
  vatPolicy: string;
  isDemo: boolean;
  revision: number;
  canEdit: boolean;
  strategies: Strategy[];
  workItems: Work[];
  summary: {
    allocatedStrategyKrw: string;
    unallocatedStrategyKrw: string;
    strategyOverBudget: boolean;
    unbudgetedStrategyCount: number;
    allocatedPlanKrw: string;
    unallocatedPlanKrw: string;
    overBudget: boolean;
    activityCount: number;
    completedCount: number;
    overdueCount: number;
    calendarDays: number;
    outsideWindowIds: string[];
  };
};
export type Bootstrap = {
  actor: Person & { role: string; isDemo: boolean };
  brands: Brand[];
  countries: Country[];
  users: Person[];
};
export const campaignStatuses = {
  DRAFT: "준비 중",
  ACTIVE: "진행 중",
  COMPLETED: "완료",
  ARCHIVED: "보관",
};
export const workStatuses = {
  PLANNED: "예정",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  ON_HOLD: "보류",
};
export const labelStatus = (status: string) =>
  (({ ...campaignStatuses, ...workStatuses }) as Record<string, string>)[
    status
  ] ?? status;
export const krw = (value: string) =>
  `${BigInt(value).toLocaleString("ko-KR")}원`;
export const day = (value: string) => value.slice(0, 10);
