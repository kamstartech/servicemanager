# Device Login Tracking & Approval System - CRITICAL GAP

## Current Problem ❌

**You're absolutely right!** We're NOT properly tracking:
1. Device registration attempts
2. Failed login attempts  
3. Device metadata for admin approval
4. Login history
5. Suspicious activity

**Current Flow Has Issues:**
```typescript
// Device is created but we don't track:
// - WHO initiated the request
// - WHEN they tried to login
// - WHERE they're logging in from (IP)
// - Device fingerprint details
// - Registration metadata
```

Admin sees device but has **NO CONTEXT** to approve or reject it!

---

## Required Solution: Comprehensive Device & Login Tracking

### 1. Enhanced Database Schema

#### A. Device Login Attempts Table (NEW)

Track EVERY login attempt, even failed ones:

```typescript
model DeviceLoginAttempt {
  id              String   @id @default(cuid())
  
  // User Context
  mobileUserId    Int?     @map("mobile_user_id")
  username        String?  @db.Text
  context         String?  @db.Text  // MOBILE_BANKING, WALLET, etc.
  
  // Device Information
  deviceId        String?  @map("device_id")        // Device UUID from app
  deviceName      String?  @map("device_name")      // "Jimmy's iPhone"
  deviceModel     String?  @map("device_model")     // "iPhone 14 Pro"
  deviceOs        String?  @map("device_os")        // "iOS 16.2"
  deviceFingerprint String? @map("device_fingerprint") // Unique hash
  
  // Location & Network
  ipAddress       String?  @map("ip_address")
  userAgent       String?  @db.Text @map("user_agent")
  location        String?  @db.Text                 // "Lilongwe, Malawi"
  
  // Attempt Details
  attemptType     AttemptType @map("attempt_type")  // REGISTRATION, LOGIN, OTP_VERIFY
  status          AttemptStatus                     // SUCCESS, FAILED, PENDING_APPROVAL
  failureReason   String?  @db.Text @map("failure_reason")
  
  // Timestamps
  attemptedAt     DateTime @default(now()) @map("attempted_at")
  
  // Relations
  mobileUser      MobileUser? @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)
  
  @@index([mobileUserId])
  @@index([deviceId])
  @@index([ipAddress])
  @@index([attemptedAt])
  @@map("fdh_device_login_attempts")
}

enum AttemptType {
  REGISTRATION    // First time registering passkey
  LOGIN           // Existing device trying to login
  OTP_VERIFY      // OTP verification attempt
}

enum AttemptStatus {
  SUCCESS
  FAILED
  PENDING_APPROVAL
  BLOCKED
}
```

#### B. Enhanced MobileDevice Schema

Add more tracking fields:

```typescript
model MobileDevice {
  id              String   @id @default(cuid())
  mobileUserId    Int      @map("mobile_user_id")
  
  // Device Metadata
  name            String?  @db.Text
  model           String?  @db.Text
  os              String?  @db.Text
  deviceId        String?  @db.Text
  deviceFingerprint String? @db.Text @map("device_fingerprint") // NEW
  
  // Passkey Credentials
  credentialId    String   @unique @db.Text
  publicKey       String   @db.Text
  counter         BigInt   @default(0)
  transports      String[]
  
  // Registration Context (NEW)
  registrationIp  String?  @map("registration_ip")      // NEW
  registrationLocation String? @map("registration_location") // NEW
  registeredAt    DateTime @default(now()) @map("registered_at") // NEW
  
  // Approval Tracking (NEW)
  isActive        Boolean  @default(false) @map("is_active") // ⚠️ Default FALSE!
  approvedBy      Int?     @map("approved_by")         // NEW: Admin user ID
  approvedAt      DateTime? @map("approved_at")        // NEW
  rejectedBy      Int?     @map("rejected_by")         // NEW
  rejectedAt      DateTime? @map("rejected_at")        // NEW
  rejectionReason String?  @db.Text @map("rejection_reason") // NEW
  
  // Usage Tracking
  lastUsedAt      DateTime? @map("last_used_at")
  loginCount      Int      @default(0) @map("login_count") // NEW
  lastLoginIp     String?  @map("last_login_ip")       // NEW
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // Relations
  user            MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)
  
  @@index([mobileUserId])
  @@index([isActive])
  @@map("mobile_devices")
}
```

#### C. Device Session Tracking

Track active sessions:

```typescript
model DeviceSession {
  id              String   @id @default(cuid())
  deviceId        String   @map("device_id")
  mobileUserId    Int      @map("mobile_user_id")
  
  // Session Info
  token           String   @unique @db.Text // JWT token hash
  ipAddress       String   @map("ip_address")
  userAgent       String?  @db.Text @map("user_agent")
  
  // Status
  isActive        Boolean  @default(true) @map("is_active")
  expiresAt       DateTime @map("expires_at")
  lastActivityAt  DateTime @default(now()) @map("last_activity_at")
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  revokedAt       DateTime? @map("revoked_at")
  
  // Relations
  mobileUser      MobileUser @relation(fields: [mobileUserId], references: [id], onDelete: Cascade)
  
  @@index([deviceId])
  @@index([mobileUserId])
  @@index([token])
  @@map("fdh_device_sessions")
}
```

