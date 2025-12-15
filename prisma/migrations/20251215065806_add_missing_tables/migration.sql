-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_BALANCE', 'LARGE_TRANSACTION', 'SUSPICIOUS_ACTIVITY', 'PAYMENT_DUE', 'ACCOUNT_LOGIN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT', 'TRANSFER', 'WALLET_TRANSFER', 'WALLET_DEBIT', 'WALLET_CREDIT', 'ACCOUNT_TO_WALLET', 'WALLET_TO_ACCOUNT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'FAILED_PERMANENT', 'REVERSED');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MOBILE_BANKING', 'WALLET', 'ADMIN', 'API');

-- CreateEnum
CREATE TYPE "SuspicionReason" AS ENUM ('UNUSUAL_LOCATION', 'MULTIPLE_FAILED_ATTEMPTS', 'NEW_DEVICE_TRANSACTION');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('BILL', 'LOAN', 'SUBSCRIPTION', 'RECURRING');

-- CreateEnum
CREATE TYPE "PaymentReminderInterval" AS ENUM ('ONE_WEEK', 'THREE_DAYS', 'ONE_DAY');

-- CreateEnum
CREATE TYPE "LoginAlertMode" AS ENUM ('EVERY_LOGIN', 'NEW_DEVICE', 'NEW_LOCATION');

-- CreateEnum
CREATE TYPE "LoginMethod" AS ENUM ('PASSWORD', 'BIOMETRIC', 'PASSKEY', 'OTP');

-- CreateEnum
CREATE TYPE "UserAction" AS ENUM ('DISMISSED', 'THIS_WAS_ME', 'REPORT_FRAUD', 'QUICK_PAY');

