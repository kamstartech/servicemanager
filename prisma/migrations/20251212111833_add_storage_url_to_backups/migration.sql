-- AlterTable
ALTER TABLE "fdh_backups" ADD COLUMN     "storage_url" TEXT;

-- CreateTable
CREATE TABLE "app_screens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "context" "MobileUserContext" NOT NULL,
    "route" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_protected" BOOLEAN NOT NULL DEFAULT true,
    "layout" TEXT,
    "permissions" TEXT,
    "form_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_screens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_screens_context_idx" ON "app_screens"("context");

-- CreateIndex
CREATE INDEX "app_screens_is_active_idx" ON "app_screens"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "app_screens_context_route_key" ON "app_screens"("context", "route");
