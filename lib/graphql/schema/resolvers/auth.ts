import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { ESBSMSService } from "@/lib/services/sms";
import { emailService } from "@/lib/services/email";
import type { Prisma } from "@prisma/client";

type LoginInput = {
  username: string;
  password: string;
  context: string;
  deviceId: string;
  deviceName: string;
  ipAddress?: string;
  location?: string;
  deviceModel?: string;
  deviceOs?: string;
};

// Get JWT secret from environment or use default for development
const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "24h";

// Helper function to mask contact info
function maskContact(contact: string, method: "SMS" | "EMAIL"): string {
  if (method === "SMS") {
    // +265888123456 → +265***3456
    const match = contact.match(/(\+?\d{1,4})(\d+)(\d{4})/);
    if (match) {
      return `${match[1]}***${match[3]}`;
    }
    return contact;
  } else {
    // john@example.com → j***@example.com
    const [local, domain] = contact.split("@");
    if (local && domain) {
      return `${local[0]}***@${domain}`;
    }
    return contact;
  }
}



export const authResolvers = {
  Mutation: {
    async login(_parent: unknown, args: { input: LoginInput }) {
      const {
        username,
        password,
        context,
        deviceId,
        deviceName,
        ipAddress,
        location,
        deviceModel,
        deviceOs,
      } = args.input;

      // 1. Find user by username/phoneNumber and context
      // For WALLET context, use phoneNumber; for others, use username
      const user = await prisma.mobileUser.findFirst({
        where: {
          ...(context === "WALLET"
            ? { phoneNumber: username }
            : { username }),
          context: context as any,
          isActive: true,
        },
      });

      // Timing attack prevention - always hash even if user not found
      if (!user || !user.passwordHash) {
        // Log failed attempt
        await prisma.deviceLoginAttempt.create({
          data: {
            username,
            context,
            deviceId,
            deviceName,
            deviceModel,
            deviceOs,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "FAILED_CREDENTIALS",
            failureReason: "Invalid username or password",
            attemptedAt: new Date(),
          },
        });

        await bcrypt.compare(
          password,
          "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBL0dKzGK"
        );
        throw new Error("Invalid credentials");
      }

      // 2. Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        // Log failed attempt
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            username,
            context,
            deviceId,
            deviceName,
            deviceModel,
            deviceOs,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "FAILED_CREDENTIALS",
            failureReason: "Invalid password",
            attemptedAt: new Date(),
          },
        });

        throw new Error("Invalid credentials");
      }

      // 3. ✅ Password is correct - Check if device exists
      const existingDevice = await prisma.mobileDevice.findFirst({
        where: {
          mobileUserId: user.id,
          deviceId,
        },
      });

      if (existingDevice && existingDevice.isActive) {
        // 3a. Known active device - allow login
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.mobileDevice.update({
            where: { id: existingDevice.id },
            data: {
              name: deviceName ?? existingDevice.name,
              lastUsedAt: new Date(),
              lastLoginIp: ipAddress,
              loginCount: { increment: 1 },
            },
          });

          // Backfill primary device if none exists (important for users created before isPrimary)
          const primary = await tx.mobileDevice.findFirst({
            where: { mobileUserId: user.id, isPrimary: true },
            select: { id: true },
          });

          if (!primary) {
            await tx.mobileDevice.updateMany({
              where: { mobileUserId: user.id },
              data: { isPrimary: false },
            });
            await tx.mobileDevice.update({
              where: { id: existingDevice.id },
              data: { isPrimary: true },
            });
          }
        });

        // Log successful login
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            username,
            context,
            deviceId,
            deviceName,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "SUCCESS",
            attemptedAt: new Date(),
          },
        });

        // Fetch user's accounts and profile
        const accounts = await prisma.mobileUserAccount.findMany({
          where: { mobileUserId: user.id },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        });

        const profile = await prisma.mobileUserProfile.findUnique({
          where: { mobileUserId: user.id },
        });

        // Generate session ID and JWT token
        const sessionId = crypto.randomUUID();
        const token = jwt.sign(
          {
            userId: user.id,
            username: user.username,
            context: user.context,
            phoneNumber: user.phoneNumber,
            deviceId,
            sessionId,
          },
          JWT_SECRET,
          {
            expiresIn: JWT_EXPIRES_IN as any,
            issuer: "service-manager-admin",
            subject: String(user.id),
          }
        );

        // Create device session
        const tokenHash = crypto
          .createHash("sha256")
          .update(token)
          .digest("hex");

        await prisma.deviceSession.create({
          data: {
            deviceId: existingDevice.deviceId,
            mobileUserId: user.id,
            tokenHash,
            sessionId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ipAddress,
            userAgent: deviceName, // Use deviceName as userAgent proxy
            isActive: true,
          },
        });



        // Fetch app structure for user's context
        const appStructure = await prisma.appScreen.findMany({
          where: {
            context: user.context,
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

        return {
          success: true,
          user: {
            id: user.id,
            context: user.context,
            username: user.username,
            phoneNumber: user.phoneNumber,
            customerNumber: user.customerNumber,
            accountNumber: user.accountNumber,
            isActive: user.isActive,
            accounts: accounts.map((acc) => ({
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
            primaryAccount: accounts.find((acc) => acc.isPrimary)
              ? {
                id: accounts.find((acc) => acc.isPrimary)!.id,
                accountNumber: accounts.find((acc) => acc.isPrimary)!
                  .accountNumber,
                accountName: accounts.find((acc) => acc.isPrimary)!
                  .accountName,
                accountType: accounts.find((acc) => acc.isPrimary)!
                  .accountType,
                currency: accounts.find((acc) => acc.isPrimary)!.currency,
                accountStatus: accounts.find((acc) => acc.isPrimary)!
                  .accountStatus,
                holderName: accounts.find((acc) => acc.isPrimary)!.holderName,
                nickName: accounts.find((acc) => acc.isPrimary)!.nickName,
                balance: accounts
                  .find((acc) => acc.isPrimary)!
                  .balance?.toString(),
                workingBalance: accounts
                  .find((acc) => acc.isPrimary)!
                  .workingBalance?.toString(),
                frozen: accounts.find((acc) => acc.isPrimary)!.frozen ?? false,
                isHidden: accounts.find((acc) => acc.isPrimary)!.isHidden ?? false,
                isPrimary: true,
                isActive: accounts.find((acc) => acc.isPrimary)!.isActive ?? false,
                createdAt: accounts
                  .find((acc) => acc.isPrimary)!
                  .createdAt.toISOString(),
                updatedAt: accounts
                  .find((acc) => acc.isPrimary)!
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
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          token,
          secret: null,
          message: "Login successful",
          devicePending: false,
          requiresVerification: false,
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
      }

      // 3b. NEW DEVICE or inactive device - Check if user has any devices
      const hasAnyDevice = await prisma.mobileDevice.count({
        where: { mobileUserId: user.id, isActive: true },
      });

      const isFirstDevice = hasAnyDevice === 0;

      if (isFirstDevice) {
        // First device - Send OTP for verification
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        const verificationToken = crypto.randomUUID();

        // Determine verification method
        const profile = await prisma.mobileUserProfile.findUnique({
          where: { mobileUserId: user.id },
        });

        const email = profile?.email;
        const verificationMethod = user.phoneNumber ? "SMS" : "EMAIL";
        const sentTo = verificationMethod === "SMS" ? user.phoneNumber : email;

        if (!sentTo) {
          throw new Error("No phone number or email associated with this account");
        }

        // Create login attempt with OTP
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            username,
            context,
            deviceId,
            deviceName,
            deviceModel,
            deviceOs,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "PENDING_VERIFICATION",
            otpCode,
            otpSentTo: sentTo,
            otpSentAt: new Date(),
            otpExpiresAt,
            verificationToken,
            attemptedAt: new Date(),
          },
        });

        if (verificationMethod === "SMS") {
          const smsResult = await ESBSMSService.sendOTP(sentTo, otpCode, user.id);
          if (!smsResult.success) {
            throw new Error(smsResult.error || "Failed to send OTP");
          }
        } else {
          await emailService.sendOTP(sentTo, otpCode, user.username ?? username ?? "");
        }

        // Mask contact
        const maskedContact = maskContact(sentTo, verificationMethod);

        return {
          success: true,
          requiresVerification: true,
          verificationMethod,
          maskedContact,
          verificationToken,
          message: `Verification code sent to ${maskedContact}`,
          devicePending: false,
        };
      }

      // 3c. Second+ device - Requires admin approval
      await prisma.$transaction([
        prisma.mobileDevice.upsert({
          where: {
            mobileUserId_deviceId: {
              mobileUserId: user.id,
              deviceId,
            },
          },
          create: {
            mobileUserId: user.id,
            deviceId,
            name: deviceName || "Mobile Device",
            model: deviceModel,
            os: deviceOs,
            isActive: false,
            isPrimary: false,
            lastLoginIp: ipAddress,
            verificationIp: ipAddress,
            verificationLocation: location,
          },
          update: {
            name: deviceName,
            model: deviceModel,
            os: deviceOs,
            isActive: false,
            isPrimary: false,
            lastLoginIp: ipAddress,
          },
        }),
        prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            username,
            context,
            deviceId,
            deviceName,
            deviceModel,
            deviceOs,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "PENDING_APPROVAL",
            attemptedAt: new Date(),
          },
        }),
      ]);

      return {
        success: true,
        requiresApproval: true,
        message: "Device pending admin approval",
        devicePending: true,
        requiresVerification: false,
      };
    },

    async resetMobileUserPassword(
      _parent: unknown,
      args: { input: { userId: string } }
    ) {
      const { userId } = args.input;

      const user = await prisma.mobileUser.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Generate 6-digit password for wallet users, alphanumeric for others
      const tempPassword = user.context === "WALLET"
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await prisma.mobileUser.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return {
        success: true,
        tempPassword,
        message: "Temporary password generated successfully",
      };
    },
  },
};
