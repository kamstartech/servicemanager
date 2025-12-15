import { prisma } from '@/lib/db/prisma';
import { SMSResponse } from './types';

export interface LogSMSParams {
  userId: number;
  phoneNumber: string;
  message: string;
  type: string;
  status: 'ready' | 'sent' | 'failed' | 'retry';
  messageId?: string;
  error?: string;
  details?: any;
}

export class SMSLogger {
  /**
   * Log SMS to database for tracking and monitoring
   */
  static async log(params: LogSMSParams): Promise<number> {
    try {
      const sms = await prisma.sMSNotification.create({
        data: {
          userId: params.userId,
          msisdn: params.phoneNumber,
          message: params.message,
          status: params.status,
          sentAt: params.status === 'sent' ? new Date() : null,
          attemptCount: params.status === 'retry' ? 1 : 0,
          details: {
            type: params.type,
            messageId: params.messageId,
            error: params.error,
            ...params.details,
          },
        },
      });

      console.log(`📱 SMS logged: ID ${sms.id}, Status: ${params.status}`);
      return sms.id;
    } catch (error) {
      console.error('Failed to log SMS:', error);
      // Don't throw - logging failure shouldn't break SMS sending
      return -1;
    }
  }

  /**
   * Update SMS status after delivery attempt
   */
  static async updateStatus(
    smsId: number,
    status: 'sent' | 'failed' | 'retry',
    details?: any
  ): Promise<void> {
    try {
      await prisma.sMSNotification.update({
        where: { id: smsId },
        data: {
          status,
          sentAt: status === 'sent' ? new Date() : undefined,
          attemptCount: { increment: status === 'retry' ? 1 : 0 },
          details: details ? { ...details } : undefined,
        },
      });

      console.log(`📱 SMS ${smsId} updated: ${status}`);
    } catch (error) {
      console.error(`Failed to update SMS ${smsId}:`, error);
    }
  }

  /**
   * Get SMS stats for monitoring
   */
  static async getStats(
    startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
    endDate: Date = new Date()
  ) {
    try {
      const [total, sent, failed, pending, retrying] = await Promise.all([
        prisma.sMSNotification.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.sMSNotification.count({
          where: {
            status: 'sent',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.sMSNotification.count({
          where: {
            status: 'failed',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.sMSNotification.count({
          where: {
            status: 'ready',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        prisma.sMSNotification.count({
          where: {
            status: 'retry',
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      ]);

      const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : '0';

      return {
        total,
        sent,
        failed,
        pending,
        retrying,
        successRate: parseFloat(successRate),
      };
    } catch (error) {
      console.error('Failed to get SMS stats:', error);
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        retrying: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Get recent SMS for realtime feed
   */
  static async getRecent(limit: number = 50) {
    try {
      return await prisma.sMSNotification.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          userId: true,
          msisdn: true,
          message: true,
          status: true,
          sentAt: true,
          attemptCount: true,
          createdAt: true,
          details: true,
        },
      });
    } catch (error) {
      console.error('Failed to get recent SMS:', error);
      return [];
    }
  }

  /**
   * Get failed SMS that need attention
   */
  static async getFailedSMS(limit: number = 20) {
    try {
      return await prisma.sMSNotification.findMany({
        where: {
          status: 'failed',
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          userId: true,
          msisdn: true,
          message: true,
          status: true,
          attemptCount: true,
          createdAt: true,
          details: true,
        },
      });
    } catch (error) {
      console.error('Failed to get failed SMS:', error);
      return [];
    }
  }

  /**
   * Retry failed SMS
   */
  static async retry(smsId: number): Promise<boolean> {
    try {
      const sms = await prisma.sMSNotification.findUnique({
        where: { id: smsId },
      });

      if (!sms) {
        console.error(`SMS ${smsId} not found`);
        return false;
      }

      // Check retry limit
      if (sms.attemptCount >= 3) {
        console.error(`SMS ${smsId} exceeded retry limit`);
        return false;
      }

      // Update to retry status
      await prisma.sMSNotification.update({
        where: { id: smsId },
        data: {
          status: 'retry',
          attemptCount: { increment: 1 },
        },
      });

      return true;
    } catch (error) {
      console.error(`Failed to retry SMS ${smsId}:`, error);
      return false;
    }
  }
}
