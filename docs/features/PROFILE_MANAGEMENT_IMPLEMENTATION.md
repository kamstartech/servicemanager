# Profile Management Implementation

## Summary

Complete profile management system for admin web users with password change, profile updates, and WebAuthn passkey support for passwordless authentication.

## Features

### 1. Profile Information
- View and update display name
- Email display (read-only)
- Real-time profile updates with auth context refresh

### 2. Password Management
- Secure password change with current password verification
- Password strength validation (minimum 8 characters)
- Show/hide password toggle for all fields
- Password confirmation matching
- Bcrypt password hashing

### 3. Passkey Management (WebAuthn)
- Register passkeys for passwordless authentication
- View all registered passkeys with device information
- Device type icons (USB key, smartphone, laptop)
- Last used timestamps
- Remove passkeys with confirmation dialog
- Platform authenticator support

## Files Created

### Frontend Components

**Page**
- `app/(dashboard)/profile/page.tsx` - Main profile page

**Components**
- `components/profile/profile-info.tsx` - Profile information form
- `components/profile/password-change.tsx` - Password change form with show/hide
- `components/profile/passkey-manager.tsx` - Passkey list and management
- `components/profile/passkey-register-dialog.tsx` - WebAuthn registration flow

### API Routes

**Profile Operations**
- `app/api/profile/update/route.ts` - POST - Update user name
- `app/api/profile/change-password/route.ts` - POST - Change password

**Passkey Operations**
- `app/api/profile/passkeys/route.ts` - GET - List user passkeys
- `app/api/profile/passkeys/register/start/route.ts` - POST - Start passkey registration
- `app/api/profile/passkeys/register/complete/route.ts` - POST - Complete registration
- `app/api/profile/passkeys/[id]/route.ts` - DELETE - Remove passkey

### Database

**Schema Changes** (`prisma/schema.prisma`)
- Added `AdminWebPasskey` model
- Added `passkeys` relation to `AdminWebUser`
- Fields: credentialId, publicKey, counter, deviceName, transports, etc.

**Migration**
- `prisma/migrations/20251214153714_add_admin_web_passkeys/migration.sql`

### Navigation

**Sidebar** (`components/admin-sidebar.tsx`)
- Added Profile link with UserCog icon
- Positioned at bottom of sidebar for easy access

## Database Schema

```prisma
model AdminWebPasskey {
  id                  String    @id @default(cuid())
  userId              Int       @map("user_id")
  credentialId        String    @unique @map("credential_id") @db.Text
  publicKey           String    @map("public_key") @db.Text
  counter             BigInt    @default(0)
  deviceName          String?   @map("device_name") @db.Text
  transports          String[]  @default([])
  backupEligible      Boolean   @default(false) @map("backup_eligible")
  backupState         Boolean   @default(false) @map("backup_state")
  attestationFormat   String?   @map("attestation_format") @db.Text
  aaguid              String?   @db.Text
  lastUsedAt          DateTime? @map("last_used_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  user AdminWebUser @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("admin_web_passkeys")
}
```

## API Endpoints

### Update Profile
```
POST /api/profile/update
Body: { "name": "John Doe" }
Response: { "user": { "id": 1, "email": "...", "name": "John Doe" } }
```

### Change Password
```
POST /api/profile/change-password
Body: {
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
Response: { "success": true }
```

### List Passkeys
```
GET /api/profile/passkeys
Response: {
  "passkeys": [
    {
      "id": "...",
      "deviceName": "My Laptop",
      "createdAt": "...",
      "lastUsedAt": "...",
      "transports": ["internal"]
    }
  ]
}
```

### Register Passkey - Start
```
POST /api/profile/passkeys/register/start
Response: {
  "options": {
    "challenge": "...",
    "rp": { "name": "Admin Panel", "id": "localhost" },
    "user": { "id": "...", "name": "...", "displayName": "..." },
    ...
  }
}
```

