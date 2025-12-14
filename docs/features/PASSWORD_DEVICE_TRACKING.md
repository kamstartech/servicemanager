# Password-Based Device Tracking & Approval System

## Clarification ✅

This is for **password-based authentication**, NOT passkey!

**Current Flow:**
```typescript
// User logs in with username + password + deviceId
login(username, password, deviceId, deviceName)
  ↓
- If device exists & isActive: Login success ✓
- If device exists & !isActive: devicePending = true (can't login)
- If device doesn't exist: devicePending = true (can't login)
```

**Problem:** Device tracking happens AFTER login attempt, but we need to track BEFORE!

---

## Complete Password Login & Device Tracking Flow

### Scenario 1: First Login Attempt (New Device)

```
User Opens App
  ↓
Enters: username, password, device info
  ↓
System checks:
1. ✅ Valid username/password?
2. ❓ Is this device registered?
3. ❓ Is device approved?
  ↓
[NEW DEVICE DETECTED]
  ↓
System Actions:
1. Log login attempt with device info
2. Create device record (isActive: FALSE)
3. Return: { devicePending: true, requiresApproval: true }
  ↓
User sees: "Device pending approval by administrator"
  ↓
Admin Panel:
- Shows new device request
- User: John Doe
- Device: iPhone 14 Pro
- IP: 41.77.123.45
- Location: Lilongwe
- Time: 2025-12-11 23:00
  ↓
Admin Reviews & Approves
  ↓
Device.isActive = TRUE
  ↓
User can now login!
```

### Scenario 2: Login with Approved Device

```
User Opens App
  ↓
Enters: username, password, deviceId
  ↓
System checks:
1. ✅ Valid username/password?
2. ✅ Device exists in system?
3. ✅ Device is approved (isActive: true)?
  ↓
[APPROVED DEVICE]
  ↓
System Actions:
1. Log successful login
2. Update device lastUsedAt
3. Increment loginCount
4. Return JWT token
  ↓
User logs in successfully ✓
```

### Scenario 3: Login with Unapproved Device

```
User Opens App
  ↓
Enters: username, password, deviceId (exists but not approved)
  ↓
System checks:
1. ✅ Valid username/password?
2. ✅ Device exists?
3. ❌ Device NOT approved (isActive: false)
  ↓
[PENDING DEVICE]
  ↓
System Actions:
1. Log login attempt (BLOCKED - pending approval)
2. Return: { devicePending: true }
  ↓
User sees: "Device pending approval by administrator"
```

---

## Updated Database Schema

### Device Login Attempts (Track ALL password login attempts)

```typescript
model DeviceLoginAttempt {
  id              String   @id @default(cuid())
  
  // User Context
  mobileUserId    Int?     @map("mobile_user_id")
  username        String?  @db.Text
  context         String?  @db.Text
  
  // Device Information
  deviceId        String?  @map("device_id")        // From mobile app
  deviceName      String?  @map("device_name")      
  deviceModel     String?  @map("device_model")     
  deviceOs        String?  @map("device_os")        
  
  // Network Context
  ipAddress       String?  @map("ip_address")
  userAgent       String?  @db.Text @map("user_agent")
  location        String?  @db.Text
  
  // Attempt Details
  attemptType     AttemptType @map("attempt_type")  // PASSWORD_LOGIN
  status          AttemptStatus                     
  failureReason   String?  @db.Text @map("failure_reason")
  wasDeviceNew    Boolean  @default(false) @map("was_device_new")  // NEW!
  
  attemptedAt     DateTime @default(now()) @map("attempted_at")
  
  mobileUser      MobileUser? @relation(fields: [mobileUserId], references: [id])
  
  @@index([mobileUserId])
  @@index([deviceId])
  @@index([ipAddress])
  @@index([attemptedAt])
  @@map("fdh_device_login_attempts")
}

enum AttemptType {
  PASSWORD_LOGIN     // NEW: Password-based login
  PASSKEY_REGISTRATION
  PASSKEY_LOGIN
  OTP_VERIFY
}

enum AttemptStatus {
  SUCCESS
  FAILED_CREDENTIALS
  FAILED_DEVICE_PENDING    // NEW: Correct password but device not approved
  FAILED_DEVICE_BLOCKED
  PENDING_APPROVAL
}
```

### Enhanced MobileDevice Schema

