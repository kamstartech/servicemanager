import { prisma } from "@/lib/db/prisma";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ESBSMSService } from "@/lib/services/sms";
import { emailService } from "@/lib/services/email";

const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";

async function issueMobileUserSecret(
  mobileUserId: number
): Promise<string | null> {
  const secret = crypto.randomBytes(32).toString("base64url");
  const secretHash = await bcrypt.hash(secret, 12);

  try {
    await prisma.mobileUser.update({
      where: { id: mobileUserId },
      data: { secretHash },
    });
  } catch (err) {
    console.error("Failed to persist mobile user secretHash:", err);
    return null;
  }

  return secret;
}

export const deviceVerificationResolvers = {
  Mutation: {
    async verifyDeviceOtp(
      _parent: unknown,
      args: { verificationToken: string; otpCode: string }
    ) {
      const { verificationToken, otpCode } = args;

      // Find attempt
      const attempt = await prisma.deviceLoginAttempt.findUnique({
        where: { verificationToken },
        include: { mobileUser: true },
      });

      if (!attempt) {
        throw new Error("Invalid verification token");
      }

      // Check expiry
      if (attempt.otpExpiresAt && new Date() > attempt.otpExpiresAt) {
        await prisma.deviceLoginAttempt.update({
          where: { id: attempt.id },
          data: { status: "EXPIRED" },
        });
        throw new Error("Verification code expired. Please request a new code.");
      }

      // Check max attempts
      if (attempt.otpAttempts >= 5) {
        throw new Error("Too many failed attempts. Please request a new code.");
      }

      // Verify OTP
      if (attempt.otpCode !== otpCode) {
        await prisma.deviceLoginAttempt.update({
          where: { id: attempt.id },
          data: {
            otpAttempts: { increment: 1 },
            status: "FAILED_OTP",
          },
        });
        throw new Error("Invalid verification code");
      }

      if (!attempt.mobileUserId || !attempt.deviceId) {
        throw new Error("Invalid verification session");
      }

      // ✅ OTP VERIFIED - Create device!
      const verifiedVia = attempt.otpSentTo?.includes("@") ? "OTP_EMAIL" : "OTP_SMS";

      const device = await prisma.mobileDevice.upsert({
        where: {
          mobileUserId_deviceId: {
            mobileUserId: attempt.mobileUserId,
            deviceId: attempt.deviceId,
          },
        },
        create: {
          mobileUserId: attempt.mobileUserId,
          deviceId: attempt.deviceId,
          name: attempt.deviceName || "Mobile Device",
          model: attempt.deviceModel,
          os: attempt.deviceOs,
          verifiedVia,
          verificationIp: attempt.ipAddress,
          verificationLocation: attempt.location,
          isActive: true,
        },
        update: {
          name: attempt.deviceName || "Mobile Device",
          model: attempt.deviceModel,
          os: attempt.deviceOs,
          verifiedVia,
          verificationIp: attempt.ipAddress,
          verificationLocation: attempt.location,
          isActive: true,
        },
      });

      // Update attempt status
      await prisma.deviceLoginAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "VERIFIED",
          otpVerifiedAt: new Date(),
        },
      });

      // Fetch user's accounts and profile
      const accounts = await prisma.mobileUserAccount.findMany({
        where: { mobileUserId: attempt.mobileUserId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });

      const profile = await prisma.mobileUserProfile.findUnique({
        where: { mobileUserId: attempt.mobileUserId },
      });

      // Fetch app structure for user's context
      const appStructure = await prisma.appScreen.findMany({
        where: {
          context: attempt.context as any,
          isActive: true,
        },
        include: {
          pages: {
            where: { isActive: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      });

      // Generate session ID and JWT token
      const sessionId = crypto.randomUUID();
      const token = jwt.sign(
        {
          userId: attempt.mobileUserId,
          username: attempt.mobileUser!.username,
          phoneNumber: attempt.mobileUser!.phoneNumber,
          context: attempt.context,
          deviceId: device.deviceId,
          sessionId,
        },
        JWT_SECRET,
        {
          expiresIn: JWT_EXPIRES_IN as any,
          issuer: "service-manager-admin",
          subject: String(attempt.mobileUserId),
        }
      );

      // Create device session
      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      await prisma.deviceSession.create({
        data: {
          deviceId: device.deviceId,
          mobileUserId: attempt.mobileUserId!,
          tokenHash,
          sessionId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          ipAddress: attempt.ipAddress,
          isActive: true,
        },
      });

      const secret = await issueMobileUserSecret(attempt.mobileUserId!);

      return {
        success: true,
        token,
        secret,
        user: {
          id: attempt.mobileUser!.id,
          context: attempt.mobileUser!.context,
          username: attempt.mobileUser!.username,
          phoneNumber: attempt.mobileUser!.phoneNumber,
          customerNumber: attempt.mobileUser!.customerNumber,
          accountNumber: attempt.mobileUser!.accountNumber,
          isActive: attempt.mobileUser!.isActive,
          accounts: accounts.map((acc: any) => ({
            id: acc.id,
            accountNumber: acc.accountNumber,
            accountName: acc.accountName,
            accountType: acc.accountType,
            currency: acc.currency,
            accountStatus: acc.accountStatus,
            holderName: acc.holderName,
            nickName: acc.nickName,
            balance: acc.balance?.toString(),
            workingBalance: acc.workingBalance?.toString(),
            frozen: acc.frozen ?? false,
            isHidden: acc.isHidden ?? false,
            isPrimary: acc.isPrimary ?? false,
            isActive: acc.isActive ?? false,
            createdAt: acc.createdAt.toISOString(),
            updatedAt: acc.updatedAt.toISOString(),
          })),
          primaryAccount: accounts.find((acc: any) => acc.isPrimary)
            ? {
              id: accounts.find((acc: any) => acc.isPrimary)!.id,
              accountNumber: accounts.find((acc: any) => acc.isPrimary)!
                .accountNumber,
              accountName: accounts.find((acc: any) => acc.isPrimary)!.accountName,
              accountType: accounts.find((acc: any) => acc.isPrimary)!.accountType,
              currency: accounts.find((acc: any) => acc.isPrimary)!.currency,
              accountStatus: accounts.find((acc: any) => acc.isPrimary)!
                .accountStatus,
              holderName: accounts.find((acc: any) => acc.isPrimary)!.holderName,
              nickName: accounts.find((acc: any) => acc.isPrimary)!.nickName,
              balance: accounts
                .find((acc: any) => acc.isPrimary)!
                .balance?.toString(),
              workingBalance: accounts
                .find((acc: any) => acc.isPrimary)!
                .workingBalance?.toString(),
              frozen: accounts.find((acc: any) => acc.isPrimary)!.frozen ?? false,
              isHidden: accounts.find((acc: any) => acc.isPrimary)!.isHidden ?? false,
              isPrimary: true,
              isActive: accounts.find((acc: any) => acc.isPrimary)!.isActive ?? false,
              createdAt: accounts
                .find((acc: any) => acc.isPrimary)!
                .createdAt.toISOString(),
              updatedAt: accounts
                .find((acc: any) => acc.isPrimary)!
                .updatedAt.toISOString(),
            }
            : null,
          profile: profile
            ? {
              id: profile.id,
              mobileUserId: profile.mobileUserId,
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email,
              phone: profile.phone,
              address: profile.address,
              city: profile.city,
              country: profile.country,
              zip: profile.zip,
              createdAt: profile.createdAt.toISOString(),
              updatedAt: profile.updatedAt.toISOString(),
            }
            : null,
          createdAt: attempt.mobileUser!.createdAt.toISOString(),
          updatedAt: attempt.mobileUser!.updatedAt.toISOString(),
        },
        device: {
          id: device.id,
          name: device.name,
          model: device.model,
          os: device.os,
          isActive: device.isActive,
          createdAt: device.createdAt.toISOString(),
          updatedAt: device.updatedAt.toISOString(),
        },
        message: "Device verified successfully",
        appStructure: appStructure.map((screen) => ({
          id: screen.id,
          name: screen.name,
          context: screen.context,
          icon: screen.icon,
          order: screen.order,
          isActive: screen.isActive,
          isTesting: screen.isTesting,
          pages: screen.pages.map((page) => ({
            id: page.id,
            name: page.name,
            icon: page.icon,
            order: page.order,
            isActive: page.isActive,
            isTesting: page.isTesting,
            screenId: page.screenId,
            createdAt: page.createdAt.toISOString(),
            updatedAt: page.updatedAt.toISOString(),
          })),
          createdAt: screen.createdAt.toISOString(),
          updatedAt: screen.updatedAt.toISOString(),
        })),
      };
    },

    async resendDeviceOtp(
      _parent: unknown,
      args: { verificationToken: string }
    ) {
      const { verificationToken } = args;

      const attempt = await prisma.deviceLoginAttempt.findUnique({
        where: { verificationToken },
        include: { mobileUser: true },
      });

      if (!attempt || !attempt.mobileUser) {
        throw new Error("Invalid verification token");
      }

      // Check if already verified
      if (attempt.status === "VERIFIED") {
        throw new Error("Device already verified");
      }

      // Rate limiting: Check if last OTP was sent < 60 seconds ago
      if (
        attempt.otpSentAt &&
        new Date().getTime() - attempt.otpSentAt.getTime() < 60000
      ) {
        throw new Error("Please wait 60 seconds before requesting a new code");
      }

      // Generate new OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      // Update attempt
      await prisma.deviceLoginAttempt.update({
        where: { id: attempt.id },
        data: {
          otpCode,
          otpSentAt: new Date(),
          otpExpiresAt,
          otpAttempts: 0, // Reset attempts
          status: "PENDING_VERIFICATION",
        },
      });

      // Send OTP (integrate with SMS/Email service)
      const sentTo = attempt.otpSentTo!;
      if (sentTo.includes("@")) {
        await emailService.sendOTP(sentTo, otpCode, attempt.mobileUser.username);
      } else {
        const smsResult = await ESBSMSService.sendOTP(sentTo, otpCode, attempt.mobileUserId!);
        if (!smsResult.success) {
          throw new Error(smsResult.error || "Failed to send OTP");
        }
      }

      return true;
    },
  },
};
