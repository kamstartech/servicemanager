import { prisma } from "@/lib/db/prisma";
import parser from "cron-parser";

export const migrationSchedulingResolvers = {
    Mutation: {
        async scheduleMigration(_parent: unknown, args: { id: string; cron: string }) {
            const { id, cron } = args;

            // Validate cron expression
            try {
                parser.parse(cron);
            } catch (err) {
                throw new Error("Invalid cron expression");
            }

            // Calculate next run immediately to verify and set initial schedule
            const interval = parser.parse(cron);
            const nextRun = interval.next().toDate();

            // @ts-ignore
            const migration = await (prisma as any).migration.update({
                where: { id: parseInt(id) },
                data: {
                    isRecurring: true,
                    cronExpression: cron,
                    nextRunAt: nextRun
                }
            });

            return {
                ...migration,
                createdAt: migration.createdAt.toISOString(),
                updatedAt: migration.updatedAt.toISOString(),
                lastRunAt: migration.lastRunAt?.toISOString(),
                nextRunAt: migration.nextRunAt?.toISOString()
            };
        },

        async unscheduleMigration(_parent: unknown, args: { id: string }) {
            // @ts-ignore
            const migration = await (prisma as any).migration.update({
                where: { id: parseInt(args.id) },
                data: {
                    isRecurring: false,
                    cronExpression: null,
                    nextRunAt: null
                }
            });

            return {
                ...migration,
                createdAt: migration.createdAt.toISOString(),
                updatedAt: migration.updatedAt.toISOString(),
                lastRunAt: migration.lastRunAt?.toISOString(),
                nextRunAt: migration.nextRunAt?.toISOString()
            };
        }
    }
};
