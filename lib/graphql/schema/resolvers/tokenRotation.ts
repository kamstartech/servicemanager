import { prisma } from "@/lib/db/prisma";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const tokenRotationResolvers = {
  Mutation: {
    secureRotateUserToken: async (
      _: unknown,
      { input }: { input: { currentToken: string; deviceId: string } }
    ) => {
      try {
        const { currentToken, deviceId } = input;

        // 1. Verify JWT signature and decode
        let decoded: any;
        try {
          decoded = jwt.verify(currentToken, JWT_SECRET);
        } catch (err) {
          return {
            success: false,
            token: null,
            message: "Invalid or expired token",
          };
        }

        // 2. Extract userId from token (not from input!)
        const userId = decoded.userId;

        // 3. Hash current token to find session
        const currentTokenHash = crypto
          .createHash("sha256")
          .update(currentToken)
          .digest("hex");

        // 4. Verify session exists and is active
        const currentSession = await prisma.deviceSession.findUnique({
          where: { tokenHash: currentTokenHash },
          include: { mobileUser: true },
        });

        if (!currentSession) {
          return {
            success: false,
            token: null,
            message: "Session not found",
          };
        }

        if (!currentSession.isActive) {
          return {
            success: false,
            token: null,
            message: "Session has been revoked",
          };
        }

        if (new Date() > currentSession.expiresAt) {
          return {
            success: false,
            token: null,
            message: "Session expired",
          };
        }

        // 5. Verify device belongs to user and is active
        const device = await prisma.mobileDevice.findFirst({
          where: {
            mobileUserId: userId,
            deviceId: deviceId,
            isActive: true,
          },
        });

        if (!device) {
          return {
            success: false,
            token: null,
            message: "Device not found or not active",
          };
        }

        // 6. Verify user is active
        if (!currentSession.mobileUser.isActive) {
          return {
            success: false,
            token: null,
            message: "User account is inactive",
          };
        }

        // 7. Revoke old session
        await prisma.deviceSession.update({
          where: { id: currentSession.id },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        });

        // 8. Generate new session ID and token
        const newSessionId = crypto.randomUUID();
        const newToken = jwt.sign(
          {
            userId: currentSession.mobileUser.id,
            username: currentSession.mobileUser.username,
            phoneNumber: currentSession.mobileUser.phoneNumber,
            context: currentSession.mobileUser.context,
            deviceId: deviceId,
            sessionId: newSessionId,
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN as any }
        );

        // 9. Create new session
        const newTokenHash = crypto
          .createHash("sha256")
          .update(newToken)
          .digest("hex");

        await prisma.deviceSession.create({
          data: {
            deviceId: deviceId,
            mobileUserId: userId,
            tokenHash: newTokenHash,
            sessionId: newSessionId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            ipAddress: currentSession.ipAddress,
            userAgent: currentSession.userAgent,
            isActive: true,
          },
        });

        // 10. Log rotation event
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: userId,
            deviceId: deviceId,
            attemptType: "PASSWORD_LOGIN",
            status: "SUCCESS",
            attemptedAt: new Date(),
          },
        });

        return {
          success: true,
          token: newToken,
          message: "Token rotated successfully for this device",
        };
      } catch (error) {
        console.error("Error rotating token:", error);
        return {
          success: false,
          token: null,
          message: "Failed to rotate token",
        };
      }
    },

    // Admin can revoke all sessions for a user
    revokeAllUserSessions: async (
      _: unknown,
      { userId }: { userId: string }
    ) => {
      try {
        const userIdInt = parseInt(userId);

        const result = await prisma.deviceSession.updateMany({
          where: {
            mobileUserId: userIdInt,
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        });

        return {
          success: true,
          message: `Revoked ${result.count} active sessions`,
        };
      } catch (error) {
        console.error("Error revoking sessions:", error);
        return {
          success: false,
          message: "Failed to revoke sessions",
        };
      }
    },

    // Revoke single device sessions
    revokeDeviceSessions: async (
      _: unknown,
      { userId, deviceId }: { userId: string; deviceId: string }
    ) => {
      try {
        const userIdInt = parseInt(userId);

        const result = await prisma.deviceSession.updateMany({
          where: {
            mobileUserId: userIdInt,
            deviceId: deviceId,
            isActive: true,
          },
          data: {
            isActive: false,
            revokedAt: new Date(),
          },
        });

        return {
          success: true,
          message: `Revoked ${result.count} sessions for device`,
        };
      } catch (error) {
        console.error("Error revoking device sessions:", error);
        return {
          success: false,
          message: "Failed to revoke device sessions",
        };
      }
    },
  },

  Query: {
    // Get active sessions for a user
    activeSessions: async (_: unknown, { userId }: { userId: string }) => {
      const userIdInt = parseInt(userId);

      const sessions = await prisma.deviceSession.findMany({
        where: {
          mobileUserId: userIdInt,
          isActive: true,
        },
        orderBy: { lastActivityAt: "desc" },
      });

      return sessions.map((session) => ({
        id: session.id,
        deviceId: session.deviceId,
        lastActivityAt: session.lastActivityAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }));
    },
  },
};
