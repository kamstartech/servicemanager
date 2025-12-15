import { NextRequest, NextResponse } from 'next/server';
import { ESBSMSService } from '@/lib/services/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, message, type = 'generic' } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    let response;

    switch (type) {
      case 'otp':
        const otp = body.otp || Math.floor(100000 + Math.random() * 900000).toString();
        response = await ESBSMSService.sendOTP(phoneNumber, otp);
        break;

      case 'alert':
        response = await ESBSMSService.sendAccountAlert(
          phoneNumber,
          body.alertType || 'GENERIC',
          body.alertData || {}
        );
        break;

      case 'transaction':
        response = await ESBSMSService.sendTransactionNotification(
          phoneNumber,
          body.amount,
          body.currency,
          body.transactionType || 'CREDIT',
          body.balance
        );
        break;

      case 'password_reset':
        response = await ESBSMSService.sendPasswordReset(phoneNumber, body.resetCode);
        break;

      case 'welcome':
        response = await ESBSMSService.sendWelcome(phoneNumber, body.firstName || 'User');
        break;

      default:
        response = await ESBSMSService.sendSMS(phoneNumber, message);
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('SMS API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'ESB SMS Gateway API',
    description: 'Send SMS via FDH ESB Gateway',
    usage: {
      method: 'POST',
      body: {
        phoneNumber: 'Phone number (e.g., 260977396223)',
        message: 'Message to send',
        type: 'generic | otp | alert | transaction | password_reset | welcome',
      },
      examples: {
        generic: {
          phoneNumber: '260977396223',
          message: 'Hello from ESB SMS Gateway',
          type: 'generic',
        },
        otp: {
          phoneNumber: '260977396223',
          otp: '123456',
          type: 'otp',
        },
        alert: {
          phoneNumber: '260977396223',
          alertType: 'LOW_BALANCE',
          alertData: { balance: '100', currency: 'ZMW', threshold: '500' },
          type: 'alert',
        },
        transaction: {
          phoneNumber: '260977396223',
          amount: '1000',
          currency: 'ZMW',
          transactionType: 'CREDIT',
          balance: '5000',
          type: 'transaction',
        },
      },
    },
    gateway: {
      url: process.env.ESB_SMS_URL || 'https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages',
      client: process.env.ESB_CLIENT_ID || 'd79b32b5-b9a8-41de-b215-b038a913f619',
    },
  });
}
