import { prisma } from "@/lib/db/prisma";

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
const ALERT_SETTINGS_INTERVAL = parseInt(process.env.ALERT_SETTINGS_INTERVAL || "21600000"); // 6 hours
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
    console.log(`   Check interval: ${ALERT_SETTINGS_INTERVAL / 1000 / 60 / 60}h`);
    console.log(`   Batch size: ${ALERT_SETTINGS_BATCH_SIZE} accounts`);

    // Start periodic check
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
   * Manually trigger alert settings creation (for testing/admin)
   */
  async triggerCreation(): Promise<void> {
    console.log("🔔 Manually triggering alert settings creation...");
    await this.createMissingAlertSettings();
  }
}

export const alertSettingsService = new AlertSettingsService();
