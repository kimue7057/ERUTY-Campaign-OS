-- Prisma's migration metadata also stays inaccessible through the Data API.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "_prisma_migrations" FROM PUBLIC;
DO $$
DECLARE api_role text;
DECLARE app_table text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "_prisma_migrations" FROM %I', api_role);
    END IF;
  END LOOP;
  -- eruty_app is provisioned separately with a private LOGIN password, no ownership,
  -- no BYPASSRLS, and no membership in Supabase's browser/authentication roles.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eruty_app') THEN
    FOREACH app_table IN ARRAY ARRAY['AppUser', 'Brand', 'BrandCountry', 'Campaign', 'CampaignMember', 'Strategy', 'WorkItem', 'BudgetLine', 'AuditEvent'] LOOP
      EXECUTE format('CREATE POLICY eruty_server_only ON %I TO eruty_app USING (true) WITH CHECK (true)', app_table);
    END LOOP;
    GRANT SELECT ON "AppUser" TO eruty_app;
    GRANT SELECT, INSERT ON "AuditEvent" TO eruty_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON "Brand", "BrandCountry", "Campaign", "CampaignMember", "Strategy", "WorkItem", "BudgetLine" TO eruty_app;
  END IF;
END $$;
