# FCM Token Column Fix

## Date: 2025-12-15

## Problem
Mobile app login was failing with error:
```
The column `mobile_devices.fcm_token` does not exist in the current database.
```

The login credentials were correct, but the query failed when checking for existing devices because the FCM (Firebase Cloud Messaging) columns were missing from the `mobile_devices` table.

## Root Cause
The Prisma schema defined FCM-related columns:
- `fcmToken` (TEXT)
- `fcmTokenUpdatedAt` (TIMESTAMP)
- `pushEnabled` (BOOLEAN, default true)

But these columns were never added to the actual database table.

## Solution
Added the missing columns manually to the database:

```sql
ALTER TABLE mobile_devices 
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS mobile_devices_fcm_token_idx ON mobile_devices(fcm_token);
```

## Verification
✅ Columns added successfully
✅ Index created on fcm_token
✅ Login now proceeds past device check
✅ Mobile app can now login with correct credentials

## Impact
- **Before:** Mobile login failed at device verification step
- **After:** Mobile login works correctly (with valid credentials)

## Related
- Push notifications now fully supported
- Firebase Admin SDK initialized from service account file
- FCM tokens can be stored and used for push notifications

---
*Last Updated: 2025-12-15*
*Fixed by: Database schema synchronization*
