# Secure Password Login with OTP Verification

## Problem with Previous Approach ❌

Creating device records on every login attempt fills the database with:
- Failed attempts
- Malicious attempts
- Testing/probing attempts
- Spam devices

## NEW Approach: OTP Verification BEFORE Device Creation ✅

Only create device record AFTER user proves they control the account via OTP!

---

## Complete Flow: First-Time Login with OTP

### Step 1: Login Attempt (No Devices Exist)

```
User Opens App
  ↓
Enters: username, password, deviceInfo
  ↓
System Checks:
1. ✅ Valid username?
2. ✅ Valid password?
3. ❓ User has ANY approved devices?
  ↓
[NO APPROVED DEVICES FOUND]
  ↓
System Actions:
1. Log attempt to DeviceLoginAttempt table
   - Status: PENDING_VERIFICATION
   - Store: username, deviceInfo, IP, location
   - wasDeviceNew: true
2. Generate 6-digit OTP
3. Send OTP via SMS/Email
4. Return response:
   {
     requiresVerification: true,
     verificationMethod: "SMS" | "EMAIL",
     maskedContact: "+265***1234",
     verificationUrl: "https://app.com/verify-device/[token]",
     message: "Check your SMS/Email for verification code"
   }
  ↓
User sees: 
"We sent a code to +265***1234"
"Open the link and enter the code to verify your device"
```

### Step 2: User Opens Verification URL

```
User clicks link or enters URL manually
  ↓
Opens: https://app.com/verify-device/[token]
  ↓
Shows verification page:
  [______] Enter 6-digit code
  [Verify] [Resend Code]
  ↓
User enters OTP code
  ↓
System verifies OTP
  ↓
If VALID:
  1. Create device in MobileDevice table
     - isActive: TRUE (verified via OTP)
     - Store device info, IP, location
  2. Update login attempt status: SUCCESS
  3. Generate JWT token
  4. Return: { success: true, token: "..." }
  ↓
User automatically logged in! ✓
```

### Step 3: Subsequent Logins (Device Approved)

```
User Opens App (same device)
  ↓
Enters: username, password, deviceId
  ↓
System Checks:
1. ✅ Valid password?
2. ✅ Device exists?
3. ✅ Device is approved?
  ↓
[DEVICE FOUND & APPROVED]
  ↓
System Actions:
1. Update device lastUsedAt
2. Log successful login
3. Return JWT token
  ↓
User logs in immediately! ✓
```

---

## Database Schema

### DeviceLoginAttempt (Track attempts BEFORE device creation)

```typescript
model DeviceLoginAttempt {
  id              String   @id @default(cuid())
  
  // User Context
  mobileUserId    Int?     @map("mobile_user_id")
  username        String?  @db.Text
  context         String?  @db.Text
  
  // Device Information (NOT yet in device table)
  deviceId        String?  @map("device_id")
  deviceName      String?  @map("device_name")
  deviceModel     String?  @map("device_model")
  deviceOs        String?  @map("device_os")
  
  // Network Context
  ipAddress       String?  @map("ip_address")
  location        String?  @db.Text
  
  // Attempt Details
  attemptType     AttemptType @map("attempt_type")
  status          AttemptStatus
  failureReason   String?  @db.Text @map("failure_reason")
  
  // OTP Verification (NEW!)
  otpCode         String?  @map("otp_code")
  otpSentTo       String?  @map("otp_sent_to")      // Phone or email
  otpSentAt       DateTime? @map("otp_sent_at")
  otpExpiresAt    DateTime? @map("otp_expires_at")
  otpVerifiedAt   DateTime? @map("otp_verified_at")
  otpAttempts     Int      @default(0) @map("otp_attempts")
  verificationToken String? @unique @map("verification_token") // URL token
  
  attemptedAt     DateTime @default(now()) @map("attempted_at")
  
  mobileUser      MobileUser? @relation(fields: [mobileUserId], references: [id])
  
  @@index([mobileUserId])
  @@index([deviceId])
  @@index([verificationToken])
  @@map("fdh_device_login_attempts")
}

enum AttemptStatus {
  PENDING_VERIFICATION  // NEW: Waiting for OTP
  VERIFIED              // NEW: OTP confirmed
  SUCCESS
  FAILED_CREDENTIALS
  FAILED_OTP            // NEW: Wrong OTP
  EXPIRED               // NEW: OTP expired
}
```

