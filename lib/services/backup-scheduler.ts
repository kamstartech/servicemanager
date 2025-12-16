import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/db/prisma";
import { backupService } from "@/lib/services/backup";

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const year = get("year") ?? "0000";
  const month = get("month") ?? "01";
  const day = get("day") ?? "01";
  const hour = get("hour") ?? "00";
  const minute = get("minute") ?? "00";

  return {
    date: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

class BackupScheduler {
  private task: ScheduledTask | null = null;
  private isChecking = false;

  init() {
    if (this.task) {
      console.log("BackupScheduler already initialized");
      return;
    }

    console.log("Initializing BackupScheduler...");

    this.task = cron.schedule("* * * * *", async () => {
      await this.checkAndRunBackup();
    });
  }

  private async checkAndRunBackup() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const schedule = await prisma.backupSchedule.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: {},
      });
      if (!schedule || !schedule.enabled) {
        return;
      }

      const now = new Date();

      let zoned;
      try {
        zoned = getZonedParts(now, schedule.timeZone);
      } catch {
        zoned = getZonedParts(now, "UTC");
      }

      const [targetHour, targetMinute] = schedule.time.split(":");

      const dueNow = zoned.hour === targetHour && zoned.minute === targetMinute;
      if (!dueNow) {
        return;
      }

      if (schedule.lastRunDate === zoned.date) {
        return;
      }

      const claimed = await prisma.backupSchedule.updateMany({
        where: {
          id: 1,
          enabled: true,
          isRunning: false,
          OR: [{ lastRunDate: null }, { lastRunDate: { not: zoned.date } }],
        },
        data: {
          isRunning: true,
        },
      });

      if (claimed.count !== 1) {
        return;
      }

      try {
        console.log(`🕒 Running scheduled backup (${schedule.timeZone} ${schedule.time})...`);
        const filename = await backupService.createBackup();
        console.log(`✅ Scheduled backup created: ${filename}`);

        await prisma.backupSchedule.update({
          where: { id: 1 },
          data: {
            isRunning: false,
            lastRunAt: now,
            lastRunDate: zoned.date,
          },
        });
      } catch (error) {
        console.error("❌ Scheduled backup failed:", error);
        await prisma.backupSchedule
          .update({
            where: { id: 1 },
            data: {
              isRunning: false,
            },
          })
          .catch(() => {});
      }
    } finally {
      this.isChecking = false;
    }
  }
}

export const backupScheduler = new BackupScheduler();
