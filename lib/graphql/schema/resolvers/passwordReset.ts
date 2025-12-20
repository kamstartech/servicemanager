import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ESBSMSService } from "@/lib/services/sms";
import { emailService } from "@/lib/services/email";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// In-memory OTP storage (use Redis in production)
const otpStorage = new Map<
  string,
  {
    otp: string;
    userId: number;
    phoneNumber: string;
    deviceId: string;
    expiresAt: Date;
  }
>();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const passwordResetResolvers = {
  Mutation: {
    // Step 1: Initiate password reset with memo word
    initiatePasswordReset: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          username: string;
          secret: string;
          phoneNumber?: string;
          deviceId: string;
          deviceName?: string;
        };
      }
    ) => {
      try {
        const { username, secret, phoneNumber, deviceId, deviceName } = input;

        // 1. Find user by username
        const user = await prisma.mobileUser.findFirst({
          where: {
            username: username,
            isActive: true,
          },
          include: {
            profile: true,
          },
        });

        if (!user) {
          return {
            success: false,
            message: "User not found",
            resetToken: null,
            otpSentTo: null,
          };
        }

        // 2. Verify secret
        if (!user.secretHash) {
          return {
            success: false,
            message: "Secret not set for this account",
            resetToken: null,
            otpSentTo: null,
          };
        }

        const secretMatch = await bcrypt.compare(secret, user.secretHash);
        if (!secretMatch) {
          // Log failed attempt
          await prisma.deviceLoginAttempt.create({
            data: {
              mobileUserId: user.id,
              deviceId: deviceId,
              attemptType: "PASSWORD_LOGIN",
              status: "FAILED_CREDENTIALS",
              attemptedAt: new Date(),
            },
          });

          return {
            success: false,
            message: "Invalid secret",
            resetToken: null,
            otpSentTo: null,
          };
        }

        // 3. Determine where to send OTP (phone or email)
        const sendSMS = !!(user.phoneNumber && user.smsNotifications);
        const email = user.profile?.email;
        const sendEmail = !!(email && user.emailNotifications);

        if (!sendSMS && !sendEmail) {
          return {
            success: false,
            message: "No phone number or email is enabled for verification on this account",
            resetToken: null,
            otpSentTo: null,
          };
        }

        // 4. Generate OTP and reset token
        const otp = generateOTP();
        const resetToken = crypto.randomUUID();

        const maskedContacts: string[] = [];
        const sentToDetails: string[] = [];

        if (sendSMS) {
          maskedContacts.push(`***${user.phoneNumber!.slice(-4)}`);
          sentToDetails.push(user.phoneNumber!);
        }
        if (sendEmail) {
          const [local, domain] = email!.split("@");
          maskedContacts.push(`${local[0]}***@${domain}`);
          sentToDetails.push(email!);
        }

        const otpSentTo = maskedContacts.join(" and ");
        const fullSentTo = sentToDetails.join(", ");

        // Store OTP (expires in 5 minutes)
        otpStorage.set(resetToken, {
          otp,
          userId: user.id,
          phoneNumber: fullSentTo,
          deviceId: deviceId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        // 5. Send OTP to all enabled channels
        if (sendSMS) {
          const smsResult = await ESBSMSService.sendOTP(user.phoneNumber!, otp, user.id);
          if (!smsResult.success && !sendEmail) {
            otpStorage.delete(resetToken);
            return {
              success: false,
              message: smsResult.error || "Failed to send OTP",
              resetToken: null,
              otpSentTo: null,
            };
          }
        }

        if (sendEmail) {
          try {
            await emailService.sendOTP(email!, otp, user.username ?? username);
          } catch (e) {
            if (!sendSMS) {
              otpStorage.delete(resetToken);
              throw e;
            }
          }
        }

        // 6. Log attempt
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            deviceId: deviceId,
            attemptType: "OTP_VERIFY",
            status: "PENDING_VERIFICATION",
            attemptedAt: new Date(),
          },
        });

        return {
          success: true,
          message: `OTP sent to ${otpSentTo}`,
          resetToken,
          otpSentTo,
        };
      } catch (error) {
        console.error("Error initiating password reset:", error);
        return {
          success: false,
          message: "Failed to initiate password reset",
          resetToken: null,
          otpSentTo: null,
        };
      }
    },

    // Step 2: Verify OTP
    verifyResetOTP: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          resetToken: string;
          otp: string;
          deviceId: string;
        };
      }
    ) => {
      try {
        const { resetToken, otp, deviceId } = input;

        // 1. Lookup OTP
        const stored = otpStorage.get(resetToken);

        if (!stored) {
          return {
            success: false,
            message: "Invalid or expired reset token",
            verifiedToken: null,
          };
        }

        // 2. Check expiration
        if (new Date() > stored.expiresAt) {
          otpStorage.delete(resetToken);
          return {
            success: false,
            message: "OTP has expired",
            verifiedToken: null,
          };
        }

        // 3. Verify device matches
        if (stored.deviceId !== deviceId) {
          return {
            success: false,
            message: "Device mismatch",
            verifiedToken: null,
          };
        }

        // 4. Verify OTP
        if (stored.otp !== otp) {
          await prisma.deviceLoginAttempt.create({
            data: {
              mobileUserId: stored.userId,
              deviceId: deviceId,
              attemptType: "OTP_VERIFY",
              status: "FAILED_OTP",
              attemptedAt: new Date(),
            },
          });

          return {
            success: false,
            message: "Invalid OTP",
            verifiedToken: null,
          };
        }

        // 5. Generate verified token (valid for 10 minutes)
        const verifiedToken = crypto.randomUUID();
        otpStorage.set(verifiedToken, {
          ...stored,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        // Remove old token
        otpStorage.delete(resetToken);

        // 6. Log success
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: stored.userId,
            deviceId: deviceId,
            attemptType: "OTP_VERIFY",
            status: "VERIFIED",
            attemptedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "OTP verified successfully",
          verifiedToken,
        };
      } catch (error) {
        console.error("Error verifying reset OTP:", error);
        return {
          success: false,
          message: "Failed to verify OTP",
          verifiedToken: null,
        };
      }
    },

    // Step 3: Complete password reset with new password
    completePasswordReset: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          verifiedToken: string;
          newPassword: string;
          deviceId: string;
        };
      }
    ) => {
      try {
        const { verifiedToken, newPassword, deviceId } = input;

        // 1. Lookup verified token
        const stored = otpStorage.get(verifiedToken);

        if (!stored) {
          return {
            success: false,
            message: "Invalid or expired verification token",
            token: null,
          };
        }

        // 2. Check expiration
        if (new Date() > stored.expiresAt) {
          otpStorage.delete(verifiedToken);
          return {
            success: false,
            message: "Verification token has expired",
            token: null,
          };
        }

        // 3. Verify device matches
        if (stored.deviceId !== deviceId) {
          return {
            success: false,
            message: "Device mismatch",
            token: null,
          };
        }

        // 4. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 5. Update password in database
        const user = await prisma.mobileUser.update({
          where: { id: stored.userId },
          data: { passwordHash: hashedPassword },
        });

        // 6. Revoke all existing sessions (force re-login on all devices)
        await prisma.deviceSession.updateMany({
          where: {
            mobileUserId: user.id,
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        });

        // 7. Register or update device
        let device = await prisma.mobileDevice.findFirst({
          where: {
            mobileUserId: user.id,
            deviceId: deviceId,
          },
        });

        if (!device) {
          device = await prisma.mobileDevice.create({
            data: {
              mobileUserId: user.id,
              deviceId: deviceId,
              name: "Reset Device",
              isActive: true,

              lastUsedAt: new Date(),
            },
          });
        } else {
          await prisma.mobileDevice.update({
            where: { id: device.id },
            data: {
              isActive: true,

              lastUsedAt: new Date(),
            },
          });
        }

        // 8. Generate new JWT token and session
        const sessionId = crypto.randomUUID();
        const token = jwt.sign(
          {
            userId: user.id,
            username: user.username,
            phoneNumber: user.phoneNumber,
            context: user.context,
            deviceId: deviceId,
            sessionId: sessionId,
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN as any }
        );

        // Create session
        const tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        await prisma.deviceSession.create({
          data: {
            deviceId: deviceId,
            mobileUserId: user.id,
            tokenHash: tokenHash,
            sessionId: sessionId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
        });

        // 9. Clean up OTP storage
        otpStorage.delete(verifiedToken);

        // 10. Log success
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            deviceId: deviceId,
            attemptType: "PASSWORD_LOGIN",
            status: "SUCCESS",
            attemptedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Password reset successful",
          token,
        };
      } catch (error) {
        console.error("Error completing password reset:", error);
        return {
          success: false,
          message: "Failed to reset password",
          token: null,
        };
      }
    },
  },
};