### MobileDevice (Only created AFTER OTP verification)

```typescript
model MobileDevice {
  id              String   @id @default(cuid())
  mobileUserId    Int      @map("mobile_user_id")
  
  // Device Info
  name            String?  @db.Text
  model           String?  @db.Text
  os              String?  @db.Text
  deviceId        String   @db.Text  // Unique ID from app
  
  // For passkey devices
  credentialId    String?  @unique @db.Text
  publicKey       String?  @db.Text
  counter         BigInt?  @default(0)
  transports      String[]
  
  // Verification Context
  verifiedVia     String?  @map("verified_via")  // "OTP_SMS", "OTP_EMAIL", "PASSKEY"
  verificationIp  String?  @map("verification_ip")
  verificationLocation String? @map("verification_location")
  verifiedAt      DateTime @default(now()) @map("verified_at")
  
  // Always active once created (verified)
  isActive        Boolean  @default(true) @map("is_active")
  
  // Usage Tracking
  lastUsedAt      DateTime? @map("last_used_at")
  loginCount      Int      @default(0) @map("login_count")
  lastLoginIp     String?  @map("last_login_ip")
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  user            MobileUser @relation(fields: [mobileUserId], references: [id])
  
  @@unique([mobileUserId, deviceId])
  @@index([mobileUserId])
  @@map("mobile_devices")
}
```

---

## Updated Login Resolver

