import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";

function requireAdminContext(ctx: GraphQLContext) {
  const context = ctx.auth?.context;
  if (context !== "ADMIN" && context !== "ADMIN_WEB") {
    throw new Error("Forbidden");
  }
}

type BackupScheduleRecord = {
  id: number;
  enabled: boolean;
  time: string;
  timeZone: string;
  isRunning: boolean;
  lastRunAt: Date | null;
  lastRunDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toGraphQL(schedule: BackupScheduleRecord) {
  return {
    id: String(schedule.id),
    enabled: schedule.enabled,
    time: schedule.time,
    timeZone: schedule.timeZone,
    isRunning: schedule.isRunning,
    lastRunAt: schedule.lastRunAt ? schedule.lastRunAt.toISOString() : null,
    lastRunDate: schedule.lastRunDate,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

async function getOrCreateSchedule(): Promise<BackupScheduleRecord> {
  return prisma.backupSchedule.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export const backupScheduleResolvers = {
  Query: {
    async backupSchedule(_parent: unknown, _args: unknown, ctx: GraphQLContext) {
      requireAdminContext(ctx);
      const schedule = await getOrCreateSchedule();
      return toGraphQL(schedule);
    },
  },

  Mutation: {
    async updateBackupSchedule(
      _parent: unknown,
      args: { input: { enabled?: boolean; time?: string; timeZone?: string } },
      ctx: GraphQLContext
    ) {
      requireAdminContext(ctx);

      const schedule = await getOrCreateSchedule();

      const time = args.input.time;
      if (time !== undefined) {
        if (!/^\d{2}:\d{2}$/.test(time)) {
          throw new Error("Invalid time format. Expected HH:MM");
        }
        const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
          throw new Error("Invalid time value");
        }
      }

      const updated = await prisma.backupSchedule.update({
        where: { id: schedule.id },
        data: {
          enabled: args.input.enabled,
          time: args.input.time,
          timeZone: args.input.timeZone,
        },
      });

      return toGraphQL(updated);
    },
  },
};
