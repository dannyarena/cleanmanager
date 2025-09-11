-- CreateEnum
CREATE TYPE "public"."Theme" AS ENUM ('LIGHT', 'DARK');

-- CreateTable
CREATE TABLE "public"."tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "primaryColor" TEXT DEFAULT '#2563eb',
    "theme" "public"."Theme" NOT NULL DEFAULT 'LIGHT',
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "recurrenceDefaultFrequency" "public"."RecurrenceFrequency" NOT NULL DEFAULT 'WEEKLY',
    "recurrenceDefaultInterval" INTEGER NOT NULL DEFAULT 1,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "public"."tenant_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "public"."tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
