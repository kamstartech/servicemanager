-- AlterTable
ALTER TABLE "app_screens" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_testing" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "app_screens_is_active_idx" ON "app_screens"("is_active");
