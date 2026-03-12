-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "permissions" TEXT,
ADD COLUMN     "title" TEXT;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
