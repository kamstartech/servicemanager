import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";
import { PushNotificationService } from "@/lib/services/push-notification";

export const pushNotificationResolvers = {
  Mutation: {
    // Register device for push notifications
    async registerDeviceForPush(
      _: unknown,
      args: {
        fcmToken: string;
        deviceId: string;
      },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      // Update device with FCM token
      const updated = await prisma.mobileDevice.updateMany({
        where: {
          mobileUserId: context.userId,
          deviceId: args.deviceId,
        },
        data: {
          fcmToken: args.fcmToken,
          fcmTokenUpdatedAt: new Date(),
          pushEnabled: true,
        },
      });

      if (updated.count === 0) {
        throw new Error("Device not found or does not belong to you");
      }

      console.log(
        `FCM token registered for user ${context.userId}, device ${args.deviceId}`
      );

      return true;
    },

    // Unregister device from push notifications
    async unregisterDeviceFromPush(
      _: unknown,
      args: { deviceId: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const updated = await prisma.mobileDevice.updateMany({
        where: {
          mobileUserId: context.userId,
          deviceId: args.deviceId,
        },
        data: {
          fcmToken: null,
          pushEnabled: false,
        },
      });

      if (updated.count === 0) {
        throw new Error("Device not found or does not belong to you");
      }

      console.log(
        `FCM token unregistered for user ${context.userId}, device ${args.deviceId}`
      );

      return true;
    },

    // Test push notification
    async testPushNotification(
      _: unknown,
      args: { deviceId?: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      await PushNotificationService.sendTestNotification(
        context.userId,
        args.deviceId
      );

      return true;
    },

    // Admin-only: test push notification for a specific user/device
    async adminTestPushNotification(
      _: unknown,
      args: { userId: string; deviceId?: string },
      context: GraphQLContext
    ) {
      if (!context.adminId) {
        throw new Error("Forbidden");
      }

      const userId = Number(args.userId);
      if (!Number.isFinite(userId)) {
        throw new Error("Invalid userId");
      }

      if (args.deviceId) {
        const device = await prisma.mobileDevice.findFirst({
          where: {
            mobileUserId: userId,
            deviceId: args.deviceId,
          },
          select: { id: true },
        });

        if (!device) {
          throw new Error("Device not found for user");
        }
      }

      const result = await PushNotificationService.sendTestNotification(
        userId,
        args.deviceId
      );

      return !!result?.success;
    },
  },
};
