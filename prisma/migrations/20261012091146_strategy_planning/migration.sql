-- AlterTable
ALTER TABLE "Strategy" ADD COLUMN     "budgetCeilingKrw" BIGINT,
ADD COLUMN     "planEnd" DATE,
ADD COLUMN     "planStart" DATE;
ALTER TABLE "Strategy" ADD CONSTRAINT "strategy_period" CHECK (("planStart" IS NULL AND "planEnd" IS NULL) OR ("planStart" IS NOT NULL AND "planEnd" IS NOT NULL AND "planStart" <= "planEnd"));
ALTER TABLE "Strategy" ADD CONSTRAINT "strategy_budget_nonnegative" CHECK ("budgetCeilingKrw" IS NULL OR "budgetCeilingKrw" >= 0);
