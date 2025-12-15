import { messaging } from '@/lib/firebase/admin';
import { prisma } from '@/lib/db/prisma';

export interface SendPushNotificationParams {
  userId: number;
  type: string;
  priority?: string;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionData?: any;
  deviceId?: string; // Send to specific device, or all if null
}

export class PushNotificationService {
  /**
   * Send push notification to user's device(s)
   */
  static async send(params: SendPushNotificationParams) {
    const {
      userId,
      type,
      priority = 'NORMAL',
      title,
      body,
      imageUrl,
      actionUrl,
      actionData,
      deviceId,
    } = params;

    try {
      // Check if Firebase messaging is available
      if (!messaging) {
        console.warn('Firebase messaging not initialized - skipping push notification');
        return null;
      }

      // Get user devices with FCM tokens
      const devices = await prisma.mobileDevice.findMany({
        where: {
          mobileUserId: userId,
          isActive: true,
          fcmToken: { not: null },
          ...(deviceId && { deviceId }),
        },
      });

      if (devices.length === 0) {
        console.log(`No active devices with FCM tokens found for user ${userId}`);
        return null;
      }

      const tokens = devices.map((d) => d.fcmToken!).filter(Boolean);

      if (tokens.length === 0) {
        console.log(`No valid FCM tokens for user ${userId}`);
        return null;
      }

      // Create notification ID
      const notificationId = crypto.randomUUID();

      // Prepare message
      const message = {
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl }),
        },
        data: {
          notificationId,
          type,
          priority,
          ...(actionUrl && { actionUrl }),
          ...(actionData && { actionData: JSON.stringify(actionData) }),
        },
        tokens,
      };

      console.log(`Sending push notification to ${tokens.length} device(s) for user ${userId}`);

      // Send via Firebase
      const response = await messaging.sendEachForMulticast(message);

      console.log(`Push notification sent: ${response.successCount} success, ${response.failureCount} failed`);

      // Handle invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        
        response.responses.forEach((resp, idx) => {
          if (resp.error) {
            console.error(`Failed to send to token ${idx}:`, resp.error.message);
            
            // Check if token is invalid
            if (
              resp.error.code === 'messaging/invalid-registration-token' ||
              resp.error.code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        // Remove invalid tokens
        if (invalidTokens.length > 0) {
          await this.removeInvalidTokens(invalidTokens);
        }
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        notificationId,
      };
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send notification about checkbook status change
   */
  static async sendCheckbookStatusUpdate(
    userId: number,
    status: string,
    requestId: string
  ) {
    const statusMessages: Record<string, { title: string; body: string }> = {
      APPROVED: {
        title: 'Checkbook Request Approved',
        body: 'Your checkbook request has been approved',
      },
      READY_FOR_COLLECTION: {
        title: 'Checkbook Ready',
        body: 'Your checkbook is ready for collection',
      },
      COLLECTED: {
        title: 'Checkbook Collected',
        body: 'Your checkbook has been marked as collected',
      },
      REJECTED: {
        title: 'Checkbook Request Rejected',
        body: 'Your checkbook request was rejected',
      },
    };

    const message = statusMessages[status] || {
      title: 'Checkbook Update',
      body: 'Your checkbook request status has changed',
    };

    return this.send({
      userId,
      type: 'CHECKBOOK_STATUS',
      priority: status === 'READY_FOR_COLLECTION' ? 'HIGH' : 'NORMAL',
      title: message.title,
      body: message.body,
      actionUrl: `/checkbooks/${requestId}`,
      actionData: { status, requestId },
    });
  }

  /**
   * Send account frozen notification
   */
  static async sendAccountFrozenAlert(
    userId: number,
    accountNumber: string,
    frozen: boolean
  ) {
    return this.send({
      userId,
      type: 'ACCOUNT_FROZEN',
      priority: 'HIGH',
      title: frozen ? 'Account Frozen' : 'Account Unfrozen',
      body: frozen
        ? `Your account ${accountNumber} has been frozen`
        : `Your account ${accountNumber} has been unfrozen`,
      actionUrl: `/accounts/${accountNumber}`,
      actionData: { accountNumber, frozen },
    });
  }

  /**
   * Send transaction notification
   */
  static async sendTransactionAlert(
    userId: number,
    transactionType: 'COMPLETE' | 'FAILED',
    amount: string,
    currency: string,
    transactionId: string
  ) {
    const isComplete = transactionType === 'COMPLETE';

    return this.send({
      userId,
      type: isComplete ? 'TRANSACTION_COMPLETE' : 'TRANSACTION_FAILED',
      priority: 'NORMAL',
      title: isComplete ? 'Transaction Successful' : 'Transaction Failed',
      body: isComplete
        ? `${amount} ${currency} transaction completed successfully`
        : `${amount} ${currency} transaction failed`,
      actionUrl: `/transactions/${transactionId}`,
      actionData: { transactionId, amount, currency },
    });
  }

  /**
   * Send test notification
   */
  static async sendTestNotification(userId: number, deviceId?: string) {
    return this.send({
      userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      priority: 'NORMAL',
      title: 'Test Notification',
      body: 'This is a test push notification from your mobile banking app',
      deviceId,
    });
  }

  /**
   * Send account alert notification
   */
  static async sendAccountAlert(
    userId: number,
    alertType: string,
    accountNumber: string,
    alertData: any
  ) {
    const alertMessages: Record<string, { title: string; body: (data: any) => string; priority: string }> = {
      LOW_BALANCE: {
        title: 'Low Balance Alert',
        body: (data) => `Your account ${accountNumber} balance is ${data.balance || 'low'}`,
        priority: 'HIGH',
      },
      LARGE_TRANSACTION: {
        title: 'Large Transaction',
        body: (data) => `Large transaction of ${data.amount} ${data.currency} detected on account ${accountNumber}`,
        priority: 'HIGH',
      },
      SUSPICIOUS_ACTIVITY: {
        title: 'Security Alert',
        body: (data) => `Suspicious activity detected on account ${accountNumber}: ${data.reason || 'Please review'}`,
        priority: 'URGENT',
      },
      PAYMENT_DUE: {
        title: 'Payment Due',
        body: (data) => `Payment of ${data.amount} ${data.currency} is due on ${data.dueDate}`,
        priority: 'NORMAL',
      },
      ACCOUNT_LOGIN: {
        title: 'New Login Detected',
        body: (data) => `New login to your account from ${data.device || 'unknown device'}`,
        priority: 'HIGH',
      },
    };

    const alert = alertMessages[alertType] || {
      title: 'Account Alert',
      body: () => 'Please check your account',
      priority: 'NORMAL',
    };

    return this.send({
      userId,
      type: 'ACCOUNT_ALERT',
      priority: alert.priority,
      title: alert.title,
      body: alert.body(alertData),
      actionUrl: `/accounts/${accountNumber}/alerts`,
      actionData: { alertType, accountNumber, ...alertData },
    });
  }

  /**
   * Send login alert notification
   */
  static async sendLoginAlert(
    userId: number,
    deviceName: string,
    location?: string,
    ipAddress?: string
  ) {
    return this.send({
      userId,
      type: 'LOGIN_ALERT',
      priority: 'HIGH',
      title: 'New Login Detected',
      body: location
        ? `New login from ${deviceName} in ${location}`
        : `New login from ${deviceName}`,
      actionUrl: '/security/devices',
      actionData: { deviceName, location, ipAddress },
    });
  }

  /**
   * Send payment due reminder
   */
  static async sendPaymentDueReminder(
    userId: number,
    amount: string,
    currency: string,
    dueDate: string,
    paymentId: string
  ) {
    return this.send({
      userId,
      type: 'PAYMENT_DUE',
      priority: 'NORMAL',
      title: 'Payment Reminder',
      body: `Payment of ${amount} ${currency} is due on ${dueDate}`,
      actionUrl: `/payments/${paymentId}`,
      actionData: { amount, currency, dueDate, paymentId },
    });
  }

  /**
   * Remove invalid FCM tokens
   */
  private static async removeInvalidTokens(tokens: string[]) {
    console.log(`Removing ${tokens.length} invalid FCM token(s)`);
    
    await prisma.mobileDevice.updateMany({
      where: { fcmToken: { in: tokens } },
      data: { fcmToken: null },
    });
  }
}
