import { prisma } from "@/lib/db/prisma";
import { pubsub, EVENTS } from "../../pubsub";

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
        balance: account.balance?.toString() || null,
        isPrimary: account.isPrimary,
        isActive: account.isActive,
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
        balance: account.balance?.toString() || null,
        isPrimary: account.isPrimary,
        isActive: account.isActive,
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
  },
};
