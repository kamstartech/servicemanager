import { prisma } from "@/lib/db/prisma";
import { t24AccountDetailsService } from "@/lib/services/t24/account-details";
import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";

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
      return;
    }

    console.log("🚀 Starting account enrichment service...");
    console.log(`   Enrichment interval: ${ENRICHMENT_INTERVAL / 1000 / 60 / 60}h`);
    console.log(`   Batch size: ${ENRICHMENT_BATCH_SIZE} accounts`);

    // Start periodic enrichment
    this.enrichmentInterval = setInterval(() => {
      this.enrichAccounts();
    }, ENRICHMENT_INTERVAL);

    // Initial enrichment after 1 minute (give system time to start)
    setTimeout(() => {
      this.enrichAccounts();
    }, 60000);

    console.log("✅ Account enrichment service started");
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
  }

  /**
   * Enrich accounts that are missing details
   */
  private async enrichAccounts(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Account enrichment already running, skipping...");
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
          stats.errors++;
        }
      }

      console.log("✅ Account enrichment complete:");
      console.log(`   Accounts checked: ${stats.accountsChecked}`);
      console.log(`   Accounts enriched: ${stats.accountsEnriched}`);
      console.log(`   Profiles updated: ${stats.profilesUpdated}`);
      console.log(`   Categories created: ${stats.categoriesCreated}`);
      console.log(`   Errors: ${stats.errors}`);
    } catch (error) {
      console.error("❌ Account enrichment failed:", error);
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

      // Fetch account details from T24
      const result = await t24AccountDetailsService.getAccountDetailsFormatted(accountNumber);

      if (!result.ok || !result.data) {
        console.log(`   ⚠️ No details found for account ${accountNumber}`);
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
          }
          profileUpdated = true;
        }
      }

      console.log(`   ✅ Enriched account ${accountNumber}: ${data.categoryName}`);
      return { enriched: true, profileUpdated, categoryCreated };
    } catch (error) {
      console.error(`   ❌ Error enriching account ${accountNumber}:`, error);
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
