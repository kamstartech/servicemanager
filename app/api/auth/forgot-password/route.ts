import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
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

    // Send email (you'll need to implement this based on your email service)
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

// Email sending function - implement based on your email service
async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
) {
  // TODO: Implement with your email service (e.g., SendGrid, Mailgun, etc.)
  // For now, we'll just log it
  console.log(`
    Password Reset Email:
    To: ${email}
    Name: ${name}
    Reset Link: ${resetLink}
    
    Subject: Reset Your FDH Bank Admin Password
    
    Hi ${name},
    
    You requested to reset your password for the FDH Bank Admin Panel.
    
    Click the link below to reset your password:
    ${resetLink}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
    
    Best regards,
    FDH Bank Admin Team
  `);

  // Example with nodemailer (uncomment and configure if using):
  /*
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset Your FDH Bank Admin Password',
    html: `
      <h2>Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>You requested to reset your password for the FDH Bank Admin Panel.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 9999px; font-weight: 600;">Reset Password</a>
      <p>Or copy and paste this link:</p>
      <p>${resetLink}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>FDH Bank Admin Team</p>
    `,
  });
  */
}
