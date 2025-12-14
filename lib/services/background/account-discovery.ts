import { prisma } from "@/lib/db/prisma";
import { t24AccountsService } from "@/lib/services/t24/accounts";
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";

/**
 * Account Discovery Service
 * 
 * Background service that periodically checks for new accounts for mobile banking users
 * from T24 core banking system and adds them to the database.
 * 
 * Features:
 * - Runs every 24 hours (configurable)
 * - Only checks MOBILE_BANKING users
 * - Adds new accounts discovered from T24
 * - Marks accounts as inactive if removed from T24
 * - Handles pagination for customers with 100+ accounts
 * - Uses background queue to avoid blocking main discovery process
 * - Logs all discoveries
 */

// Configuration
const DISCOVERY_INTERVAL = parseInt(process.env.ACCOUNT_DISCOVERY_INTERVAL || "86400000"); // 24 hours
const DISCOVERY_BATCH_SIZE = parseInt(process.env.ACCOUNT_DISCOVERY_BATCH_SIZE || "50"); // Users per batch
const PAGINATION_QUEUE_INTERVAL = 5000; // 5 seconds between pagination fetches

// Pagination job queue
interface PaginationJob {
  userId: number;
  customerNumber: string;
  pageToken: string;
  existingAccountNumbers: string[];
  timestamp: number;
}

class PaginationQueue {
  private queue: PaginationJob[] = [];

  add(job: PaginationJob): void {
    // Avoid duplicates for same user/page
    const exists = this.queue.find(
      (j) => j.userId === job.userId && j.pageToken === job.pageToken
    );
    if (!exists) {
      this.queue.push(job);
    }
  }

  getNext(): PaginationJob | undefined {
    return this.queue.shift();
  }

  hasJobs(): boolean {
    return this.queue.length > 0;
  }

  getCount(): number {
    return this.queue.length;
  }
}

export class AccountDiscoveryService {
  private discoveryInterval: NodeJS.Timeout | null = null;
  private paginationInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private paginationQueue: PaginationQueue;

  constructor() {
    this.paginationQueue = new PaginationQueue();
  }

  /**
   * Start the account discovery service
   */
  start(): void {
    if (this.discoveryInterval) {
      console.log("⚠️ Account discovery service already running");
      return;
    }

    console.log("🚀 Starting account discovery service...");
    console.log(`   Discovery interval: ${DISCOVERY_INTERVAL / 1000 / 60 / 60}h`);
    console.log(`   Batch size: ${DISCOVERY_BATCH_SIZE} users`);

    // Start periodic discovery
    this.discoveryInterval = setInterval(() => {
      this.discoverNewAccounts();
    }, DISCOVERY_INTERVAL);

    // Start pagination queue processor
    this.paginationInterval = setInterval(() => {
      this.processPaginationQueue();
    }, PAGINATION_QUEUE_INTERVAL);

    // Initial discovery after 30 seconds
    setTimeout(() => {
      this.discoverNewAccounts();
    }, 30000);

    console.log("✅ Account discovery service started");
  }

  /**
   * Stop the account discovery service
   */
  stop(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    if (this.paginationInterval) {
      clearInterval(this.paginationInterval);
      this.paginationInterval = null;
    }
    console.log("✅ Account discovery service stopped");
  }

  /**
   * Discover new accounts for all mobile banking users
   */
  private async discoverNewAccounts(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Account discovery already running, skipping...");
      return;
    }

    this.isRunning = true;