```typescript
model MobileDevice {
  id              String   @id @default(cuid())
  mobileUserId    Int      @map("mobile_user_id")
  
  // Device Info
  name            String?  @db.Text
  model           String?  @db.Text
  os              String?  @db.Text
  deviceId        String?  @db.Text  // Unique ID from app
  
  // For passkey devices only
  credentialId    String?  @unique @db.Text
  publicKey       String?  @db.Text
  counter         BigInt?  @default(0)
  transports      String[]
  
  // Registration Context
  registrationIp  String?  @map("registration_ip")
  registrationLocation String? @map("registration_location")
  registeredAt    DateTime @default(now()) @map("registered_at")
  
  // Approval Tracking
  isActive        Boolean  @default(false) @map("is_active")  // FALSE by default!
  approvedBy      Int?     @map("approved_by")
  approvedAt      DateTime? @map("approved_at")
  
  // Usage Tracking
  lastUsedAt      DateTime? @map("last_used_at")
  loginCount      Int      @default(0) @map("login_count")
  lastLoginIp     String?  @map("last_login_ip")
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  user            MobileUser @relation(fields: [mobileUserId], references: [id])
  
  @@index([mobileUserId])
  @@index([deviceId])
  @@map("mobile_devices")
}
```

---

## Updated Login Resolver with Device Tracking

```typescript
export const authResolvers = {
  Mutation: {
    async login(
      _parent: unknown, 
      args: { 
        input: LoginInput & { 
          ipAddress?: string;      // NEW
          location?: string;       // NEW
          deviceModel?: string;    // NEW
          deviceOs?: string;       // NEW
        } 
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
        deviceOs
      } = args.input;

      // Find user
      const user = await prisma.mobileUser.findFirst({
        where: {
          username,
          context: context as any,
          isActive: true,
        },
      });

      if (!user || !user.passwordHash) {
        // Log failed attempt - invalid credentials
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
            attemptType: 'PASSWORD_LOGIN',
            status: 'FAILED_CREDENTIALS',
            failureReason: 'Invalid username or password',
            attemptedAt: new Date(),
          }
        });
        
        await bcrypt.compare(password, "$2b$12$...");
        throw new Error("Invalid credentials");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        // Log failed attempt - wrong password
        await prisma.deviceLoginAttempt.create({
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
            attemptType: 'PASSWORD_LOGIN',
            status: 'FAILED_CREDENTIALS',
            failureReason: 'Invalid password',
            attemptedAt: new Date(),
          }
        });
        
        throw new Error("Invalid credentials");
      }

      // ✅ Password is correct - now check device
      let devicePending = false;
      let isNewDevice = false;

      const existingDevice = await prisma.mobileDevice.findFirst({
        where: {
          mobileUserId: user.id,
          deviceId,
        },
      });

      if (!existingDevice) {
        // 🆕 NEW DEVICE - Create and mark pending
        isNewDevice = true;
        
        await prisma.mobileDevice.create({
          data: {
            mobileUserId: user.id,
            deviceId,
            name: deviceName,
            model: deviceModel,
            os: deviceOs,
            registrationIp: ipAddress,
            registrationLocation: location,
            isActive: false,  // ⚠️ Not active until admin approves
          }
        });

        // Log attempt - device needs approval
        await prisma.deviceLoginAttempt.create({
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
            attemptType: 'PASSWORD_LOGIN',
            status: 'PENDING_APPROVAL',
            wasDeviceNew: true,
            attemptedAt: new Date(),
          }
        });

        devicePending = true;
      } else {
        // Device exists - check if approved
        if (!existingDevice.isActive) {
          // Device exists but not approved yet
          await prisma.deviceLoginAttempt.create({
            data: {
              mobileUserId: user.id,
              username,
              context,
              deviceId,
              deviceName,
              ipAddress,
              location,
              attemptType: 'PASSWORD_LOGIN',
              status: 'FAILED_DEVICE_PENDING',
              failureReason: 'Device awaiting admin approval',
              attemptedAt: new Date(),
            }
          });
          
          devicePending = true;
        } else {
          // ✅ Device is approved - allow login!
          
          // Update device usage
          await prisma.mobileDevice.update({
            where: { id: existingDevice.id },
            data: {
              name: deviceName ?? existingDevice.name,
              lastUsedAt: new Date(),
              lastLoginIp: ipAddress,
              loginCount: { increment: 1 },
            },
          });

          // Log successful login
          await prisma.deviceLoginAttempt.create({
            data: {
              mobileUserId: user.id,
              username,
              context,
              deviceId,
              deviceName,
              ipAddress,
              location,
              attemptType: 'PASSWORD_LOGIN',
              status: 'SUCCESS',
              attemptedAt: new Date(),
            }
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          context: user.context,
          deviceId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        token: devicePending ? null : token,
        user: {
          id: user.id,
          username: user.username,
          phoneNumber: user.phoneNumber,
          context: user.context,
        },
        devicePending,
        message: isNewDevice 
          ? "Device registered. Awaiting admin approval." 
          : devicePending 
            ? "Device awaiting admin approval." 
            : "Login successful",
      };
    },
  },
};
```

