/*
  Warnings:

  - A unique constraint covering the columns `[mobile_user_id,deviceId]` on the table `mobile_devices` will be added. If there are existing duplicate values, this will fail.
  - Made the column `deviceId` on table `mobile_devices` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AttemptType" AS ENUM ('PASSWORD_LOGIN', 'PASSKEY_REGISTRATION', 'PASSKEY_LOGIN', 'OTP_VERIFY');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'SUCCESS', 'FAILED_CREDENTIALS', 'FAILED_OTP', 'FAILED_DEVICE_PENDING', 'FAILED_DEVICE_BLOCKED', 'EXPIRED', 'PENDING_APPROVAL');

-- AlterTable
ALTER TABLE "mobile_devices" ADD COLUMN     "last_login_ip" TEXT,
ADD COLUMN     "login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verification_ip" TEXT,
ADD COLUMN     "verification_location" TEXT,
ADD COLUMN     "verified_via" TEXT,
ALTER COLUMN "deviceId" SET NOT NULL,
ALTER COLUMN "credentialId" DROP NOT NULL,
ALTER COLUMN "publicKey" DROP NOT NULL,
ALTER COLUMN "counter" DROP NOT NULL,
ALTER COLUMN "transports" SET DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "fdh_device_login_attempts" (
    "id" TEXT NOT NULL,
    "mobile_user_id" INTEGER,
    "username" TEXT,
    "context" TEXT,
    "device_id" TEXT,
    "device_name" TEXT,
    "device_model" TEXT,
    "device_os" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "attempt_type" "AttemptType" NOT NULL,
    "status" "AttemptStatus" NOT NULL,
    "failure_reason" TEXT,
    "otp_code" TEXT,
    "otp_sent_to" TEXT,
    "otp_sent_at" TIMESTAMP(3),
    "otp_expires_at" TIMESTAMP(3),
    "otp_verified_at" TIMESTAMP(3),
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "verification_token" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fdh_device_login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fdh_device_login_attempts_verification_token_key" ON "fdh_device_login_attempts"("verification_token");

-- CreateIndex
CREATE INDEX "fdh_device_login_attempts_mobile_user_id_idx" ON "fdh_device_login_attempts"("mobile_user_id");

-- CreateIndex
CREATE INDEX "fdh_device_login_attempts_device_id_idx" ON "fdh_device_login_attempts"("device_id");

-- CreateIndex
CREATE INDEX "fdh_device_login_attempts_verification_token_idx" ON "fdh_device_login_attempts"("verification_token");

-- CreateIndex
CREATE INDEX "fdh_device_login_attempts_attempted_at_idx" ON "fdh_device_login_attempts"("attempted_at");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_devices_mobile_user_id_deviceId_key" ON "mobile_devices"("mobile_user_id", "deviceId");

-- AddForeignKey
ALTER TABLE "fdh_device_login_attempts" ADD CONSTRAINT "fdh_device_login_attempts_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
