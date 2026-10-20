export const actualFields = [
  { key: "actualNetSalesKrw", label: "실제 순판매액" },
  { key: "actualErutyRevenueKrw", label: "실제 이루티 매출" },
  { key: "actualIncurredCostKrw", label: "실제 발생 비용" },
] as const;
export type ActualKey = typeof actualFields[number]["key"];
export type ActualTotals = Record<ActualKey, { totalKrw: string; recordedCount: number }> & { campaignCount: number };
export function actualTotals(rows: Record<ActualKey, bigint | string | null>[]): ActualTotals {
  const totals = { campaignCount: rows.length } as ActualTotals;
  for (const { key } of actualFields) {
    const recorded = rows.filter(row => row[key] !== null);
    totals[key] = { totalKrw: recorded.reduce((sum, row) => sum + BigInt(row[key]!), 0n).toString(), recordedCount: recorded.length };
  }
  return totals;
}
const snapshot = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function actualChanges(beforeValue: unknown, afterValue: unknown) {
  const before = snapshot(beforeValue), after = snapshot(afterValue);
  const changes: { label: string; before: string; after: string }[] = [];
  for (const { key, label } of actualFields) {
    if ((before[key] ?? null) === (after[key] ?? null)) continue;
    const format = (v: unknown) => typeof v === "string" && /^\d+$/.test(v) ? `${BigInt(v).toLocaleString("ko-KR")}원` : "미입력";
    changes.push({ label, before: format(before[key]), after: format(after[key]) });
  }
  for (const [key, label] of [["actualsAsOfDate", "집계 기준일"], ["actualsNote", "집계 메모"]]) {
    if ((before[key] ?? null) === (after[key] ?? null)) continue;
    const format = (v: unknown) => typeof v === "string" && v ? key === "actualsAsOfDate" ? v.slice(0, 10) : v : "미입력";
    changes.push({ label, before: format(before[key]), after: format(after[key]) });
  }
  return changes;
}
