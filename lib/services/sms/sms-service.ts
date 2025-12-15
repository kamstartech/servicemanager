import { SMSResponse } from './types';

export class ESBSMSService {
  private static readonly ESB_URL = process.env.ESB_SMS_URL || 'https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages';
  private static readonly ESB_USERNAME = process.env.ESB_USERNAME || 'admin';
  private static readonly ESB_PASSWORD = process.env.ESB_PASSWORD || 'admin';
  private static readonly CLIENT_ID = process.env.ESB_CLIENT_ID || 'd79b32b5-b9a8-41de-b215-b038a913f619';

  /**
   * Send SMS via ESB Gateway
   */
  static async sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      const authString = `${this.ESB_USERNAME}:${this.ESB_PASSWORD}`;
      const base64Auth = Buffer.from(authString).toString('base64');

      const payload = {
        client: this.CLIENT_ID,
        message: message,
        phoneNumber: phoneNumber,
      };

      const response = await fetch(this.ESB_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: 'sent',
          messageId: data?.messageId || data?.id,
          details: data,
        };
      }

      return {
        success: false,
        status: 'failed',
        error: data?.message || 'Failed to send SMS',
        details: data,
      };
    } catch (error: any) {
      console.error('ESB SMS Error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Send OTP via SMS
   */
  static async sendOTP(phoneNumber: string, otp: string): Promise<SMSResponse> {
    const message = `Your verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send account alert via SMS
   */
  static async sendAccountAlert(
    phoneNumber: string,
    alertType: string,
    alertData: any
  ): Promise<SMSResponse> {
    let message = '';

    switch (alertType) {
      case 'LOW_BALANCE':
        message = `Alert: Your account balance (${alertData.balance} ${alertData.currency}) is below the threshold of ${alertData.threshold} ${alertData.currency}.`;
        break;

      case 'LARGE_TRANSACTION':
        message = `Alert: A ${alertData.type} transaction of ${alertData.amount} ${alertData.currency} was ${alertData.type === 'DEBIT' ? 'debited from' : 'credited to'} your account.`;
        break;

      case 'SUSPICIOUS_ACTIVITY':
        message = `Security Alert: Suspicious activity detected on your account. Reason: ${alertData.reason}. Please contact support if this wasn't you.`;
        break;

      case 'PASSWORD_CHANGE':
        message = `Security Alert: Your account password was changed. If you did not make this change, please contact support immediately.`;
        break;

      default:
        message = `Account Alert: ${alertType}`;
    }

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send transaction notification via SMS
   */
  static async sendTransactionNotification(
    phoneNumber: string,
    amount: string,
    currency: string,
    type: 'DEBIT' | 'CREDIT',
    balance?: string
  ): Promise<SMSResponse> {
    const action = type === 'DEBIT' ? 'debited from' : 'credited to';
    let message = `Transaction: ${amount} ${currency} ${action} your account.`;
    
    if (balance) {
      message += ` New balance: ${balance} ${currency}`;
    }

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send password reset code via SMS
   */
  static async sendPasswordReset(phoneNumber: string, resetCode: string): Promise<SMSResponse> {
    const message = `Your password reset code is: ${resetCode}. This code will expire in 30 minutes. Do not share this code.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send welcome message
   */
  static async sendWelcome(phoneNumber: string, firstName: string): Promise<SMSResponse> {
    const message = `Welcome ${firstName}! Your account has been successfully created. Thank you for choosing our service.`;
    return this.sendSMS(phoneNumber, message);
  }
}
