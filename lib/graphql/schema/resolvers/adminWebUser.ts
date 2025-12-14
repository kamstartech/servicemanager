import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth/jwt";

interface AdminWebLoginInput {
  email: string;
  password: string;
}

interface AdminWebPasswordResetRequestInput {
  email: string;
}

interface AdminWebPasswordResetInput {
  token: string;
  newPassword: string;
}

export const adminWebUserResolvers = {
  Query: {
    async adminWebUsers() {
      const users = await prisma.adminWebUser.findMany({
        orderBy: { createdAt: "desc" },
      });

      return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }));
    },
  },
  Mutation: {
    async adminWebLogin(
      _parent: unknown,
      args: { input: AdminWebLoginInput },
    ) {
      const { email, password } = args.input;

      const user = await prisma.adminWebUser.findUnique({
        where: { email },
      });

      // Timing attack prevention
      if (!user || !user.passwordHash) {
        await bcrypt.compare(
          password,
          "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBL0dKzGK",
        );
        throw new Error("Invalid credentials");
      }

      if (!user.isActive) {
        throw new Error("Invalid credentials");
      }

      const isValidPassword = await bcrypt.compare(
        password,
        user.passwordHash,
      );

      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      const token = generateToken({
        userId: user.id,
        username: user.email,
        context: "ADMIN_WEB",
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        token,
        message: "Login successful",
      };
    },

    async adminWebRequestPasswordReset(
      _parent: unknown,
      args: { input: AdminWebPasswordResetRequestInput },
    ) {
      const { email } = args.input;
      const user = await prisma.adminWebUser.findUnique({ where: { email } });

      if (!user) {
        // Do not leak whether the email exists
        return true;
      }

      const rawToken = await bcrypt.genSalt(10);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await prisma.adminWebPasswordResetToken.create({
        data: {
          token: rawToken,
          userId: user.id,
          expiresAt,
        },
      });

      // TODO: integrate with real email delivery system.
      console.log("[AdminWeb] Password reset token", {
        email,
        token: rawToken,
      });

      return true;
    },

    async adminWebResetPassword(
      _parent: unknown,
      args: { input: AdminWebPasswordResetInput },
    ) {
      const { token, newPassword } = args.input;

      const record = await prisma.adminWebPasswordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!record || !record.user) {
        throw new Error("Invalid or expired token");
      }

      if (record.usedAt || record.expiresAt < new Date()) {
        throw new Error("Invalid or expired token");
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.$transaction([
        prisma.adminWebUser.update({
          where: { id: record.userId },
          data: { passwordHash },
        }),
        prisma.adminWebPasswordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
      ]);

      return true;
    },
  },
};
