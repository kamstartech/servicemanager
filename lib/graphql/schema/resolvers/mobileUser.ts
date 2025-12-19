import { prisma } from "@/lib/db/prisma";
import { pubsub, EVENTS } from "../../pubsub";
import { WalletTierService } from "@/lib/services/wallet-tiers";
import bcrypt from "bcryptjs";

type MobileUsersArguments = {
  context?: string;
};

type CreateMobileUserInput = {
  context: string;
  username?: string;
  phoneNumber?: string;
  passwordHash?: string;
};

type UpdateMobileUserInput = {
  id: string;
  isActive?: boolean;
};

export const mobileUserResolvers = {
  MobileUser: {
    // Field resolver for accounts array
    async accounts(parent: any) {
      const accounts = await prisma.mobileUserAccount.findMany({
        where: { mobileUserId: parent.id },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      return accounts.map(account => ({
        id: account.id.toString(),
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
        frozen: account.frozen ?? false,
        isHidden: account.isHidden ?? false,
        isPrimary: account.isPrimary ?? false,
        isActive: account.isActive ?? false,
        mobileUserId: account.mobileUserId.toString(),
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      }));
    },

    // Field resolver for primary account
    async primaryAccount(parent: any) {
      const account = await prisma.mobileUserAccount.findFirst({
        where: {
          mobileUserId: parent.id,
          isPrimary: true,
          isActive: true
        }
      });

      if (!account) return null;

      return {
        id: account.id.toString(),
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
        frozen: account.frozen ?? false,
        isHidden: account.isHidden ?? false,
        isPrimary: account.isPrimary ?? false,
        isActive: account.isActive ?? false,
        mobileUserId: account.mobileUserId.toString(),
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      };
    },

    // Field resolver for profile
    async profile(parent: any) {
      const profile = await prisma.mobileUserProfile.findUnique({
        where: { mobileUserId: parent.id }
      });

      if (!profile) return null;

      return {
        id: profile.id.toString(),
        mobileUserId: profile.mobileUserId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        country: profile.country,
        zip: profile.zip,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      };
    },

    // Field resolver for wallet tier (for WALLET context users)
    async walletTier(parent: any) {
      if (parent.context !== 'WALLET') return null;

      const kyc = await prisma.mobileUserKYC.findUnique({
        where: { mobileUserId: parent.id },
        include: { walletTier: true }
      });

      if (!kyc?.walletTier) return null;

      return {
        id: kyc.walletTier.id,
        name: kyc.walletTier.name,
        position: kyc.walletTier.position,
        maximumBalance: kyc.walletTier.maximumBalance,
        maxTransactionAmount: kyc.walletTier.maxTransactionAmount,
        dailyTransactionLimit: kyc.walletTier.dailyTransactionLimit,
        monthlyTransactionLimit: kyc.walletTier.monthlyTransactionLimit,
        dailyTransactionCount: kyc.walletTier.dailyTransactionCount,
        monthlyTransactionCount: kyc.walletTier.monthlyTransactionCount,
      };
    },
    // Check if secret is set
    hasSecret(parent: any) {
      return !!parent.secretHash;
    }
  },

  Query: {
    async mobileUsers(_parent: unknown, arguments_: MobileUsersArguments) {
      const where = arguments_.context
        ? { context: arguments_.context as any }
        : {};

      const mobileUsers = await prisma.mobileUser.findMany({ where });

      return mobileUsers.map((mobileUser: any) => ({
        id: mobileUser.id,
        context: mobileUser.context,
        username: mobileUser.username,
        phoneNumber: mobileUser.phoneNumber,
        customerNumber: mobileUser.customerNumber,
        accountNumber: mobileUser.accountNumber,
        isActive: mobileUser.isActive,
        createdAt: mobileUser.createdAt.toISOString(),
        updatedAt: mobileUser.updatedAt.toISOString(),
      }));
    },
  },
  Mutation: {
    async createMobileUser(_parent: unknown, args: { input: CreateMobileUserInput }) {
      const user = await prisma.mobileUser.create({
        data: {
          context: args.input.context as any,
          username: args.input.username,
          phoneNumber: args.input.phoneNumber,
          passwordHash: args.input.passwordHash,
        },
      });

      // If WALLET context, automatically set up wallet account and assign default tier
      if (args.input.context === 'WALLET') {
        try {
          // Assign default tier
          await WalletTierService.assignDefaultTier(user.id);

          // Create wallet account (phoneNumber as accountNumber)
          await WalletTierService.getOrCreateWalletAccount(user.id);
        } catch (error) {
          console.error('Error setting up wallet for new user:', error);
          // Don't fail user creation if tier/account setup fails
        }
      }

      const formattedUser = {
        id: user.id,
        context: user.context,
        username: user.username,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      pubsub.publish(EVENTS.MOBILE_USER_CREATED, formattedUser);

      return formattedUser;
    },
    async updateMobileUser(_parent: unknown, args: { input: UpdateMobileUserInput }) {
      const user = await prisma.mobileUser.update({
        where: { id: parseInt(args.input.id) },
        data: {
          isActive: args.input.isActive,
        },
      });

      const formattedUser = {
        id: user.id,
        context: user.context,
        username: user.username,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      pubsub.publish(EVENTS.MOBILE_USER_UPDATED, formattedUser);

      return formattedUser;
    },
    async setMemoWord(_parent: unknown, args: { memoWord: string }, context: any) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const hashedSecret = await bcrypt.hash(args.memoWord, 12);

      const user = await prisma.mobileUser.update({
        where: { id: context.userId },
        data: { secretHash: hashedSecret },
      });

      return {
        success: true,
        message: "Memo word set successfully",
        user: {
          id: user.id,
          context: user.context,
          username: user.username,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        token: null, // Token already exists on client
        appStructure: await prisma.appScreen.findMany({
          where: {
            context: user.context,
            isActive: true,
          },
          include: {
            pages: {
              where: { isActive: true },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        }).then(screens => screens.map((screen) => ({
          id: screen.id,
          name: screen.name,
          context: screen.context,
          icon: screen.icon,
          order: screen.order,
          isActive: screen.isActive,
          isTesting: screen.isTesting,
          pages: screen.pages.map((page) => ({
            id: page.id,
            name: page.name,
            icon: page.icon,
            order: page.order,
            isActive: page.isActive,
            isTesting: page.isTesting,
            screenId: page.screenId,
            createdAt: page.createdAt.toISOString(),
            updatedAt: page.updatedAt.toISOString(),
          })),
          createdAt: screen.createdAt.toISOString(),
          updatedAt: screen.updatedAt.toISOString(),
        })))
      };
    },
  },
};
