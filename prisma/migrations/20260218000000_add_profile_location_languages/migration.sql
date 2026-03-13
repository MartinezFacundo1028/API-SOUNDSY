-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "location" TEXT;
ALTER TABLE "Profile" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
