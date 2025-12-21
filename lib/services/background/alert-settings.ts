import { prisma } from "@/lib/db/prisma";
import { accountEvents, AccountEvent } from "@/lib/events/account-events";

/**
 * Alert Settings Service
 * 
 * Background service that ensures all accounts have alert settings.
 * Creates default alert settings for accounts that don't have them.
 * 
 * Features:
 * - Runs every 6 hours (configurable)
 * - Checks all active mobile banking accounts
 * - Creates default alert settings for accounts without them
 * - Skips accounts that already have settings
 * - Logs all operations
 */

// Configuration  
// Event-based creation with daily fallback for cleanup
const EVENT_BASED_ENABLED = process.env.EVENT_BASED_ENABLED !== 'false'; // Default: enabled
const ALERT_SETTINGS_INTERVAL = EVENT_BASED_ENABLED
  ? parseInt(process.env.ALERT_SETTINGS_FALLBACK_INTERVAL || "86400000") // 24 hours fallback
  : parseInt(process.env.ALERT_SETTINGS_INTERVAL || "21600000"); // 6 hours (legacy)
const ALERT_SETTINGS_BATCH_SIZE = parseInt(process.env.ALERT_SETTINGS_BATCH_SIZE || "100"); // Accounts per batch

export class AlertSettingsService {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the alert settings service
   */
  start(): void {
    if (this.interval) {
      console.log("⚠️ Alert settings service already running");
      return;
    }

    console.log("🚀 Starting alert settings service...");
    console.log(`   Event-based: ${EVENT_BASED_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Check interval: ${ALERT_SETTINGS_INTERVAL / 1000 / 60 / 60}h ${EVENT_BASED_ENABLED ? '(fallback only)' : ''}`);
    console.log(`   Batch size: ${ALERT_SETTINGS_BATCH_SIZE} accounts`);

    // Register event listeners for event-based creation
    if (EVENT_BASED_ENABLED) {
      this.registerEventListeners();
    }

    // Start periodic check (either main or fallback based on EVENT_BASED_ENABLED)
    this.interval = setInterval(() => {
      this.createMissingAlertSettings();
    }, ALERT_SETTINGS_INTERVAL);

    // Initial run after 1 minute (let other services start first)
    setTimeout(() => {
      this.createMissingAlertSettings();
    }, 60000);

    console.log("✅ Alert settings service started");
  }

  /**
   * Register event listeners for event-based alert settings creation
   */
  private registerEventListeners(): void {
    console.log("📡 Registering alert settings event listeners...");

    // Account linked - create alert settings immediately
    accountEvents.on(AccountEvent.ACCOUNT_LINKED, async ({ userId, accountNumber }) => {
      if (userId && accountNumber) {
        console.log(`🔔 Event: Account linked - creating alert settings for ${accountNumber}`);
        try {
          await this.createAlertSettingsForAccount(userId, accountNumber);
        } catch (error) {
          console.error(`Failed to create alert settings for ${accountNumber}:`, error);
        }
      }
    });

    // Account discovered - create alert settings
    accountEvents.on(AccountEvent.ACCOUNT_DISCOVERED, async ({ userId, accountNumber }) => {
      if (userId && accountNumber) {
        console.log(`🔔 Event: Account discovered - creating alert settings for ${accountNumber}`);
        try {
          await this.createAlertSettingsForAccount(userId, accountNumber);
        } catch (error) {
          console.error(`Failed to create alert settings for ${accountNumber}:`, error);
        }
      }
    });

    console.log("✅ Event listeners registered");
  }

  /**
   * Stop the alert settings service
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("✅ Alert settings service stopped");
  }

  /**
   * Create default alert settings for accounts that don't have them
   */
  private async createMissingAlertSettings(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Alert settings creation already running, skipping...");
      return;
    }

    this.isRunning = true;

    try {
      console.log("🔔 Starting alert settings creation...");

      const stats = {
        accountsChecked: 0,
        settingsCreated: 0,
        errors: 0,
      };

      // Get all active mobile banking accounts
      const accounts = await prisma.mobileUserAccount.findMany({
        where: {
          isActive: true,
          mobileUser: {
            context: "MOBILE_BANKING",
            isActive: true,
          },
        },
        select: {
          accountNumber: true,
          mobileUserId: true,
        },
        take: ALERT_SETTINGS_BATCH_SIZE,
      });

      console.log(`   Found ${accounts.length} active accounts to check`);

      // Process accounts in batches
      for (const account of accounts) {
        stats.accountsChecked++;

        try {
          // Check if alert settings already exist
          const existingSettings = await prisma.accountAlertSettings.findUnique({
            where: {
              mobileUserId_accountNumber: {
                mobileUserId: account.mobileUserId,
                accountNumber: account.accountNumber,
              },
            },
          });

          // Skip if settings already exist
          if (existingSettings) {
            continue;
          }

          // Create default alert settings
          await prisma.accountAlertSettings.create({
            data: {
              mobileUserId: account.mobileUserId,
              accountNumber: account.accountNumber,
              // All defaults are set in Prisma schema:
              // - lowBalanceEnabled: true
              // - largeTransactionEnabled: true
              // - paymentReminderInterval: ONE_DAY
              // - loginAlertMode: NEW_DEVICE
              // - etc.
            },
          });

          stats.settingsCreated++;
          console.log(`   ✅ Created alert settings for account ${account.accountNumber}`);

        } catch (error) {
          stats.errors++;
          console.error(`   ❌ Error creating alert settings for ${account.accountNumber}:`, error);
        }
      }

      console.log("✅ Alert settings creation completed");
      console.log(`   Accounts checked: ${stats.accountsChecked}`);
      console.log(`   Settings created: ${stats.settingsCreated}`);
      console.log(`   Errors: ${stats.errors}`);

    } catch (error) {
      console.error("❌ Error in alert settings service:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get the current status of the service
   */
  getStatus(): { running: boolean; interval: number } {
    return {
      running: this.isRunning,
      interval: ALERT_SETTINGS_INTERVAL,
    };
  }

  /**
   * Create alert settings for a single account (for event-based creation)
   */
  private async createAlertSettingsForAccount(mobileUserId: number, accountNumber: string): Promise<void> {
    try {
      // Check if settings already exist
      const existingSettings = await prisma.accountAlertSettings.findUnique({
        where: {
          mobileUserId_accountNumber: {
            mobileUserId,
            accountNumber,
          },
        },
      });

      // Skip if settings already exist
      if (existingSettings) {
        return;
      }

      // Create default alert settings
      await prisma.accountAlertSettings.create({
        data: {
          mobileUserId,
          accountNumber,
          // All defaults are set in Prisma schema
        },
      });

      console.log(`   ✅ Created alert settings for account ${accountNumber}`);
    } catch (error) {
      console.error(`   ❌ Error creating alert settings for ${accountNumber}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger alert settings creation (for testing/admin)
   */
  async triggerCreation(): Promise<void> {
    console.log("🔔 Manually triggering alert settings creation...");
    await this.createMissingAlertSettings();
  }
}

export const alertSettingsService = new AlertSettingsService();
