# Push Notification System Design

## Overview
Design for implementing push notifications in the service manager system, allowing mobile applications to subscribe and receive real-time notifications for various events.

---

## Architecture

### Components

1. **Push Notification Provider** (Firebase Cloud Messaging - FCM)
   - Industry standard
   - Supports iOS and Android
   - Free tier available
   - Reliable delivery

2. **Device Token Management**
   - Store FCM tokens per device
   - Handle token refresh
   - Support multiple devices per user

3. **Notification Queue**
   - Redis or PostgreSQL for queuing
   - Retry mechanism for failed deliveries
   - Priority levels

4. **GraphQL API**
   - Subscription management
   - Notification history
   - Device registration

---

## Database Schema Changes

### 1. Add FCM Token to MobileDevice

```prisma
model MobileDevice {
  id           String     @id @default(cuid())
  mobileUserId Int        @map("mobile_user_id")
  
  // Existing fields...
  deviceId     String     @db.Text
  name         String?    @db.Text
  model        String?    @db.Text
  os           String?    @db.Text
  
  // NEW: Push notification support
  fcmToken            String?   @db.Text @map("fcm_token")
  fcmTokenUpdatedAt   DateTime? @map("fcm_token_updated_at")
  pushEnabled         Boolean   @default(true) @map("push_enabled")
  
  isActive     Boolean    @default(true) @map("is_active")
  lastUsedAt   DateTime?  @map("last_used_at")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  
  // Relations
  user         MobileUser @relation(fields: [mobileUserId], references: [id])
  
  @@index([mobileUserId])
  @@index([fcmToken])
  @@map("fdh_mobile_devices")
}
```

### 2. Create Notification Model

```prisma
enum NotificationType {
  ACCOUNT_ALERT           // Low balance, large transaction
  TRANSACTION_COMPLETE    // Transaction completed
  TRANSACTION_FAILED      // Transaction failed
  CHECKBOOK_STATUS        // Checkbook request status change
  ACCOUNT_FROZEN          // Account frozen/unfrozen
  LOGIN_ALERT             // New device login
  SECURITY_ALERT          // Suspicious activity
  PAYMENT_DUE             // Payment reminder
  PROMOTION               // Marketing/promotional
  SYSTEM_ANNOUNCEMENT     // System updates
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  READ
}

model PushNotification {
  id              String               @id @default(cuid())
  mobileUserId    Int                  @map("mobile_user_id")
  deviceId        String?              @map("device_id") // null = all devices
  
  type            NotificationType
  priority        NotificationPriority @default(NORMAL)
  
  title           String               @db.Text
  body            String               @db.Text
  imageUrl        String?              @map("image_url") @db.Text
  
  // Action/Deep linking
  actionUrl       String?              @map("action_url") @db.Text
  actionData      Json?                @map("action_data")
  
  // Delivery tracking
  status          NotificationStatus   @default(PENDING)
  sentAt          DateTime?            @map("sent_at")
  deliveredAt     DateTime?            @map("delivered_at")
  readAt          DateTime?            @map("read_at")
  failedAt        DateTime?            @map("failed_at")
  failureReason   String?              @map("failure_reason") @db.Text
  
  // Retry logic
  retryCount      Int                  @default(0) @map("retry_count")
  nextRetryAt     DateTime?            @map("next_retry_at")
  
  // Metadata
  metadata        Json?
  expiresAt       DateTime?            @map("expires_at")
  
  createdAt       DateTime             @default(now()) @map("created_at")
  updatedAt       DateTime             @updatedAt @map("updated_at")
  
  // Relations
  mobileUser      MobileUser           @relation(fields: [mobileUserId], references: [id])
  
  @@index([mobileUserId])
  @@index([deviceId])
  @@index([status])
  @@index([createdAt])
  @@index([nextRetryAt])
  @@map("fdh_push_notifications")
}

model NotificationPreference {
  id              Int                  @id @default(autoincrement())
  mobileUserId    Int                  @unique @map("mobile_user_id")
  
  // Per-type preferences
  accountAlerts         Boolean @default(true) @map("account_alerts")
  transactionUpdates    Boolean @default(true) @map("transaction_updates")
  checkbookUpdates      Boolean @default(true) @map("checkbook_updates")
  securityAlerts        Boolean @default(true) @map("security_alerts")
  paymentReminders      Boolean @default(true) @map("payment_reminders")
  promotions            Boolean @default(false) @map("promotions")
  systemAnnouncements   Boolean @default(true) @map("system_announcements")
  
  // Quiet hours
  quietHoursEnabled Boolean   @default(false) @map("quiet_hours_enabled")
  quietHoursStart   String?   @map("quiet_hours_start") // "22:00"
  quietHoursEnd     String?   @map("quiet_hours_end")   // "08:00"
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // Relations
  mobileUser      MobileUser @relation(fields: [mobileUserId], references: [id])
  
  @@map("fdh_notification_preferences")
}
```

