-- CreateTable
CREATE TABLE "app_screen_pages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_testing" BOOLEAN NOT NULL DEFAULT false,
    "screen_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_screen_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_screen_pages_screen_id_idx" ON "app_screen_pages"("screen_id");

-- CreateIndex
CREATE INDEX "app_screen_pages_order_idx" ON "app_screen_pages"("order");

-- CreateIndex
CREATE INDEX "app_screen_pages_is_active_idx" ON "app_screen_pages"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "app_screen_pages_screen_id_name_key" ON "app_screen_pages"("screen_id", "name");

-- AddForeignKey
ALTER TABLE "app_screen_pages" ADD CONSTRAINT "app_screen_pages_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "app_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
