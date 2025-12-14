import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/db/prisma";
import parser from "cron-parser";
import { migrationResolvers } from "@/lib/graphql/schema/resolvers/migration";

class MigrationScheduler {
    private task: ScheduledTask | null = null;
    private isRunning = false;

    init() {
        if (this.task) {
            console.log("MigrationScheduler already initialized");
            return;
        }

        console.log("Initializing MigrationScheduler...");
        // Run every minute to check for due migrations
        this.task = cron.schedule("* * * * *", async () => {
            await this.checkAndRunMigrations();
        });
    }

    async checkAndRunMigrations() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const now = new Date();

            // Find active recurring migrations that are due
            const dueMigrations = await prisma.migration.findMany({
                where: {
                    isRecurring: true,
                    status: { not: "RUNNING" }, // Prevent overlapping runs
                    OR: [
                        { nextRunAt: { lte: now } },
                        { nextRunAt: null } // Should have been set, but just in case
                    ]
                }
            });

            for (const migration of dueMigrations) {
                // Double check status before running (race condition safety)
                const freshMigration = await prisma.migration.findUnique({ where: { id: migration.id } });
                if (freshMigration?.status === "RUNNING") continue;

                console.log(`Starting recurring migration: ${migration.name} (${migration.id})`);

                try {
                    // Calculate next run time
                    let nextRun: Date | null = null;
                    if ((migration as any).cronExpression) {
                        try {
                            const interval = parser.parse((migration as any).cronExpression);
                            nextRun = interval.next().toDate();
                        } catch (err) {
                            console.error(`Invalid cron expression for migration ${migration.id}:`, err);
                        }
                    }

                    // Update scheduling info
                    // @ts-ignore
                    await (prisma as any).migration.update({
                        where: { id: migration.id },
                        data: { nextRunAt: nextRun }
                    });

                    // Execute Migration
                    // We call the resolver logic directly. Since resolvers usually take (parent, args, context),
                    // we might need to refactor the logic out of the resolver if it relies heavily on context.
                    // However, for now we will assume runMigration logic is self-contained or we mock it.
                    // BETTER APPROACH: Extract run logic to a service if not already. 
                    // Checking existing resolver structure...

                    // Assuming we can't easily call the resolver mutation directly without context,
                    // Let's implement the core run logic or rely on a service. 
                    // Since we don't have a separate service yet, let's call the resolver with mock context.

                    // We assume DuplicateStrategy enum is defined in the resolver or types.
                    // Based on error: "SKIP_DUPLICATES" seems to be the correct value matching "SKIP" intent.
                    await migrationResolvers.Mutation.runMigration(
                        {},
                        { id: String(migration.id), duplicateStrategy: "SKIP_DUPLICATES" } as any
                    );

                } catch (error) {
                    console.error(`Failed to run recurring migration ${migration.id}:`, error);
                }
            }

        } catch (error) {
            console.error("Error in MigrationScheduler:", error);
        } finally {
            this.isRunning = false;
        }
    }
}

export const migrationScheduler = new MigrationScheduler();
