-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "public"."shift_exceptions" ADD COLUMN     "newDate" TIMESTAMP(3);
