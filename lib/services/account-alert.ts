import { prisma } from "@/lib/db/prisma";
import { PushNotificationService } from "./push-notification";
import { ESBSMSService } from "./sms";
import { AlertType, NotificationChannel } from "@prisma/client";

export class AccountAlertService {
  /**
   * Trigger an account alert and send notifications
   */
  static async triggerAlert(params: {
    userId: number;
    accountNumber: string;
    alertType: AlertType;
    alertData: any;
  }) {
    const { userId, accountNumber, alertType, alertData } = params;

    try {
      // Get alert settings for this account
      const settings = await prisma.accountAlertSettings.findFirst({
        where: {
          mobileUserId: userId,
          accountNumber,
        },
      });

      // Check if alert is enabled
      if (!this.isAlertEnabled(alertType, settings, alertData)) {
        console.log(`Alert ${alertType} is disabled for account ${accountNumber}`);
        return null;
      }

      // Determine channels to send
      const channels = this.getChannelsForAlert(alertType, settings);

      // Create alert record
      const alert = await prisma.accountAlert.create({
        data: {
          mobileUserId: userId,
          accountNumber,
          alertType,
          alertData,
          status: 'PENDING',
          channelsSent: channels,
        },
      });

      // Send notifications based on enabled channels
      let notificationSent = false;

      // Send push notification if PUSH is in channels
      if (channels.includes('PUSH' as NotificationChannel)) {
        try {
          await PushNotificationService.sendAccountAlert(
            userId,
            alertType,
            accountNumber,
            alertData
          );
          notificationSent = true;
        } catch (error) {
          console.error('Failed to send push notification for alert:', error);
        }
      }

      // Send SMS if SMS is in channels
      if (channels.includes('SMS' as NotificationChannel)) {
        try {
          // Get user phone number
          const user = await prisma.mobileUser.findUnique({
            where: { id: userId },
            select: { phoneNumber: true },
          });

          if (user?.phoneNumber) {
            await ESBSMSService.sendAccountAlert(
              user.phoneNumber,
              alertType,
              alertData
            );
            notificationSent = true;
          }
        } catch (error) {
          console.error('Failed to send SMS for alert:', error);
        }
      }

      // Update alert status
      await prisma.accountAlert.update({
        where: { id: alert.id },
        data: {
          status: notificationSent ? 'SENT' : 'FAILED',
          sentAt: notificationSent ? new Date() : null,
        },
      });

      return alert;
    } catch (error) {
      console.error('Error triggering alert:', error);
      throw error;
    }
  }

