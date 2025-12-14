import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

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

// Send email with credentials
async function sendWelcomeEmail(email: string, password: string) {
  // Email configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "1025"),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD || "",
        }
      : undefined,
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || "noreply@fdhbank.com",
    to: email,
    subject: "Your FDH Bank Admin Panel Access",
    text: `
Hello,

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
        path: process.cwd() + "/public/images/logo/BLUE PNG/FDH LOGO-06.png",
        cid: "logo",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
}

async function main() {
  console.log("🌱 Starting admin user seeder...");

  const email = "jimmykamanga@gmail.com";
  const name = "Jimmy Kamanga";

  // Check if admin user already exists
  const existingUser = await prisma.adminWebUser.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("⚠️  Admin user already exists:", email);
    console.log("   Skipping seeder.");
    return;
  }

  // Generate a random secure password
  const generatedPassword = generatePassword(16);
  console.log("🔐 Generated password for", email);

  // Hash the password
  const passwordHash = await bcrypt.hash(generatedPassword, 10);

  // Create the admin user
  const adminUser = await prisma.adminWebUser.create({
    data: {
      email,
      name,
      passwordHash,
      isActive: true,
    },
  });

  console.log("✅ Admin user created successfully:");
  console.log("   ID:", adminUser.id);
  console.log("   Email:", adminUser.email);
  console.log("   Name:", adminUser.name);

  // Send welcome email with credentials
  console.log("\n📧 Sending credentials email...");
  try {
    await sendWelcomeEmail(email, generatedPassword);
    console.log("✅ Credentials email sent to:", email);
    console.log("\n📬 Check your email for login credentials!");
    console.log("   (If using MailHog, visit: http://localhost:8025)");
  } catch (error) {
    console.error("❌ Failed to send email. Credentials:");
    console.error("   Email:", email);
    console.error("   Password:", generatedPassword);
    console.error("\n⚠️  Please save these credentials manually!");
  }

  console.log("\n✨ Seeder completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeder failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
