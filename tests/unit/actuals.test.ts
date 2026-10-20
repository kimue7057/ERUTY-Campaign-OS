import { expect, it } from "vitest";
import { actualsSchema } from "../../lib/validation";
import { actualChanges, actualTotals } from "../../lib/actuals";
const empty = { actualNetSalesKrw: null, actualErutyRevenueKrw: null, actualIncurredCostKrw: null };
it("미입력과 0원을 구분하고 큰 원화와 세 실적을 각각 합산한다", () => {
  const result = actualTotals([empty, { actualNetSalesKrw: "9007199254740993", actualErutyRevenueKrw: "2", actualIncurredCostKrw: "0" }, { actualNetSalesKrw: "1", actualErutyRevenueKrw: null, actualIncurredCostKrw: "300" }]);
  expect(result).toEqual({ campaignCount: 3, actualNetSalesKrw: { totalKrw: "9007199254740994", recordedCount: 2 }, actualErutyRevenueKrw: { totalKrw: "2", recordedCount: 1 }, actualIncurredCostKrw: { totalKrw: "300", recordedCount: 2 } });
  expect(actualTotals([empty]).actualNetSalesKrw).toEqual({ totalKrw: "0", recordedCount: 0 });
});
it("수기 실적의 기준일·금액·원화 범위·위조 입력을 검증한다", () => {
  const value = { ...empty, actualNetSalesKrw: "0", actualsAsOfDate: "2026-10-15", actualsNote: null, revision: 1 };
  expect(actualsSchema.safeParse(value).success).toBe(true);
  expect(actualsSchema.safeParse({ ...value, actualsAsOfDate: null }).success).toBe(false);
  for (const invalid of ["-1", "0.1", "9223372036854775808"]) expect(actualsSchema.safeParse({ ...value, actualIncurredCostKrw: invalid }).success).toBe(false);
  expect(actualsSchema.safeParse({ ...value, targetNetSalesKrw: "10" }).success).toBe(false);
  expect(actualsSchema.safeParse({ ...value, actualNetSalesKrw: null, actualsAsOfDate: null }).success).toBe(true);
});
it("미입력·0원·정정 전후를 수정 이력에 정확하게 표시한다", () => {
  expect(actualChanges(empty, { ...empty, actualIncurredCostKrw: "0", actualsAsOfDate: "2026-10-15T00:00:00.000Z" })).toEqual([{ label: "실제 발생 비용", before: "미입력", after: "0원" }, { label: "집계 기준일", before: "미입력", after: "2026-10-15" }]);
  expect(actualChanges({ actualNetSalesKrw: "9007199254740993" }, { actualNetSalesKrw: null })).toEqual([{ label: "실제 순판매액", before: "9,007,199,254,740,993원", after: "미입력" }]);
});
