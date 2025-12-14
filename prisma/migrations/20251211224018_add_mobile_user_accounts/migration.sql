-- CreateTable
CREATE TABLE "fdh_mobile_user_accounts" (
    "id" SERIAL NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT,
    "account_type" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MWK',
    "balance" DECIMAL(15,2),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_mobile_user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fdh_mobile_user_accounts_mobile_user_id_idx" ON "fdh_mobile_user_accounts"("mobile_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_mobile_user_accounts_mobile_user_id_account_number_key" ON "fdh_mobile_user_accounts"("mobile_user_id", "account_number");

-- AddForeignKey
ALTER TABLE "fdh_mobile_user_accounts" ADD CONSTRAINT "fdh_mobile_user_accounts_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing account numbers to new table
INSERT INTO "fdh_mobile_user_accounts" 
    ("mobile_user_id", "account_number", "is_primary", "is_active", "created_at", "updated_at")
SELECT 
    id, 
    "accountNumber", 
    true, 
    true, 
    "created_at", 
    "updated_at"
FROM "fdh_mobile_users"
WHERE "accountNumber" IS NOT NULL 
  AND "accountNumber" != ''
  AND "context" = 'MOBILE_BANKING';
