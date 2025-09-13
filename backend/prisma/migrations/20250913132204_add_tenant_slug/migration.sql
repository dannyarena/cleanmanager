/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add slug column as nullable first
ALTER TABLE "public"."tenants" ADD COLUMN "slug" TEXT;

-- Update existing records with default slug values
UPDATE "public"."tenants" SET "slug" = 'cleanmanager-demo' WHERE "slug" IS NULL;

-- Make slug column NOT NULL
ALTER TABLE "public"."tenants" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE INDEX "checklists_tenantId_idx" ON "public"."checklists"("tenantId");

-- CreateIndex
CREATE INDEX "sites_tenantId_idx" ON "public"."sites"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");
