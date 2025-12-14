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

// Send welcome email with credentials
async function sendWelcomeEmail(email: string, name: string, password: string) {
  await emailService.sendEmail({
    to: email,
    subject: "Your FDH Bank Admin Panel Access",
    text: `
Hello ${name},

Your admin account for the FDH Bank Admin Panel has been created.

Login URL: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login
Email: ${email}
Password: ${password}

Please login and change your password immediately for security reasons.

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
            Your admin account has been created successfully. Below are your login credentials:
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
                <td style="padding: 8px 0;"><strong>Password:</strong></td>
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
        path: path.join(process.cwd(), "public", "images", "logo", "BLUE PNG", "FDH LOGO-06.png"),
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

    // Generate a random secure password
    const generatedPassword = generatePassword(16);

    // Hash the password
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    // Create the admin user
    const newUser = await prisma.adminWebUser.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        isActive: true,
      },
    });

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name, generatedPassword);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // User is created, but email failed - return partial success
      return NextResponse.json(
        {
          success: true,
          message: "User created but email failed to send",
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
          credentials: {
            email: newUser.email,
            password: generatedPassword,
          },
          emailSent: false,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Admin user created successfully. Credentials sent via email.",
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
