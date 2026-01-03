import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";
import { PushNotificationService } from "@/lib/services/push-notification";

export const pushNotificationResolvers = {
  Query: {
    // Get current user's notifications
    async myNotifications(
      _: unknown,
      args: {
        type?: string;
        page?: number;
        pageSize?: number;
      },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 20;
      const skip = (page - 1) * pageSize;

      const where: any = {
        mobileUserId: context.userId,
      };

      if (args.type) {
        where.type = args.type;
      }

      const [items, totalCount] = await Promise.all([
        prisma.pushNotification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.pushNotification.count({ where }),
      ]);

      return {
        items: items.map(item => ({
          ...item,
          sentAt: item.sentAt?.toISOString(),
          deliveredAt: item.deliveredAt?.toISOString(),
          readAt: item.readAt?.toISOString(),
          createdAt: item.createdAt.toISOString(),
        })),
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    },

    // Get unread notification count
    async unreadNotificationCount(_: unknown, __: unknown, context: GraphQLContext) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      return await prisma.pushNotification.count({
        where: {
          mobileUserId: context.userId,
          status: { not: "READ" },
        },
      });
    },
  },

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

    // Mark notification as read
    async markNotificationAsRead(
      _: unknown,
      args: { id: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      await prisma.pushNotification.update({
        where: {
          id: args.id,
          mobileUserId: context.userId,
        },
        data: {
          status: "READ",
          readAt: new Date(),
        },
      });

      return true;
    },

    // Mark all notifications as read
    async markAllNotificationsAsRead(
      _: unknown,
      __: unknown,
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      await prisma.pushNotification.updateMany({
        where: {
          mobileUserId: context.userId,
          status: { not: "READ" },
        },
        data: {
          status: "READ",
          readAt: new Date(),
        },
      });

      return true;
    },

    // Delete a notification
    async deleteNotification(
      _: unknown,
      args: { id: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error("Authentication required");
      }

      await prisma.pushNotification.delete({
        where: {
          id: args.id,
          mobileUserId: context.userId,
        },
      });

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