### Register Passkey - Complete
```
POST /api/profile/passkeys/register/complete
Body: {
  "credential": { ... },
  "deviceName": "My iPhone"
}
Response: { "success": true, "passkeyId": "..." }
```

### Delete Passkey
```
DELETE /api/profile/passkeys/{id}
Response: { "success": true }
```

## Security Features

### Authentication
- All endpoints protected with `withAuth` middleware
- JWT token required
- User context validated

### Password Change
- Current password verification required
- Minimum 8 character length enforced
- Bcrypt hashing (cost factor 10)
- Password confirmation matching on client

### Passkey Security
- WebAuthn standard compliance
- Platform authenticator support
- Credential ID uniqueness enforced
- User ownership verification on deletion
- Challenge-based registration
- Attestation support

## Usage

### Accessing Profile
1. Click "Profile" in sidebar (bottom)
2. View/edit profile information
3. Change password securely
4. Manage passkeys

### Changing Password
1. Enter current password
2. Enter new password (8+ characters)
3. Confirm new password
4. Submit form

### Registering Passkey
1. Click "Add Passkey" button
2. Enter device name
3. Click "Register Passkey"
4. Follow browser/device prompts
5. Passkey appears in list

### Removing Passkey
1. Click trash icon on passkey
2. Confirm deletion in dialog
3. Passkey removed from list

## WebAuthn Implementation

### Registration Flow
1. Client requests registration options from server
2. Server generates challenge and options
3. Client calls `navigator.credentials.create()`
4. Browser/device prompts user for biometric/PIN
5. Credential created and returned to client
6. Client sends credential to server
7. Server verifies and stores credential

### Authentication Flow (Future)
1. Server generates authentication challenge
2. Client calls `navigator.credentials.get()`
3. User authenticates with biometric/PIN
4. Assertion returned to client
5. Client sends assertion to server
6. Server verifies signature and counter
7. User authenticated

## Future Enhancements

### Short Term
- Install `@simplewebauthn/server` for proper attestation verification
- Install `@simplewebauthn/browser` for client-side helpers
- Add passkey authentication to login flow
- Session management with passkey authentication

### Medium Term
- Multi-device passkey sync
- Backup codes for account recovery
- Login attempt tracking for passkeys
- Email notifications on passkey changes

### Long Term
- Conditional UI for passkey autofill
- Resident key support
- Cross-device authentication
- Passkey management across all admin features

## Testing

### Manual Testing
1. Start development server
2. Log in as admin user
3. Navigate to /profile
4. Test profile name update
5. Test password change
6. Test passkey registration (if supported device)
7. Test passkey deletion

### Database Migration
```bash
# When database is running
npx prisma migrate dev

# Or run the migration SQL manually
psql -d service_manager -f prisma/migrations/20251214153714_add_admin_web_passkeys/migration.sql
```

### Verify Passkey Support
```javascript
// In browser console
if (window.PublicKeyCredential) {
  console.log('WebAuthn supported!');
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then(available => console.log('Platform auth available:', available));
} else {
  console.log('WebAuthn not supported');
}
```

## Dependencies

### Required
- `bcrypt` - Password hashing (already installed)
- `@prisma/client` - Database access (already installed)

### Recommended for Production
- `@simplewebauthn/server` - WebAuthn server verification
- `@simplewebauthn/browser` - WebAuthn client helpers

```bash
npm install @simplewebauthn/server @simplewebauthn/browser
```

## Browser Support

### WebAuthn Support
- Chrome 67+
- Firefox 60+
- Safari 13+
- Edge 18+

### Platform Authenticators
- Windows Hello
- Touch ID (macOS/iOS)
- Face ID (iOS)
- Android Biometrics

## Related Documentation

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [MDN Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [SimpleWebAuthn Documentation](https://simplewebauthn.dev/)

---

*Implementation Date: 2024-12-14*