---

## GraphQL Schema

```graphql
# Types
enum NotificationType {
  ACCOUNT_ALERT
  TRANSACTION_COMPLETE
  TRANSACTION_FAILED
  CHECKBOOK_STATUS
  ACCOUNT_FROZEN
  LOGIN_ALERT
  SECURITY_ALERT
  PAYMENT_DUE
  PROMOTION
  SYSTEM_ANNOUNCEMENT
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  READ
}

type PushNotification {
  id: ID!
  type: NotificationType!
  priority: NotificationPriority!
  title: String!
  body: String!
  imageUrl: String
  actionUrl: String
  actionData: JSON
  status: NotificationStatus!
  sentAt: DateTime
  deliveredAt: DateTime
  readAt: DateTime
  createdAt: DateTime!
}

type NotificationPreference {
  accountAlerts: Boolean!
  transactionUpdates: Boolean!
  checkbookUpdates: Boolean!
  securityAlerts: Boolean!
  paymentReminders: Boolean!
  promotions: Boolean!
  systemAnnouncements: Boolean!
  quietHoursEnabled: Boolean!
  quietHoursStart: String
  quietHoursEnd: String
}

type NotificationConnection {
  notifications: [PushNotification!]!
  total: Int!
  unreadCount: Int!
  page: Int!
  pageSize: Int!
}

input RegisterDeviceInput {
  fcmToken: String!
  deviceId: String!
  deviceName: String
  deviceModel: String
  deviceOs: String
}

input UpdateNotificationPreferencesInput {
  accountAlerts: Boolean
  transactionUpdates: Boolean
  checkbookUpdates: Boolean
  securityAlerts: Boolean
  paymentReminders: Boolean
  promotions: Boolean
  systemAnnouncements: Boolean
  quietHoursEnabled: Boolean
  quietHoursStart: String
  quietHoursEnd: String
}

# Queries
extend type Query {
  # Get user's notifications
  myNotifications(
    status: NotificationStatus
    type: NotificationType
    page: Int = 1
    pageSize: Int = 20
  ): NotificationConnection!
  
  # Get specific notification
  notification(id: ID!): PushNotification
  
  # Get notification preferences
  myNotificationPreferences: NotificationPreference!
  
  # Get unread count
  unreadNotificationCount: Int!
}

# Mutations
extend type Mutation {
  # Register device for push notifications
  registerDeviceForPush(input: RegisterDeviceInput!): Boolean!
  
  # Unregister device
  unregisterDeviceFromPush(deviceId: String!): Boolean!
  
  # Update notification preferences
  updateNotificationPreferences(
    input: UpdateNotificationPreferencesInput!
  ): NotificationPreference!
  
  # Mark notification as read
  markNotificationAsRead(id: ID!): PushNotification!
  
  # Mark all as read
  markAllNotificationsAsRead: Int!
  
  # Delete notification
  deleteNotification(id: ID!): Boolean!
  
  # Test push notification
  testPushNotification(deviceId: String!): Boolean!
}
```

---

## Implementation Steps

### Phase 1: Infrastructure Setup

#### 1. Install Dependencies
```bash
npm install firebase-admin
npm install @google-cloud/tasks  # For queuing (optional)
npm install ioredis               # For Redis queue (optional)
```

#### 2. Firebase Setup
- Create Firebase project
- Download service account key
- Add to environment variables

```env
# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

#### 3. Initialize Firebase Admin SDK

```typescript
// lib/firebase/admin.ts
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const messaging = admin.messaging();
export default admin;
```

### Phase 2: Database Migration

```sql
-- Add FCM token to mobile devices
ALTER TABLE "fdh_mobile_devices" 
ADD COLUMN IF NOT EXISTS "fcm_token" TEXT,
ADD COLUMN IF NOT EXISTS "fcm_token_updated_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "push_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "fdh_mobile_devices_fcm_token_idx" 
ON "fdh_mobile_devices"("fcm_token");

