-- AlterTable: Add context and wallet-specific fields to fdh_mobile_user_accounts
ALTER TABLE "fdh_mobile_user_accounts" 
  ADD COLUMN "context" "MobileUserContext" NOT NULL DEFAULT 'MOBILE_BANKING',
  ADD COLUMN "frozen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "last_transaction_date" TIMESTAMP(3);

-- DropIndex: Drop old unique constraint
DROP INDEX IF EXISTS "fdh_mobile_user_accounts_mobileUserId_accountNumber_key";

-- CreateIndex: Add new indexes
CREATE INDEX "fdh_mobile_user_accounts_context_idx" ON "fdh_mobile_user_accounts"("context");
CREATE UNIQUE INDEX "fdh_mobile_user_accounts_mobileUserId_accountNumber_context_key" ON "fdh_mobile_user_accounts"("mobile_user_id", "account_number", "context");

-- CreateTable: fdh_wallet_tiers
CREATE TABLE "fdh_wallet_tiers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "minimum_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "maximum_balance" DECIMAL(15,2) NOT NULL,
    "maximum_credit_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "maximum_debt_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "min_transaction_amount" DECIMAL(15,2) NOT NULL,
    "max_transaction_amount" DECIMAL(15,2) NOT NULL,
    "daily_transaction_limit" DECIMAL(15,2) NOT NULL,
    "monthly_transaction_limit" DECIMAL(15,2) NOT NULL,
    "daily_transaction_count" INTEGER NOT NULL,
    "monthly_transaction_count" INTEGER NOT NULL,
    "required_kyc_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kyc_rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_wallet_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fdh_mobile_user_kyc
CREATE TABLE "fdh_mobile_user_kyc" (
    "id" SERIAL NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "wallet_tier_id" INTEGER,
    "date_of_birth" DATE,
    "occupation" TEXT,
    "employer_name" TEXT,
    "source_of_funds" TEXT,
    "id_number" TEXT,
    "id_image" TEXT,
    "kyc_complete" BOOLEAN NOT NULL DEFAULT false,
    "kyc_verified_at" TIMESTAMP(3),
    "nrb_validation" BOOLEAN,
    "nrb_response_code" INTEGER,
    "nrb_response_message" TEXT,
    "nrb_status" TEXT,
    "nrb_status_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_mobile_user_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: fdh_wallet_tiers
CREATE UNIQUE INDEX "fdh_wallet_tiers_position_key" ON "fdh_wallet_tiers"("position");
CREATE INDEX "fdh_wallet_tiers_is_default_idx" ON "fdh_wallet_tiers"("is_default");

-- CreateIndex: fdh_mobile_user_kyc
CREATE UNIQUE INDEX "fdh_mobile_user_kyc_mobile_user_id_key" ON "fdh_mobile_user_kyc"("mobile_user_id");
CREATE INDEX "fdh_mobile_user_kyc_mobile_user_id_idx" ON "fdh_mobile_user_kyc"("mobile_user_id");
CREATE INDEX "fdh_mobile_user_kyc_wallet_tier_id_idx" ON "fdh_mobile_user_kyc"("wallet_tier_id");

-- AddForeignKey
ALTER TABLE "fdh_mobile_user_kyc" ADD CONSTRAINT "fdh_mobile_user_kyc_mobile_user_id_fkey" 
    FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fdh_mobile_user_kyc" ADD CONSTRAINT "fdh_mobile_user_kyc_wallet_tier_id_fkey" 
    FOREIGN KEY ("wallet_tier_id") REFERENCES "fdh_wallet_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
