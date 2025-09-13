/*
  Warnings:

  - Made the column `tenantId` on table `check_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `shift_exception_operators` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `shift_exception_sites` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `shift_exceptions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `shift_operators` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `shift_recurrence` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `shift_sites` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."check_items" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."shift_exception_operators" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."shift_exception_sites" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."shift_exceptions" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."shift_operators" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."shift_recurrence" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."shift_sites" ALTER COLUMN "tenantId" SET NOT NULL;
