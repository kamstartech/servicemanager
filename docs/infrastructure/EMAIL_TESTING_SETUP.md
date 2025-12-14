# MailHog Email Testing - Complete Setup

## Overview

**MailHog** is a lightweight email testing tool that catches all outgoing emails without actually sending them. Perfect for development and testing!

---

## 🎯 Why MailHog?

✅ **Catches all emails** - No risk of sending test emails to real users  
✅ **Web UI** - Beautiful interface to view all sent emails  
✅ **No configuration** - Works out of the box  
✅ **Lightweight** - Only 10MB Docker image  
✅ **API access** - Retrieve emails programmatically  
✅ **Multiple mailboxes** - Test different recipients  

**Alternative:** Mailpit (more modern), Mailtrap (cloud service, paid)

---

## 📦 Installation

### 1. MailHog Already Added to Docker Compose

**File:** `docker-compose.yml`

```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: service_manager_mailhog
  ports:
    - "1025:1025"  # SMTP Server
    - "8025:8025"  # Web UI
  restart: unless-stopped
  networks:
    - service_manager_network
```

### 2. Start MailHog

```bash
# From project root
docker-compose up -d mailhog
```

### 3. Verify Running

```bash
docker ps | grep mailhog
```

Expected output:
```
service_manager_mailhog   mailhog/mailhog:latest   Up   0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

---

## 🔧 Configuration

### Environment Variables

**File:** `admin/.env.local`

```env
# MailHog (Development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@servicemanager.local
```

### Production SMTP (Example: Gmail)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

---

## 🚀 Usage

### Email Service Library

**File:** `lib/services/email/index.ts`

### Send Simple Email

```typescript
import { emailService } from "@/lib/services/email";

await emailService.sendEmail({
  to: "user@example.com",
  subject: "Test Email",
  text: "Plain text content",
  html: "<h1>HTML content</h1>",
});
```

### Send OTP Code

```typescript
await emailService.sendOTP(
  "user@example.com",
  "123456",  // OTP code
  "JohnDoe"  // Username
);
```

### Send Password Reset

```typescript
await emailService.sendPasswordReset(
  "user@example.com",
  "https://app.com/reset?token=abc123",
  "JohnDoe"
);
```

### Send Welcome Email

```typescript
await emailService.sendWelcome(
  "newuser@example.com",
  "NewUser"
);
```

### Send Transaction Notification

```typescript
await emailService.sendTransactionNotification(
  "user@example.com",
  "JohnDoe",
  {
    type: "Transfer",
    amount: "1,000.00",
    currency: "MWK",
    reference: "TXN123456789",
    timestamp: new Date().toLocaleString(),
  }
);
```

### Test Connection

```typescript
const connected = await emailService.testConnection();
if (connected) {
  console.log("Email server ready!");
}
```

---

## 🧪 Testing

### Run Test Script

```bash
cd admin
npm run test-email
```

**Expected output:**
```
🧪 Testing Email Service with MailHog...

1️⃣ Testing connection...
✅ Connection successful

2️⃣ Sending simple email...
✅ Simple email sent

3️⃣ Sending OTP email...
✅ OTP email sent

4️⃣ Sending password reset email...
✅ Password reset email sent

5️⃣ Sending welcome email...
✅ Welcome email sent

6️⃣ Sending transaction notification...
✅ Transaction notification sent

🎉 All tests passed!

📧 View emails in MailHog: http://localhost:8025
```

### View Emails in Web UI

**Open:** http://localhost:8025

You'll see all test emails in the interface!

---

## 🌐 Web UI Features

### Main Interface

**URL:** http://localhost:8025

**Features:**
- 📬 **Inbox** - All caught emails
- 🔍 **Search** - Find emails by subject, recipient, etc.
- 👁️ **Preview** - View HTML and plain text
- 📎 **Attachments** - Download email attachments
- 🗑️ **Delete** - Clear individual or all emails
- 📤 **Forward** - Forward to real email address (testing)

### API Access

```bash
# Get all messages
curl http://localhost:8025/api/v2/messages

# Get specific message
curl http://localhost:8025/api/v2/messages/{message_id}

