ALTER TABLE "Campaign" ADD COLUMN "actualErutyRevenueKrw" BIGINT,
ADD COLUMN "actualIncurredCostKrw" BIGINT,
ADD COLUMN "actualNetSalesKrw" BIGINT,
ADD COLUMN "actualsAsOfDate" DATE,
ADD COLUMN "actualsNote" TEXT;
ALTER TABLE "Campaign" ADD CONSTRAINT "actual_amounts_nonnegative" CHECK (
  ("actualNetSalesKrw" IS NULL OR "actualNetSalesKrw" >= 0) AND
  ("actualErutyRevenueKrw" IS NULL OR "actualErutyRevenueKrw" >= 0) AND
  ("actualIncurredCostKrw" IS NULL OR "actualIncurredCostKrw" >= 0)
);
ALTER TABLE "Campaign" ADD CONSTRAINT "actual_amounts_require_date" CHECK (
  ("actualNetSalesKrw" IS NULL AND "actualErutyRevenueKrw" IS NULL AND "actualIncurredCostKrw" IS NULL) OR "actualsAsOfDate" IS NOT NULL
);
ALTER TABLE "Campaign" ADD CONSTRAINT "actuals_note_length" CHECK ("actualsNote" IS NULL OR char_length("actualsNote") <= 10000);
