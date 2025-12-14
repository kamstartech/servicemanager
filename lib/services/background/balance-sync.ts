import { prisma } from "@/lib/db/prisma";
import { t24BalanceService } from "@/lib/services/t24/balance";
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";

/**
 * Account Balance Sync Service
 * 
 * Background service that periodically syncs mobile user account balances
 * from T24 core banking system.
 * 
 * Based on the Elixir UserBalanceSyncProcessor pattern:
 * - Runs every 5 minutes (configurable)
 * - Priority queue for auth flows (2 second timeout)
 * - Background queue for regular syncs
 * - Updates both MobileUser and MobileUserAccount tables
 */

// Configuration
const SYNC_INTERVAL = parseInt(process.env.BALANCE_SYNC_INTERVAL || "300000"); // 5 minutes
const AUTH_SYNC_TIMEOUT = 2000; // 2 seconds
const QUEUE_PROCESS_INTERVAL = 1000; // 1 second

// In-memory queues (could be moved to Redis for production)
interface SyncRequest {
  userId: number;
  timestamp: number;
  priority: "high" | "normal";
}

class BalanceSyncQueue {
  private priorityQueue: SyncRequest[] = [];
  private backgroundQueue: SyncRequest[] = [];

  addToPriority(userId: number): void {
    this.priorityQueue.push({
      userId,
      timestamp: Date.now(),
      priority: "high",
    });
  }

  addToBackground(userId: number): void {
    // Avoid duplicates
    if (!this.backgroundQueue.find((r) => r.userId === userId)) {
      this.backgroundQueue.push({
        userId,
        timestamp: Date.now(),
        priority: "normal",
      });
    }
  }

  getNextPriority(): SyncRequest | undefined {
    return this.priorityQueue.shift();
  }

  getNextBackground(): SyncRequest | undefined {
    return this.backgroundQueue.shift();
  }

  hasPriority(): boolean {
    return this.priorityQueue.length > 0;
  }

  hasBackground(): boolean {
    return this.backgroundQueue.length > 0;
  }

  getPriorityCount(): number {
    return this.priorityQueue.length;
  }

  getBackgroundCount(): number {
    return this.backgroundQueue.length;
  }
}

