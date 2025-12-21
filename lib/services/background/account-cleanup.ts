import { prisma } from "@/lib/db/prisma";
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";
import { logsPubSub } from "@/lib/redis/logs-pubsub";

/**
 * Account Cleanup Service
 * 
 * Background service that cleans up orphan and duplicate accounts.
 * 
 * Features:
 * - Runs every 7 days (configurable)
 * - Removes duplicate accounts (same user + account number + context)
 * - Keeps the oldest account when duplicates are found
 * - Logs all cleanup operations
 */

// Configuration
const CLEANUP_INTERVAL = parseInt(process.env.ACCOUNT_CLEANUP_INTERVAL || "604800000"); // 7 days
const CLEANUP_BATCH_SIZE = parseInt(process.env.ACCOUNT_CLEANUP_BATCH_SIZE || "100"); // Accounts per batch

export class AccountCleanupService {
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start the account cleanup service
     */
    start(): void {
        if (this.cleanupInterval) {
            console.log("⚠️ Account cleanup service already running");
            void logsPubSub.publishLog({
                service: "account-cleanup",
                level: "warn",
                message: "Start called but service already running",
                timestamp: Date.now(),
            });
            return;
        }

        console.log("🚀 Starting account cleanup service...");
        console.log(`   Cleanup interval: ${CLEANUP_INTERVAL / 1000 / 60 / 60 / 24} days`);
        console.log(`   Batch size: ${CLEANUP_BATCH_SIZE} accounts`);

        void logsPubSub.publishLog({
            service: "account-cleanup",
            level: "info",
            message: `Service starting (interval=${CLEANUP_INTERVAL}ms, batchSize=${CLEANUP_BATCH_SIZE})`,
            timestamp: Date.now(),
        });

        // Start periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.cleanupOrphanAccounts();
        }, CLEANUP_INTERVAL);

        // Initial cleanup after 5 minutes (give system time to start)
        setTimeout(() => {
            this.cleanupOrphanAccounts();
        }, 300000);

        console.log("✅ Account cleanup service started");
        void logsPubSub.publishLog({
            service: "account-cleanup",
            level: "info",
            message: "Service started",
            timestamp: Date.now(),
        });
    }

    /**
     * Stop the account cleanup service
     */
    stop(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        console.log("✅ Account cleanup service stopped");
        void logsPubSub.publishLog({
            service: "account-cleanup",
            level: "info",
            message: "Service stopped",
            timestamp: Date.now(),
        });
    }

    /**
     * Clean up orphan and duplicate accounts
     */
    private async cleanupOrphanAccounts(): Promise<void> {
        if (this.isRunning) {
            console.log("⚠️ Account cleanup already running, skipping...");
            void logsPubSub.publishLog({
                service: "account-cleanup",
                level: "warn",
                message: "Cleanup already running, skipping",
                timestamp: Date.now(),
            });
            return;
        }

        this.isRunning = true;

        // Publish "cleaning" status
        await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_CLEANUP, {
            service: "account-cleanup",
            timestamp: Date.now(),
            status: this.getStatus(),
        });

        try {
            console.log("🧹 Starting account cleanup...");
            void logsPubSub.publishLog({
                service: "account-cleanup",
                level: "info",
                message: "Cleanup run started",
                timestamp: Date.now(),
            });

            const stats = {
                duplicatesChecked: 0,
                duplicatesRemoved: 0,
                errors: 0,
            };

            // Find duplicate accounts (same mobileUserId + accountNumber + context)
            // Group by these fields and find where count > 1
            const duplicates = await prisma.$queryRaw<
                Array<{ mobile_user_id: number; account_number: string; context: string; count: bigint }>
            >`
        SELECT mobile_user_id, account_number, context, COUNT(*) as count
        FROM fdh_mobile_user_accounts
        GROUP BY mobile_user_id, account_number, context
        HAVING COUNT(*) > 1
        LIMIT ${CLEANUP_BATCH_SIZE}
      `;

            console.log(`   Found ${duplicates.length} sets of duplicate accounts`);
            void logsPubSub.publishLog({
                service: "account-cleanup",
                level: "info",
                message: `Duplicate sets found: ${duplicates.length}`,
                timestamp: Date.now(),
            });

            for (const duplicate of duplicates) {
                try {
                    const result = await this.cleanupDuplicateSet(
                        duplicate.mobile_user_id,
                        duplicate.account_number,
                        duplicate.context
                    );
                    stats.duplicatesChecked++;
                    stats.duplicatesRemoved += result.removed;
                } catch (error) {
                    console.error(
                        `❌ Failed to cleanup duplicates for user ${duplicate.mobile_user_id}, account ${duplicate.account_number}:`,
                        error
                    );
                    void logsPubSub.publishLog({
                        service: "account-cleanup",
                        level: "error",
                        message: `Failed to cleanup duplicates: user=${duplicate.mobile_user_id}, account=${duplicate.account_number}: ${error instanceof Error ? error.message : "Unknown error"}`,
                        timestamp: Date.now(),
                    });
                    stats.errors++;
                }
            }

            console.log("✅ Account cleanup complete:");
            console.log(`   Duplicate sets checked: ${stats.duplicatesChecked}`);
            console.log(`   Duplicate accounts removed: ${stats.duplicatesRemoved}`);
            console.log(`   Errors: ${stats.errors}`);
            void logsPubSub.publishLog({
                service: "account-cleanup",
                level: stats.errors > 0 ? "warn" : "info",
                message: `Cleanup complete (checked=${stats.duplicatesChecked}, removed=${stats.duplicatesRemoved}, errors=${stats.errors})`,
                timestamp: Date.now(),
            });
        } catch (error) {
            console.error("❌ Account cleanup failed:", error);
            void logsPubSub.publishLog({
                service: "account-cleanup",
                level: "error",
                message: `Cleanup run failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                timestamp: Date.now(),
            });
        } finally {
            this.isRunning = false;

            // Publish "idle" status
            await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_CLEANUP, {
                service: "account-cleanup",
                timestamp: Date.now(),
                status: this.getStatus(),
            });
        }
    }

    /**
     * Clean up a set of duplicate accounts
     * Keeps the oldest one, deletes the rest
     */
    private async cleanupDuplicateSet(
        mobileUserId: number,
        accountNumber: string,
        context: string
    ): Promise<{ removed: number }> {
        // Get all duplicate accounts for this combination
        const accounts = await prisma.mobileUserAccount.findMany({
            where: {
                mobileUserId,
                accountNumber,
                context: context as "MOBILE_BANKING" | "WALLET",
            },
            orderBy: {
                createdAt: "asc", // Oldest first
            },
        });

        if (accounts.length <= 1) {
            // No duplicates, skip
            return { removed: 0 };
        }

        console.log(
            `   🔍 Found ${accounts.length} duplicates for user ${mobileUserId}, account ${accountNumber}`
        );
        void logsPubSub.publishLog({
            service: "account-cleanup",
            level: "info",
            message: `Found ${accounts.length} duplicates for user ${mobileUserId}, account ${accountNumber}`,
            timestamp: Date.now(),
        });

        // Keep the first one (oldest), delete the rest
        const accountsToDelete = accounts.slice(1);
        const idsToDelete = accountsToDelete.map((a) => a.id);

        // Delete duplicates
        const deleteResult = await prisma.mobileUserAccount.deleteMany({
            where: {
                id: {
                    in: idsToDelete,
                },
            },
        });

        console.log(
            `   ✅ Removed ${deleteResult.count} duplicate(s) for user ${mobileUserId}, account ${accountNumber}`
        );
        void logsPubSub.publishLog({
            service: "account-cleanup",
            level: "info",
            message: `Removed ${deleteResult.count} duplicate(s) for user ${mobileUserId}, account ${accountNumber}`,
            timestamp: Date.now(),
        });

        return { removed: deleteResult.count };
    }

    /**
     * Manually trigger cleanup
     */
    async cleanupNow(): Promise<void> {
        await this.cleanupOrphanAccounts();
    }

    /**
     * Get service status
     */
    getStatus(): {
        running: boolean;
        cleaning: boolean;
        interval: number;
    } {
        return {
            running: this.cleanupInterval !== null,
            cleaning: this.isRunning,
            interval: CLEANUP_INTERVAL,
        };
    }
}

// Singleton instance
export const accountCleanupService = new AccountCleanupService();
