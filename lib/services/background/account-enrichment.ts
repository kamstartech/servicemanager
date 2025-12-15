import { prisma } from "@/lib/db/prisma";
import { t24AccountDetailsService } from "@/lib/services/t24/account-details";
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";
import { logsPubSub } from "@/lib/redis/logs-pubsub";

/**
 * Account Enrichment Service
 * 
 * Background service that enriches account records with detailed information from T24.
 * Fetches category, status, holder name, and other account metadata for accounts
 * that are missing this information.
 * 
 * Features:
 * - Runs every 12 hours (configurable)
 * - Only processes accounts missing categoryId or categoryName
 * - Enriches accounts with T24 account details
 * - Auto-starts with application
 */

// Configuration
const ENRICHMENT_INTERVAL = parseInt(process.env.ACCOUNT_ENRICHMENT_INTERVAL || "43200000"); // 12 hours
const ENRICHMENT_BATCH_SIZE = parseInt(process.env.ACCOUNT_ENRICHMENT_BATCH_SIZE || "20"); // Accounts per batch
const ENRICHMENT_DELAY = 2000; // 2 seconds between requests to avoid overloading T24

export class AccountEnrichmentService {
  private enrichmentInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the account enrichment service
   */
  start(): void {
    if (this.enrichmentInterval) {
      console.log("⚠️ Account enrichment service already running");
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "warn",
        message: "Start called but service already running",
        timestamp: Date.now(),
      });
      return;
    }

    console.log("🚀 Starting account enrichment service...");
    console.log(`   Enrichment interval: ${ENRICHMENT_INTERVAL / 1000 / 60 / 60}h`);
    console.log(`   Batch size: ${ENRICHMENT_BATCH_SIZE} accounts`);

    void logsPubSub.publishLog({
      service: "account-enrichment",
      level: "info",
      message: `Service starting (interval=${ENRICHMENT_INTERVAL}ms, batchSize=${ENRICHMENT_BATCH_SIZE})`,
      timestamp: Date.now(),
    });

    // Start periodic enrichment
    this.enrichmentInterval = setInterval(() => {
      this.enrichAccounts();
    }, ENRICHMENT_INTERVAL);

    // Initial enrichment after 1 minute (give system time to start)
    setTimeout(() => {
      this.enrichAccounts();
    }, 60000);

    console.log("✅ Account enrichment service started");
    void logsPubSub.publishLog({
      service: "account-enrichment",
      level: "info",
      message: "Service started",
      timestamp: Date.now(),
    });
  }

  /**
   * Stop the account enrichment service
   */
  stop(): void {
    if (this.enrichmentInterval) {
      clearInterval(this.enrichmentInterval);
      this.enrichmentInterval = null;
    }
    console.log("✅ Account enrichment service stopped");
    void logsPubSub.publishLog({
      service: "account-enrichment",
      level: "info",
      message: "Service stopped",
      timestamp: Date.now(),
    });
  }

  /**
   * Enrich accounts that are missing details
   */
  private async enrichAccounts(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Account enrichment already running, skipping...");
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "warn",
        message: "Enrichment already running, skipping",
        timestamp: Date.now(),
      });
      return;
    }

    this.isRunning = true;

    // Publish "enriching" status
    await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_ENRICHMENT, {
      service: "account-enrichment",
      timestamp: Date.now(),
      status: this.getStatus(),
    });

    try {
      console.log("🔍 Starting account enrichment...");
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "info",
        message: "Enrichment run started",
        timestamp: Date.now(),
      });

      const stats = {
        accountsChecked: 0,
        accountsEnriched: 0,
        profilesUpdated: 0,
        categoriesCreated: 0,
        errors: 0,
      };

      // Get accounts that need enrichment (missing categoryId or categoryName)
      const accountsToEnrich = await prisma.mobileUserAccount.findMany({
        where: {
          isActive: true,
          OR: [
            { categoryId: null },
            { categoryName: null },
          ],
        },
        select: {
          id: true,
          accountNumber: true,
          mobileUserId: true,
        },
        take: ENRICHMENT_BATCH_SIZE,
      });

      console.log(`   Found ${accountsToEnrich.length} accounts to enrich`);
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "info",
        message: `Accounts fetched for enrichment: ${accountsToEnrich.length}`,
        timestamp: Date.now(),
      });

      for (const account of accountsToEnrich) {
        try {
          const result = await this.enrichAccount(account.id, account.accountNumber);
          stats.accountsChecked++;
          if (result.enriched) {
            stats.accountsEnriched++;
          }
          if (result.profileUpdated) {
            stats.profilesUpdated++;
          }
          if (result.categoryCreated) {
            stats.categoriesCreated++;
          }

          // Delay between requests to avoid overloading T24
          await new Promise((resolve) => setTimeout(resolve, ENRICHMENT_DELAY));
        } catch (error) {
          console.error(`❌ Failed to enrich account ${account.accountNumber}:`, error);
          void logsPubSub.publishLog({
            service: "account-enrichment",
            level: "error",
            message: `Failed to enrich account ${account.accountNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
            timestamp: Date.now(),
          });
          stats.errors++;
        }
      }

      console.log("✅ Account enrichment complete:");
      console.log(`   Accounts checked: ${stats.accountsChecked}`);
      console.log(`   Accounts enriched: ${stats.accountsEnriched}`);
      console.log(`   Profiles updated: ${stats.profilesUpdated}`);
      console.log(`   Categories created: ${stats.categoriesCreated}`);
      console.log(`   Errors: ${stats.errors}`);
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: stats.errors > 0 ? "warn" : "info",
        message: `Enrichment complete (checked=${stats.accountsChecked}, enriched=${stats.accountsEnriched}, errors=${stats.errors})`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("❌ Account enrichment failed:", error);
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "error",
        message: `Enrichment run failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    } finally {
      this.isRunning = false;

      // Publish "idle" status
      await servicePubSub.publishStatus(ServiceChannel.ACCOUNT_ENRICHMENT, {
        service: "account-enrichment",
        timestamp: Date.now(),
        status: this.getStatus(),
      });
    }
  }

  /**
   * Enrich a specific account with T24 details
   * Also updates user profile if customer details are available
   * Auto-creates account category if it doesn't exist
   * Returns: { enriched: boolean, profileUpdated: boolean, categoryCreated: boolean }
   */
  private async enrichAccount(
    accountId: number,
    accountNumber: string
  ): Promise<{ enriched: boolean; profileUpdated: boolean; categoryCreated: boolean }> {
    try {
      console.log(`   🔄 Enriching account ${accountNumber}...`);
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "debug",
        message: `Enriching account ${accountNumber}`,
        timestamp: Date.now(),
      });

      // Fetch account details from T24
      const result = await t24AccountDetailsService.getAccountDetailsFormatted(accountNumber);

      if (!result.ok || !result.data) {
        console.log(`   ⚠️ No details found for account ${accountNumber}`);
        void logsPubSub.publishLog({
          service: "account-enrichment",
          level: "warn",
          message: `No details found for account ${accountNumber}`,
          timestamp: Date.now(),
        });
        return { enriched: false, profileUpdated: false, categoryCreated: false };
      }

      const { data } = result;

      // Get the account with user relation
      const account = await prisma.mobileUserAccount.findUnique({
        where: { id: accountId },
        include: {
          mobileUser: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!account) {
        console.log(`   ⚠️ Account ${accountNumber} not found in database`);
        void logsPubSub.publishLog({
          service: "account-enrichment",
          level: "warn",
          message: `Account ${accountNumber} not found in database`,
          timestamp: Date.now(),
        });
        return { enriched: false, profileUpdated: false, categoryCreated: false };
      }

      // Update account with enriched data
      await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: {
          categoryId: data.categoryId, // Use actual T24 category ID (e.g., "1001", "6015")
          categoryName: data.categoryName,
          accountStatus: data.accountStatus,
          holderName: data.holderName,
          nickName: data.nickName,
          onlineLimit: data.onlineLimit,
          openingDate: data.openingDate,
          currency: data.currency || "MWK",
          accountName: data.holderName,
          updatedAt: new Date(),
        },
      });

      let profileUpdated = false;
      let categoryCreated = false;

      // Auto-create account category if it doesn't exist
      if (data.categoryId && data.categoryName) {
        const categoryResult = await prisma.accountCategory.upsert({
          where: { category: data.categoryId },
          update: {
            // Don't update existing categories, just ensure it exists
            updatedAt: new Date(),
          },
          create: {
            category: data.categoryId,
            displayToMobile: true, // Default: show new categories
          },
        });
        
        // Check if category was just created (has recent createdAt)
        const wasJustCreated = categoryResult.createdAt.getTime() === categoryResult.updatedAt.getTime();
        if (wasJustCreated) {
          categoryCreated = true;
          console.log(`   📋 Created new category: ${data.categoryId} - ${data.categoryName}`);
          void logsPubSub.publishLog({
            service: "account-enrichment",
            level: "info",
            message: `Created new category: ${data.categoryId} - ${data.categoryName}`,
            timestamp: Date.now(),
          });
        }
      }

      // Update user profile if customer details are available and profile needs update
      if (data.customer && account.mobileUser) {
        const profile = account.mobileUser.profile;
        const needsUpdate = !profile || 
          !profile.firstName || 
          !profile.lastName || 
          !profile.email || 
          !profile.phone;

        if (needsUpdate) {
          console.log(`   📝 Updating user profile for user ${account.mobileUserId}...`);
          void logsPubSub.publishLog({
            service: "account-enrichment",
            level: "info",
            message: `Updating user profile for user ${account.mobileUserId}`,
            timestamp: Date.now(),
          });

          if (profile) {
            // Update existing profile
            await prisma.mobileUserProfile.update({
              where: { mobileUserId: account.mobileUserId },
              data: {
                firstName: profile.firstName || data.customer.firstName,
                lastName: profile.lastName || data.customer.lastName,
                email: profile.email || data.customer.email,
                phone: profile.phone || data.customer.phoneNumber,
                address: profile.address || data.customer.street,
                city: profile.city || data.customer.town,
                updatedAt: new Date(),
              },
            });
            console.log(`   ✅ Updated profile for user ${account.mobileUserId}`);
            void logsPubSub.publishLog({
              service: "account-enrichment",
              level: "info",
              message: `Updated profile for user ${account.mobileUserId}`,
              timestamp: Date.now(),
            });
          } else {
            // Create new profile
            await prisma.mobileUserProfile.create({
              data: {
                mobileUserId: account.mobileUserId,
                firstName: data.customer.firstName,
                lastName: data.customer.lastName,
                email: data.customer.email,
                phone: data.customer.phoneNumber,
                address: data.customer.street,
                city: data.customer.town,
              },
            });
            console.log(`   ✅ Created profile for user ${account.mobileUserId}`);
            void logsPubSub.publishLog({
              service: "account-enrichment",
              level: "info",
              message: `Created profile for user ${account.mobileUserId}`,
              timestamp: Date.now(),
            });
          }
          profileUpdated = true;
        }
      }

      console.log(`   ✅ Enriched account ${accountNumber}: ${data.categoryName}`);
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "info",
        message: `Enriched account ${accountNumber}: ${data.categoryName}`,
        timestamp: Date.now(),
      });
      return { enriched: true, profileUpdated, categoryCreated };
    } catch (error) {
      console.error(`   ❌ Error enriching account ${accountNumber}:`, error);
      void logsPubSub.publishLog({
        service: "account-enrichment",
        level: "error",
        message: `Error enriching account ${accountNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
      return { enriched: false, profileUpdated: false, categoryCreated: false };
    }
  }

  /**
   * Manually trigger enrichment for a specific account
   * Returns: { enriched: boolean, profileUpdated: boolean, categoryCreated: boolean }
   */
  async enrichAccountManual(accountNumber: string): Promise<{ enriched: boolean; profileUpdated: boolean; categoryCreated: boolean }> {
    const account = await prisma.mobileUserAccount.findFirst({
      where: { accountNumber },
      select: {
        id: true,
        accountNumber: true,
      },
    });

    if (!account) {
      throw new Error(`Account ${accountNumber} not found`);
    }

    return this.enrichAccount(account.id, account.accountNumber);
  }

  /**
   * Get service status
   */
  getStatus(): {
    running: boolean;
    enriching: boolean;
    interval: number;
  } {
    return {
      running: this.enrichmentInterval !== null,
      enriching: this.isRunning,
      interval: ENRICHMENT_INTERVAL,
    };
  }
}

// Singleton instance
export const accountEnrichmentService = new AccountEnrichmentService();
