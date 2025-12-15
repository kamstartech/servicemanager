import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/auth/middleware";
import crypto from "crypto";
import { emailService } from "@/lib/services/email";
import path from "path";

// Generate a secure random token
function generateSetupToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Send welcome email with setup link
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

/**
 * POST /api/admin/users
 * Create a new admin user
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admins can create other admin users
    if (user.context !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { email, name } = await request.json();

    // Validate input
    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.adminWebUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create the admin user without password (will be set via token link)
    const newUser = await prisma.adminWebUser.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: "", // Empty password hash - user will set it via token
        isActive: false, // Inactive until password is set
      },
    });

    // Generate setup token (48 hours expiry for new users)
    const token = generateSetupToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Save the token to database
    await prisma.adminWebPasswordResetToken.create({
      data: {
        token,
        userId: newUser.id,
        expiresAt,
      },
    });

    // Send welcome email with setup link
    try {
      await sendWelcomeEmail(email, name, token);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      
      // Delete the user and token since email failed
      await prisma.adminWebPasswordResetToken.delete({
        where: { token },
      });
      await prisma.adminWebUser.delete({
        where: { id: newUser.id },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Failed to send setup email. Please try again.",
          emailSent: false,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Admin user created successfully. Setup link sent via email.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        emailSent: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create admin user error:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the user" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/admin/users
 * Get all admin users
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Only admins can view admin users
    if (user.context !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const users = await prisma.adminWebUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get admin users error:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching users" },
      { status: 500 }
    );
  }
});
