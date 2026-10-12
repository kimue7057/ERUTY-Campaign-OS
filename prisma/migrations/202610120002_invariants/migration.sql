-- Prisma does not express CHECK constraints; keep these in reviewed SQL migrations.
ALTER TABLE "Campaign" ADD CONSTRAINT "campaign_dates" CHECK ("planStart" <= "planEnd");
ALTER TABLE "Campaign" ADD CONSTRAINT "campaign_nonnegative_money" CHECK (
  "budgetCeilingKrw" >= 0 AND "targetNetSalesKrw" >= 0 AND "targetErutyRevenueKrw" >= 0
);
ALTER TABLE "WorkItem" ADD CONSTRAINT "work_dates" CHECK ("plannedStart" <= "plannedEnd");
ALTER TABLE "WorkItem" ADD CONSTRAINT "work_actual_dates" CHECK ("actualStart" IS NULL OR "actualEnd" IS NULL OR "actualStart" <= "actualEnd");
-- Constant ACTIVITY parentKind + composite parent FK prevents a third level,
-- wrong campaign/strategy, and attaching an activity below another work item.
ALTER TABLE "WorkItem" ADD CONSTRAINT "work_hierarchy" CHECK (
  "parentKind" = 'ACTIVITY' AND (
    ("kind" = 'ACTIVITY' AND "parentId" IS NULL) OR
    ("kind" = 'SUBTASK' AND "parentId" IS NOT NULL AND "parentId" <> "id")
  )
);
ALTER TABLE "BudgetLine" ADD CONSTRAINT "budget_activity_only" CHECK ("activityKind" = 'ACTIVITY');
ALTER TABLE "BudgetLine" ADD CONSTRAINT "budget_nonnegative" CHECK ("plannedAmountKrw" >= 0);
ALTER TABLE "BrandCountry" ADD CONSTRAINT "country_code" CHECK ("countryCode" ~ '^[A-Z]{2}$');
ALTER TABLE "Brand" ADD CONSTRAINT "brand_name" CHECK (length(trim("name")) BETWEEN 1 AND 120);
ALTER TABLE "BrandCountry" ADD CONSTRAINT "country_name" CHECK (length(trim("countryName")) BETWEEN 1 AND 120);
ALTER TABLE "Campaign" ADD CONSTRAINT "campaign_name" CHECK (length(trim("name")) BETWEEN 1 AND 120);
ALTER TABLE "Strategy" ADD CONSTRAINT "strategy_name" CHECK (length(trim("name")) BETWEEN 1 AND 120);
ALTER TABLE "WorkItem" ADD CONSTRAINT "work_name" CHECK (length(trim("name")) BETWEEN 1 AND 120);
ALTER TABLE "Strategy" ADD CONSTRAINT "strategy_sort" CHECK ("sortOrder" >= 0 AND "revision" > 0);
ALTER TABLE "WorkItem" ADD CONSTRAINT "work_sort" CHECK ("sortOrder" >= 0 AND "revision" > 0);

-- Preserve append-only change evidence, including when an empty entity is deleted.
CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only';
END;
$$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
