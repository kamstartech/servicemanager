import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email configuration from environment
const emailConfig = {
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "1025"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: process.env.SMTP_USER
    ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD || "",
    }
    : undefined,
};

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(emailConfig);
  }
  return transporter;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    cid?: string;
  }>;
  userId?: number;
  type?: string;
}

export class EmailService {
  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    // Check user preference for non-critical Email
    const { userId, type } = options;
    const criticalTypes = ['otp', 'password_reset'];

    if (userId && type && !criticalTypes.includes(type)) {
      const { prisma } = await import('@/lib/db/prisma');
      const user = await prisma.mobileUser.findUnique({
        where: { id: userId },
        select: { emailNotifications: true }
      });

      if (user && !user.emailNotifications) {
        console.log(`Email notifications are disabled for user ${userId}. Skipping ${type} message.`);
        return false;
      }
    }

    const transporter = getTransporter();

    try {
      const info = await transporter.sendMail({
        from: options.from || process.env.SMTP_FROM || "noreply@servicemanager.local",
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(", ")
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(", ")
            : options.bcc
          : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      console.log("✅ Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      throw error;
    }
  }

  /**
   * Send OTP email
   */
  async sendOTP(to: string, otp: string, username: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: "Your Verification Code",
      text: `Hello ${username},\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verification Code</h2>
          <p>Hello ${username},</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    to: string,
    resetUrl: string,
    username: string
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: "Password Reset Request",
      text: `Hello ${username},\n\nYou requested to reset your password.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Hello ${username},</p>
          <p>You requested to reset your password.</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcome(to: string, username: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: "Welcome to Service Manager",
      text: `Hello ${username},\n\nWelcome to Service Manager! Your account has been created successfully.\n\nYou can now log in and start using our services.\n\nThank you for joining us!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Service Manager!</h2>
          <p>Hello ${username},</p>
          <p>Welcome to Service Manager! Your account has been created successfully.</p>
          <p>You can now log in and start using our services.</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Log In Now
            </a>
          </div>
          <p>Thank you for joining us!</p>
        </div>
      `,
    });
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    to: string,
    username: string,
    transactionDetails: {
      type: string;
      amount: string;
      currency: string;
      reference: string;
      timestamp: string;
    }
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Transaction Notification - ${transactionDetails.reference}`,
      text: `Hello ${username},\n\nTransaction ${transactionDetails.type}\nAmount: ${transactionDetails.amount} ${transactionDetails.currency}\nReference: ${transactionDetails.reference}\nDate: ${transactionDetails.timestamp}\n\nThank you for using our services.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Transaction Notification</h2>
          <p>Hello ${username},</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Type:</strong></td>
                <td style="padding: 8px 0;">${transactionDetails.type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                <td style="padding: 8px 0;">${transactionDetails.amount} ${transactionDetails.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Reference:</strong></td>
                <td style="padding: 8px 0;">${transactionDetails.reference}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Date:</strong></td>
                <td style="padding: 8px 0;">${transactionDetails.timestamp}</td>
              </tr>
            </table>
          </div>
          <p>Thank you for using our services.</p>
        </div>
      `,
    });
  }

  /**
   * Send account statement email with file attachment (PDF/Excel/CSV)
   */
  async sendStatementEmail(
    to: string,
    accountName: string,
    accountNumber: string,
    startDate: string,
    endDate: string,
    format: 'PDF' | 'EXCEL' | 'CSV',
    fileBuffer: Buffer,
    filename: string,
    password?: string
  ): Promise<boolean> {
    const isPDF = format === 'PDF';

    const subject = `Account Statement - ${accountNumber} (${format})`;

    const textMessage = isPDF
      ? `Dear ${accountName},

Your account statement for period ${startDate} to ${endDate} is attached as a password-protected PDF.

To open the PDF, use the following password:
${password}

This password is your: FirstName + LastName + Username (no spaces)
Example: If your name is John Doe and username is john.doe, the password is: JohnDoejohn.doe

Please keep this password secure.

Best regards,
FDH Bank`
      : `Dear ${accountName},

Your account statement for period ${startDate} to ${endDate} is attached as ${format} format.

You can open this file with any spreadsheet application (${format === 'EXCEL' ? 'Microsoft Excel, Google Sheets, etc.' : 'Microsoft Excel, Google Sheets, any text editor, etc.'}).

Best regards,
FDH Bank`;

    const htmlMessage = isPDF
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Statement</h2>
          <p>Dear ${accountName},</p>
          <p>Your account statement for period <strong>${startDate}</strong> to <strong>${endDate}</strong> is attached as a password-protected PDF.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Account Number:</strong> ${accountNumber}</p>
            <p><strong>PDF Password:</strong></p>
            <div style="background-color: #007bff; color: white; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 10px 0; border-radius: 5px;">
              ${password}
            </div>
            <p style="font-size: 14px; color: #666;">
              This password is your: FirstName + LastName + Username (no spaces)<br>
              <em>Example: If your name is John Doe and username is john.doe, the password is: JohnDoejohn.doe</em>
            </p>
          </div>
          
          <p style="color: #dc3545; font-size: 14px;">⚠️ Please keep this password secure. Do not share it with anyone.</p>
          <p>Best regards,<br>FDH Bank</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Statement</h2>
          <p>Dear ${accountName},</p>
          <p>Your account statement for period <strong>${startDate}</strong> to <strong>${endDate}</strong> is attached as <strong>${format}</strong> format.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Account Number:</strong> ${accountNumber}</p>
            <p><strong>File Format:</strong> ${format}</p>
            <p style="font-size: 14px; color: #666;">
              ${format === 'EXCEL'
        ? 'You can open this file with Microsoft Excel, Google Sheets, or any spreadsheet application.'
        : 'You can open this file with any spreadsheet application or text editor.'}
            </p>
          </div>
          
          <p>Best regards,<br>FDH Bank</p>
        </div>
      `;

    return this.sendEmail({
      to,
      subject,
      text: textMessage,
      html: htmlMessage,
      attachments: [
        {
          filename,
          content: fileBuffer,
        },
      ],
    });
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    const transporter = getTransporter();
    try {
      await transporter.verify();
      console.log("✅ Email server connection verified");
      return true;
    } catch (error) {
      console.error("❌ Email server connection failed:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
