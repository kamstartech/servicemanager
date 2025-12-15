# Firebase Integration - Reusing Elixir Project Configuration

## Overview
The Elixir service_manager project already has Firebase/FCM configuration in place. We can reuse the same Firebase credentials and extend the system to work with both Elixir and Node.js admin.

---

## What Exists in Elixir Project

### 1. Database Schema - Settings Table
The Elixir project stores Firebase credentials in the `settings` table:

```elixir
# lib/service_manager/schemas/embedded/embedded_notifications.ex
embedded_schema do
  # Push notification settings
  field :push_notifications_enabled, :boolean, default: true
  field :fcm_server_key, :string      # FCM Server Key (Legacy)
  field :apn_key_id, :string          # Apple Push - Key ID
  field :apn_team_id, :string         # Apple Push - Team ID
  field :apn_bundle_id, :string       # Apple Push - Bundle ID
  field :apn_key_file, :string        # Apple Push - Key File Path
end
```

### 2. Admin UI for Configuration
Located at: `/lib/service_manager_web/live/backend/settings_live/components/notifications.ex`

The admin can configure:
- Enable/Disable push notifications
- FCM Server Key
- Apple Push Notification (APN) settings

### 3. Storage
- Credentials stored in PostgreSQL `settings` table
- Cached in Cachex for fast access
- Key: `"notifications"`

---

## Integration Strategy

### Option 1: Shared Database Access (Recommended)
Both Elixir and Node.js read from the same PostgreSQL database.

**Advantages:**
✅ Single source of truth  
✅ No duplication  
✅ Changes in Elixir admin UI immediately available to Node.js  
✅ Consistent configuration  

**Implementation:**
```typescript
// lib/config/firebase.ts
import { prisma } from '@/lib/db/prisma';

export async function getFirebaseConfig() {
  // Query settings table
  const settings = await prisma.$queryRaw`
    SELECT config 
    FROM settings 
    WHERE key = 'notifications' 
    AND status = 'active'
    ORDER BY inserted_at DESC 
    LIMIT 1
  `;
  
  if (!settings || settings.length === 0) {
    throw new Error('Firebase configuration not found in settings');
  }
  
  const config = settings[0].config;
  
  if (!config.push_notifications_enabled) {
    throw new Error('Push notifications are disabled');
  }
  
  return {
    fcmServerKey: config.fcm_server_key,
    apnKeyId: config.apn_key_id,
    apnTeamId: config.apn_team_id,
    apnBundleId: config.apn_bundle_id,
    apnKeyFile: config.apn_key_file,
  };
}
```

### Option 2: Service Account JSON File
Use Firebase Admin SDK with service account (modern approach).

**Better Alternative - Use Firebase Admin SDK v2:**

1. **Generate Service Account Key from Firebase Console:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download JSON file

2. **Store in Environment:**
```env
# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

3. **Initialize Firebase Admin:**
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

---

## Recommended Approach: Hybrid

### Use Firebase Admin SDK + Store Tokens in Shared Database

1. **Firebase Admin SDK** (Node.js) - For sending notifications
2. **Shared Database** - For storing device tokens and notification history
3. **Elixir can also send** - Via HTTP API to Node.js or directly using Pigeon library

---

## Database Schema Updates

### Update MobileDevice (Already exists in Elixir)

Check if Elixir project already has these fields:

```sql
-- Check existing schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fdh_mobile_devices';
```

If not present, add:

```sql
ALTER TABLE fdh_mobile_devices 
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS fdh_mobile_devices_fcm_token_idx 
ON fdh_mobile_devices(fcm_token);
```

### Create PushNotification Table (Shared)

```sql
CREATE TABLE IF NOT EXISTS fdh_push_notifications (
  id TEXT PRIMARY KEY,
  mobile_user_id INTEGER NOT NULL,
  device_id TEXT,
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  action_url TEXT,
  action_data JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP,
  metadata JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (mobile_user_id) REFERENCES fdh_mobile_users(id) ON DELETE CASCADE
);

