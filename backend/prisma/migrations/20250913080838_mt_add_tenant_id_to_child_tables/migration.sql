/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,name]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,name]` on the table `sites` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."users_email_key";

-- AlterTable
ALTER TABLE "public"."check_items" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."shift_exception_operators" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."shift_exception_sites" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."shift_exceptions" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."shift_operators" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."shift_recurrence" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "public"."shift_sites" ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "check_items_tenantId_idx" ON "public"."check_items"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_tenantId_name_key" ON "public"."clients"("tenantId", "name");

-- CreateIndex
CREATE INDEX "shift_exception_operators_tenantId_idx" ON "public"."shift_exception_operators"("tenantId");

-- CreateIndex
CREATE INDEX "shift_exception_sites_tenantId_idx" ON "public"."shift_exception_sites"("tenantId");

-- CreateIndex
CREATE INDEX "shift_exceptions_tenantId_idx" ON "public"."shift_exceptions"("tenantId");

-- CreateIndex
CREATE INDEX "shift_operators_tenantId_idx" ON "public"."shift_operators"("tenantId");

-- CreateIndex
CREATE INDEX "shift_recurrence_tenantId_idx" ON "public"."shift_recurrence"("tenantId");

-- CreateIndex
CREATE INDEX "shift_sites_tenantId_idx" ON "public"."shift_sites"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "sites_tenantId_name_key" ON "public"."sites"("tenantId", "name");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "public"."users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "public"."users"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "public"."shift_recurrence" ADD CONSTRAINT "shift_recurrence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_sites" ADD CONSTRAINT "shift_sites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_operators" ADD CONSTRAINT "shift_operators_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."check_items" ADD CONSTRAINT "check_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_exceptions" ADD CONSTRAINT "shift_exceptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_exception_sites" ADD CONSTRAINT "shift_exception_sites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_exception_operators" ADD CONSTRAINT "shift_exception_operators_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