# Delete all messages
curl -X DELETE http://localhost:8025/api/v1/messages
```

---

## 📧 Email Templates

All templates use responsive HTML with inline CSS for maximum compatibility.

### Template Features

✅ Mobile-responsive design  
✅ Inline CSS (email client compatible)  
✅ Plain text fallback  
✅ Professional styling  
✅ Clear call-to-action buttons  

### Customize Templates

Edit templates in: `lib/services/email/index.ts`

---

## 🔒 Integration Examples

### In Password Reset Flow

```typescript
// In password reset resolver
import { emailService } from "@/lib/services/email";

const resetToken = generateToken();
const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

await emailService.sendPasswordReset(
  user.email,
  resetUrl,
  user.username
);
```

### In OTP Verification

```typescript
// In OTP resolver
import { emailService } from "@/lib/services/email";

const otpCode = generateOTP();

await emailService.sendOTP(
  user.email,
  otpCode,
  user.username
);
```

### In User Registration

```typescript
// After user created
import { emailService } from "@/lib/services/email";

await emailService.sendWelcome(
  user.email,
  user.username
);
```

---

## 🚨 Troubleshooting

### MailHog Not Receiving Emails

**Check:**
1. Is MailHog running?
   ```bash
   docker ps | grep mailhog
   ```

2. Correct SMTP settings in `.env.local`?
   ```env
   SMTP_HOST=localhost
   SMTP_PORT=1025
   ```

3. Check MailHog logs:
   ```bash
   docker logs service_manager_mailhog
   ```

### Connection Refused

**Solution:**
```bash
# Restart MailHog
docker-compose restart mailhog

# Check ports not in use
lsof -i :1025
lsof -i :8025
```

### Emails Not Showing in UI

**Solution:**
```bash
# Clear MailHog data
docker-compose down mailhog
docker-compose up -d mailhog
```

---

## 🌍 Production Setup

### Using Real SMTP (Gmail Example)

**1. Enable 2FA on Gmail**

**2. Generate App Password**
- Go to: https://myaccount.google.com/apppasswords
- Create app password for "Mail"

**3. Update Environment**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here
SMTP_FROM=noreply@yourdomain.com
```

### Using SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### Using AWS SES

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

---

## 📊 Monitoring

### Email Sending Statistics

Add logging to track sent emails:

```typescript
// In email service
console.log(`📧 Email sent: ${options.subject} -> ${options.to}`);
```

### Failed Email Handling

```typescript
try {
  await emailService.sendEmail(options);
} catch (error) {
  console.error("Email failed:", error);
  // Log to monitoring service (Sentry, etc.)
  // Retry logic
  // Fallback notification (SMS, push)
}
```

---

## 🎯 Best Practices

1. **Always use templates** - Consistent branding
2. **Include plain text** - Email client compatibility
3. **Test before production** - Use MailHog first
4. **Handle failures gracefully** - Don't block user flows
5. **Respect user preferences** - Allow unsubscribe
6. **Monitor delivery** - Track bounces and complaints
7. **Use env variables** - Never hardcode credentials

---

## 📚 Email Service Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `sendEmail()` | Send custom email | `Promise<boolean>` |
| `sendOTP()` | Send OTP code | `Promise<boolean>` |
| `sendPasswordReset()` | Password reset link | `Promise<boolean>` |
| `sendWelcome()` | Welcome new users | `Promise<boolean>` |
| `sendTransactionNotification()` | Transaction alerts | `Promise<boolean>` |
| `testConnection()` | Verify SMTP | `Promise<boolean>` |

---

## 🔗 Resources

- **MailHog GitHub**: https://github.com/mailhog/MailHog
- **Nodemailer Docs**: https://nodemailer.com/
- **Email Best Practices**: https://www.emailonacid.com/blog/

---

## Summary

✅ **MailHog installed** and configured  
✅ **Email service** with 5+ templates  
✅ **Web UI** at http://localhost:8025  
✅ **SMTP** on port 1025  
✅ **Test script** included  
✅ **Production ready** (just change SMTP settings)  

**Start testing emails now! 📧**