-- Create push notifications table
CREATE TABLE IF NOT EXISTS "fdh_push_notifications" (
  "id" TEXT PRIMARY KEY,
  "mobile_user_id" INTEGER NOT NULL,
  "device_id" TEXT,
  "type" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "image_url" TEXT,
  "action_url" TEXT,
  "action_data" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sent_at" TIMESTAMP,
  "delivered_at" TIMESTAMP,
  "read_at" TIMESTAMP,
  "failed_at" TIMESTAMP,
  "failure_reason" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "next_retry_at" TIMESTAMP,
  "metadata" JSONB,
  "expires_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE
);

CREATE INDEX "fdh_push_notifications_mobile_user_id_idx" ON "fdh_push_notifications"("mobile_user_id");
CREATE INDEX "fdh_push_notifications_device_id_idx" ON "fdh_push_notifications"("device_id");
CREATE INDEX "fdh_push_notifications_status_idx" ON "fdh_push_notifications"("status");
CREATE INDEX "fdh_push_notifications_created_at_idx" ON "fdh_push_notifications"("created_at");
CREATE INDEX "fdh_push_notifications_next_retry_at_idx" ON "fdh_push_notifications"("next_retry_at");

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS "fdh_notification_preferences" (
  "id" SERIAL PRIMARY KEY,
  "mobile_user_id" INTEGER UNIQUE NOT NULL,
  "account_alerts" BOOLEAN NOT NULL DEFAULT true,
  "transaction_updates" BOOLEAN NOT NULL DEFAULT true,
  "checkbook_updates" BOOLEAN NOT NULL DEFAULT true,
  "security_alerts" BOOLEAN NOT NULL DEFAULT true,
  "payment_reminders" BOOLEAN NOT NULL DEFAULT true,
  "promotions" BOOLEAN NOT NULL DEFAULT false,
  "system_announcements" BOOLEAN NOT NULL DEFAULT true,
  "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
  "quiet_hours_start" TEXT,
  "quiet_hours_end" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("mobile_user_id") REFERENCES "fdh_mobile_users"("id") ON DELETE CASCADE
);
```

### Phase 3: Push Notification Service

```typescript
// lib/services/push-notification.ts
import { messaging } from '@/lib/firebase/admin';
import { prisma } from '@/lib/db/prisma';

export interface SendPushNotificationParams {
  userId: number;
  type: string;
  priority?: string;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionData?: any;
  deviceId?: string; // Send to specific device, or all if null
}

export class PushNotificationService {
  /**
   * Send push notification to user's device(s)
   */
  static async send(params: SendPushNotificationParams) {
    const {
      userId,
      type,
      priority = 'NORMAL',
      title,
      body,
      imageUrl,
      actionUrl,
      actionData,
      deviceId,
    } = params;

    // Check user preferences
    const prefs = await this.getUserPreferences(userId);
    if (!this.shouldSendNotification(type, prefs)) {
      console.log(`Notification blocked by user preferences: ${type}`);
      return null;
    }

    // Get user devices
    const devices = await prisma.mobileDevice.findMany({
      where: {
        mobileUserId: userId,
        isActive: true,
        pushEnabled: true,
        fcmToken: { not: null },
        ...(deviceId && { deviceId }),
      },
    });

    if (devices.length === 0) {
      console.log(`No active devices found for user ${userId}`);
      return null;
    }

    // Create notification record
    const notification = await prisma.pushNotification.create({
      data: {
        mobileUserId: userId,
        deviceId,
        type,
        priority,
        title,
        body,
        imageUrl,
        actionUrl,
        actionData,
        status: 'PENDING',
      },
    });

    // Send to all devices
    const tokens = devices.map((d) => d.fcmToken!).filter(Boolean);
    
    try {
      const message = {
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl }),
        },
        data: {
          notificationId: notification.id,
          type,
          priority,
          ...(actionUrl && { actionUrl }),
          ...(actionData && { actionData: JSON.stringify(actionData) }),
        },
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      // Update notification status
      await prisma.pushNotification.update({
        where: { id: notification.id },
        data: {
          status: response.successCount > 0 ? 'SENT' : 'FAILED',
          sentAt: new Date(),
          ...(response.successCount === 0 && {
            failureReason: response.responses[0]?.error?.message,
          }),
        },
      });

