import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth/jwt";
import crypto from "crypto";
import { emailService } from "@/lib/services/email";
import path from "path";
import type { GraphQLContext } from "@/lib/graphql/context";

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

interface AdminWebCreateUserInput {
  email: string;
  name: string;
}

// Generate a secure random token
function generateSetupToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function sendWelcomeEmail(email: string, name: string, token: string) {
  const setupUrl = `https://mobile-banking-v2.abakula.com/setup-password?token=${token}`;

  await emailService.sendEmail({
    to: email,
    subject: "Welcome to FDH Bank Admin Panel",
    text: `
Hello ${name},

Welcome to the FDH Bank Admin Panel! Your admin account has been created.

To get started, please set up your password by clicking the link below:
${setupUrl}

This link will expire in 48 hours.

If you did not expect this invitation, please contact support immediately.

Best regards,
FDH Bank Admin Team
    `,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
          <img src="cid:logo" alt="FDH Bank" style="width: 80px; height: auto; margin-bottom: 10px;" />
          <h1 style="color: #154E9E; margin: 10px 0 0 0;">FDH Bank</h1>
          <p style="color: #666; margin-top: 5px;">Admin Panel</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h2 style="color: #154E9E; margin-top: 0;">Welcome to FDH Bank Admin Panel</h2>
          <p style="color: #333; line-height: 1.6;">
            Hello <strong>${name}</strong>,
          </p>
          <p style="color: #333; line-height: 1.6;">
            Your admin account has been created successfully. To get started, please set up your password by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" 
               style="display: inline-block; 
                      padding: 16px 40px; 
                      background-color: #f59e0b; 
                      color: white; 
                      text-decoration: none; 
                      border-radius: 50px; 
                      font-weight: 600;
                      font-size: 16px;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              Set Up Password
            </a>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #154E9E; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
              ${setupUrl}
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #d97706; font-size: 13px; line-height: 1.6;">
              <strong>⚠️ Important:</strong><br>
              This link will expire in 48 hours. If you did not expect this invitation, please contact support immediately.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} FDH Bank. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: "fdh-logo.png",
        path: path.join(
          process.cwd(),
          "public",
          "images",
          "logo",
          "BLUE PNG",
          "FDH LOGO-06.png"
        ),
        cid: "logo",
      },
    ],
  });
}

async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `https://mobile-banking-v2.abakula.com/reset-password?token=${token}`;

  await emailService.sendEmail({
    to: email,
    subject: "Reset Your FDH Bank Admin Panel Password",
    text: `
Hello ${name},

A password reset has been requested for your FDH Bank Admin Panel account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 24 hours.

If you did not request this password reset, please ignore this email or contact support immediately.

Best regards,
FDH Bank Admin Team
    `,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px;">
          <img src="cid:logo" alt="FDH Bank" style="width: 80px; height: auto; margin-bottom: 10px;" />
          <h1 style="color: #154E9E; margin: 10px 0 0 0;">FDH Bank</h1>
          <p style="color: #666; margin-top: 5px;">Admin Panel</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h2 style="color: #154E9E; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #333; line-height: 1.6;">
            Hello <strong>${name}</strong>,
          </p>
          <p style="color: #333; line-height: 1.6;">
            A password reset has been requested for your FDH Bank Admin Panel account. Click the button below to choose a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; 
                      padding: 16px 40px; 
                      background-color: #f59e0b; 
                      color: white; 
                      text-decoration: none; 
                      border-radius: 50px; 
                      font-weight: 600;
                      font-size: 16px;
                      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              Reset Password
            </a>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.6;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #154E9E; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
              ${resetUrl}
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #d97706; font-size: 13px; line-height: 1.6;">
              <strong>⚠️ Important Security Notice:</strong><br>
              This link will expire in 24 hours. If you did not request this password reset, please ignore this email or contact support immediately.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} FDH Bank. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: "fdh-logo.png",
        path: path.join(
          process.cwd(),
          "public",
          "images",
          "logo",
          "BLUE PNG",
          "FDH LOGO-06.png"
        ),
        cid: "logo",
      },
    ],
  });
}

function requireAdminContext(ctx: GraphQLContext) {
  const context = ctx.auth?.context;
  if (context !== "ADMIN" && context !== "ADMIN_WEB") {
    throw new Error("Forbidden");
  }
}

export const adminWebUserResolvers = {
  Query: {
    async adminWebUsers(_parent: unknown, _args: unknown, ctx: GraphQLContext) {
      requireAdminContext(ctx);
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

    async adminWebCreateUser(
      _parent: unknown,
      args: { input: AdminWebCreateUserInput },
      ctx: GraphQLContext,
    ) {
      requireAdminContext(ctx);

      const { email, name } = args.input;

      if (!email || !name) {
        throw new Error("Email and name are required");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      const existingUser = await prisma.adminWebUser.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const newUser = await prisma.adminWebUser.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash: "",
          isActive: false,
        },
      });

      const token = generateSetupToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      await prisma.adminWebPasswordResetToken.create({
        data: {
          token,
          userId: newUser.id,
          expiresAt,
        },
      });

      try {
        await sendWelcomeEmail(email, name, token);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);

        await prisma.adminWebPasswordResetToken.delete({
          where: { token },
        });
        await prisma.adminWebUser.delete({
          where: { id: newUser.id },
        });

        return {
          success: false,
          message: "Failed to send setup email. Please try again.",
          emailSent: false,
          user: null,
        };
      }

      return {
        success: true,
        message: "Admin user created successfully. Setup link sent via email.",
        emailSent: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt.toISOString(),
          updatedAt: newUser.updatedAt.toISOString(),
        },
      };
    },

    async adminWebSendPasswordResetLink(
      _parent: unknown,
      args: { userId: string },
      ctx: GraphQLContext,
    ) {
      requireAdminContext(ctx);

      const userId = parseInt(args.userId);
      if (isNaN(userId)) {
        throw new Error("Invalid user ID");
      }

      const targetUser = await prisma.adminWebUser.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      await prisma.adminWebPasswordResetToken.updateMany({
        where: {
          userId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          expiresAt: new Date(),
        },
      });

      const token = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.adminWebPasswordResetToken.create({
        data: {
          token,
          userId,
          expiresAt,
        },
      });

      try {
        await sendPasswordResetEmail(
          targetUser.email,
          targetUser.name || targetUser.email,
          token,
        );

        return {
          success: true,
          message: "Password reset link sent successfully.",
          emailSent: true,
        };
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);

        await prisma.adminWebPasswordResetToken.delete({
          where: { token },
        });

        return {
          success: false,
          message: "Failed to send reset email. Please try again.",
          emailSent: false,
        };
      }
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