```typescript
export const authResolvers = {
  Mutation: {
    async login(
      _parent: unknown,
      args: {
        input: LoginInput & {
          ipAddress?: string;
          location?: string;
          deviceModel?: string;
          deviceOs?: string;
        };
      }
    ) {
      const {
        username,
        password,
        context,
        deviceId,
        deviceName,
        ipAddress,
        location,
        deviceModel,
        deviceOs,
      } = args.input;

      // 1. Find user and verify password
      const user = await prisma.mobileUser.findFirst({
        where: {
          username,
          context: context as any,
          isActive: true,
        },
      });

      if (!user || !user.passwordHash) {
        // Log failed attempt
        await prisma.deviceLoginAttempt.create({
          data: {
            username,
            context,
            deviceId,
            deviceName,
            deviceModel,
            deviceOs,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "FAILED_CREDENTIALS",
            failureReason: "Invalid username or password",
            attemptedAt: new Date(),
          },
        });

        await bcrypt.compare(password, "$2b$12$...");
        throw new Error("Invalid credentials");
      }

      const isValidPassword = await bcrypt.compare(
        password,
        user.passwordHash
      );

      if (!isValidPassword) {
        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            username,
            context,
            deviceId,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "FAILED_CREDENTIALS",
            failureReason: "Invalid password",
            attemptedAt: new Date(),
          },
        });

        throw new Error("Invalid credentials");
      }

      // 2. ✅ Password is correct - Check if device exists
      const existingDevice = await prisma.mobileDevice.findFirst({
        where: {
          mobileUserId: user.id,
          deviceId,
        },
      });

      if (existingDevice && existingDevice.isActive) {
        // 3a. Known device - allow login
        await prisma.mobileDevice.update({
          where: { id: existingDevice.id },
          data: {
            lastUsedAt: new Date(),
            lastLoginIp: ipAddress,
            loginCount: { increment: 1 },
          },
        });

        await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            username,
            context,
            deviceId,
            ipAddress,
            attemptType: "PASSWORD_LOGIN",
            status: "SUCCESS",
            attemptedAt: new Date(),
          },
        });

        const token = jwt.sign(
          { userId: user.id, username, context, deviceId },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            phoneNumber: user.phoneNumber,
            context: user.context,
          },
          requiresVerification: false,
        };
      }

      // 3b. NEW DEVICE - Require OTP verification
      // Check if user has ANY approved devices
      const hasAnyDevice = await prisma.mobileDevice.count({
        where: { mobileUserId: user.id, isActive: true },
      });

      const requiresOtp = hasAnyDevice === 0; // First device needs OTP

      if (requiresOtp) {
        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        const verificationToken = crypto.randomUUID();

        // Determine verification method
        const verificationMethod = user.phoneNumber ? "SMS" : "EMAIL";
        const sentTo = user.phoneNumber || user.email;

        // Create login attempt with OTP
        const attempt = await prisma.deviceLoginAttempt.create({
          data: {
            mobileUserId: user.id,
            username,
            context,
            deviceId,
            deviceName,
            deviceModel,
            deviceOs,
            ipAddress,
            location,
            attemptType: "PASSWORD_LOGIN",
            status: "PENDING_VERIFICATION",
            otpCode,
            otpSentTo: sentTo,
            otpSentAt: new Date(),
            otpExpiresAt,
            verificationToken,
            attemptedAt: new Date(),
          },
        });

        // Send OTP
        if (verificationMethod === "SMS") {
          await sendSMS(sentTo, `Your verification code is: ${otpCode}`);
        } else {
          await sendEmail(
            sentTo,
            "Verify Your Device",
            `Your verification code is: ${otpCode}`
          );
        }

        // Mask contact
        const maskedContact = maskContact(sentTo, verificationMethod);

        return {
          requiresVerification: true,
          verificationMethod,
          maskedContact,
          verificationUrl: `https://app.example.com/verify-device/${verificationToken}`,
          message: `Verification code sent to ${maskedContact}`,
        };
      }

      // 3c. Second+ device - requires admin approval
      return {
        requiresApproval: true,
        message: "Device pending admin approval",
      };
    },

    // NEW: Verify device with OTP
    async verifyDeviceOtp(
      _parent: unknown,
      args: { verificationToken: string; otpCode: string }
    ) {
      const { verificationToken, otpCode } = args;

      // Find attempt
      const attempt = await prisma.deviceLoginAttempt.findUnique({
        where: { verificationToken },
        include: { mobileUser: true },
      });

      if (!attempt) {
        throw new Error("Invalid verification token");
      }

      // Check expiry
      if (new Date() > attempt.otpExpiresAt!) {
        await prisma.deviceLoginAttempt.update({
          where: { id: attempt.id },
          data: { status: "EXPIRED" },
        });
        throw new Error("Verification code expired");
      }

      // Check attempts
      if (attempt.otpAttempts >= 5) {
        throw new Error("Too many attempts. Request a new code.");
      }

      // Verify OTP
      if (attempt.otpCode !== otpCode) {
        await prisma.deviceLoginAttempt.update({
          where: { id: attempt.id },
          data: {
            otpAttempts: { increment: 1 },
            status: "FAILED_OTP",
          },
        });
        throw new Error("Invalid verification code");
      }

      // ✅ OTP VERIFIED - Create device!
      const device = await prisma.mobileDevice.create({
        data: {
          mobileUserId: attempt.mobileUserId!,
          deviceId: attempt.deviceId!,
          name: attempt.deviceName,
          model: attempt.deviceModel,
          os: attempt.deviceOs,
          verifiedVia: attempt.otpSentTo?.includes("@")
            ? "OTP_EMAIL"
            : "OTP_SMS",
          verificationIp: attempt.ipAddress,
          verificationLocation: attempt.location,
          isActive: true, // Already verified!
        },
      });

      // Update attempt
      await prisma.deviceLoginAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "VERIFIED",
          otpVerifiedAt: new Date(),
        },
      });

      // Generate token
      const token = jwt.sign(
        {
          userId: attempt.mobileUserId,
          username: attempt.mobileUser!.username,
          context: attempt.context,
          deviceId: device.deviceId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        success: true,
        token,
        device: {
          id: device.id,
          name: device.name,
          model: device.model,
        },
        message: "Device verified successfully",
      };
    },
  },
};

// Helper functions
function maskContact(contact: string, method: "SMS" | "EMAIL"): string {
  if (method === "SMS") {
    return contact.replace(/(\d{4})\d{5}(\d{3})/, "$1***$2");
  } else {
    const [local, domain] = contact.split("@");
    return `${local[0]}***@${domain}`;
  }
}

