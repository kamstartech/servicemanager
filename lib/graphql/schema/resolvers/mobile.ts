import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";

export const mobileResolvers = {
  Query: {
    // Get current user's devices
    async myDevices(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const devices = await prisma.mobileDevice.findMany({
        where: { mobileUserId: context.userId },
        orderBy: { lastUsedAt: "desc" },
      });

      // Get active sessions per device
      const sessions = await prisma.deviceSession.findMany({
        where: {
          mobileUserId: context.userId,
          isActive: true,
        },
      });

      // Group sessions by device
      const sessionsByDevice = sessions.reduce(
        (acc: Record<string, any[]>, session: any) => {
        if (!acc[session.deviceId]) acc[session.deviceId] = [];
        acc[session.deviceId].push(session);
        return acc;
        },
        {} as Record<string, any[]>
      );

      return devices.map((device: any) => ({
        id: device.id,
        deviceId: device.deviceId,
        name: device.name,
        model: device.model,
        os: device.os,
        isActive: device.isActive,
        isCurrent: device.deviceId === context.deviceId,
        lastUsedAt: device.lastUsedAt?.toISOString(),
        createdAt: device.createdAt.toISOString(),
        activeSessions: (sessionsByDevice[device.deviceId] || []).map((s: any) => ({
          id: s.id,
          deviceId: s.deviceId,
          lastActivityAt: s.lastActivityAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          ipAddress: s.ipAddress,
          isActive: s.isActive,
          isCurrent: s.sessionId === context.sessionId,
        })),
      }));
    },

    // Get current user's profile
    async myProfile(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const profile = await prisma.mobileUserProfile.findUnique({
        where: { mobileUserId: context.userId },
      });

      if (!profile) {
        return null;
      }

      return {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      };
    },

    // Get current user's accounts
    async myAccounts(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const accounts = await prisma.mobileUserAccount.findMany({
        where: { mobileUserId: context.userId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });

      return accounts.map((acc: any) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        accountType: acc.accountType,
        currency: acc.currency,
        holderName: acc.holderName,
        nickName: acc.nickName,
        balance: acc.balance?.toString(),
        frozen: acc.frozen,
        isHidden: acc.isHidden,
        isPrimary: acc.isPrimary,
        isActive: acc.isActive,
        createdAt: acc.createdAt.toISOString(),
        updatedAt: acc.updatedAt.toISOString(),
      }));
    },

    // Get primary account
    async myPrimaryAccount(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const account = await prisma.mobileUserAccount.findFirst({
        where: {
          mobileUserId: context.userId,
          isPrimary: true,
        },
      });

      if (!account) {
        return null;
      }

      return {
        id: account.id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        currency: account.currency,
        holderName: account.holderName,
        nickName: account.nickName,
        balance: account.balance?.toString(),
        frozen: account.frozen,
        isHidden: account.isHidden,
        isPrimary: account.isPrimary,
        isActive: account.isActive,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      };
    },

    // Get current user's active sessions
    async mySessions(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const sessions = await prisma.deviceSession.findMany({
        where: {
          mobileUserId: context.userId,
          isActive: true,
        },
        orderBy: { lastActivityAt: "desc" },
      });

      return sessions.map((session: any) => ({
        id: session.id,
        deviceId: session.deviceId,
        lastActivityAt: session.lastActivityAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        ipAddress: session.ipAddress,
        isActive: session.isActive,
        isCurrent: session.sessionId === context.sessionId,
      }));
    },

    // Get current user's beneficiaries
    async myBeneficiaries(
      _: unknown,
      args: { type?: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const where: any = { mobileUserId: context.userId };
      if (args.type) {
        if (args.type === "BANK") {
          where.beneficiaryType = {
            in: ["BANK_INTERNAL", "BANK_EXTERNAL"],
          };
        } else {
          where.beneficiaryType = args.type;
        }
      }

      const beneficiaries = await prisma.beneficiary.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return beneficiaries.map((b: any) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));
    },
  },

  Mutation: {
    // Update profile
    async updateMyProfile(
      _: unknown,
      { input }: { input: any },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const profile = await prisma.mobileUserProfile.upsert({
        where: { mobileUserId: context.userId },
        update: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          country: input.country,
          zip: input.zip,
        },
        create: {
          mobileUserId: context.userId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          country: input.country,
          zip: input.zip,
        },
      });

      return {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      };
    },

    async updateMyNotificationSettings(
      _: unknown,
      { input }: { input: { smsNotifications?: boolean; emailNotifications?: boolean; pushNotifications?: boolean } },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const updated = await prisma.mobileUser.update({
        where: { id: context.userId },
        data: {
          ...(input.smsNotifications !== undefined && {
            smsNotifications: input.smsNotifications,
          }),
          ...(input.emailNotifications !== undefined && {
            emailNotifications: input.emailNotifications,
          }),
          ...(input.pushNotifications !== undefined && {
            pushNotifications: input.pushNotifications,
          }),
        },
        select: {
          smsNotifications: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      });

      return {
        smsNotifications: updated.smsNotifications,
        emailNotifications: updated.emailNotifications,
        pushNotifications: updated.pushNotifications,
      };
    },

    // Revoke a device (cannot revoke current device)
    async revokeMyDevice(
      _: unknown,
      { deviceId }: { deviceId: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      if (deviceId === context.deviceId) {
        throw new Error("Cannot revoke current device. Use logout instead.");
      }

      // Verify device belongs to user
      const device = await prisma.mobileDevice.findFirst({
        where: {
          mobileUserId: context.userId,
          deviceId: deviceId,
        },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      // Revoke all sessions for that device
      await prisma.deviceSession.updateMany({
        where: {
          mobileUserId: context.userId,
          deviceId: deviceId,
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      return true;
    },

    // Rename device
    async renameMyDevice(
      _: unknown,
      { deviceId, name }: { deviceId: string; name: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const device = await prisma.mobileDevice.findFirst({
        where: {
          mobileUserId: context.userId,
          deviceId: deviceId,
        },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      const updated = await prisma.mobileDevice.update({
        where: { id: device.id },
        data: { name },
      });

      return {
        id: updated.id,
        deviceId: updated.deviceId,
        name: updated.name,
        model: updated.model,
        os: updated.os,
        isActive: updated.isActive,
        isCurrent: updated.deviceId === context.deviceId,
        lastUsedAt: updated.lastUsedAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        activeSessions: [],
      };
    },

    // Revoke a specific session
    async revokeMySession(
      _: unknown,
      { sessionId }: { sessionId: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      if (sessionId === context.sessionId) {
        throw new Error("Cannot revoke current session. Use logout instead.");
      }

      const session = await prisma.deviceSession.findFirst({
        where: {
          mobileUserId: context.userId,
          sessionId: sessionId,
          isActive: true,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      await prisma.deviceSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      return true;
    },

    // Revoke all other sessions (keep current)
    async revokeAllMyOtherSessions(
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const result = await prisma.deviceSession.updateMany({
        where: {
          mobileUserId: context.userId,
          sessionId: { not: context.sessionId },
          isActive: true,
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Revoked ${result.count} other session(s)`,
      };
    },
  },
};
