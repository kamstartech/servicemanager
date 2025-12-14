-- CreateTable
CREATE TABLE "admin_web_passkeys" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "device_name" TEXT,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "backup_eligible" BOOLEAN NOT NULL DEFAULT false,
    "backup_state" BOOLEAN NOT NULL DEFAULT false,
    "attestation_format" TEXT,
    "aaguid" TEXT,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_web_passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_web_passkeys_credential_id_key" ON "admin_web_passkeys"("credential_id");

-- CreateIndex
CREATE INDEX "admin_web_passkeys_user_id_idx" ON "admin_web_passkeys"("user_id");

-- AddForeignKey
ALTER TABLE "admin_web_passkeys" ADD CONSTRAINT "admin_web_passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_web_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
