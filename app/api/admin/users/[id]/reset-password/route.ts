import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/auth/middleware";
import crypto from "crypto";
import { emailService } from "@/lib/services/email";
import path from "path";

// Generate a secure random token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Send password reset email with token link
async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
) {
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

/**
 * POST /api/admin/users/[id]/reset-password
 * Generate reset token and send email with reset link
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

      // Invalidate any existing unused tokens for this user
      await prisma.adminWebPasswordResetToken.updateMany({
        where: {
          userId: userId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          expiresAt: new Date(), // Expire old tokens immediately
        },
      });

      // Generate a new secure token
      const token = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

      // Save the token to database
      await prisma.adminWebPasswordResetToken.create({
        data: {
          token,
          userId,
          expiresAt,
        },
      });

      // Send password reset email with link
      try {
        await sendPasswordResetEmail(
          targetUser.email,
          targetUser.name || targetUser.email,
          token
        );

        return NextResponse.json({
          success: true,
          message: "Password reset link sent successfully.",
          emailSent: true,
        });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        
        // Delete the token since email failed
        await prisma.adminWebPasswordResetToken.delete({
          where: { token },
        });

        return NextResponse.json(
          {
            success: false,
            message: "Failed to send reset email. Please try again.",
            emailSent: false,
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Reset password error:", error);
      return NextResponse.json(
        { error: "An error occurred while processing the reset request" },
        { status: 500 }
      );
    }
  }
);
