# First Device Verification System

## Problem Statement

When a user logs in with their **first device** (no existing approved devices), we need a way to verify their identity before approving the device. Currently, devices are created but may need admin approval.

## Current Flow

1. User registers passkey → Device created with `isActive: false`
2. Admin manually approves device via admin panel
3. User can then login

## Proposed Solution: OTP Verification for First Device

### Overview

When registering the first device, automatically send an OTP via:
- **SMS** to user's registered phone number
- **Email** to user's registered email (if available)

User enters OTP to auto-approve their first device.

---

## Implementation Plan

### Phase 1: Database Schema

Add OTP tracking table:

```typescript
model DeviceVerificationOtp {
  id            String   @id @default(cuid())
  mobileUserId  Int      @map("mobile_user_id")
  deviceId      String   @map("device_id")
  
  otpCode       String   @map("otp_code")
  otpType       OtpType  @map("otp_type") // SMS or EMAIL
  
  sentTo        String   // Phone number or email
  expiresAt     DateTime @map("expires_at")
  verified      Boolean  @default(false)
  verifiedAt    DateTime? @map("verified_at")
  attempts      Int      @default(0)
  
  createdAt     DateTime @default(now()) @map("created_at")
  
  mobileUser    MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)
  
  @@index([mobileUserId])
  @@index([deviceId])
  @@map("fdh_device_verification_otps")
}

enum OtpType {
  SMS
  EMAIL
}
```

### Phase 2: GraphQL Schema Updates

```graphql
type DeviceVerificationResult {
  success: Boolean!
  requiresVerification: Boolean!
  verificationMethod: String  # "SMS" or "EMAIL" or "BOTH"
  maskedContact: String       # "***-***-1234" or "j***@example.com"
  deviceId: String
  message: String
}

input VerifyDeviceOtpInput {
  deviceId: ID!
  otpCode: String!
}

type VerifyDeviceOtpResult {
  success: Boolean!
  device: MobileDevice
  token: String  # JWT for immediate login
  message: String
}

extend type Mutation {
  # Send OTP for device verification
  sendDeviceVerificationOtp(
    deviceId: ID!
    method: OtpType!  # SMS or EMAIL
  ): Boolean!
  
  # Verify device with OTP
  verifyDeviceOtp(input: VerifyDeviceOtpInput!): VerifyDeviceOtpResult!
  
  # Resend OTP (rate limited)
  resendDeviceVerificationOtp(deviceId: ID!): Boolean!
}
```

### Phase 3: Modified Registration Flow

#### Current `registerPasskeyComplete`:

```typescript
// After successful passkey registration
const newDevice = await prisma.mobileDevice.create({
  data: {
    mobileUserId: user.id,
    credentialId: credentialID,
    publicKey: credentialPublicKey,
    counter: BigInt(counter),
    transports: responseJson.response.transports || ["internal"],
    name: deviceInfo.name || "Mobile Device",
    model: deviceInfo.model,
    os: deviceInfo.os,
    deviceId: deviceInfo.deviceId,
    isActive: false,  // NOT ACTIVE YET
  },
});
```

#### Enhanced `registerPasskeyComplete`:

```typescript
async registerPasskeyComplete(...) {
  // ... existing passkey verification code ...
  
  // Check if this is first device
  const existingDevices = await prisma.mobileDevice.count({
    where: { 
      mobileUserId: user.id,
      isActive: true 
    }
  });
  
  const isFirstDevice = existingDevices === 0;
  
  const newDevice = await prisma.mobileDevice.create({
    data: {
      mobileUserId: user.id,
      credentialId: credentialID,
      publicKey: credentialPublicKey,
      counter: BigInt(counter),
      transports: responseJson.response.transports || ["internal"],
      name: deviceInfo.name || "Mobile Device",
      model: deviceInfo.model,
      os: deviceInfo.os,
      deviceId: deviceInfo.deviceId,
      isActive: !isFirstDevice,  // Auto-approve if not first device
    },
  });
  
  if (isFirstDevice) {
    // Generate OTP
    const otpCode = generateOTP(); // 6-digit code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Determine verification method
    const method = user.phoneNumber ? 'SMS' : 'EMAIL';
    const sentTo = user.phoneNumber || user.email;
    
    // Save OTP
    await prisma.deviceVerificationOtp.create({
      data: {
        mobileUserId: user.id,
        deviceId: newDevice.id,
        otpCode,
        otpType: method,
        sentTo,
        expiresAt,
      }
    });
    
    // Send OTP
    if (method === 'SMS') {
      await sendSMS(sentTo, `Your verification code is: ${otpCode}`);
    } else {
      await sendEmail(sentTo, `Your verification code is: ${otpCode}`);
    }
    
    return {
      success: true,
      requiresVerification: true,
      verificationMethod: method,
      maskedContact: maskContact(sentTo, method),
      deviceId: newDevice.id,
      message: `Verification code sent via ${method}`,
    };
  }
  
  // Not first device - auto approved
  return {
    success: true,
    requiresVerification: false,
    device: newDevice,
  };
}
```

