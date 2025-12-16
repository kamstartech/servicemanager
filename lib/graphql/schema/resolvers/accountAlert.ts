import { prisma } from "@/lib/db/prisma";
import { AccountAlertService } from "@/lib/services/account-alert";
import type { GraphQLContext } from "@/lib/graphql/context";

export const accountAlertResolvers = {
  Query: {
    async accountAlertSettings(
      _parent: unknown,
      args: { accountNumber: string },
      context: GraphQLContext
    ) {
      try {
        if (!context.adminId && !context.userId) {
          throw new Error("Authentication required");
        }

        if (!context.adminId && context.userId) {
          const ownsAccount = await prisma.mobileUserAccount.findFirst({
            where: {
              mobileUserId: context.userId,
              accountNumber: args.accountNumber,
              isActive: true,
            },
            select: { id: true },
          });

          if (!ownsAccount) {
            return null;
          }
        }

        const settings = await prisma.accountAlertSettings.findFirst({
          where: context.adminId
            ? { accountNumber: args.accountNumber }
            : { accountNumber: args.accountNumber, mobileUserId: context.userId },
          include: { mobileUser: true }
        });

        if (!settings) {
          return null;
        }

        return {
          id: settings.id.toString(),
          mobileUserId: settings.mobileUserId,
          accountNumber: settings.accountNumber,
          lowBalanceEnabled: settings.lowBalanceEnabled,
          lowBalanceThreshold: settings.lowBalanceThreshold?.toString() || null,
          lowBalanceChannels: settings.lowBalanceChannels,
          largeTransactionEnabled: settings.largeTransactionEnabled,
          largeTransactionThreshold: settings.largeTransactionThreshold?.toString() || null,
          largeTransactionChannels: settings.largeTransactionChannels,
          largeTransactionDebitOnly: settings.largeTransactionDebitOnly,
          alertUnusualLocation: settings.alertUnusualLocation,
          alertMultipleFailedAttempts: settings.alertMultipleFailedAttempts,
          alertNewDeviceTransaction: settings.alertNewDeviceTransaction,
          suspiciousActivityChannels: settings.suspiciousActivityChannels,
          paymentDueEnabled: settings.paymentDueEnabled,
          paymentDueChannels: settings.paymentDueChannels,
          paymentReminderInterval: settings.paymentReminderInterval,
          loginAlertMode: settings.loginAlertMode,
          loginAlertChannels: settings.loginAlertChannels,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietHoursStart: settings.quietHoursStart?.toISOString() || null,
          quietHoursEnd: settings.quietHoursEnd?.toISOString() || null,
          createdAt: settings.createdAt.toISOString(),
          updatedAt: settings.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("Error fetching accountAlertSettings:", error);
        return null;
      }
    },

    async accountAlerts(
      _parent: unknown,
      args: {
        accountNumber?: string;
        alertType?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
      },
      context: GraphQLContext
    ) {
      try {
        if (!context.adminId && !context.userId) {
          throw new Error("Authentication required");
        }

        const where: any = {};

        if (!context.adminId && context.userId) {
          where.mobileUserId = context.userId;
        }

        if (args.accountNumber) {
          where.accountNumber = args.accountNumber;
        }

        if (args.alertType) {
          where.alertType = args.alertType;
        }

        if (args.startDate || args.endDate) {
          where.triggeredAt = {};
          if (args.startDate) {
            where.triggeredAt.gte = new Date(args.startDate);
          }
          if (args.endDate) {
            where.triggeredAt.lte = new Date(args.endDate);
          }
        }

        const [alerts, totalCount] = await Promise.all([
          prisma.accountAlert.findMany({
            where,
            orderBy: { triggeredAt: 'desc' },
            take: args.limit || 20,
            skip: args.offset || 0,
          }),
          prisma.accountAlert.count({ where }),
        ]);

        return {
          alerts: alerts.map(alert => ({
            id: alert.id.toString(),
            mobileUserId: alert.mobileUserId,
            accountNumber: alert.accountNumber,
            alertType: alert.alertType,
            alertData: alert.alertData,
            status: alert.status,
            channelsSent: alert.channelsSent,
            sentAt: alert.sentAt?.toISOString() || null,
            deliveryStatus: alert.deliveryStatus,
            acknowledgedAt: alert.acknowledgedAt?.toISOString() || null,
            userAction: alert.userAction,
            triggeredAt: alert.triggeredAt.toISOString(),
            createdAt: alert.createdAt.toISOString(),
            updatedAt: alert.updatedAt.toISOString(),
          })),
          totalCount,
        };
      } catch (error) {
        console.error("Error fetching accountAlerts:", error);
        return { alerts: [], totalCount: 0 };
      }
    },

    async suspiciousActivities(
      _parent: unknown,
      args: {
        mobileUserId?: number;
        isResolved?: boolean;
        limit?: number;
        offset?: number;
      },
      context: GraphQLContext
    ) {
      try {
        if (!context.adminId && !context.userId) {
          throw new Error("Authentication required");
        }

        const where: any = {};

        if (context.adminId) {
          if (args.mobileUserId) {
            where.mobileUserId = args.mobileUserId;
          }
        } else if (context.userId) {
          where.mobileUserId = context.userId;
        }

        if (args.isResolved !== undefined) {
          where.isResolved = args.isResolved;
        }

        const logs = await prisma.suspiciousActivityLog.findMany({
          where,
          orderBy: { detectedAt: 'desc' },
          take: args.limit || 20,
          skip: args.offset || 0,
        });

        return logs.map(log => ({
          id: log.id.toString(),
          alertId: log.alertId,
          mobileUserId: log.mobileUserId,
          accountNumber: log.accountNumber,
          suspicionReason: log.suspicionReason,
          riskScore: log.riskScore,
          detectionDetails: log.detectionDetails,
          relatedTransactionIds: log.relatedTransactionIds,
          deviceId: log.deviceId,
          ipAddress: log.ipAddress,
          location: log.location,
          isResolved: log.isResolved,
          resolvedAt: log.resolvedAt?.toISOString() || null,
          resolutionAction: log.resolutionAction,
          adminNotes: log.adminNotes,
          detectedAt: log.detectedAt.toISOString(),
          createdAt: log.createdAt.toISOString(),
        }));
      } catch (error) {
        console.error("Error fetching suspiciousActivities:", error);
        return [];
      }
    },
  },

  Mutation: {
    async updateAccountAlertSettings(
      _parent: unknown,
      args: {
        settings: {
          accountNumber: string;
          lowBalanceEnabled?: boolean;
          lowBalanceThreshold?: string;
          lowBalanceChannels?: string[];
          largeTransactionEnabled?: boolean;
          largeTransactionThreshold?: string;
          largeTransactionChannels?: string[];
          largeTransactionDebitOnly?: boolean;
          alertUnusualLocation?: boolean;
          alertMultipleFailedAttempts?: boolean;
          alertNewDeviceTransaction?: boolean;
          suspiciousActivityChannels?: string[];
          paymentDueEnabled?: boolean;
          paymentDueChannels?: string[];
          paymentReminderInterval?: string;
          loginAlertMode?: string;
          loginAlertChannels?: string[];
          quietHoursEnabled?: boolean;
          quietHoursStart?: string;
          quietHoursEnd?: string;
        };
      },
      context: GraphQLContext
    ) {
      try {
        if (!context.adminId && !context.userId) {
          throw new Error("Authentication required");
        }

        const { accountNumber, ...settingsData } = args.settings;

        // Find the mobile user by account number
        const account = await prisma.mobileUserAccount.findFirst({
          where: context.adminId
            ? { accountNumber }
            : { accountNumber, mobileUserId: context.userId, isActive: true },
        });

        if (!account) {
          throw new Error(`Account ${accountNumber} not found`);
        }

        const updateData: any = {};

        if (settingsData.lowBalanceEnabled !== undefined) {
          updateData.lowBalanceEnabled = settingsData.lowBalanceEnabled;
        }
        if (settingsData.lowBalanceThreshold !== undefined) {
          updateData.lowBalanceThreshold = settingsData.lowBalanceThreshold;
        }
        if (settingsData.lowBalanceChannels !== undefined) {
          updateData.lowBalanceChannels = settingsData.lowBalanceChannels;
        }
        if (settingsData.largeTransactionEnabled !== undefined) {
          updateData.largeTransactionEnabled = settingsData.largeTransactionEnabled;
        }
        if (settingsData.largeTransactionThreshold !== undefined) {
          updateData.largeTransactionThreshold = settingsData.largeTransactionThreshold;
        }
        if (settingsData.largeTransactionChannels !== undefined) {
          updateData.largeTransactionChannels = settingsData.largeTransactionChannels;
        }
        if (settingsData.largeTransactionDebitOnly !== undefined) {
          updateData.largeTransactionDebitOnly = settingsData.largeTransactionDebitOnly;
        }
        if (settingsData.alertUnusualLocation !== undefined) {
          updateData.alertUnusualLocation = settingsData.alertUnusualLocation;
        }
        if (settingsData.alertMultipleFailedAttempts !== undefined) {
          updateData.alertMultipleFailedAttempts = settingsData.alertMultipleFailedAttempts;
        }
        if (settingsData.alertNewDeviceTransaction !== undefined) {
          updateData.alertNewDeviceTransaction = settingsData.alertNewDeviceTransaction;
        }
        if (settingsData.suspiciousActivityChannels !== undefined) {
          updateData.suspiciousActivityChannels = settingsData.suspiciousActivityChannels;
        }
        if (settingsData.paymentDueEnabled !== undefined) {
          updateData.paymentDueEnabled = settingsData.paymentDueEnabled;
        }
        if (settingsData.paymentDueChannels !== undefined) {
          updateData.paymentDueChannels = settingsData.paymentDueChannels;
        }
        if (settingsData.paymentReminderInterval !== undefined) {
          updateData.paymentReminderInterval = settingsData.paymentReminderInterval;
        }
        if (settingsData.loginAlertMode !== undefined) {
          updateData.loginAlertMode = settingsData.loginAlertMode;
        }
        if (settingsData.loginAlertChannels !== undefined) {
          updateData.loginAlertChannels = settingsData.loginAlertChannels;
        }
        if (settingsData.quietHoursEnabled !== undefined) {
          updateData.quietHoursEnabled = settingsData.quietHoursEnabled;
        }
        if (settingsData.quietHoursStart !== undefined) {
          updateData.quietHoursStart = settingsData.quietHoursStart ? new Date(settingsData.quietHoursStart) : null;
        }
        if (settingsData.quietHoursEnd !== undefined) {
          updateData.quietHoursEnd = settingsData.quietHoursEnd ? new Date(settingsData.quietHoursEnd) : null;
        }

        const settings = await prisma.accountAlertSettings.upsert({
          where: {
            mobileUserId_accountNumber: {
              mobileUserId: account.mobileUserId,
              accountNumber,
            },
          },
          update: updateData,
          create: {
            mobileUserId: account.mobileUserId,
            accountNumber,
            ...updateData,
          },
        });

        return {
          id: settings.id.toString(),
          mobileUserId: settings.mobileUserId,
          accountNumber: settings.accountNumber,
          lowBalanceEnabled: settings.lowBalanceEnabled,
          lowBalanceThreshold: settings.lowBalanceThreshold?.toString() || null,
          lowBalanceChannels: settings.lowBalanceChannels,
          largeTransactionEnabled: settings.largeTransactionEnabled,
          largeTransactionThreshold: settings.largeTransactionThreshold?.toString() || null,
          largeTransactionChannels: settings.largeTransactionChannels,
          largeTransactionDebitOnly: settings.largeTransactionDebitOnly,
          alertUnusualLocation: settings.alertUnusualLocation,
          alertMultipleFailedAttempts: settings.alertMultipleFailedAttempts,
          alertNewDeviceTransaction: settings.alertNewDeviceTransaction,
          suspiciousActivityChannels: settings.suspiciousActivityChannels,
          paymentDueEnabled: settings.paymentDueEnabled,
          paymentDueChannels: settings.paymentDueChannels,
          paymentReminderInterval: settings.paymentReminderInterval,
          loginAlertMode: settings.loginAlertMode,
          loginAlertChannels: settings.loginAlertChannels,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietHoursStart: settings.quietHoursStart?.toISOString() || null,
          quietHoursEnd: settings.quietHoursEnd?.toISOString() || null,
          createdAt: settings.createdAt.toISOString(),
          updatedAt: settings.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("Error updating accountAlertSettings:", error);
        throw error;
      }
    },

    async acknowledgeAlert(
      _parent: unknown,
      args: { alertId: string; action?: string },
      context: GraphQLContext
    ) {
      try {
        if (!context.adminId && !context.userId) {
          throw new Error("Authentication required");
        }

        const alertId = parseInt(args.alertId);

        const alert = await prisma.accountAlert.findUnique({
          where: { id: alertId },
          select: { id: true, mobileUserId: true },
        });

        if (!alert) {
          return false;
        }

        if (!context.adminId && context.userId && alert.mobileUserId !== context.userId) {
          throw new Error("Access denied");
        }

        await prisma.accountAlert.update({
          where: { id: alertId },
          data: {
            acknowledgedAt: new Date(),
            userAction: args.action as any,
          },
        });

        return true;
      } catch (error) {
        console.error("Error acknowledging alert:", error);
        return false;
      }
    },

    async testAlert(
      _parent: unknown,
      args: { accountNumber: string; alertType: string },
      context: GraphQLContext
    ) {
      try {
        if (!context.adminId && !context.userId) {
          throw new Error("Authentication required");
        }

        // Find the mobile user by account number
        const account = await prisma.mobileUserAccount.findFirst({
          where: context.adminId
            ? { accountNumber: args.accountNumber }
            : {
                accountNumber: args.accountNumber,
                mobileUserId: context.userId,
                isActive: true,
              },
        });

        if (!account) {
          throw new Error(`Account ${args.accountNumber} not found`);
        }

        // Trigger test alert with push notification
        await AccountAlertService.triggerAlert({
          userId: account.mobileUserId,
          accountNumber: args.accountNumber,
          alertType: args.alertType as any,
          alertData: {
            test: true,
            message: "This is a test alert",
            timestamp: new Date().toISOString(),
          },
        });

        return true;
      } catch (error) {
        console.error("Error creating test alert:", error);
        return false;
      }
    },

    async resolveSuspiciousActivity(
      _parent: unknown,
      args: {
        logId: string;
        action: string;
        adminNotes?: string;
      },
      context: GraphQLContext
    ) {
      try {
        if (!context.adminId) {
          throw new Error("Forbidden");
        }

        const logId = parseInt(args.logId);

        await prisma.suspiciousActivityLog.update({
          where: { id: logId },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
            resolutionAction: args.action as any,
            adminNotes: args.adminNotes,
          },
        });

        return true;
      } catch (error) {
        console.error("Error resolving suspicious activity:", error);
        return false;
      }
    },
  },
};
