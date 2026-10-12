export function serialize<T>(value: T): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  );
}
export function seoulToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
type SummaryInput = {
  planStart: Date;
  planEnd: Date;
  budgetCeilingKrw: bigint;
  budgetLines: { plannedAmountKrw: bigint }[];
  workItems: {
    id: string;
    kind: string;
    status: string;
    plannedStart: Date;
    plannedEnd: Date;
  }[];
};
export function campaignSummary(c: SummaryInput, today = seoulToday()) {
  const allocated = c.budgetLines.reduce(
    (sum, line) => sum + line.plannedAmountKrw,
    0n,
  );
  const activities = c.workItems.filter((w) => w.kind === "ACTIVITY");
  return {
    allocatedPlanKrw: allocated.toString(),
    unallocatedPlanKrw: (c.budgetCeilingKrw - allocated).toString(),
    overBudget: allocated > c.budgetCeilingKrw,
    activityCount: activities.length,
    completedCount: activities.filter((w) => w.status === "COMPLETED").length,
    overdueCount: activities.filter(
      (w) => w.status !== "COMPLETED" && dateOnly(w.plannedEnd) < today,
    ).length,
    outsideWindowIds: c.workItems
      .filter((w) => w.plannedStart < c.planStart || w.plannedEnd > c.planEnd)
      .map((w) => w.id),
    calendarDays:
      Math.round((c.planEnd.getTime() - c.planStart.getTime()) / 86400000) + 1,
  };
}
