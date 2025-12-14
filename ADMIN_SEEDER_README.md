# Admin User Seeder

## Overview
Automated seeder to create the initial admin user account with secure credentials sent via email.

## Features

✅ **Secure Password Generation**
- 16-character random password
- Mix of uppercase, lowercase, numbers, and special characters
- Cryptographically secure using `crypto.randomBytes()`

✅ **Email Delivery**
- FDH-branded email template
- Sends credentials to admin's email
- Works with MailHog in development

✅ **Safety Checks**
- Prevents duplicate admin users
- Verifies user doesn't already exist before creating
- Provides clear error messages

## Admin User Details

- **Email**: `jimmykamanga@gmail.com`
- **Name**: `Jimmy Kamanga`
- **Password**: Generated and sent via email
- **Status**: Active by default

## Usage

### Run the Seeder

```bash
npm run seed:admin
```

Or using Prisma directly:

```bash
npx prisma db seed
```

### Expected Output

```
🌱 Starting admin user seeder...
🔐 Generated password for jimmykamanga@gmail.com
✅ Admin user created successfully:
   ID: 1
   Email: jimmykamanga@gmail.com
   Name: Jimmy Kamanga

📧 Sending credentials email...
✅ Credentials email sent to: jimmykamanga@gmail.com

📬 Check your email for login credentials!
   (If using MailHog, visit: http://localhost:8025)

✨ Seeder completed successfully!
```

### If Email Fails

If email sending fails, the seeder will output the credentials to the console:

```
❌ Failed to send email. Credentials:
   Email: jimmykamanga@gmail.com
   Password: YourGeneratedPasswordHere

⚠️  Please save these credentials manually!
```

## Email Template

The welcome email includes:

- **Login URL** - Direct link to admin panel
- **Email Address** - Admin email
- **Generated Password** - Secure random password
- **Login Button** - One-click access to login page
- **Security Notice** - Reminder to change password

### Email Preview

**Subject**: Your FDH Bank Admin Panel Access

The email is styled with:
- FDH Bank branding (Blue #154E9E, Orange #f59e0b)
- Professional layout
- Responsive design
- Security warnings

## Viewing the Email (Development)

### With MailHog

1. **Ensure MailHog is running**:
   ```bash
   docker ps | grep mailhog
   ```

2. **Run the seeder**:
   ```bash
   npm run seed:admin
   ```

3. **Check MailHog UI**:
   - Open: http://localhost:8025
   - Find the "Your FDH Bank Admin Panel Access" email
   - View credentials
   - Click "Login Now" button

## Security Considerations

### Password Strength
- **Length**: 16 characters
- **Complexity**: Mixed case, numbers, symbols
- **Randomness**: Cryptographically secure

### Best Practices
- ✅ Change password immediately after first login
- ✅ Don't share credentials
- ✅ Use password manager to store securely
- ✅ Enable 2FA when available

## Troubleshooting

### "Admin user already exists"

If you see this message, the admin user is already in the database.

**To reset**:

```bash
# Option 1: Delete and recreate (development only)
npx prisma studio
# Navigate to AdminWebUser table
# Delete the user manually

# Option 2: Use SQL (development only)
psql -U postgres -d service_manager -c "DELETE FROM admin_web_users WHERE email='jimmykamanga@gmail.com';"

# Then run seeder again
npm run seed:admin
```

### Email Not Sending

**Check SMTP Configuration**:

```bash
# .env file should have:
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=noreply@fdhbank.com
```

**Verify MailHog is Running**:

```bash
docker ps | grep mailhog
# Should show: service_manager_mailhog

# If not running:
docker compose up -d mailhog
```

**Check Logs**:

```bash
docker logs service_manager_mailhog
```

### Database Connection Issues

**Check Database is Running**:

```bash
docker ps | grep postgres
# Should show: service_manager_db

# If not running:
docker compose up -d db
```

**Verify DATABASE_URL**:

```bash
# .env should have:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/service_manager"
```

**Test Connection**:

```bash
npx prisma db pull
```

## Files

### Seeder Script
- **Location**: `prisma/seed/admin-user.ts`
- **Purpose**: Creates admin user and sends credentials

### Package.json
- **Script**: `npm run seed:admin`
- **Prisma Seed**: Configured in `prisma` section

## Manual Login (If Email Fails)

If email sending fails but seeder completes:

1. **Copy credentials from console output**
2. **Navigate to**: http://localhost:3000/login
3. **Enter**:
   - Email: `jimmykamanga@gmail.com`
   - Password: [from console output]
4. **Change password immediately**

## Production Considerations

### Before Running in Production

1. **Update Email Service**:
   - Replace MailHog with production SMTP (SendGrid, AWS SES, etc.)
   - Update `.env` with production SMTP credentials

2. **Secure Environment**:
   - Use proper email service with SSL/TLS
   - Store SMTP credentials securely
   - Use environment variables, not hardcoded values

3. **Password Policy**:
   - Consider requiring password change on first login
   - Implement password expiration
   - Add 2FA requirement

4. **Audit Logging**:
   - Log admin user creation
   - Track first login
   - Monitor password changes

## Next Steps After Seeding

1. ✅ Check email for credentials
2. ✅ Login to admin panel
3. ✅ Change password immediately
4. ✅ Update profile information if needed
5. ✅ Set up 2FA (when available)
6. ✅ Review security settings

## Support

For issues or questions:
1. Check email spam folder
2. Verify MailHog is running (http://localhost:8025)
3. Check console output for errors
4. Review database connection
5. Verify environment variables

## License

This seeder is part of the FDH Bank Admin Panel project.
