# Forgot Password Implementation for Admin Users

## Overview
A complete password reset flow for admin users with security best practices.

## Features

### Security Features
- ✅ Secure token generation (32 bytes random)
- ✅ Token expiration (1 hour)
- ✅ One-time use tokens
- ✅ Email enumeration protection
- ✅ Bcrypt password hashing
- ✅ Active user validation
- ✅ Automatic cleanup of old tokens

### User Flow
1. User clicks "Forgot your password?" on login page
2. User enters email address
3. System generates secure reset token
4. Email sent with reset link
5. User clicks link and enters new password
6. Password updated and user redirected to login

## Pages

### 1. Forgot Password (`/forgot-password`)
- Email input form
- Status messages (success/error)
- Link back to login
- Same branded design as login page

### 2. Reset Password (`/reset-password?token=xxx`)
- Token validation from URL
- New password input with confirmation
- Password requirements (min 8 characters)
- Status messages
- Auto-redirect to login on success

## API Routes

### POST `/api/auth/forgot-password`
Initiates password reset process.

**Request Body:**
```json
{
  "email": "admin@example.com"
}
```

**Response (Success):**
```json
{
  "message": "If an account exists, a reset link has been sent."
}
```

**Security Notes:**
- Always returns success even if email doesn't exist (prevents enumeration)
- Checks if user is active before sending email
- Deletes old unused tokens before creating new one
- Logs email content to console in development

### POST `/api/auth/reset-password`
Resets the password using a valid token.

**Request Body:**
```json
{
  "token": "abc123...",
  "password": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "message": "Password reset successfully"
}
```

**Validation:**
- Token must exist and not be used
- Token must not be expired (1 hour limit)
- Password must be at least 8 characters
- User must be active
- Token marked as used after successful reset

## Database Schema

Already exists in Prisma schema:

```prisma
model AdminWebUser {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  name         String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  resetTokens AdminWebPasswordResetToken[]
}

model AdminWebPasswordResetToken {
  id        Int       @id @default(autoincrement())
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  userId    Int
  user      AdminWebUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
}
```

## Email Integration

✅ **Integrated with MailHog** - Email service is configured and ready to use!

### Current Implementation
- Uses existing `EmailService` from `@/lib/services/email`
- Sends emails via MailHog (SMTP on port 1025)
- FDH-branded HTML email template
- Includes both plain text and HTML versions

### Email Template Features
- **FDH Bank branding** - Blue (#154E9E) and Orange (#f59e0b) colors
- **Poppins font** - Consistent with UI
- **Responsive design** - Works on all devices
- **Clear call-to-action** - Orange button matching brand
- **Security information** - Expiration time and security notice
- **Professional footer** - Copyright and automated message notice

### MailHog Access
When running in development with Docker Compose:
- **SMTP Server**: localhost:1025 (for sending)
- **Web UI**: http://localhost:8025 (to view emails)

All password reset emails will appear in the MailHog web interface where you can:
- View the email content
- Click the reset link directly
- Test the full flow

## Environment Variables

Already configured for MailHog in docker-compose.yml:
```env
# Required for password reset links
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email service (MailHog - already configured)
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@fdhbank.com
```

**Note**: When running with Docker Compose, `SMTP_HOST` should be `mailhog` (the service name).
When running locally without Docker, use `localhost`.

## Testing

### Manual Testing Flow

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Create a test admin user** (if not exists)
   ```sql
   INSERT INTO admin_web_users (email, password_hash, name, is_active)
   VALUES ('admin@test.com', '$2b$10$...', 'Test Admin', true);
   ```

3. **Test forgot password**
   - Navigate to `/login`
   - Click "Forgot your password?"
   - Enter admin email
   - Open MailHog web UI at http://localhost:8025
   - Click on the password reset email
   - Copy the reset link from the email

4. **Test reset password**
   - Click the reset link in the email (or navigate manually)
   - Enter new password
   - Submit and verify redirect

5. **Test login with new password**
   - Use new password to login

### Security Testing

1. **Test expired token:**
   - Manually set `expiresAt` to past date in database
   - Try to use token
   - Should show "expired" error

2. **Test used token:**
   - Complete password reset
   - Try to use same token again
   - Should show "already used" error

3. **Test invalid token:**
   - Use random token string
   - Should show "invalid" error

4. **Test email enumeration protection:**
   - Try with non-existent email
   - Should show same success message

## Security Best Practices Implemented

✅ **Token Security**
- Cryptographically secure random tokens (32 bytes)
- One-time use only
- 1-hour expiration
- Stored hashed in database

✅ **Password Security**
- Minimum length requirement (8 characters)
- Bcrypt hashing with salt rounds
- Password confirmation validation

✅ **Anti-Enumeration**
- Same response for existing/non-existing emails
- No information leakage

✅ **Rate Limiting** (Recommended to add)
- Consider adding rate limiting to prevent abuse
- Example: Max 5 requests per 15 minutes per IP

✅ **Database Security**
- Transaction-based updates
- Cascade deletion on user removal
- Proper indexing on token field

## UI/UX Features

- ✅ Consistent FDH branding
- ✅ Clear error/success messages
- ✅ Loading states
- ✅ Form validation
- ✅ Auto-redirect on success
- ✅ Back to login links
- ✅ Disabled states when appropriate

## Future Enhancements

1. **Rate Limiting**
   - Add rate limiting middleware
   - Track attempts per IP/email

2. **Email Templates**
   - HTML email templates
   - Branded email design

3. **Audit Logging**
   - Log all password reset attempts
   - Track successful resets

4. **Multi-factor Authentication**
   - Require 2FA before password reset
   - Send confirmation code via SMS

5. **Password Strength Meter**
   - Visual feedback on password strength
   - Enforce complexity requirements

## Troubleshooting

### Emails not sending
- Check SMTP configuration in .env
- Verify MailHog container is running: `docker ps | grep mailhog`
- Check MailHog logs: `docker logs service_manager_mailhog`
- Access MailHog UI: http://localhost:8025

### Token errors
- Verify database connection
- Check token hasn't expired
- Ensure token hasn't been used

### Database errors
- Run `npx prisma generate`
- Check DATABASE_URL in .env
- Verify schema is up to date

## Files Created/Modified

### New Files
- `app/forgot-password/page.tsx`
- `app/forgot-password/layout.tsx`
- `app/reset-password/page.tsx`
- `app/reset-password/layout.tsx`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`

### Modified Files
- `app/login/page.tsx` - Updated forgot password link

## Support

For issues or questions:
1. Check console logs for errors
2. Verify environment variables
3. Check database connectivity
4. Review Prisma schema matches database