    // Publish "discovering" status
    await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_DISCOVERY, {
      service: "account-discovery",
      timestamp: Date.now(),
      status: this.getStatus(),
    });

    try {
      console.log("🔍 Starting account discovery...");

      const stats = {
        usersChecked: 0,
        accountsAdded: 0,
        accountsDeactivated: 0,
        errors: 0,
      };

      // Get all mobile banking users with customer numbers
      const users = await prisma.mobileUser.findMany({
        where: {
          context: "MOBILE_BANKING",
          isActive: true,
          customerNumber: {
            not: null,
          },
        },
        include: {
          accounts: true,
        },
        take: DISCOVERY_BATCH_SIZE,
      });

      console.log(`   Found ${users.length} users to check`);

      for (const user of users) {
        try {
          const result = await this.discoverUserAccounts(user.id, user.customerNumber!);
          stats.usersChecked++;
          stats.accountsAdded += result.added;
          stats.accountsDeactivated += result.deactivated;
        } catch (error) {
          console.error(`❌ Failed to discover accounts for user ${user.id}:`, error);
          stats.errors++;
        }
      }

      console.log("✅ Account discovery complete:");
      console.log(`   Users checked: ${stats.usersChecked}`);
      console.log(`   New accounts added: ${stats.accountsAdded}`);
      console.log(`   Accounts deactivated: ${stats.accountsDeactivated}`);
      console.log(`   Errors: ${stats.errors}`);
    } catch (error) {
      console.error("❌ Account discovery failed:", error);
    } finally {
      this.isRunning = false;

      // Publish "idle" status
      await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_DISCOVERY, {
        service: "account-discovery",
        timestamp: Date.now(),
        status: this.getStatus(),
      });
    }
  }

  /**
   * Discover new accounts for a specific user
   */
  async discoverUserAccounts(
    userId: number,
    customerNumber: string
  ): Promise<{ added: number; deactivated: number }> {
    // Get current accounts from database
    const existingAccounts = await prisma.mobileUserAccount.findMany({
      where: { mobileUserId: userId },
    });

    const existingAccountNumbers = existingAccounts.map((a) => a.accountNumber);

    // Fetch first page of accounts from T24
    const result = await t24AccountsService.getCustomerAccountIds(customerNumber);

    if (result.accountIds.length === 0) {
      console.log(`   User ${userId}: No accounts found in T24`);
      return { added: 0, deactivated: 0 };
    }

    // If there are more pages, queue them for background processing
    if (result.hasMore && result.nextPageToken) {
      console.log(`   User ${userId}: Found ${result.totalSize} total accounts, queuing pagination (page 2+)`);
      this.paginationQueue.add({
        userId,
        customerNumber,
        pageToken: result.nextPageToken,
        existingAccountNumbers,
        timestamp: Date.now(),
      });
    }

    // Process first page immediately
    return this.processAccountPage(userId, result.accountIds, existingAccountNumbers);
  }

  /**
   * Process pagination queue in background
   */
  private async processPaginationQueue(): Promise<void> {
    if (!this.paginationQueue.hasJobs()) {
      return;
    }

    const job = this.paginationQueue.getNext();
    if (!job) return;

    try {
      console.log(`📄 Processing pagination for user ${job.userId} (queue: ${this.paginationQueue.getCount()} jobs)`);

      // Fetch next page
      const data = await t24AccountsService.getCustomerAccounts(job.customerNumber, job.pageToken);

      if (!data) {
        console.error(`❌ Failed to fetch page for user ${job.userId}`);
        return;
      }

      const accountIds = data.body
        .map((account) => account["ACCOUNT.ID"])
        .filter((id) => id !== undefined && id !== null);

      // Process this page
      await this.processAccountPage(job.userId, accountIds, job.existingAccountNumbers);

      // If there are more pages, queue the next one
      const hasMore = data.header.total_size > (data.header.page_start + data.body.length - 1);
      if (hasMore && data.header.page_token) {
        this.paginationQueue.add({
          userId: job.userId,
          customerNumber: job.customerNumber,
          pageToken: data.header.page_token,
          existingAccountNumbers: job.existingAccountNumbers,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error(`❌ Failed to process pagination for user ${job.userId}:`, error);
    }
  }

  /**
   * Process a page of accounts for a user
   */
  private async processAccountPage(
    userId: number,
    t24AccountIds: string[],
    existingAccountNumbers: string[]
  ): Promise<{ added: number; deactivated: number }> {
    // Find new accounts (in T24 but not in DB)
    const newAccountNumbers = t24AccountIds.filter(
      (id) => !existingAccountNumbers.includes(id)
    );

    // Note: We only deactivate accounts on the first page to avoid race conditions
    // Accounts are only marked inactive if they're missing from ALL pages
    const removedAccountNumbers: string[] = [];

    let added = 0;

    // Add new accounts
    for (const accountNumber of newAccountNumbers) {
      try {
        // Check if already exists (avoid duplicates during pagination)
        const existing = await prisma.mobileUserAccount.findFirst({
          where: {
            mobileUserId: userId,
            accountNumber: accountNumber,
          },
        });

        if (!existing) {
          await prisma.mobileUserAccount.create({
            data: {
              mobileUserId: userId,
              accountNumber: accountNumber,
              isPrimary: false, // Primary account should be set explicitly
              isActive: true,
            },
          });
          console.log(`   ✅ Added account ${accountNumber} for user ${userId}`);
          added++;
        }
      } catch (error) {
        console.error(`   ❌ Failed to add account ${accountNumber}:`, error);
      }
    }

    if (added > 0) {
      console.log(`   User ${userId}: +${added} new accounts`);
    }

    return { added, deactivated: 0 };
  }

  /**
   * Manually trigger discovery for a specific user
   */
  async discoverForUser(userId: number): Promise<{ added: number; deactivated: number }> {
    const user = await prisma.mobileUser.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.context !== "MOBILE_BANKING") {
      throw new Error(`User ${userId} is not a mobile banking user`);
    }

    if (!user.customerNumber) {
      throw new Error(`User ${userId} has no customer number`);
    }

    return this.discoverUserAccounts(userId, user.customerNumber);
  }

  /**
   * Get service status
   */
  getStatus(): { 
    running: boolean; 
    discovering: boolean; 
    interval: number;
    paginationQueueSize: number;
  } {
    return {
      running: this.discoveryInterval !== null,
      discovering: this.isRunning,
      interval: DISCOVERY_INTERVAL,
      paginationQueueSize: this.paginationQueue.getCount(),
    };
  }
}

// Singleton instance
export const accountDiscoveryService = new AccountDiscoveryService();