### Phase 4: OTP Verification Resolver

```typescript
async verifyDeviceOtp(
  _parent: unknown,
  args: { input: { deviceId: string; otpCode: string } }
) {
  const { deviceId, otpCode } = args.input;
  
  // Find OTP record
  const otpRecord = await prisma.deviceVerificationOtp.findFirst({
    where: {
      deviceId,
      otpCode,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    include: {
      mobileUser: true,
    }
  });
  
  if (!otpRecord) {
    // Increment failed attempts
    await prisma.deviceVerificationOtp.updateMany({
      where: { deviceId },
      data: { attempts: { increment: 1 } }
    });
    
    throw new Error("Invalid or expired verification code");
  }
  
  // Check max attempts (prevent brute force)
  if (otpRecord.attempts >= 5) {
    throw new Error("Too many failed attempts. Please request a new code.");
  }
  
  // Mark as verified
  await prisma.deviceVerificationOtp.update({
    where: { id: otpRecord.id },
    data: {
      verified: true,
      verifiedAt: new Date(),
    }
  });
  
  // Activate device
  const device = await prisma.mobileDevice.update({
    where: { id: deviceId },
    data: { isActive: true }
  });
  
  // Generate JWT token for immediate login
  const token = jwt.sign(
    {
      userId: otpRecord.mobileUserId,
      username: otpRecord.mobileUser.username,
      context: otpRecord.mobileUser.context,
      deviceId: deviceId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  return {
    success: true,
    device: {
      ...device,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
      counter: device.counter.toString(),
    },
    token,
    message: "Device verified successfully",
  };
}
```

### Phase 5: Helper Functions

```typescript
// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Mask contact info for privacy
function maskContact(contact: string, type: 'SMS' | 'EMAIL'): string {
  if (type === 'SMS') {
    // +265888123456 → +265***123456
    return contact.replace(/(\d{3})\d{6}(\d{3})/, '$1******$2');
  } else {
    // john@example.com → j***@example.com
    const [local, domain] = contact.split('@');
    return `${local[0]}***@${domain}`;
  }
}

// Send SMS (integrate with existing SMS service)
async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  // Use existing SMS worker or service
  // await SMSWorker.send({ to: phoneNumber, body: message });
}

// Send Email (integrate with Swoosh mailer)
async function sendEmail(email: string, message: string): Promise<void> {
  // Use existing email service
  // await EmailService.send({ to: email, subject: "Verify Device", body: message });
}
```

---

## Mobile App Flow

### Scenario: First Device Registration

```
User Opens App
     ↓
Enters Username/Password
     ↓
registerPasskeyStart() → Challenge
     ↓
Device Biometric Prompt
     ↓
registerPasskeyComplete(response)
     ↓
Response: {
  requiresVerification: true,
  verificationMethod: "SMS",
  maskedContact: "+265***123456",
  deviceId: "clx123..."
}
     ↓
[OTP Input Screen]
User enters 6-digit code
     ↓
verifyDeviceOtp(deviceId, code)
     ↓
Response: {
  success: true,
  token: "eyJhbGc...",
  device: {...}
}
     ↓
Login Success! → Home Screen
```

### Scenario: Second Device Registration

```
User Opens App on New Device
     ↓
Enters Username/Password
     ↓
registerPasskeyStart() → Challenge
     ↓
Device Biometric Prompt
     ↓
registerPasskeyComplete(response)
     ↓
Response: {
  requiresVerification: false,
  device: {...}
}
     ↓
Shows: "Device pending approval by admin"
     ↓
Admin approves via admin panel
     ↓
User can login
```

---

## Security Considerations

### 1. Rate Limiting
- Max 3 OTP sends per device per hour
- Max 5 OTP verification attempts per code
- Exponential backoff for failed attempts

### 2. OTP Expiry
- OTPs expire after 10 minutes
- Old OTPs automatically cleaned up

### 3. Audit Trail
- Log all OTP sends and verification attempts
- Track verification method used
- Record device info at time of verification

### 4. Edge Cases

