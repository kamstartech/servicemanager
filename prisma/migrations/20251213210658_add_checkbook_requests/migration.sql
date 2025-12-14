-- CreateEnum
CREATE TYPE "CheckbookRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED', 'REJECTED');

-- CreateTable
CREATE TABLE "checkbook_requests" (
    "id" SERIAL NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "account_number" TEXT NOT NULL,
    "number_of_checkbooks" INTEGER NOT NULL DEFAULT 1,
    "collection_point" TEXT NOT NULL,
    "status" "CheckbookRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "ready_at" TIMESTAMP(3),
    "collected_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "notes" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkbook_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checkbook_requests_mobile_user_id_idx" ON "checkbook_requests"("mobile_user_id");

-- CreateIndex
CREATE INDEX "checkbook_requests_account_number_idx" ON "checkbook_requests"("account_number");

-- CreateIndex
CREATE INDEX "checkbook_requests_status_idx" ON "checkbook_requests"("status");

-- CreateIndex
CREATE INDEX "checkbook_requests_requested_at_idx" ON "checkbook_requests"("requested_at");

-- AddForeignKey
ALTER TABLE "checkbook_requests" ADD CONSTRAINT "checkbook_requests_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkbook_requests" ADD CONSTRAINT "checkbook_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "admin_web_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