export class AccountBalanceSyncService {
  private syncQueue: BalanceSyncQueue;
  private syncInterval: NodeJS.Timeout | null = null;
  private queueInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    this.syncQueue = new BalanceSyncQueue();
  }

  /**
   * Start the background sync service
   */
  start(): void {
    if (this.syncInterval) {
      console.log("⚠️ Balance sync service already running");
      return;
    }

    console.log("🚀 Starting account balance sync service...");
    console.log(`   Sync interval: ${SYNC_INTERVAL / 1000}s`);
    console.log(`   Auth timeout: ${AUTH_SYNC_TIMEOUT}ms`);

    // Start periodic sync of pending users
    this.syncInterval = setInterval(() => {
      this.syncPendingUsers();
    }, SYNC_INTERVAL);

    // Start queue processing
    this.queueInterval = setInterval(() => {
      this.processQueues();
    }, QUEUE_PROCESS_INTERVAL);

    // Initial sync on startup (after 5 seconds)
    setTimeout(() => {
      this.syncPendingUsers();
    }, 5000);

    console.log("✅ Balance sync service started");
  }

  /**
   * Stop the background sync service
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
    console.log("✅ Balance sync service stopped");
  }

  /**
   * Sync balance with timeout for authentication flow
   * Returns balance quickly for auth, or continues in background
   */
  async syncWithTimeout(userId: number): Promise<{ ok: boolean; balance?: string; timeout?: boolean }> {
    return new Promise((resolve) => {
      // Add to priority queue
      this.syncQueue.addToPriority(userId);

      // Set timeout
      const timeoutId = setTimeout(() => {
        // Move to background queue and return timeout
        this.syncQueue.addToBackground(userId);
        resolve({ ok: false, timeout: true });
      }, AUTH_SYNC_TIMEOUT);

      // Try to sync immediately
      this.syncUserBalance(userId)
        .then((balance) => {
          clearTimeout(timeoutId);
          resolve({ ok: true, balance });
        })
        .catch(() => {
          clearTimeout(timeoutId);
          this.syncQueue.addToBackground(userId);
          resolve({ ok: false, timeout: true });
        });
    });
  }

  /**
   * Add user to background sync queue
   */
  queueSync(userId: number): void {
    this.syncQueue.addToBackground(userId);
  }

  /**
   * Process priority and background queues
   */
  private async processQueues(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Process priority queue first
      while (this.syncQueue.hasPriority()) {
        const request = this.syncQueue.getNextPriority();
        if (request) {
          await this.syncUserBalance(request.userId);
        }
      }

      // Process background queue (one at a time to avoid overwhelming T24)
      if (this.syncQueue.hasBackground()) {
        const request = this.syncQueue.getNextBackground();
        if (request) {
          await this.syncUserBalance(request.userId);
        }
      }

      // Publish status update after processing queues
      await servicePubSub.publishStatus(ServiceChannel.BALANCE_SYNC, {
        service: "balance-sync",
        timestamp: Date.now(),
        status: this.getStatus(),
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync all pending users (periodic job)
   */
  private async syncPendingUsers(): Promise<void> {
    try {
      console.log("🔄 Starting periodic balance sync...");

      // Sync only MOBILE_BANKING users (not WALLET users)
      const users = await prisma.mobileUser.findMany({
        where: {
          isActive: true,
          context: "MOBILE_BANKING", // Only sync mobile banking users
        },
        include: {
          accounts: true, // Include their accounts from MobileUserAccount table
        },
        take: 100, // Limit to avoid overwhelming T24
      });

      console.log(`   Found ${users.length} mobile banking users to sync`);

      let accountCount = 0;
      for (const user of users) {
        if (user.accounts.length > 0) {
          this.syncQueue.addToBackground(user.id);
          accountCount += user.accounts.length;
        }
      }

      console.log(`   Queued ${accountCount} accounts for sync`);
      console.log("✅ Periodic sync queued");
    } catch (error) {
      console.error("❌ Error in periodic sync:", error);
    }
  }

  /**
   * Sync a single user's balance
   */
  private async syncUserBalance(userId: number): Promise<string | null> {
    try {
      const user = await prisma.mobileUser.findUnique({
        where: { id: userId },
        include: {
          accounts: true, // Get accounts from MobileUserAccount table
        },
      });

      if (!user) {
        console.error(`User ${userId} not found`);
        return null;
      }

      // Only sync MOBILE_BANKING users
      if (user.context !== "MOBILE_BANKING") {
        console.log(`User ${userId} is ${user.context}, skipping sync`);
        return null;
      }

      // Get primary account or first account
      const primaryAccount = user.accounts.find((a) => a.isPrimary) || user.accounts[0];

      if (!primaryAccount) {
        console.log(`No accounts found for user ${userId}`);
        return null;
      }

      // Fetch balance from T24 using the account number
      const balanceResult = await t24BalanceService.getAccountBalanceExtended(
        primaryAccount.accountNumber
      );

      if (!balanceResult.ok) {
        console.error(`❌ T24 fetch failed: ${balanceResult.error}`);
        return null;
      }

      // Use available balance as primary balance
      const balance = balanceResult.availableBalance || "0";

      // Update account balance in MobileUserAccount table with all balance types
      await prisma.mobileUserAccount.update({
        where: { id: primaryAccount.id },
        data: {
          balance: balance, // Primary balance (same as available)
          workingBalance: balanceResult.workingBalance,
          availableBalance: balanceResult.availableBalance,
          clearedBalance: balanceResult.clearedBalance,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Synced balance for user ${userId} (${user.username || user.phoneNumber}): ${balance}`);
      return balance;
    } catch (error) {
      console.error(`❌ Failed to sync user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Fetch balance from T24 core banking system
   */
  private async fetchBalanceFromT24(accountNumber: string): Promise<string | null> {
    const result = await t24BalanceService.getAccountBalanceExtended(accountNumber);
    return result.ok ? result.availableBalance || null : null;
  }

  /**
   * Get queue status for monitoring
   */
  getStatus(): { priority: number; background: number; processing: boolean; interval: number } {
    return {
      priority: this.syncQueue.getPriorityCount(),
      background: this.syncQueue.getBackgroundCount(),
      processing: this.isProcessing,
      interval: SYNC_INTERVAL,
    };
  }
}

// Singleton instance
export const balanceSyncService = new AccountBalanceSyncService();
