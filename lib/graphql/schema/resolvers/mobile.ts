import type { GraphQLContext } from "@/lib/graphql/context";
import { pubsub, EVENTS } from "@/lib/graphql/pubsub";
import { GraphQLError } from 'graphql';
import { prisma } from "@/lib/db/prisma";

async function getHiddenAccountCategoryIds(): Promise<string[]> {
  const hidden = await prisma.accountCategory.findMany({
    where: { displayToMobile: false },
    select: { category: true },
  });

  return hidden.map((c: { category: string }) => c.category);
}

export const mobileResolvers = {
  Query: {
    // Get current user's devices
    async myDevices(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
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
        isPrimary: device.isPrimary,
        isCurrent: device.deviceId === context.deviceId,
        lastUsedAt: device.lastUsedAt?.toISOString(),
        credentialId: device.credentialId,
        createdAt: device.createdAt.toISOString(),
        updatedAt: device.updatedAt.toISOString(),
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
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
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
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      const hiddenCategoryIds = await getHiddenAccountCategoryIds();

      const accounts = await prisma.mobileUserAccount.findMany({
        where: {
          mobileUserId: context.userId,
          ...(hiddenCategoryIds.length > 0
            ? {
              OR: [
                { categoryId: null },
                { categoryId: { notIn: hiddenCategoryIds } },
              ],
            }
            : {}),
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });

      return accounts.map((acc: any) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        accountType: acc.accountType,
        currency: acc.currency,
        accountStatus: acc.accountStatus,
        holderName: acc.holderName,
        nickName: acc.nickName,
        balance: acc.balance?.toString(),
        frozen: acc.frozen ?? false,
        isHidden: acc.isHidden ?? false,
        isPrimary: acc.isPrimary ?? false,
        isActive: acc.isActive ?? false,
        createdAt: acc.createdAt.toISOString(),
        updatedAt: acc.updatedAt.toISOString(),
      }));
    },

    // Get primary account
    async myPrimaryAccount(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      const hiddenCategoryIds = await getHiddenAccountCategoryIds();

      const account = await prisma.mobileUserAccount.findFirst({
        where: {
          mobileUserId: context.userId,
          isPrimary: true,
          ...(hiddenCategoryIds.length > 0
            ? {
              OR: [
                { categoryId: null },
                { categoryId: { notIn: hiddenCategoryIds } },
              ],
            }
            : {}),
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
        accountStatus: account.accountStatus,
        holderName: account.holderName,
        nickName: account.nickName,
        balance: account.balance?.toString(),
        frozen: account.frozen ?? false,
        isHidden: account.isHidden ?? false,
        isPrimary: account.isPrimary ?? false,
        isActive: account.isActive ?? false,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      };
    },

    // Get current user's active sessions
    async mySessions(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
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
      // Authentication - check for mobile user
      if (!context.mobileUser) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      console.log(`🔍 myBeneficiaries query - userId: ${context.mobileUser.id}, type: ${args.type || 'all'}`);

      const where: any = { userId: context.mobileUser.id };
      if (args.type) {
        if (args.type === "BANK") {
          where.beneficiaryType = {
            in: ["FDH_BANK", "EXTERNAL_BANK"],
          };
        } else if (args.type === "WALLET") {
          where.beneficiaryType = {
            in: ["FDH_WALLET", "EXTERNAL_WALLET"],
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

    // Get current user's notification settings
    async myNotificationSettings(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      const user = await prisma.mobileUser.findUnique({
        where: { id: context.userId },
        select: {
          smsNotifications: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      });

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'NOT_FOUND',
            http: { status: 404 },
          },
        });
      }

      return user;
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
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
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
          profileImageUrl: input.profileImageUrl,
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
          profileImageUrl: input.profileImageUrl,
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
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
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

    // Toggle multi-device session setting
    async toggleMultiDeviceSession(
      _: unknown,
      { enabled }: { enabled: boolean },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      await prisma.mobileUser.update({
        where: { id: context.userId },
        data: { allowMultiSession: enabled },
      });

      console.log(
        `Multi-device session ${enabled ? "enabled" : "disabled"} for user ${context.userId}`
      );

      return true;
    },

    // Revoke a device (cannot revoke current device)
    async revokeMyDevice(
      _: unknown,
      { deviceId }: { deviceId: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      if (deviceId === context.deviceId) {
        throw new GraphQLError("Cannot revoke current device. Use logout instead.", {
          extensions: {
            code: 'OPERATION_NOT_ALLOWED',
            http: { status: 400 },
          },
        });
      }

      // Verify device belongs to user
      const device = await prisma.mobileDevice.findFirst({
        where: {
          mobileUserId: context.userId,
          deviceId: deviceId,
        },
      });

      if (!device) {
        throw new GraphQLError('Device not found', {
          extensions: {
            code: 'NOT_FOUND',
            http: { status: 404 },
          },
        });
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
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      const device = await prisma.mobileDevice.findFirst({
        where: {
          mobileUserId: context.userId,
          deviceId: deviceId,
        },
      });

      if (!device) {
        throw new GraphQLError('Device not found', {
          extensions: {
            code: 'NOT_FOUND',
            http: { status: 404 },
          },
        });
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
        isPrimary: updated.isPrimary,
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
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      if (sessionId === context.sessionId) {
        throw new GraphQLError("Cannot revoke current session. Use logout instead.", {
          extensions: {
            code: 'OPERATION_NOT_ALLOWED',
            http: { status: 400 },
          },
        });
      }

      const session = await prisma.deviceSession.findFirst({
        where: {
          mobileUserId: context.userId,
          sessionId: sessionId,
          isActive: true,
        },
      });

      if (!session) {
        throw new GraphQLError('Session not found', {
          extensions: {
            code: 'NOT_FOUND',
            http: { status: 404 },
          },
        });
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
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
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

    /**
     * Approve a pending device (user self-approval)
     */
    async approveMyDevice(
      _: unknown,
      { deviceId }: { deviceId: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      // Verify device belongs to this user and is pending
      const device = await prisma.mobileDevice.findFirst({
        where: {
          id: deviceId,
          mobileUserId: context.userId,
          isActive: false, // Must be pending
        },
      });

      if (!device) {
        throw new GraphQLError('Pending device not found or already approved', {
          extensions: {
            code: 'NOT_FOUND',
            http: { status: 404 },
          },
        });
      }

      // Approve the device
      await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
        await tx.mobileDevice.update({
          where: { id: deviceId },
          data: { isActive: true, verifiedVia: "USER_APPROVAL" },
        });

        // Ensure user has a primary device
        const primary = await tx.mobileDevice.findFirst({
          where: { mobileUserId: context.userId!, isPrimary: true },
          select: { id: true },
        });

        if (!primary) {
          await tx.mobileDevice.updateMany({
            where: { mobileUserId: context.userId! },
            data: { isPrimary: false },
          });
          await tx.mobileDevice.update({
            where: { id: deviceId },
            data: { isPrimary: true },
          });
        }
      });

      // Send notification to the newly approved device (if it has FCM token)
      const { PushNotificationService } = await import("@/lib/services/push-notification");
      PushNotificationService.send({
        userId: context.userId,
        type: "DEVICE_APPROVED",
        priority: "HIGH",
        title: "Device Approved",
        body: `Your device "${device.name || 'Mobile Device'}" has been approved and is now active`,
        deviceId: device.deviceId,
      }).catch((error) => {
        console.error("Failed to send device approval notification:", error);
      });

      // Publish real-time update for GraphQL Subscription
      pubsub.publish(EVENTS.DEVICE_APPROVAL_STATUS, {
        deviceApprovalStatus: {
          deviceId: device.deviceId,
          status: "APPROVED",
          message: "Your device has been approved.",
        }
      }, device.deviceId);

      return true;
    },

    /**
     * Deny a pending device (user self-denial)
     */
    async denyMyDevice(
      _: unknown,
      { deviceId }: { deviceId: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        });
      }

      // Verify device belongs to this user and is pending
      const device = await prisma.mobileDevice.findFirst({
        where: {
          id: deviceId,
          mobileUserId: context.userId,
          isActive: false,
        },
      });

      if (!device) {
        throw new GraphQLError('Pending device not found', {
          extensions: {
            code: 'NOT_FOUND',
            http: { status: 404 },
          },
        });
      }

      // Send notification to the denied device (async)
      const { PushNotificationService } = await import("@/lib/services/push-notification");
      PushNotificationService.send({
        userId: context.userId,
        type: "DEVICE_DENIED",
        priority: "HIGH",
        title: "Access Denied",
        body: `Access for device "${device.name || 'Mobile Device'}" was denied`,
        deviceId: device.deviceId,
      }).catch((error) => {
        console.error("Failed to send device denial notification:", error);
      });

      // Publish real-time update for GraphQL Subscription
      pubsub.publish(EVENTS.DEVICE_APPROVAL_STATUS, {
        deviceApprovalStatus: {
          deviceId: device.deviceId,
          status: "DENIED",
          message: "Your login request was denied.",
        }
      }, device.deviceId);

      // Delete the pending device
      await prisma.mobileDevice.delete({
        where: { id: deviceId },
      });

      return true;
    },
  },
};
