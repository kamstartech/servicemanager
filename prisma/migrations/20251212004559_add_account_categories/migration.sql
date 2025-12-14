-- CreateTable
CREATE TABLE "fdh_account_categories" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "display_to_mobile" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_account_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fdh_account_categories_category_key" ON "fdh_account_categories"("category");
