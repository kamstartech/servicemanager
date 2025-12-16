-- CreateTable
CREATE TABLE "backup_schedule" (
    "id" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "time" VARCHAR(5) NOT NULL DEFAULT '02:00',
    "time_zone" TEXT NOT NULL DEFAULT 'UTC',
    "is_running" BOOLEAN NOT NULL DEFAULT false,
    "last_run_at" TIMESTAMP(3),
    "last_run_date" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedule_pkey" PRIMARY KEY ("id")
);
