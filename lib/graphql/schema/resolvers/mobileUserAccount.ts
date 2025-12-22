import { prisma } from "@/lib/db/prisma";
import { PushNotificationService } from "@/lib/services/push-notification";
import { accountEvents, AccountEvent } from "@/lib/events/account-events";
import { pubsub, EVENTS } from "@/lib/graphql/pubsub";

export const mobileUserAccountResolvers = {
  Query: {
    async mobileUserAccounts(_parent: unknown, args: { userId: string }) {
      try {
        const userId = parseInt(args.userId);
        if (isNaN(userId)) {
          console.error(`Invalid userId for mobileUserAccounts: ${args.userId}`);
          return [];
        }

        const accounts = await prisma.mobileUserAccount.findMany({
          where: { mobileUserId: userId },
          orderBy: [
            { isPrimary: 'desc' }, // Primary account first
            { createdAt: 'asc' }
          ]
        });

        return accounts.map(account => ({
          id: account.id.toString(),
          context: account.context,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountType: account.accountType,
          currency: account.currency,
          categoryId: account.categoryId,
          categoryName: account.categoryName,
          accountStatus: account.accountStatus,
          holderName: account.holderName,
          nickName: account.nickName,
          balance: account.balance?.toString() || null,
          workingBalance: account.workingBalance?.toString() || null,
          frozen: account.frozen,
          isHidden: account.isHidden,
          isPrimary: account.isPrimary,
          isActive: account.isActive,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        }));
      } catch (error) {
        console.error("Error fetching mobileUserAccounts:", error);
        return [];
      }
    },

    async allMobileUserAccounts(_parent: unknown) {
      try {
        const accounts = await prisma.mobileUserAccount.findMany({
          orderBy: [
            { isPrimary: 'desc' },
            { accountNumber: 'asc' }
          ]
        });

        return accounts.map(account => ({
          id: account.id.toString(),
          context: account.context,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountType: account.accountType,
          currency: account.currency,
          categoryId: account.categoryId,
          categoryName: account.categoryName,
          accountStatus: account.accountStatus,
          holderName: account.holderName,
          nickName: account.nickName,
          balance: account.balance?.toString() || null,
          workingBalance: account.workingBalance?.toString() || null,
          frozen: account.frozen,
          isHidden: account.isHidden,
          isPrimary: account.isPrimary,
          isActive: account.isActive,
          mobileUserId: account.mobileUserId.toString(),
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        }));
      } catch (error) {
        console.error("Error fetching allMobileUserAccounts:", error);
        return [];
      }
    },

    async mobileUserAccount(_parent: unknown, args: { accountNumber: string }) {
      try {
        const account = await prisma.mobileUserAccount.findFirst({
          where: { accountNumber: args.accountNumber }
        });

        if (!account) {
          return null;
        }

        return {
          id: account.id.toString(),
          context: account.context,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountType: account.accountType,
          currency: account.currency,
          categoryId: account.categoryId,
          categoryName: account.categoryName,
          accountStatus: account.accountStatus,
          holderName: account.holderName,
          nickName: account.nickName,
          balance: account.balance?.toString() || null,
          workingBalance: account.workingBalance?.toString() || null,
          frozen: account.frozen,
          isHidden: account.isHidden,
          isPrimary: account.isPrimary,
          isActive: account.isActive,
          mobileUserId: account.mobileUserId.toString(),
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("Error fetching mobileUserAccount:", error);
        return null;
      }
    }
  },

  Mutation: {
    async linkAccountToUser(
      _parent: unknown,
      args: {
        userId: string;
        accountNumber: string;
        accountName?: string;
        accountType?: string;
        isPrimary?: boolean;
      }
    ) {
      const userId = parseInt(args.userId);

      // If this is marked as primary, unset other primary accounts
      if (args.isPrimary) {
        await prisma.mobileUserAccount.updateMany({
          where: { mobileUserId: userId, isPrimary: true },
          data: { isPrimary: false }
        });
      }

      // If no accounts exist, make this one primary
      const existingCount = await prisma.mobileUserAccount.count({
        where: { mobileUserId: userId }
      });
      const isPrimary = args.isPrimary ?? (existingCount === 0);

      const account = await prisma.mobileUserAccount.create({
        data: {
          mobileUserId: userId,
          accountNumber: args.accountNumber,
          accountName: args.accountName,
          accountType: args.accountType,
          isPrimary
        }
      });

      // Emit ACCOUNT_LINKED event for enrichment and alert settings
      accountEvents.emit(AccountEvent.ACCOUNT_LINKED, {
        userId,
        accountId: account.id,
        accountNumber: account.accountNumber,
      });

      return {
        id: account.id.toString(),
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        currency: account.currency,
        nickName: account.nickName,
        balance: account.balance?.toString() || null,
        frozen: account.frozen,
        isHidden: account.isHidden,
        isPrimary: account.isPrimary,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      };
    },

    async unlinkAccountFromUser(
      _parent: unknown,
      args: { userId: string; accountId: string }
    ) {
      const userId = parseInt(args.userId);
      const accountId = parseInt(args.accountId);

      const account = await prisma.mobileUserAccount.findUnique({
        where: { id: accountId }
      });

      if (!account || account.mobileUserId !== userId) {
        throw new Error("Account not found or does not belong to user");
      }

      // If this was the primary account, promote another
      if (account.isPrimary) {
        const nextAccount = await prisma.mobileUserAccount.findFirst({
          where: {
            mobileUserId: userId,
            id: { not: accountId },
            isActive: true
          },
          orderBy: { createdAt: 'asc' }
        });

        if (nextAccount) {
          await prisma.mobileUserAccount.update({
            where: { id: nextAccount.id },
            data: { isPrimary: true }
          });
        }
      }

      await prisma.mobileUserAccount.delete({
        where: { id: accountId }
      });

      // Emit ACCOUNT_UNLINKED event
      accountEvents.emit(AccountEvent.ACCOUNT_UNLINKED, {
        userId,
        accountId,
        accountNumber: account.accountNumber,
      });

      return true;
    },

    async setPrimaryAccount(
      _parent: unknown,
      args: { userId: string; accountId: string }
    ) {
      const userId = parseInt(args.userId);
      const accountId = parseInt(args.accountId);

      // Verify account belongs to user
      const account = await prisma.mobileUserAccount.findUnique({
        where: { id: accountId }
      });

      if (!account || account.mobileUserId !== userId) {
        throw new Error("Account not found or does not belong to user");
      }

      // Unset all primary accounts for this user
      await prisma.mobileUserAccount.updateMany({
        where: { mobileUserId: userId, isPrimary: true },
        data: { isPrimary: false }
      });

      // Set this account as primary
      await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: { isPrimary: true }
      });

      return true;
    },

    async updateAccount(
      _parent: unknown,
      args: {
        accountId: string;
        accountName?: string;
        accountType?: string;
      }
    ) {
      const accountId = parseInt(args.accountId);

      const account = await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: {
          ...(args.accountName !== undefined && { accountName: args.accountName }),
          ...(args.accountType !== undefined && { accountType: args.accountType }),
        }
      });

      return {
        id: account.id.toString(),
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        currency: account.currency,
        nickName: account.nickName,
        balance: account.balance?.toString() || null,
        frozen: account.frozen,
        isHidden: account.isHidden,
        isPrimary: account.isPrimary,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      };
    },

    async setAccountNickname(
      _parent: unknown,
      args: {
        accountId: string;
        nickName: string;
      },
      context: any
    ) {
      const accountId = parseInt(args.accountId);

      // If context has userId (mobile user), verify account ownership
      if (context.userId) {
        const account = await prisma.mobileUserAccount.findUnique({
          where: { id: accountId }
        });

        if (!account || account.mobileUserId !== context.userId) {
          throw new Error("Account not found or does not belong to you");
        }
      }

      const updatedAccount = await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: { nickName: args.nickName }
      });

      return {
        id: updatedAccount.id.toString(),
        accountNumber: updatedAccount.accountNumber,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        currency: updatedAccount.currency,
        nickName: updatedAccount.nickName,
        balance: updatedAccount.balance?.toString() || null,
        frozen: updatedAccount.frozen,
        isHidden: updatedAccount.isHidden,
        isPrimary: updatedAccount.isPrimary,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
      };
    },

    async freezeAccount(
      _parent: unknown,
      args: { accountId: string },
      context: any
    ) {
      const accountId = parseInt(args.accountId);

      // If context has userId (mobile user), verify account ownership
      if (context.userId) {
        const account = await prisma.mobileUserAccount.findUnique({
          where: { id: accountId }
        });

        if (!account || account.mobileUserId !== context.userId) {
          throw new Error("Account not found or does not belong to you");
        }
      }

      const updatedAccount = await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: { frozen: true }
      });

      const result = {
        id: updatedAccount.id.toString(),
        accountNumber: updatedAccount.accountNumber,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        currency: updatedAccount.currency,
        nickName: updatedAccount.nickName,
        balance: updatedAccount.balance?.toString() || null,
        frozen: updatedAccount.frozen,
        isHidden: updatedAccount.isHidden,
        isPrimary: updatedAccount.isPrimary,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
      };

      // Send push notification
      try {
        await PushNotificationService.sendAccountFrozenAlert(
          updatedAccount.mobileUserId,
          updatedAccount.accountNumber,
          true
        );
      } catch (error) {
        console.error("Failed to send freeze notification:", error);
      }

      return result;
    },

    async unfreezeAccount(
      _parent: unknown,
      args: { accountId: string },
      context: any
    ) {
      const accountId = parseInt(args.accountId);

      // If context has userId (mobile user), verify account ownership
      if (context.userId) {
        const account = await prisma.mobileUserAccount.findUnique({
          where: { id: accountId }
        });

        if (!account || account.mobileUserId !== context.userId) {
          throw new Error("Account not found or does not belong to you");
        }
      }

      const updatedAccount = await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: { frozen: false }
      });

      const result = {
        id: updatedAccount.id.toString(),
        accountNumber: updatedAccount.accountNumber,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        currency: updatedAccount.currency,
        nickName: updatedAccount.nickName,
        balance: updatedAccount.balance?.toString() || null,
        frozen: updatedAccount.frozen,
        isHidden: updatedAccount.isHidden,
        isPrimary: updatedAccount.isPrimary,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
      };

      // Send push notification
      try {
        await PushNotificationService.sendAccountFrozenAlert(
          updatedAccount.mobileUserId,
          updatedAccount.accountNumber,
          false
        );
      } catch (error) {
        console.error("Failed to send unfreeze notification:", error);
      }

      return result;
    },

    async hideAccount(
      _parent: unknown,
      args: { accountId: string },
      context: any
    ) {
      const accountId = parseInt(args.accountId);

      // If context has userId (mobile user), verify account ownership
      if (context.userId) {
        const account = await prisma.mobileUserAccount.findUnique({
          where: { id: accountId }
        });

        if (!account || account.mobileUserId !== context.userId) {
          throw new Error("Account not found or does not belong to you");
        }

        // Cannot hide primary account
        if (account.isPrimary) {
          throw new Error("Cannot hide primary account");
        }
      }

      const updatedAccount = await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: { isHidden: true }
      });

      return {
        id: updatedAccount.id.toString(),
        accountNumber: updatedAccount.accountNumber,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        currency: updatedAccount.currency,
        nickName: updatedAccount.nickName,
        balance: updatedAccount.balance?.toString() || null,
        frozen: updatedAccount.frozen,
        isHidden: updatedAccount.isHidden,
        isPrimary: updatedAccount.isPrimary,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
      };
    },

    async unhideAccount(
      _parent: unknown,
      args: { accountId: string },
      context: any
    ) {
      const accountId = parseInt(args.accountId);

      // If context has userId (mobile user), verify account ownership
      if (context.userId) {
        const account = await prisma.mobileUserAccount.findUnique({
          where: { id: accountId }
        });

        if (!account || account.mobileUserId !== context.userId) {
          throw new Error("Account not found or does not belong to you");
        }
      }

      const updatedAccount = await prisma.mobileUserAccount.update({
        where: { id: accountId },
        data: { isHidden: false }
      });

      return {
        id: updatedAccount.id.toString(),
        accountNumber: updatedAccount.accountNumber,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        currency: updatedAccount.currency,
        nickName: updatedAccount.nickName,
        balance: updatedAccount.balance?.toString() || null,
        frozen: updatedAccount.frozen,
        isHidden: updatedAccount.isHidden,
        isPrimary: updatedAccount.isPrimary,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt.toISOString(),
        updatedAt: updatedAccount.updatedAt.toISOString(),
      };
    },

    // Trigger account discovery for a user
    async triggerAccountDiscovery(_parent: unknown, args: { userId: string }) {
      const userId = parseInt(args.userId);
      if (isNaN(userId)) {
        throw new Error("Invalid userId");
      }

      // Get user info
      const user = await prisma.mobileUser.findUnique({
        where: { id: userId },
        select: { customerNumber: true, context: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.customerNumber) {
        return {
          success: false,
          message: "User does not have a customer number",
          accountsAdded: 0,
          accountsDeactivated: 0,
        };
      }

      // Import and trigger discovery
      const { accountDiscoveryService } = await import(
        "@/lib/services/background/account-discovery"
      );

      const result = await accountDiscoveryService.discoverForUser(userId);

      // Publish subscription event for real-time updates in admin UI
      const { publishAccountsUpdate } = await import(
        "@/lib/graphql/publish-accounts-update"
      );
      await publishAccountsUpdate(userId);

      return {
        success: true,
        message: `Discovery completed: ${result.added} account(s) added, ${result.deactivated} deactivated`,
        accountsAdded: result.added,
        accountsDeactivated: result.deactivated,
      };
    },
  },

  Subscription: {
    accountsUpdated: {
      subscribe: (_parent: unknown, { userId }: { userId: string }) =>
        pubsub.subscribe(EVENTS.ACCOUNTS_UPDATED, userId),
      resolve: (payload: any) => payload,
    },
  },
};
