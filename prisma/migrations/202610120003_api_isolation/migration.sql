-- ORM-created tables are not automatically protected by Supabase's Data API.
-- No browser role receives a policy. Server-side Prisma remains the sole data path.
ALTER TABLE "AppUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandCountry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Strategy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AppUser", "Brand", "BrandCountry", "Campaign", "CampaignMember", "Strategy", "WorkItem", "BudgetLine", "AuditEvent" FROM PUBLIC;

-- Keep this migration usable on ordinary PostgreSQL as well as Supabase.
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "AppUser", "Brand", "BrandCountry", "Campaign", "CampaignMember", "Strategy", "WorkItem", "BudgetLine", "AuditEvent" FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