  /**
   * Trigger low balance alert
   */
  static async triggerLowBalanceAlert(
    userId: number,
    accountNumber: string,
    balance: string,
    currency: string,
    threshold: string
  ) {
    return this.triggerAlert({
      userId,
      accountNumber,
      alertType: 'LOW_BALANCE',
      alertData: {
        balance,
        currency,
        threshold,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Trigger large transaction alert
   */
  static async triggerLargeTransactionAlert(
    userId: number,
    accountNumber: string,
    transactionId: string,
    amount: string,
    currency: string,
    type: 'DEBIT' | 'CREDIT',
    description?: string
  ) {
    return this.triggerAlert({
      userId,
      accountNumber,
      alertType: 'LARGE_TRANSACTION',
      alertData: {
        transactionId,
        amount,
        currency,
        type,
        description,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Trigger suspicious activity alert
   */
  static async triggerSuspiciousActivityAlert(
    userId: number,
    accountNumber: string,
    reason: string,
    details: any,
    riskScore?: number
  ) {
    // Create suspicious activity log
    const log = await prisma.suspiciousActivityLog.create({
      data: {
        mobileUserId: userId,
        accountNumber,
        suspicionReason: reason as any,
        riskScore: riskScore || 0,
        detectionDetails: details,
        deviceId: details.deviceId,
        ipAddress: details.ipAddress,
        location: details.location,
      },
    });

    return this.triggerAlert({
      userId,
      accountNumber,
      alertType: 'SUSPICIOUS_ACTIVITY',
      alertData: {
        reason,
        riskScore,
        logId: log.id,
        ...details,
      },
    });
  }

  /**
   * Trigger login alert
   */
  static async triggerLoginAlert(
    userId: number,
    deviceName: string,
    deviceId: string,
    location?: string,
    ipAddress?: string
  ) {
    try {
      // Get alert settings
      const settings = await prisma.accountAlertSettings.findFirst({
        where: { mobileUserId: userId },
      });

      // Check login alert mode
      if (!settings) {
        return null;
      }

      // For NEW_DEVICE mode, check if device is new
      if (settings.loginAlertMode === 'NEW_DEVICE') {
        const device = await prisma.mobileDevice.findFirst({
          where: {
            mobileUserId: userId,
            deviceId,
          },
        });

        // If device exists and has been used before, don't send alert
        if (device && device.lastUsedAt) {
          return null;
        }
      }

      // Send push notification directly (not tied to account)
      if (settings.loginAlertChannels.includes('PUSH' as NotificationChannel)) {
        await PushNotificationService.sendLoginAlert(
          userId,
          deviceName,
          location,
          ipAddress
        );
      }

      // Create alert record
      return await prisma.accountAlert.create({
        data: {
          mobileUserId: userId,
          accountNumber: null, // Login alerts are not account-specific
          alertType: 'ACCOUNT_LOGIN',
          alertData: {
            deviceName,
            deviceId,
            location,
            ipAddress,
            timestamp: new Date().toISOString(),
          },
          status: 'SENT',
          channelsSent: settings.loginAlertChannels,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error triggering login alert:', error);
      throw error;
    }
  }

  /**
   * Trigger payment due reminder
   */
  static async triggerPaymentDueReminder(
    userId: number,
    accountNumber: string,
    paymentId: string,
    amount: string,
    currency: string,
    dueDate: string
  ) {
    const alert = await this.triggerAlert({
      userId,
      accountNumber,
      alertType: 'PAYMENT_DUE',
      alertData: {
        paymentId,
        amount,
        currency,
        dueDate,
        timestamp: new Date().toISOString(),
      },
    });

    // Also send via push notification service
    if (alert) {
      try {
        await PushNotificationService.sendPaymentDueReminder(
          userId,
          amount,
          currency,
          dueDate,
          paymentId
        );
      } catch (error) {
        console.error('Failed to send payment reminder push:', error);
      }
    }

    return alert;
  }

  /**
   * Check if alert is enabled based on settings
   */
  private static isAlertEnabled(
    alertType: AlertType,
    settings: any,
    alertData: any
  ): boolean {
    if (!settings) {
      return true; // Default: enabled
    }

    switch (alertType) {
      case 'LOW_BALANCE':
        return settings.lowBalanceEnabled;

      case 'LARGE_TRANSACTION':
        if (!settings.largeTransactionEnabled) {
          return false;
        }
        // Check if debit-only setting applies
        if (settings.largeTransactionDebitOnly && alertData.type === 'CREDIT') {
          return false;
        }
        return true;

      case 'SUSPICIOUS_ACTIVITY':
        return (
          settings.alertUnusualLocation ||
          settings.alertMultipleFailedAttempts ||
          settings.alertNewDeviceTransaction
        );

      case 'PAYMENT_DUE':
        return settings.paymentDueEnabled;

      case 'ACCOUNT_LOGIN':
        return settings.loginAlertMode !== 'NEVER';

      default:
        return true;
    }
  }

  /**
   * Get notification channels for alert type
   */
  private static getChannelsForAlert(
    alertType: AlertType,
    settings: any
  ): NotificationChannel[] {
    if (!settings) {
      return ['PUSH']; // Default: PUSH only
    }

    switch (alertType) {
      case 'LOW_BALANCE':
        return settings.lowBalanceChannels || ['PUSH'];

      case 'LARGE_TRANSACTION':
        return settings.largeTransactionChannels || ['PUSH', 'SMS'];

      case 'SUSPICIOUS_ACTIVITY':
        return settings.suspiciousActivityChannels || ['PUSH', 'SMS', 'EMAIL'];

      case 'PAYMENT_DUE':
        return settings.paymentDueChannels || ['PUSH', 'SMS'];

      case 'ACCOUNT_LOGIN':
        return settings.loginAlertChannels || ['PUSH', 'EMAIL'];

      default:
        return ['PUSH'];
    }
  }
}
