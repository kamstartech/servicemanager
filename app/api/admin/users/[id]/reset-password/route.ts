import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/auth/middleware";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { emailService } from "@/lib/services/email";
import path from "path";

// Generate a secure random password
function generatePassword(length = 16): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

// Send password reset email
async function sendPasswordResetEmail(
  email: string,
  name: string,
  password: string
) {
  await emailService.sendEmail({
    to: email,
    subject: "Your FDH Bank Admin Panel Password Has Been Reset",
    text: `
Hello ${name},

Your password for the FDH Bank Admin Panel has been reset.

Login URL: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login
Email: ${email}
New Password: ${password}

Please login with your new password and change it immediately for security reasons.

If you did not request this password reset, please contact support immediately.

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
          <h2 style="color: #154E9E; margin-top: 0;">Password Reset</h2>
          <p style="color: #333; line-height: 1.6;">
            Your password for the FDH Bank Admin Panel has been reset successfully.
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Login URL:</strong></td>
                <td style="padding: 8px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login" 
                     style="color: #154E9E; text-decoration: none;">
                    ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Email:</strong></td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>New Password:</strong></td>
                <td style="padding: 8px 0; font-family: monospace; background-color: #f0f0f0; padding: 5px; border-radius: 3px;">
                  ${password}
                </td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login" 
               style="display: inline-block; 
                      padding: 14px 32px; 
                      background-color: #f59e0b; 
                      color: white; 
                      text-decoration: none; 
                      border-radius: 9999px; 
                      font-weight: 600;
                      font-size: 16px;">
              Login Now
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #d97706; font-size: 13px; line-height: 1.6;">
              <strong>⚠️ Important Security Notice:</strong><br>
              Please login and change your password immediately. Keep your credentials secure and do not share them with anyone.
              If you did not request this password reset, please contact support immediately.
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

/**
 * POST /api/admin/users/[id]/reset-password
 * Reset password for an admin user
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      // Only admins can reset passwords
      if (user.context !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { id } = await params;
      const userId = parseInt(id);

      if (isNaN(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }

      // Find the user
      const targetUser = await prisma.adminWebUser.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Generate a new random secure password
      const newPassword = generatePassword(16);

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await prisma.adminWebUser.update({
        where: { id: userId },
        data: { passwordHash },
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail(
          targetUser.email,
          targetUser.name,
          newPassword
        );

        return NextResponse.json({
          success: true,
          message: "Password reset successfully. New credentials sent via email.",
          emailSent: true,
        });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        
        return NextResponse.json(
          {
            success: true,
            message: "Password reset but email failed to send",
            credentials: {
              email: targetUser.email,
              password: newPassword,
            },
            emailSent: false,
          },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error("Reset password error:", error);
      return NextResponse.json(
        { error: "An error occurred while resetting the password" },
        { status: 500 }
      );
    }
  }
);
