-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "WorkKind" AS ENUM ('ACTIVITY', 'SUBTASK');

-- CreateEnum
CREATE TYPE "VatPolicy" AS ENUM ('INCLUDED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "CampaignRole" AS ENUM ('EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" UUID NOT NULL,
    "authSubject" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL DEFAULT 'MEMBER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandCountry" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "countryName" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "brandCountryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID,
    "planStart" DATE NOT NULL,
    "planEnd" DATE NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "budgetCeilingKrw" BIGINT NOT NULL DEFAULT 0,
    "targetNetSalesKrw" BIGINT NOT NULL DEFAULT 0,
    "targetErutyRevenueKrw" BIGINT NOT NULL DEFAULT 0,
    "vatPolicy" "VatPolicy" NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "campaignId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CampaignRole" NOT NULL,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("campaignId","userId")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItem" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "strategyId" UUID NOT NULL,
    "parentId" UUID,
    "parentKind" "WorkKind" NOT NULL DEFAULT 'ACTIVITY',
    "kind" "WorkKind" NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID,
    "status" "WorkStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStart" DATE NOT NULL,
    "plannedEnd" DATE NOT NULL,
    "actualStart" DATE,
    "actualEnd" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "activityId" UUID,
    "activityKind" "WorkKind" NOT NULL DEFAULT 'ACTIVITY',
    "category" TEXT NOT NULL DEFAULT 'INITIAL',
    "description" TEXT NOT NULL,
    "plannedAmountKrw" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_authSubject_key" ON "AppUser"("authSubject");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BrandCountry_brandId_countryCode_key" ON "BrandCountry"("brandId", "countryCode");

-- CreateIndex
CREATE INDEX "Campaign_brandCountryId_idx" ON "Campaign"("brandCountryId");

-- CreateIndex
CREATE INDEX "CampaignMember_userId_idx" ON "CampaignMember"("userId");

-- CreateIndex
CREATE INDEX "Strategy_campaignId_sortOrder_idx" ON "Strategy"("campaignId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_id_campaignId_key" ON "Strategy"("id", "campaignId");

-- CreateIndex
CREATE INDEX "WorkItem_campaignId_strategyId_sortOrder_idx" ON "WorkItem"("campaignId", "strategyId", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkItem_parentId_idx" ON "WorkItem"("parentId");

-- CreateIndex
CREATE INDEX "WorkItem_ownerId_idx" ON "WorkItem"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_id_campaignId_strategyId_kind_key" ON "WorkItem"("id", "campaignId", "strategyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_id_campaignId_kind_key" ON "WorkItem"("id", "campaignId", "kind");

-- CreateIndex
CREATE INDEX "BudgetLine_campaignId_idx" ON "BudgetLine"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_activityId_category_key" ON "BudgetLine"("activityId", "category");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "BrandCountry" ADD CONSTRAINT "BrandCountry_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandCountryId_fkey" FOREIGN KEY ("brandCountryId") REFERENCES "BrandCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_strategyId_campaignId_fkey" FOREIGN KEY ("strategyId", "campaignId") REFERENCES "Strategy"("id", "campaignId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_parentId_campaignId_strategyId_parentKind_fkey" FOREIGN KEY ("parentId", "campaignId", "strategyId", "parentKind") REFERENCES "WorkItem"("id", "campaignId", "strategyId", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_activityId_campaignId_activityKind_fkey" FOREIGN KEY ("activityId", "campaignId", "activityKind") REFERENCES "WorkItem"("id", "campaignId", "kind") ON DELETE RESTRICT ON UPDATE RESTRICT;