      // Handle invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (resp.error) {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await this.removeInvalidTokens(invalidTokens);
      }

      return notification;
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      await prisma.pushNotification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      throw error;
    }
  }

  /**
   * Send notification about account alert
   */
  static async sendAccountAlert(
    userId: number,
    alertType: string,
    accountNumber: string,
    details: any
  ) {
    const titles: Record<string, string> = {
      LOW_BALANCE: 'Low Balance Alert',
      LARGE_TRANSACTION: 'Large Transaction',
      SUSPICIOUS_ACTIVITY: 'Security Alert',
    };

    const bodies: Record<string, string> = {
      LOW_BALANCE: `Your account ${accountNumber} balance is low`,
      LARGE_TRANSACTION: `Large transaction detected on ${accountNumber}`,
      SUSPICIOUS_ACTIVITY: `Suspicious activity detected on ${accountNumber}`,
    };

    return this.send({
      userId,
      type: 'ACCOUNT_ALERT',
      priority: alertType === 'SUSPICIOUS_ACTIVITY' ? 'URGENT' : 'NORMAL',
      title: titles[alertType] || 'Account Alert',
      body: bodies[alertType] || 'Check your account',
      actionUrl: '/accounts/' + accountNumber,
      actionData: { alertType, ...details },
    });
  }

  /**
   * Send checkbook status notification
   */
  static async sendCheckbookStatusUpdate(
    userId: number,
    status: string,
    requestId: string
  ) {
    const statusMessages: Record<string, { title: string; body: string }> = {
      APPROVED: {
        title: 'Checkbook Request Approved',
        body: 'Your checkbook request has been approved',
      },
      READY_FOR_COLLECTION: {
        title: 'Checkbook Ready',
        body: 'Your checkbook is ready for collection',
      },
      COLLECTED: {
        title: 'Checkbook Collected',
        body: 'Your checkbook has been marked as collected',
      },
      REJECTED: {
        title: 'Checkbook Request Rejected',
        body: 'Your checkbook request was rejected',
      },
    };

    const message = statusMessages[status] || {
      title: 'Checkbook Update',
      body: 'Your checkbook request status has changed',
    };

    return this.send({
      userId,
      type: 'CHECKBOOK_STATUS',
      priority: 'NORMAL',
      title: message.title,
      body: message.body,
      actionUrl: '/checkbooks/' + requestId,
      actionData: { status, requestId },
    });
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private static shouldSendNotification(
    type: string,
    prefs: any
  ): boolean {
    const typeMap: Record<string, string> = {
      ACCOUNT_ALERT: 'accountAlerts',
      TRANSACTION_COMPLETE: 'transactionUpdates',
      TRANSACTION_FAILED: 'transactionUpdates',
      CHECKBOOK_STATUS: 'checkbookUpdates',
      SECURITY_ALERT: 'securityAlerts',
      PAYMENT_DUE: 'paymentReminders',
      PROMOTION: 'promotions',
      SYSTEM_ANNOUNCEMENT: 'systemAnnouncements',
    };

    const prefKey = typeMap[type];
    if (!prefKey) return true;

    return prefs[prefKey] !== false;
  }

  /**
   * Get user notification preferences
   */
  private static async getUserPreferences(userId: number) {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { mobileUserId: userId },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { mobileUserId: userId },
      });
    }

    return prefs;
  }

  /**
   * Remove invalid FCM tokens
   */
  private static async removeInvalidTokens(tokens: string[]) {
    await prisma.mobileDevice.updateMany({
      where: { fcmToken: { in: tokens } },
      data: { fcmToken: null, pushEnabled: false },
    });
  }
}
```

---

## Mobile App Integration

### 1. Flutter Example

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class PushNotificationManager {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  
  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Get FCM token
      String? token = await _messaging.getToken();
      
      if (token != null) {
        // Register with backend
        await registerDevice(token);
      }
      
      // Listen for token refresh
      _messaging.onTokenRefresh.listen(registerDevice);
      
      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleMessage);
      
      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_handleBackgroundMessage);
    }
  }
  
  Future<void> registerDevice(String token) async {
    final deviceId = await getDeviceId();
    final deviceInfo = await getDeviceInfo();
    
    // GraphQL mutation
    await graphqlClient.mutate(
      MutationOptions(
        document: gql('''
          mutation RegisterDevice(\$input: RegisterDeviceInput!) {
            registerDeviceForPush(input: \$input)
          }
        '''),
        variables: {
          'input': {
            'fcmToken': token,
            'deviceId': deviceId,
            'deviceName': deviceInfo.name,
            'deviceModel': deviceInfo.model,
            'deviceOs': deviceInfo.os,
          }
        },
      ),
    );
  }
  
  void _handleMessage(RemoteMessage message) {
    // Show local notification
    showNotification(
      title: message.notification?.title ?? '',
      body: message.notification?.body ?? '',
      data: message.data,
    );
  }
}
```

