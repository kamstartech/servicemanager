-- AlterTable
ALTER TABLE "fdh_mobile_user_accounts" 
ADD COLUMN "working_balance" DECIMAL(15,2),
ADD COLUMN "available_balance" DECIMAL(15,2),
ADD COLUMN "cleared_balance" DECIMAL(15,2);

-- Add comment
COMMENT ON COLUMN "fdh_mobile_user_accounts"."working_balance" IS 'Working balance from T24';
COMMENT ON COLUMN "fdh_mobile_user_accounts"."available_balance" IS 'Available balance from T24';
COMMENT ON COLUMN "fdh_mobile_user_accounts"."cleared_balance" IS 'Cleared balance from T24';
