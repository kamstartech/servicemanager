-- CreateEnum
CREATE TYPE "MobileUserContext" AS ENUM ('MOBILE_BANKING', 'WALLET', 'VILLAGE_BANKING', 'AGENT', 'MERCHANT');

-- CreateEnum
CREATE TYPE "CoreBankingAuthType" AS ENUM ('BASIC', 'BEARER');

-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BeneficiaryType" AS ENUM ('WALLET', 'BANK_INTERNAL', 'BANK_EXTERNAL');

-- CreateTable
CREATE TABLE "fdh_mobile_users" (
    "id" SERIAL NOT NULL,
    "context" "MobileUserContext" NOT NULL,
    "username" TEXT,
    "phoneNumber" TEXT,
    "customerNumber" TEXT,
    "accountNumber" TEXT,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_mobile_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_devices" (
    "id" TEXT NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "name" TEXT,
    "model" TEXT,
    "os" TEXT,
    "deviceId" TEXT,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatabaseConnection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "database" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "options" JSONB,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,

    CONSTRAINT "DatabaseConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreBankingConnection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "authType" "CoreBankingAuthType" NOT NULL DEFAULT 'BASIC',
    "token" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT,

    CONSTRAINT "CoreBankingConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreBankingEndpoint" (
    "id" SERIAL NOT NULL,
    "connectionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "path" TEXT NOT NULL,
    "bodyTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreBankingEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdh_migrations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceConnectionId" INTEGER NOT NULL,
    "sourceQuery" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetInsertQuery" TEXT NOT NULL,
    "status" "MigrationStatus" NOT NULL DEFAULT 'PENDING',
    "lastRunAt" TIMESTAMP(3),
    "lastRunSuccess" BOOLEAN,
    "lastRunMessage" TEXT,
    "lastRunRowsAffected" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdh_beneficiaries" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "beneficiary_type" "BeneficiaryType" NOT NULL,
    "phone_number" TEXT,
    "account_number" TEXT,
    "bank_code" TEXT,
    "bank_name" TEXT,
    "branch" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fdh_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_web_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_web_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_web_password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_web_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_devices_credentialId_key" ON "mobile_devices"("credentialId");

-- CreateIndex
CREATE INDEX "mobile_devices_mobile_user_id_idx" ON "mobile_devices"("mobile_user_id");

-- CreateIndex
CREATE INDEX "fdh_beneficiaries_user_id_idx" ON "fdh_beneficiaries"("user_id");

-- CreateIndex
CREATE INDEX "fdh_beneficiaries_beneficiary_type_idx" ON "fdh_beneficiaries"("beneficiary_type");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_beneficiaries_user_id_phone_number_beneficiary_type_key" ON "fdh_beneficiaries"("user_id", "phone_number", "beneficiary_type");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_beneficiaries_user_id_account_number_beneficiary_type_key" ON "fdh_beneficiaries"("user_id", "account_number", "beneficiary_type");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_beneficiaries_user_id_account_number_bank_code_benefici_key" ON "fdh_beneficiaries"("user_id", "account_number", "bank_code", "beneficiary_type");

-- CreateIndex
CREATE UNIQUE INDEX "admin_web_users_email_key" ON "admin_web_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_web_password_reset_tokens_token_key" ON "admin_web_password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoreBankingEndpoint" ADD CONSTRAINT "CoreBankingEndpoint_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CoreBankingConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_migrations" ADD CONSTRAINT "fdh_migrations_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES "DatabaseConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fdh_beneficiaries" ADD CONSTRAINT "fdh_beneficiaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_web_password_reset_tokens" ADD CONSTRAINT "admin_web_password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_web_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
