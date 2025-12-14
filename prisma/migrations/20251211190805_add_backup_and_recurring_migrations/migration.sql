-- AlterTable
ALTER TABLE "fdh_migrations" ADD COLUMN     "cron_expression" TEXT,
ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "next_run_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "fdh_backups" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fdh_backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fdh_backups_filename_key" ON "fdh_backups"("filename");