---

## Admin Panel: Device Approval UI

```tsx
// Show pending password-login devices
<Card>
  <CardHeader>
    <CardTitle>Pending Device Approvals</CardTitle>
    <p className="text-sm text-muted-foreground">
      Devices that attempted login with correct password
    </p>
  </CardHeader>
  <CardContent>
    {pendingDevices.map(device => (
      <div key={device.id} className="border rounded p-4 space-y-3">
        {/* User Info */}
        <div className="flex justify-between">
          <div>
            <h3 className="font-bold">{device.user.username}</h3>
            <p className="text-sm text-muted-foreground">
              {device.user.phoneNumber}
            </p>
          </div>
          <Badge variant="warning">Pending Approval</Badge>
        </div>

        {/* Device Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Device:</span>
            <p className="text-muted-foreground">{device.name}</p>
          </div>
          <div>
            <span className="font-medium">Model:</span>
            <p className="text-muted-foreground">{device.model} • {device.os}</p>
          </div>
          <div>
            <span className="font-medium">First Attempt:</span>
            <p className="text-muted-foreground">
              {new Date(device.registeredAt).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="font-medium">IP Address:</span>
            <p className="text-muted-foreground font-mono">{device.registrationIp}</p>
          </div>
          {device.registrationLocation && (
            <div className="col-span-2">
              <span className="font-medium">Location:</span>
              <p className="text-muted-foreground">{device.registrationLocation}</p>
            </div>
          )}
        </div>

        {/* Login Attempts History */}
        <div>
          <span className="font-medium text-sm">Login Attempts:</span>
          <div className="mt-2 space-y-1">
            {device.loginAttempts?.slice(0, 5).map((attempt: any) => (
              <div key={attempt.id} className="flex justify-between text-xs">
                <span>{new Date(attempt.attemptedAt).toLocaleString()}</span>
                <Badge 
                  variant={
                    attempt.status === 'SUCCESS' ? 'default' :
                    attempt.status === 'PENDING_APPROVAL' ? 'warning' :
                    'destructive'
                  }
                  className="text-xs"
                >
                  {attempt.status}
                </Badge>
              </div>
            ))}
          </div>
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
            onClick={() => rejectDevice(device.id)}
            className="flex-1"
          >
            ✗ Reject
          </Button>
        </div>
      </div>
    ))}
  </CardContent>
</Card>
```

---

## GraphQL: Approve Device Mutation

```typescript
async approveDevice(
  _parent: unknown,
  args: { deviceId: string; notes?: string },
  context: { adminUserId: number }
) {
  const device = await prisma.mobileDevice.update({
    where: { id: args.deviceId },
    data: {
      isActive: true,
      approvedBy: context.adminUserId,
      approvedAt: new Date(),
    },
    include: {
      user: true,
    }
  });

  // Log approval
  await prisma.deviceLoginAttempt.create({
    data: {
      mobileUserId: device.mobileUserId,
      deviceId: device.id,
      attemptType: 'PASSWORD_LOGIN',
      status: 'SUCCESS',
      attemptedAt: new Date(),
    }
  });

  // Optional: Send notification to user
  // await sendNotification(device.user.phoneNumber, "Your device has been approved");

  return device;
}
```

---

## Key Differences from Passkey Flow

| Aspect | Password Login | Passkey Registration |
|--------|----------------|----------------------|
| **Trigger** | Every login attempt | One-time registration |
| **Device Creation** | On first login | During registration |
| **Approval** | Admin reviews after login attempt | OTP or admin approval |
| **User Experience** | "Try login → pending → admin approves → login again" | "Register → OTP/approval → login" |
| **Tracking** | Track every login attempt | Track registration only |

---

## Implementation Priority

### Phase 1: Critical (Week 1)
1. ✅ Add `DeviceLoginAttempt` table
2. ✅ Update `MobileDevice` schema with approval fields
3. ✅ Modify login resolver to track attempts
4. ✅ Set `isActive: false` by default

### Phase 2: Admin Panel (Week 1)
5. ✅ Show pending devices with full context
6. ✅ Approve/Reject buttons
7. ✅ Login attempt history display

### Phase 3: Mobile App (Week 2)
8. ✅ Handle `devicePending: true` response
9. ✅ Show "Device pending approval" message
10. ✅ Allow retry after approval

---

**This is the correct flow for password-based device tracking!** 

Should I implement this now?