-- CreateEnum
CREATE TYPE "ResolutionAction" AS ENUM ('CONFIRMED_LEGITIMATE', 'FRAUD_REPORTED', 'ACCOUNT_LOCKED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'FAILED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('THIRD_PARTY_API', 'ADMIN_PORTAL', 'SELF_SERVICE', 'T24_SYNC');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('FORM', 'API_CALL', 'VALIDATION', 'CONFIRMATION', 'DISPLAY', 'REDIRECT');

-- CreateEnum
CREATE TYPE "StepExecutionMode" AS ENUM ('CLIENT_ONLY', 'SERVER_SYNC', 'SERVER_ASYNC', 'SERVER_VALIDATION');

-- CreateEnum
CREATE TYPE "TriggerTiming" AS ENUM ('BEFORE_STEP', 'AFTER_STEP', 'BOTH');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillerType" AS ENUM ('REGISTER_GENERAL', 'BWB_POSTPAID', 'LWB_POSTPAID', 'SRWB_POSTPAID', 'SRWB_PREPAID', 'MASM', 'AIRTEL_VALIDATION', 'TNM_BUNDLES');

-- CreateEnum
CREATE TYPE "BillerTransactionType" AS ENUM ('ACCOUNT_DETAILS', 'POST_TRANSACTION', 'GET_INVOICE', 'CONFIRM_INVOICE', 'BUNDLE_DETAILS', 'CONFIRM_BUNDLE');

-- CreateEnum
CREATE TYPE "BillerTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- DropIndex
DROP INDEX "fdh_mobile_user_accounts_mobile_user_id_account_number_key";

-- AlterTable
ALTER TABLE "fdh_mobile_user_accounts" ADD COLUMN     "account_status" TEXT,
ADD COLUMN     "category_id" TEXT,
ADD COLUMN     "category_name" TEXT,
ADD COLUMN     "holder_name" TEXT,
ADD COLUMN     "nick_name" TEXT,
ADD COLUMN     "online_limit" TEXT,
ADD COLUMN     "opening_date" TEXT;

-- CreateTable
CREATE TABLE "requested_registrations" (
    "id" SERIAL NOT NULL,
    "source_ip" TEXT NOT NULL,
    "request_body" JSONB NOT NULL,
    "source" "RegistrationSource" NOT NULL DEFAULT 'THIRD_PARTY_API',
    "phone_number" TEXT NOT NULL,
    "customer_number" TEXT NOT NULL,
    "email_address" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "profile_type" TEXT,
    "company" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "elixir_user_id" INTEGER,
    "mobile_user_id" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "validation_data" JSONB,
    "process_log" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "processed_by" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requested_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_alert_settings" (
    "id" SERIAL NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "account_number" VARCHAR(20) NOT NULL,
    "low_balance_enabled" BOOLEAN NOT NULL DEFAULT true,
    "low_balance_threshold" DECIMAL(19,4),
    "low_balance_channels" "NotificationChannel"[] DEFAULT ARRAY['PUSH']::"NotificationChannel"[],
    "large_transaction_enabled" BOOLEAN NOT NULL DEFAULT true,
    "large_transaction_threshold" DECIMAL(19,4),
    "large_transaction_channels" "NotificationChannel"[] DEFAULT ARRAY['PUSH', 'SMS']::"NotificationChannel"[],
    "large_transaction_debit_only" BOOLEAN NOT NULL DEFAULT true,
    "alert_unusual_location" BOOLEAN NOT NULL DEFAULT true,
    "alert_multiple_failed_attempts" BOOLEAN NOT NULL DEFAULT true,
    "alert_new_device_transaction" BOOLEAN NOT NULL DEFAULT true,
    "suspicious_activity_channels" "NotificationChannel"[] DEFAULT ARRAY['PUSH', 'SMS', 'EMAIL']::"NotificationChannel"[],
    "payment_due_enabled" BOOLEAN NOT NULL DEFAULT true,
    "payment_due_channels" "NotificationChannel"[] DEFAULT ARRAY['PUSH', 'SMS']::"NotificationChannel"[],
    "payment_reminder_interval" "PaymentReminderInterval" NOT NULL DEFAULT 'ONE_DAY',
    "login_alert_mode" "LoginAlertMode" NOT NULL DEFAULT 'NEW_DEVICE',
    "login_alert_channels" "NotificationChannel"[] DEFAULT ARRAY['PUSH', 'EMAIL']::"NotificationChannel"[],
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" TIME(6),
    "quiet_hours_end" TIME(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_alert_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_alerts" (
    "id" SERIAL NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "account_number" VARCHAR(20),
    "alert_type" "AlertType" NOT NULL,
    "alert_data" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "channels_sent" "NotificationChannel"[] DEFAULT ARRAY[]::"NotificationChannel"[],
    "sent_at" TIMESTAMP(3),
    "delivery_status" JSONB,
    "acknowledged_at" TIMESTAMP(3),
    "user_action" "UserAction",
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspicious_activity_log" (
    "id" SERIAL NOT NULL,
    "alert_id" INTEGER,
    "mobile_user_id" INTEGER NOT NULL,
    "account_number" VARCHAR(20),
    "suspicion_reason" "SuspicionReason" NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "detection_details" JSONB NOT NULL,
    "related_transaction_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "device_id" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "location" VARCHAR(255),
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolution_action" "ResolutionAction",
    "admin_notes" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suspicious_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "type" "WorkflowStepType" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "validation" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "execution_mode" "StepExecutionMode" NOT NULL DEFAULT 'CLIENT_ONLY',
    "trigger_timing" "TriggerTiming",
    "trigger_endpoint" TEXT,
    "trigger_config" JSONB,
    "timeout_ms" INTEGER,
    "retry_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "current_step_id" TEXT,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "final_result" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_screen_page_workflows" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config_override" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_screen_page_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biller_configs" (
    "id" TEXT NOT NULL,
    "biller_type" "BillerType" NOT NULL,
    "biller_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "base_url" TEXT NOT NULL,
    "endpoints" JSONB NOT NULL,
    "authentication" JSONB,
    "default_currency" VARCHAR(3) NOT NULL DEFAULT 'MWK',
    "supported_currencies" TEXT[] DEFAULT ARRAY['MWK']::TEXT[],
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "retry_attempts" INTEGER NOT NULL DEFAULT 3,
    "features" JSONB NOT NULL,
    "validationRules" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "biller_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biller_transactions" (
    "id" TEXT NOT NULL,
    "biller_config_id" TEXT,
    "biller_type" "BillerType" NOT NULL,
    "biller_name" TEXT NOT NULL,
    "our_transaction_id" VARCHAR(50) NOT NULL,
    "external_transaction_id" TEXT,
    "transaction_type" "BillerTransactionType" NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_type" VARCHAR(20),
    "customer_account_name" TEXT,
    "credit_account" VARCHAR(20),
    "credit_account_type" VARCHAR(20),
    "debit_account" VARCHAR(20),
    "debit_account_type" VARCHAR(20),
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MWK',
    "status" "BillerTransactionStatus" NOT NULL,
    "api_endpoint" TEXT,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "error_code" VARCHAR(50),
    "bundle_id" VARCHAR(50),
    "invoice_number" VARCHAR(100),
    "meter_number" VARCHAR(50),
    "metadata" JSONB,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "initiated_by" TEXT,

    CONSTRAINT "biller_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_party_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allowed_ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 60,
    "rate_limit_per_hour" INTEGER NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "third_party_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_party_api_keys" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" VARCHAR(50) NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" INTEGER,

    CONSTRAINT "third_party_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "third_party_access_logs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "method" VARCHAR(10) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_time" INTEGER,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "request_body" JSONB,
    "response_body" JSONB,
    "error_message" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "third_party_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdh_transactions" (
    "id" TEXT NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" "TransactionSource" NOT NULL DEFAULT 'API',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MWK',
    "from_account_id" INTEGER,
    "from_account_number" VARCHAR(50),
    "from_wallet_id" INTEGER,
    "from_wallet_number" VARCHAR(20),
    "to_account_id" INTEGER,
    "to_account_number" VARCHAR(50),
    "to_wallet_id" INTEGER,
    "to_wallet_number" VARCHAR(20),
    "description" TEXT NOT NULL,
    "t24_reference" VARCHAR(100),
    "t24_response" JSONB,
    "t24_request_body" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP(3),
    "last_retry_at" TIMESTAMP(3),
    "error_message" TEXT,
    "error_code" VARCHAR(50),
    "is_reversal" BOOLEAN NOT NULL DEFAULT false,
    "original_txn_id" TEXT,
    "reversal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "initiated_by_user_id" INTEGER,

    CONSTRAINT "fdh_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdh_transaction_status_history" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "from_status" "TransactionStatus" NOT NULL,
    "to_status" "TransactionStatus" NOT NULL,
    "reason" TEXT,
    "retry_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fdh_transaction_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requested_registrations_status_idx" ON "requested_registrations"("status");

-- CreateIndex
CREATE INDEX "requested_registrations_customer_number_idx" ON "requested_registrations"("customer_number");

-- CreateIndex
CREATE INDEX "requested_registrations_phone_number_idx" ON "requested_registrations"("phone_number");

-- CreateIndex
CREATE INDEX "requested_registrations_source_ip_idx" ON "requested_registrations"("source_ip");

-- CreateIndex
CREATE INDEX "requested_registrations_created_at_idx" ON "requested_registrations"("created_at");

-- CreateIndex
CREATE INDEX "requested_registrations_source_idx" ON "requested_registrations"("source");

-- CreateIndex
CREATE INDEX "account_alert_settings_mobile_user_id_idx" ON "account_alert_settings"("mobile_user_id");

-- CreateIndex
CREATE INDEX "account_alert_settings_account_number_idx" ON "account_alert_settings"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "account_alert_settings_mobile_user_id_account_number_key" ON "account_alert_settings"("mobile_user_id", "account_number");

-- CreateIndex
CREATE INDEX "account_alerts_mobile_user_id_idx" ON "account_alerts"("mobile_user_id");

-- CreateIndex
CREATE INDEX "account_alerts_account_number_idx" ON "account_alerts"("account_number");

-- CreateIndex
CREATE INDEX "account_alerts_alert_type_idx" ON "account_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "account_alerts_status_idx" ON "account_alerts"("status");

-- CreateIndex
CREATE INDEX "account_alerts_triggered_at_idx" ON "account_alerts"("triggered_at");

-- CreateIndex
CREATE INDEX "suspicious_activity_log_mobile_user_id_idx" ON "suspicious_activity_log"("mobile_user_id");

-- CreateIndex
CREATE INDEX "suspicious_activity_log_alert_id_idx" ON "suspicious_activity_log"("alert_id");

-- CreateIndex
CREATE INDEX "suspicious_activity_log_risk_score_idx" ON "suspicious_activity_log"("risk_score");

-- CreateIndex
CREATE INDEX "suspicious_activity_log_is_resolved_idx" ON "suspicious_activity_log"("is_resolved");

-- CreateIndex
CREATE INDEX "suspicious_activity_log_detected_at_idx" ON "suspicious_activity_log"("detected_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_name_key" ON "workflows"("name");

-- CreateIndex
CREATE INDEX "workflows_is_active_idx" ON "workflows"("is_active");

-- CreateIndex
CREATE INDEX "workflow_steps_workflow_id_idx" ON "workflow_steps"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_steps_type_idx" ON "workflow_steps"("type");

-- CreateIndex
CREATE INDEX "workflow_steps_order_idx" ON "workflow_steps"("order");

-- CreateIndex
CREATE INDEX "workflow_steps_is_active_idx" ON "workflow_steps"("is_active");

-- CreateIndex
CREATE INDEX "workflow_steps_execution_mode_idx" ON "workflow_steps"("execution_mode");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_id_idx" ON "workflow_executions"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_executions_user_id_idx" ON "workflow_executions"("user_id");

-- CreateIndex
CREATE INDEX "workflow_executions_session_id_idx" ON "workflow_executions"("session_id");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");

-- CreateIndex
CREATE INDEX "app_screen_page_workflows_page_id_idx" ON "app_screen_page_workflows"("page_id");

-- CreateIndex
CREATE INDEX "app_screen_page_workflows_workflow_id_idx" ON "app_screen_page_workflows"("workflow_id");

-- CreateIndex
CREATE INDEX "app_screen_page_workflows_order_idx" ON "app_screen_page_workflows"("order");

-- CreateIndex
CREATE UNIQUE INDEX "app_screen_page_workflows_page_id_workflow_id_key" ON "app_screen_page_workflows"("page_id", "workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "biller_configs_biller_type_key" ON "biller_configs"("biller_type");

-- CreateIndex
CREATE INDEX "biller_configs_biller_type_idx" ON "biller_configs"("biller_type");

-- CreateIndex
CREATE INDEX "biller_configs_is_active_idx" ON "biller_configs"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "biller_transactions_our_transaction_id_key" ON "biller_transactions"("our_transaction_id");

-- CreateIndex
CREATE INDEX "biller_transactions_biller_type_idx" ON "biller_transactions"("biller_type");

-- CreateIndex
CREATE INDEX "biller_transactions_status_idx" ON "biller_transactions"("status");

-- CreateIndex
CREATE INDEX "biller_transactions_our_transaction_id_idx" ON "biller_transactions"("our_transaction_id");

-- CreateIndex
CREATE INDEX "biller_transactions_account_number_idx" ON "biller_transactions"("account_number");

-- CreateIndex
CREATE INDEX "biller_transactions_created_at_idx" ON "biller_transactions"("created_at");

-- CreateIndex
CREATE INDEX "biller_transactions_biller_config_id_idx" ON "biller_transactions"("biller_config_id");

-- CreateIndex
CREATE INDEX "third_party_clients_is_active_idx" ON "third_party_clients"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "third_party_api_keys_key_hash_key" ON "third_party_api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "third_party_api_keys_client_id_idx" ON "third_party_api_keys"("client_id");

-- CreateIndex
CREATE INDEX "third_party_api_keys_status_idx" ON "third_party_api_keys"("status");

-- CreateIndex
CREATE INDEX "third_party_api_keys_key_hash_idx" ON "third_party_api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "third_party_access_logs_client_id_idx" ON "third_party_access_logs"("client_id");

-- CreateIndex
CREATE INDEX "third_party_access_logs_api_key_id_idx" ON "third_party_access_logs"("api_key_id");

-- CreateIndex
CREATE INDEX "third_party_access_logs_requested_at_idx" ON "third_party_access_logs"("requested_at");

-- CreateIndex
CREATE INDEX "third_party_access_logs_endpoint_idx" ON "third_party_access_logs"("endpoint");

-- CreateIndex
CREATE INDEX "third_party_access_logs_status_code_idx" ON "third_party_access_logs"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_transactions_reference_key" ON "fdh_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_transactions_t24_reference_key" ON "fdh_transactions"("t24_reference");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_transactions_original_txn_id_key" ON "fdh_transactions"("original_txn_id");

-- CreateIndex
CREATE INDEX "fdh_transactions_status_next_retry_at_idx" ON "fdh_transactions"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "fdh_transactions_status_type_idx" ON "fdh_transactions"("status", "type");

-- CreateIndex
CREATE INDEX "fdh_transactions_reference_idx" ON "fdh_transactions"("reference");

-- CreateIndex
CREATE INDEX "fdh_transactions_from_account_id_idx" ON "fdh_transactions"("from_account_id");

-- CreateIndex
CREATE INDEX "fdh_transactions_to_account_id_idx" ON "fdh_transactions"("to_account_id");

-- CreateIndex
CREATE INDEX "fdh_transactions_from_wallet_id_idx" ON "fdh_transactions"("from_wallet_id");

-- CreateIndex
CREATE INDEX "fdh_transactions_to_wallet_id_idx" ON "fdh_transactions"("to_wallet_id");

-- CreateIndex
CREATE INDEX "fdh_transactions_t24_reference_idx" ON "fdh_transactions"("t24_reference");

-- CreateIndex
CREATE INDEX "fdh_transactions_created_at_idx" ON "fdh_transactions"("created_at");

-- CreateIndex
CREATE INDEX "fdh_transaction_status_history_transaction_id_idx" ON "fdh_transaction_status_history"("transaction_id");

-- CreateIndex
CREATE INDEX "fdh_transaction_status_history_to_status_created_at_idx" ON "fdh_transaction_status_history"("to_status", "created_at");

-- AddForeignKey
ALTER TABLE "requested_registrations" ADD CONSTRAINT "requested_registrations_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requested_registrations" ADD CONSTRAINT "requested_registrations_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "admin_web_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_alert_settings" ADD CONSTRAINT "account_alert_settings_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_alerts" ADD CONSTRAINT "account_alerts_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspicious_activity_log" ADD CONSTRAINT "suspicious_activity_log_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "account_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspicious_activity_log" ADD CONSTRAINT "suspicious_activity_log_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_screen_page_workflows" ADD CONSTRAINT "app_screen_page_workflows_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "app_screen_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_screen_page_workflows" ADD CONSTRAINT "app_screen_page_workflows_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biller_transactions" ADD CONSTRAINT "biller_transactions_biller_config_id_fkey" FOREIGN KEY ("biller_config_id") REFERENCES "biller_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "third_party_api_keys" ADD CONSTRAINT "third_party_api_keys_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "third_party_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "third_party_access_logs" ADD CONSTRAINT "third_party_access_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "third_party_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "third_party_access_logs" ADD CONSTRAINT "third_party_access_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "third_party_api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_transactions" ADD CONSTRAINT "fdh_transactions_original_txn_id_fkey" FOREIGN KEY ("original_txn_id") REFERENCES "fdh_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_transactions" ADD CONSTRAINT "fdh_transactions_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "fdh_mobile_user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_transactions" ADD CONSTRAINT "fdh_transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "fdh_mobile_user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_transactions" ADD CONSTRAINT "fdh_transactions_from_wallet_id_fkey" FOREIGN KEY ("from_wallet_id") REFERENCES "fdh_mobile_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_transactions" ADD CONSTRAINT "fdh_transactions_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "fdh_mobile_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_transactions" ADD CONSTRAINT "fdh_transactions_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_transaction_status_history" ADD CONSTRAINT "fdh_transaction_status_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "fdh_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "fdh_mobile_user_accounts_mobileUserId_accountNumber_context_key" RENAME TO "fdh_mobile_user_accounts_mobile_user_id_account_number_cont_key";