---

### 2. Updated Registration Flow with Tracking

```typescript
async registerPasskeyComplete(
  _parent: unknown,
  args: {
    username: string;
    context: string;
    response: string;
    deviceInfo?: string;
    ipAddress?: string;      // NEW: Passed from client
    location?: string;       // NEW: Optional location
  }
) {
  const { username, context, response, ipAddress, location } = args;
  const responseJson = JSON.parse(response);
  const deviceInfo = args.deviceInfo ? JSON.parse(args.deviceInfo) : {};
  
  const user = await prisma.mobileUser.findFirst({
    where: { username, context: context as any },
  });
  
  if (!user) {
    // Log failed attempt
    await prisma.deviceLoginAttempt.create({
      data: {
        username,
        context,
        deviceName: deviceInfo.name,
        deviceModel: deviceInfo.model,
        deviceOs: deviceInfo.os,
        deviceId: deviceInfo.deviceId,
        ipAddress,
        attemptType: 'REGISTRATION',
        status: 'FAILED',
        failureReason: 'User not found',
        attemptedAt: new Date(),
      }
    });
    
    throw new Error("User not found");
  }
  
  // ... passkey verification ...
  
  if (verified && registrationInfo) {
    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(deviceInfo, ipAddress);
    
    // Check if this is first device
    const existingDeviceCount = await prisma.mobileDevice.count({
      where: { mobileUserId: user.id }
    });
    
    const isFirstDevice = existingDeviceCount === 0;
    
    // Create device (INACTIVE by default for 2nd+ devices)
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
        deviceFingerprint,
        registrationIp: ipAddress,
        registrationLocation: location,
        isActive: false, // ⚠️ ALWAYS START INACTIVE!
      },
    });
    
    // Log successful registration attempt
    await prisma.deviceLoginAttempt.create({
      data: {
        mobileUserId: user.id,
        username,
        context,
        deviceId: newDevice.id,
        deviceName: deviceInfo.name,
        deviceModel: deviceInfo.model,
        deviceOs: deviceInfo.os,
        deviceFingerprint,
        ipAddress,
        location,
        attemptType: 'REGISTRATION',
        status: isFirstDevice ? 'PENDING_APPROVAL' : 'PENDING_APPROVAL',
        attemptedAt: new Date(),
      }
    });
    
    if (isFirstDevice) {
      // Send OTP for first device
      const otpCode = generateOTP();
      // ... OTP logic ...
      
      return {
        success: true,
        requiresVerification: true,
        verificationMethod: 'SMS',
        deviceId: newDevice.id,
        message: 'Verification code sent',
      };
    }
    
    // Not first device - pending admin approval
    return {
      success: true,
      requiresVerification: false,
      requiresApproval: true, // NEW FLAG
      deviceId: newDevice.id,
      message: 'Device registered. Pending admin approval.',
    };
  }
  
  throw new Error("Verification failed");
}

// Helper function
function generateDeviceFingerprint(
  deviceInfo: any,
  ipAddress?: string
): string {
  const data = JSON.stringify({
    model: deviceInfo.model,
    os: deviceInfo.os,
    deviceId: deviceInfo.deviceId,
    ip: ipAddress,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

---

### 3. Admin Panel: Enhanced Device Approval UI

Show ALL the context needed for approval:

```tsx
// admin/components/users/device-approval-section.tsx
<Card>
  <CardHeader>
    <CardTitle>Pending Device Approval</CardTitle>
  </CardHeader>
  <CardContent>
    {pendingDevices.map(device => (
      <div key={device.id} className="border rounded-lg p-4 space-y-3">
        {/* Device Info */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{device.name}</h3>
            <p className="text-sm text-muted-foreground">
              {device.model} • {device.os}
            </p>
          </div>
          <Badge variant="warning">Pending</Badge>
        </div>
        
        {/* Registration Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium">Registered:</span>
            <p className="text-muted-foreground">
              {new Date(device.registeredAt).toLocaleString()}
            </p>
          </div>
          
          <div>
            <span className="font-medium">IP Address:</span>
            <p className="text-muted-foreground font-mono">
              {device.registrationIp || 'Unknown'}
            </p>
          </div>
          
          {device.registrationLocation && (
            <div>
              <span className="font-medium">Location:</span>
              <p className="text-muted-foreground">
                {device.registrationLocation}
              </p>
            </div>
          )}
          
          <div>
            <span className="font-medium">Device ID:</span>
            <p className="text-muted-foreground font-mono text-xs">
              {device.deviceId?.substring(0, 20)}...
            </p>
          </div>
        </div>
        
        {/* Recent Login Attempts */}
        {device.loginAttempts?.length > 0 && (
          <div>
            <span className="font-medium text-sm">Recent Attempts:</span>
            <div className="mt-2 space-y-1">
              {device.loginAttempts.map((attempt: any) => (
                <div key={attempt.id} className="flex items-center justify-between text-xs">
                  <span>{new Date(attempt.attemptedAt).toLocaleString()}</span>
                  <Badge variant={attempt.status === 'FAILED' ? 'destructive' : 'default'}>
                    {attempt.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Risk Assessment */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Risk Level:</span>
          <Badge variant={calculateRiskLevel(device)}>
            {getRiskLabel(device)}
          </Badge>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => approveDevice(device.id)}
            className="flex-1"
          >
            ✓ Approve Device
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setRejectDevice(device.id)}
            className="flex-1"
          >
            ✗ Reject
          </Button>
        </div>
      </div>
    ))}
  </CardContent>
</Card>

// Risk calculation
function calculateRiskLevel(device: any): 'default' | 'warning' | 'destructive' {
  const failedAttempts = device.loginAttempts?.filter((a: any) => a.status === 'FAILED').length || 0;
  const isUnknownLocation = !device.registrationLocation;
  const isSuspiciousIp = checkSuspiciousIp(device.registrationIp);
  
  if (failedAttempts > 3 || isSuspiciousIp) return 'destructive';
  if (failedAttempts > 0 || isUnknownLocation) return 'warning';
  return 'default';
}
```

---

### 4. GraphQL Updates

```graphql
type DeviceLoginAttempt {
  id: ID!
  username: String
  deviceName: String
  deviceModel: String
  ipAddress: String
  location: String
  attemptType: String!
  status: String!
  failureReason: String
  attemptedAt: String!
}

type MobileDevice {
  id: ID!
  name: String
  model: String
  os: String
  deviceId: String
  
  # Registration Context
  registrationIp: String
  registrationLocation: String
  registeredAt: String!
  
  # Approval Status
  isActive: Boolean!
  approvedBy: Int
  approvedAt: String
  rejectedBy: Int
  rejectedAt: String
  rejectionReason: String
  
  # Usage Stats
  lastUsedAt: String
  loginCount: Int!
  lastLoginIp: String
  
  # Recent Attempts
  loginAttempts: [DeviceLoginAttempt!]!
  
  createdAt: String!
  updatedAt: String!
}

extend type Mutation {
  approveDevice(deviceId: ID!, notes: String): MobileDevice!
  rejectDevice(deviceId: ID!, reason: String!): Boolean!
  revokeDevice(deviceId: ID!): Boolean!
}

extend type Query {
  deviceLoginAttempts(userId: ID!): [DeviceLoginAttempt!]!
  suspiciousDevices: [MobileDevice!]!
}
```

---

### 5. Login Attempt Tracking

Every login (success or fail) should be logged:

```typescript
async loginWithPasskeyComplete(...) {
  // Log attempt
  const attempt = await prisma.deviceLoginAttempt.create({
    data: {
      mobileUserId: user?.id,
      username,
      context,
      deviceId,
      ipAddress,
      attemptType: 'LOGIN',
      status: 'PENDING',
      attemptedAt: new Date(),
    }
  });
  
  try {
    // ... verify passkey ...
    
    if (verified) {
      // Update attempt status
      await prisma.deviceLoginAttempt.update({
        where: { id: attempt.id },
        data: { status: 'SUCCESS' }
      });
      
      // Update device last used
      await prisma.mobileDevice.update({
        where: { id: deviceId },
        data: {
          lastUsedAt: new Date(),
          lastLoginIp: ipAddress,
          loginCount: { increment: 1 }
        }
      });
      
      return { success: true, token: '...' };
    }
  } catch (error) {
    // Log failure
    await prisma.deviceLoginAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'FAILED',
        failureReason: error.message
      }
    });
    
    throw error;
  }
}
```

---

## Implementation Priority

### Week 1: Critical Foundation ⚠️
1. **Add login attempts table** (highest priority!)
2. **Update device schema** with tracking fields
3. **Set `isActive: false` by default**
4. **Log all registration attempts**

### Week 2: Admin Panel
5. **Enhanced device approval UI** with context
6. **Approve/Reject mutations**
7. **Risk assessment display**
8. **Login attempt history view**

### Week 3: Analytics
9. **Suspicious device detection**
10. **Login attempt reports**
11. **Geographic analysis**
12. **Automated alerts**

---

## Why This Matters 🚨

Without this tracking:
- ❌ Admin has no context to approve/reject
- ❌ Can't detect suspicious activity
- ❌ No audit trail for compliance
- ❌ Can't identify attack patterns
- ❌ No way to revoke compromised devices

With this tracking:
- ✅ Admin sees WHO, WHAT, WHEN, WHERE
- ✅ Detect brute force attempts
- ✅ Full audit trail
- ✅ Risk-based approval
- ✅ Better security posture

---

**Should I implement this tracking system immediately?** It's critical for proper device approval workflow!