### 2. React Native Example

```typescript
import messaging from '@react-native-firebase/messaging';
import { GraphQLClient } from './graphql';

class PushNotificationManager {
  async initialize() {
    // Request permission
    const authStatus = await messaging().requestPermission();
    
    if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
      // Get FCM token
      const token = await messaging().getToken();
      
      if (token) {
        await this.registerDevice(token);
      }
      
      // Listen for token refresh
      messaging().onTokenRefresh(this.registerDevice);
      
      // Handle foreground messages
      messaging().onMessage(this.handleMessage);
      
      // Handle background messages
      messaging().setBackgroundMessageHandler(this.handleBackgroundMessage);
    }
  }
  
  async registerDevice(token: string) {
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceName = await DeviceInfo.getDeviceName();
    const deviceModel = await DeviceInfo.getModel();
    const deviceOs = Platform.OS;
    
    await GraphQLClient.mutate({
      mutation: REGISTER_DEVICE_MUTATION,
      variables: {
        input: {
          fcmToken: token,
          deviceId,
          deviceName,
          deviceModel,
          deviceOs,
        },
      },
    });
  }
  
  handleMessage = (message: FirebaseMessagingTypes.RemoteMessage) => {
    // Show notification
    LocalNotification.show({
      title: message.notification?.title,
      body: message.notification?.body,
      data: message.data,
    });
  };
}
```

---

## Event Triggers

### 1. Checkbook Status Change

```typescript
// After updating checkbook request status
await PushNotificationService.sendCheckbookStatusUpdate(
  request.mobileUserId,
  newStatus,
  request.id
);
```

### 2. Account Frozen

```typescript
// After freezing account
await PushNotificationService.send({
  userId: account.mobileUserId,
  type: 'ACCOUNT_FROZEN',
  priority: 'HIGH',
  title: 'Account Frozen',
  body: `Your account ${account.accountNumber} has been frozen`,
  actionUrl: `/accounts/${account.id}`,
});
```

### 3. Transaction Complete

```typescript
// After transaction completes
await PushNotificationService.send({
  userId: transaction.userId,
  type: 'TRANSACTION_COMPLETE',
  priority: 'NORMAL',
  title: 'Transaction Successful',
  body: `${transaction.amount} ${transaction.currency} sent successfully`,
  actionUrl: `/transactions/${transaction.id}`,
  actionData: { transactionId: transaction.id },
});
```

---

## Testing

### Test Mutation
```graphql
mutation TestPush {
  testPushNotification(deviceId: "device-123")
}
```

### Test Service
```typescript
// In resolver
async testPushNotification(_, { deviceId }, context) {
  if (!context.userId) {
    throw new Error("Authentication required");
  }
  
  await PushNotificationService.send({
    userId: context.userId,
    type: 'SYSTEM_ANNOUNCEMENT',
    priority: 'NORMAL',
    title: 'Test Notification',
    body: 'This is a test push notification',
    deviceId,
  });
  
  return true;
}
```

---

## Security Considerations

1. **Token Security**
   - Store FCM tokens encrypted
   - Validate token ownership
   - Expire old tokens

2. **Rate Limiting**
   - Limit notifications per user per day
   - Prevent spam

3. **Content Validation**
   - Sanitize notification content
   - Validate URLs before sending

4. **Privacy**
   - Respect user preferences
   - Honor quiet hours
   - Allow opt-out per notification type

---

## Monitoring

1. **Delivery Metrics**
   - Success rate
   - Failure reasons
   - Delivery time

2. **User Engagement**
   - Open rate
   - Action taken rate
   - Opt-out rate

3. **Alerts**
   - High failure rate
   - Token expiration spike
   - Service downtime

---

## Cost Estimation

### Firebase Cloud Messaging
- **Free tier**: Unlimited notifications
- **No additional cost** for standard push notifications

### Infrastructure
- **Database storage**: ~100MB for 1M notifications
- **Redis (optional)**: ~$15-30/month for queue
- **Compute**: Minimal overhead

---

## Next Steps

1. Set up Firebase project
2. Run database migrations
3. Implement GraphQL resolvers
4. Create push notification service
5. Integrate into existing workflows
6. Test on mobile apps
7. Monitor and optimize

---

Would you like me to proceed with implementation?