**User has no phone or email:**
- Fallback to admin approval
- Show clear message in app

**OTP delivery fails:**
- Retry mechanism (max 2 retries)
- Allow switching between SMS/EMAIL if both available
- Fallback to admin approval after 3 failed deliveries

**User loses phone before verifying:**
- Admin can manually approve
- Admin can resend OTP to different number

---

## Admin Panel Updates

### Device List Enhancements

Add verification status column:

```tsx
<Table>
  <TableRow>
    <TableCell>Device Name</TableCell>
    <TableCell>Status</TableCell>
    <TableCell>Verification</TableCell>
    <TableCell>Actions</TableCell>
  </TableRow>
  {devices.map(device => (
    <TableRow>
      <TableCell>{device.name}</TableCell>
      <TableCell>
        <Badge variant={device.isActive ? "default" : "outline"}>
          {device.isActive ? "Active" : "Pending"}
        </Badge>
      </TableCell>
      <TableCell>
        {device.verificationStatus === "OTP_VERIFIED" && (
          <Badge variant="success">OTP Verified</Badge>
        )}
        {device.verificationStatus === "ADMIN_APPROVED" && (
          <Badge variant="default">Admin Approved</Badge>
        )}
        {device.verificationStatus === "PENDING" && (
          <Badge variant="warning">Awaiting Verification</Badge>
        )}
      </TableCell>
      <TableCell>
        {!device.isActive && (
          <>
            <Button size="sm" onClick={() => approveDevice(device.id)}>
              Approve
            </Button>
            <Button size="sm" onClick={() => resendOTP(device.id)}>
              Resend OTP
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  ))}
</Table>
```

---

## Configuration

Add environment variables:

```env
# OTP Settings
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RATE_LIMIT_PER_HOUR=3

# SMS Provider
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...

# Email Provider (already exists via Swoosh)
SMTP_HOST=...
SMTP_PORT=...
```

---

## Testing Checklist

- [ ] First device registration sends OTP
- [ ] OTP code validates correctly
- [ ] Invalid OTP shows error
- [ ] Expired OTP rejected
- [ ] Max attempts exceeded blocks verification
- [ ] Second device doesn't require OTP
- [ ] SMS delivery works
- [ ] Email delivery works
- [ ] Rate limiting prevents spam
- [ ] Admin can manually approve if OTP fails
- [ ] Resend OTP works
- [ ] Device becomes active after OTP verification
- [ ] JWT token allows immediate login after verification

---

## Rollout Strategy

### Phase 1: Backend (Week 1)
- Add database schema
- Implement resolvers
- Add OTP generation/validation
- Integrate SMS/Email services

### Phase 2: Admin Panel (Week 1)
- Update device list UI
- Add resend OTP button
- Show verification status

### Phase 3: Mobile App (Week 2)
- Add OTP input screen
- Handle verification flow
- Error handling and retries

### Phase 4: Testing & Rollout (Week 2)
- Internal testing
- Beta rollout to small user group
- Monitor OTP delivery rates
- Full production rollout

---

## Alternative Approaches

### Option 1: Email Link Verification
Instead of OTP, send magic link via email:
- User clicks link
- Opens browser
- Approves device
- Returns to app

**Pros:** More secure, no code to type
**Cons:** Requires email, more complex flow

### Option 2: Push Notification to Existing Device
If user has another device:
- Send push notification
- "Approve new device?"
- Tap to approve

**Pros:** Seamless, no OTP needed
**Cons:** Requires existing active device

### Option 3: Admin-Only Approval (Current)
Keep current flow:
- All first devices need admin approval

**Pros:** Maximum security
**Cons:** Poor UX, scaling issues

---

## Recommended: **Hybrid Approach**

1. **First device**: OTP verification (auto-approve)
2. **Second device**: Push notification to first device (if available)
3. **Fallback**: Admin approval

This provides the best balance of security and UX!

---

## Files to Modify

1. `admin/prisma/schema.prisma` - Add DeviceVerificationOtp model
2. `admin/lib/graphql/schema/typeDefs.ts` - Add OTP types/mutations
3. `admin/lib/graphql/schema/resolvers/passkey.ts` - Update registration flow
4. `admin/lib/graphql/schema/resolvers/deviceVerification.ts` - NEW: OTP resolver
5. `admin/lib/services/otp.ts` - NEW: OTP generation/validation
6. `admin/lib/services/notification.ts` - SMS/Email integration
7. `admin/components/users/user-details.tsx` - Show verification status

---

**Next Steps:** Which approach do you prefer? I can implement any of these options!
