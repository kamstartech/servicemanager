import { emailService } from "./lib/services/email";

async function testEmails() {
  console.log("🧪 Testing Email Service with MailHog...\n");

  // Test 1: Connection
  console.log("1️⃣ Testing connection...");
  const connected = await emailService.testConnection();
  if (!connected) {
    console.error("❌ Connection failed. Is MailHog running?");
    console.log("Start with: docker-compose up -d mailhog");
    process.exit(1);
  }
  console.log("✅ Connection successful\n");

  // Test 2: Simple email
  console.log("2️⃣ Sending simple email...");
  await emailService.sendEmail({
    to: "test@example.com",
    subject: "Test Email",
    text: "This is a test email from Service Manager",
    html: "<h1>Test Email</h1><p>This is a test email from Service Manager</p>",
  });
  console.log("✅ Simple email sent\n");

  // Test 3: OTP email
  console.log("3️⃣ Sending OTP email...");
  await emailService.sendOTP("user@example.com", "123456", "TestUser");
  console.log("✅ OTP email sent\n");

  // Test 4: Password reset email
  console.log("4️⃣ Sending password reset email...");
  await emailService.sendPasswordReset(
    "user@example.com",
    "http://localhost:3000/reset-password?token=abc123",
    "TestUser"
  );
  console.log("✅ Password reset email sent\n");

  // Test 5: Welcome email
  console.log("5️⃣ Sending welcome email...");
  await emailService.sendWelcome("newuser@example.com", "NewUser");
  console.log("✅ Welcome email sent\n");

  // Test 6: Transaction notification
  console.log("6️⃣ Sending transaction notification...");
  await emailService.sendTransactionNotification("user@example.com", "TestUser", {
    type: "Transfer",
    amount: "1,000.00",
    currency: "MWK",
    reference: "TXN123456789",
    timestamp: new Date().toLocaleString(),
  });
  console.log("✅ Transaction notification sent\n");

  console.log("🎉 All tests passed!");
  console.log("\n📧 View emails in MailHog: http://localhost:8025");
  
  process.exit(0);
}

testEmails().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