CREATE INDEX fdh_push_notifications_mobile_user_id_idx ON fdh_push_notifications(mobile_user_id);
CREATE INDEX fdh_push_notifications_device_id_idx ON fdh_push_notifications(device_id);
CREATE INDEX fdh_push_notifications_status_idx ON fdh_push_notifications(status);
CREATE INDEX fdh_push_notifications_created_at_idx ON fdh_push_notifications(created_at);
```

---

## Implementation Plan

### Phase 1: Setup Firebase Admin SDK (Node.js)

```bash
cd admin
npm install firebase-admin
```

```typescript
// lib/firebase/admin.ts
import admin from 'firebase-admin';

// Option A: Using service account JSON (recommended)
if (!admin.apps.length) {
  const serviceAccount = require('../../config/firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Option B: Using environment variables
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

### Phase 2: Create Push Notification Service

```typescript
// lib/services/push-notification.ts
import { messaging } from '@/lib/firebase/admin';
import { prisma } from '@/lib/db/prisma';

export class PushNotificationService {
  static async send(params: {
    userId: number;
    type: string;
    title: string;
    body: string;
    imageUrl?: string;
    actionUrl?: string;
    deviceId?: string;
  }) {
    // Get device tokens from shared database
    const devices = await prisma.$queryRaw<Array<{fcm_token: string}>>`
      SELECT fcm_token 
      FROM fdh_mobile_devices 
      WHERE mobile_user_id = ${params.userId}
      AND is_active = true
      AND push_enabled = true
      AND fcm_token IS NOT NULL
      ${params.deviceId ? prisma.$queryRaw`AND device_id = ${params.deviceId}` : prisma.$queryRaw``}
    `;
    
    if (devices.length === 0) {
      console.log('No devices found for user', params.userId);
      return;
    }
    
    const tokens = devices.map(d => d.fcm_token).filter(Boolean);
    
    // Create notification record
    const notificationId = crypto.randomUUID();
    
    await prisma.$executeRaw`
      INSERT INTO fdh_push_notifications 
        (id, mobile_user_id, type, priority, title, body, image_url, action_url, status, created_at, updated_at)
      VALUES 
        (${notificationId}, ${params.userId}, ${params.type}, 'NORMAL', ${params.title}, ${params.body}, 
         ${params.imageUrl}, ${params.actionUrl}, 'PENDING', NOW(), NOW())
    `;
    
    try {
      // Send via Firebase
      const message = {
        notification: {
          title: params.title,
          body: params.body,
          ...(params.imageUrl && { imageUrl: params.imageUrl }),
        },
        data: {
          notificationId,
          type: params.type,
          ...(params.actionUrl && { actionUrl: params.actionUrl }),
        },
        tokens,
      };
      
      const response = await messaging.sendEachForMulticast(message);
      
      // Update status
      await prisma.$executeRaw`
        UPDATE fdh_push_notifications 
        SET status = ${response.successCount > 0 ? 'SENT' : 'FAILED'},
            sent_at = NOW()
        WHERE id = ${notificationId}
      `;
      
      return { success: true, response };
    } catch (error) {
      console.error('Push notification error:', error);
      
      await prisma.$executeRaw`
        UPDATE fdh_push_notifications 
        SET status = 'FAILED',
            failed_at = NOW(),
            failure_reason = ${error instanceof Error ? error.message : 'Unknown'}
        WHERE id = ${notificationId}
      `;
      
      throw error;
    }
  }
}
```

### Phase 3: Add GraphQL Mutations

```typescript
// lib/graphql/schema/resolvers/pushNotification.ts
export const pushNotificationResolvers = {
  Mutation: {
    async registerDeviceForPush(
      _: unknown,
      args: {
        input: {
          fcmToken: string;
          deviceId: string;
          deviceName?: string;
        };
      },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error('Authentication required');
      }
      
      // Update device with FCM token
      await prisma.$executeRaw`
        UPDATE fdh_mobile_devices 
        SET fcm_token = ${args.input.fcmToken},
            fcm_token_updated_at = NOW(),
            push_enabled = true,
            name = COALESCE(${args.input.deviceName}, name)
        WHERE mobile_user_id = ${context.userId}
        AND device_id = ${args.input.deviceId}
      `;
      
      return true;
    },
    
    async testPushNotification(
      _: unknown,
      args: { deviceId?: string },
      context: GraphQLContext
    ) {
      if (!context.userId) {
        throw new Error('Authentication required');
      }
      
      await PushNotificationService.send({
        userId: context.userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Test Notification',
        body: 'This is a test push notification',
        deviceId: args.deviceId,
      });
      
      return true;
    },
  },
};
```

### Phase 4: Trigger Notifications

```typescript
// After checkbook status change
import { PushNotificationService } from '@/lib/services/push-notification';

async updateCheckbookRequest(id, input) {
  // ... update logic
  
  if (input.status === 'APPROVED') {
    await PushNotificationService.send({
      userId: request.mobileUserId,
      type: 'CHECKBOOK_STATUS',
      title: 'Checkbook Request Approved',
      body: 'Your checkbook request has been approved',
      actionUrl: `/checkbooks/${request.id}`,
    });
  }
}
```

---

## Elixir Integration (Optional)

If Elixir also needs to send push notifications:

### Option 1: Add Pigeon Library to Elixir

```elixir
# mix.exs
defp deps do
  [
    {:pigeon, "~> 2.0"},
    {:kadabra, "~> 0.6.0"} # HTTP/2 client for APNs
  ]
end
```

### Option 2: Call Node.js API from Elixir

```elixir
# lib/service_manager/notifications/push_service.ex
defmodule ServiceManager.Notifications.PushService do
  def send_notification(user_id, type, title, body, opts \\ []) do
    url = "#{admin_url()}/api/push-notifications/send"
    
    body = %{
      userId: user_id,
      type: type,
      title: title,
      body: body,
      imageUrl: opts[:image_url],
      actionUrl: opts[:action_url],
      deviceId: opts[:device_id]
    }
    
    HTTPoison.post(url, Jason.encode!(body), [
      {"Content-Type", "application/json"},
      {"Authorization", "Bearer #{internal_api_token()}"}
    ])
  end
  
  defp admin_url, do: System.get_env("ADMIN_URL") || "http://localhost:3000"
  defp internal_api_token, do: System.get_env("INTERNAL_API_TOKEN")
end
```

---

## Configuration Checklist

- [ ] Set up Firebase project
- [ ] Download service account JSON
- [ ] Add environment variables to `.env`
- [ ] Install `firebase-admin` npm package
- [ ] Run database migrations
- [ ] Add FCM token fields to mobile devices
- [ ] Create push notifications table
- [ ] Implement GraphQL mutations
- [ ] Test from mobile app
- [ ] Add notification triggers to workflows
- [ ] Document for Elixir team

---

## Security Notes

1. **Service Account Key**
   - Never commit to git
   - Store in environment variables or secure vault
   - Rotate periodically

2. **Database Access**
   - Use same database connection pool
   - Apply proper indexes
   - Clean up old notifications regularly

3. **Rate Limiting**
   - Prevent notification spam
   - Respect user preferences
   - Honor quiet hours

---

## Testing

### Test with cURL
```bash
# Register device
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "mutation { registerDeviceForPush(input: { fcmToken: \"test-token\", deviceId: \"device-123\" }) }"
  }'

# Send test notification
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "mutation { testPushNotification(deviceId: \"device-123\") }"
  }'
```

---

## Next Steps

1. **Get Firebase credentials from Elixir settings table**
2. **Set up Firebase Admin SDK in Node.js**
3. **Create database migrations**
4. **Implement GraphQL resolvers**
5. **Test with mobile app**
6. **Coordinate with Elixir team for shared access**

Would you like me to implement this?
