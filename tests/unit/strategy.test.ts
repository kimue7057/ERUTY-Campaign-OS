import { expect, it } from "vitest";
import { strategySchema } from "../../lib/validation";
it("전략 기간은 쌍으로 입력하고 역전된 기간·음수 예산을 거절한다", () => {
  const value = { name: "전략", sortOrder: 0, planStart: "2026-10-12", planEnd: "2026-10-20", budgetCeilingKrw: "9007199254740993" };
  expect(strategySchema.parse(value).budgetCeilingKrw).toBe("9007199254740993");
  expect(strategySchema.safeParse({ ...value, planEnd: null }).success).toBe(false);
  expect(strategySchema.safeParse({ ...value, planEnd: undefined }).success).toBe(false);
  expect(strategySchema.safeParse({ ...value, planEnd: "2026-10-01" }).success).toBe(false);
  expect(strategySchema.safeParse({ ...value, budgetCeilingKrw: "-1" }).success).toBe(false);
  expect(strategySchema.safeParse({ name: "기존 전략", sortOrder: 0 }).success).toBe(true);
});
