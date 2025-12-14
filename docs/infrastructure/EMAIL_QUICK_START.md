# Email Testing - Quick Start (2 Minutes)

## Step 1: Start MailHog

```bash
cd /path/to/service_manager
docker-compose up -d mailhog
```

✅ **Ports:**
- SMTP: 1025
- Web UI: 8025

---

## Step 2: Configure Environment

```bash
cd admin

# Add to .env.local
cat >> .env.local << 'END'
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@servicemanager.local
END
```

---

## Step 3: Test It!

```bash
npm run test-email
```

Expected output:
```
🎉 All tests passed!
📧 View emails in MailHog: http://localhost:8025
```

---

## Step 4: View Emails

**Open:** http://localhost:8025

You'll see all test emails! 📬

---

## Using in Code

```typescript
import { emailService } from "@/lib/services/email";

// Send OTP
await emailService.sendOTP("user@example.com", "123456", "John");

// Send password reset
await emailService.sendPasswordReset(
  "user@example.com",
  "https://app.com/reset?token=abc",
  "John"
);

// Send welcome email
await emailService.sendWelcome("user@example.com", "John");
```

---

## Quick Commands

```bash
# Start MailHog
docker-compose up -d mailhog

# Test emails
npm run test-email

# View emails
open http://localhost:8025

# Check logs
docker logs service_manager_mailhog

# Restart
docker-compose restart mailhog
```

---

**That's it! You're ready to test emails! 🎉**

**Full documentation:** `EMAIL_TESTING_SETUP.md`