async function sendSMS(phone: string, message: string): Promise<void> {
  // Integrate with SMS service
  console.log(`SMS to ${phone}: ${message}`);
}

async function sendEmail(
  email: string,
  subject: string,
  body: string
): Promise<void> {
  // Integrate with email service
  console.log(`Email to ${email}: ${subject} - ${body}`);
}
```

---

## GraphQL Schema Updates

```graphql
type LoginResult {
  token: String
  user: MobileUser
  
  # New device verification flow
  requiresVerification: Boolean!
  verificationMethod: String       # "SMS" or "EMAIL"
  maskedContact: String            # "+265***1234"
  verificationUrl: String          # Link to open
  
  # Admin approval flow
  requiresApproval: Boolean!
  
  message: String
}

type VerifyDeviceResult {
  success: Boolean!
  token: String!
  device: MobileDevice!
  message: String
}

input LoginInput {
  username: String!
  password: String!
  context: MobileUserContext!
  deviceId: String!
  deviceName: String!
  
  # Optional metadata
  ipAddress: String
  location: String
  deviceModel: String
  deviceOs: String
}

extend type Mutation {
  login(input: LoginInput!): LoginResult!
  
  # Verify device with OTP
  verifyDeviceOtp(
    verificationToken: String!
    otpCode: String!
  ): VerifyDeviceResult!
  
  # Resend OTP
  resendDeviceOtp(verificationToken: String!): Boolean!
}
```

---

## Mobile App Flow

### First Login Screen

```typescript
// User enters credentials
const result = await login({
  username,
  password,
  deviceId: Device.getId(),
  deviceName: Device.getName(),
  deviceModel: Device.getModel(),
  deviceOs: Device.getOS(),
});

if (result.requiresVerification) {
  // Show OTP screen
  navigation.navigate("VerifyDevice", {
    verificationUrl: result.verificationUrl,
    maskedContact: result.maskedContact,
    verificationMethod: result.verificationMethod,
  });
} else if (result.token) {
  // Login success
  await saveToken(result.token);
  navigation.navigate("Home");
}
```

### OTP Verification Screen

```typescript
// User opens verification link or manually navigates
const VerifyDeviceScreen = ({ verificationToken }) => {
  const [otpCode, setOtpCode] = useState("");

  const handleVerify = async () => {
    const result = await verifyDeviceOtp({
      verificationToken,
      otpCode,
    });

    if (result.success) {
      await saveToken(result.token);
      navigation.replace("Home");
    }
  };

  return (
    <View>
      <Text>Enter the 6-digit code sent to {maskedContact}</Text>
      <OtpInput value={otpCode} onChange={setOtpCode} />
      <Button onPress={handleVerify}>Verify</Button>
      <Button onPress={resendOtp}>Resend Code</Button>
    </View>
  );
};
```

---

## Key Benefits of This Approach ✅

1. **Clean Device Table** - Only verified devices stored
2. **Prevent Spam** - OTP blocks malicious attempts
3. **User-Friendly** - Immediate verification, no admin wait
4. **Security** - User must prove account ownership
5. **Audit Trail** - All attempts logged in DeviceLoginAttempt
6. **Scalable** - No admin bottleneck for first devices

---

## Comparison: Old vs New

| Aspect | ❌ Old Approach | ✅ New Approach |
|--------|----------------|-----------------|
| **Device Creation** | On every login attempt | After OTP verification |
| **Database** | Filled with spam | Clean, verified devices only |
| **First Device** | Admin approval | OTP verification |
| **User Wait Time** | Hours/days | Minutes |
| **Security** | Password only | Password + OTP |
| **Tracking** | In device table | In login attempts table |

---

## Implementation Steps

1. ✅ Add OTP fields to DeviceLoginAttempt
2. ✅ Update login resolver with OTP logic
3. ✅ Create verifyDeviceOtp mutation
4. ✅ Add SMS/Email integration
5. ✅ Build verification URL handler
6. ✅ Update mobile app flow

**Should I implement this now?** This is the cleanest approach! 🚀
