-- CreateTable
CREATE TABLE "fdh_device_sessions" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "mobile_user_id" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "fdh_device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fdh_device_sessions_tokenHash_key" ON "fdh_device_sessions"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "fdh_device_sessions_session_id_key" ON "fdh_device_sessions"("session_id");

-- CreateIndex
CREATE INDEX "fdh_device_sessions_device_id_idx" ON "fdh_device_sessions"("device_id");

-- CreateIndex
CREATE INDEX "fdh_device_sessions_mobile_user_id_idx" ON "fdh_device_sessions"("mobile_user_id");

-- CreateIndex
CREATE INDEX "fdh_device_sessions_tokenHash_idx" ON "fdh_device_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "fdh_device_sessions_session_id_idx" ON "fdh_device_sessions"("session_id");

-- CreateIndex
CREATE INDEX "fdh_device_sessions_is_active_idx" ON "fdh_device_sessions"("is_active");

-- AddForeignKey
ALTER TABLE "fdh_device_sessions" ADD CONSTRAINT "fdh_device_sessions_mobile_user_id_fkey" FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
