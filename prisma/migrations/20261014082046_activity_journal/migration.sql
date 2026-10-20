ALTER TABLE "WorkItem" ADD COLUMN "description" TEXT;
ALTER TABLE "WorkItem" ADD CONSTRAINT "work_description_length" CHECK ("description" IS NULL OR char_length("description") <= 10000);
CREATE TABLE "WorkJournal" (
  "id" UUID NOT NULL,
  "workItemId" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkJournal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "journal_body_length" CHECK (char_length(btrim("body")) BETWEEN 1 AND 10000),
  CONSTRAINT "journal_revision_positive" CHECK ("revision" > 0)
);
CREATE INDEX "WorkJournal_workItemId_createdAt_id_idx" ON "WorkJournal"("workItemId", "createdAt", "id");
CREATE INDEX "WorkJournal_authorId_idx" ON "WorkJournal"("authorId");
CREATE UNIQUE INDEX "WorkItem_id_campaignId_key" ON "WorkItem"("id", "campaignId");
ALTER TABLE "WorkJournal" ADD CONSTRAINT "WorkJournal_workItemId_campaignId_fkey" FOREIGN KEY ("workItemId", "campaignId") REFERENCES "WorkItem"("id", "campaignId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "WorkJournal" ADD CONSTRAINT "WorkJournal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkJournal" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WorkJournal" FROM PUBLIC;
DO $$
DECLARE api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE "WorkJournal" FROM %I', api_role);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eruty_app') THEN
    CREATE POLICY eruty_server_only ON "WorkJournal" TO eruty_app USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT ON "WorkJournal" TO eruty_app;
    GRANT UPDATE ("body", "revision", "updatedAt") ON "WorkJournal" TO eruty_app;
  END IF;
END $$;
