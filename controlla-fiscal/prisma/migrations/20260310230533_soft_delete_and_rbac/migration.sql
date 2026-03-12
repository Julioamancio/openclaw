-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Declaration" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."InstallmentGuide" ADD COLUMN     "deletedAt" TIMESTAMP(3);
