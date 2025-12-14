import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { emailService } from "@/lib/services/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find the admin user
    const user = await prisma.adminWebUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    // For security, we always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Delete any existing unused tokens for this user
    await prisma.adminWebPasswordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    // Create the reset token
    await prisma.adminWebPasswordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Send email using the email service
    try {
      await sendPasswordResetEmail(user.email, user.name || "Admin", resetLink);
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      // Don't expose email sending errors to the user
    }

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Email sending function with FDH branding
async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
) {
  await emailService.sendEmail({
    to: email,
    subject: "Reset Your FDH Bank Admin Password",
    text: `Hello ${name},\n\nYou requested to reset your password for the FDH Bank Admin Panel.\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nFDH Bank Admin Team`,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #154E9E; margin: 0;">FDH Bank</h1>
          <p style="color: #666; margin-top: 5px;">Admin Panel</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h2 style="color: #154E9E; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #333; line-height: 1.6;">Hello ${name},</p>
          <p style="color: #333; line-height: 1.6;">
            You requested to reset your password for the FDH Bank Admin Panel.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; 
                      padding: 14px 32px; 
                      background-color: #f59e0b; 
                      color: white; 
                      text-decoration: none; 
                      border-radius: 9999px; 
                      font-weight: 600;
                      font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link into your browser:
          </p>
          <p style="color: #154E9E; word-break: break-all; font-size: 14px;">
            ${resetLink}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 13px; line-height: 1.6;">
              <strong>⏰ This link will expire in 1 hour.</strong>
            </p>
            <p style="color: #666; font-size: 13px; line-height: 1.6;">
              If you didn't request this password reset, please ignore this email. 
              Your password will remain unchanged.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} FDH Bank. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
  });
}

