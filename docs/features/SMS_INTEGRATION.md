# SMS Integration for Next.js Application

This document describes the SMS integration added to the Next.js application, which mirrors the functionality from the Elixir backend.

## Features

✅ Multiple SMS provider support (Orbit Mobile, BulkSMS, Internal ESB)
✅ Database logging of all SMS messages
✅ Flexible API for different message types
✅ Type-safe TypeScript implementation
✅ Easy provider switching via environment variables

## Providers

### 1. Orbit Mobile (Zambia) - Default
- **Provider**: Orbit Mobile (Zambian SMS Gateway)
- **Use Case**: Production SMS for Zambian users
- **Credentials**: Pre-configured with production values

### 2. BulkSMS (International)
- **Provider**: BulkSMS
- **Use Case**: International SMS delivery
- **Credentials**: Pre-configured with production values

### 3. Internal ESB
- **Provider**: Internal ESB Gateway
- **Use Case**: Development/Testing
- **Credentials**: Basic auth (admin/admin)

## Installation

The SMS service has been added to:
```
lib/services/sms/
├── types.ts              # TypeScript interfaces
├── orbit-provider.ts     # Orbit Mobile implementation
├── bulksms-provider.ts   # BulkSMS implementation
├── internal-provider.ts  # Internal ESB implementation
├── sms-service.ts        # Main service class
└── index.ts              # Exports
```

## Environment Variables

Add these to your `.env.local` file:

```bash
# SMS Provider Selection (orbit, bulksms, or internal)
SMS_PROVIDER=orbit

# Orbit Mobile Credentials (DEFAULT - Zambian Provider)
ORBIT_SMS_USERNAME=oxylane_ds
ORBIT_SMS_API_KEY=1DgvtfRcsjNErxNluIpC
ORBIT_SMS_URL=https://bms.orbitmobile.co.zm/json.php

# BulkSMS Credentials (International Provider)
BULKSMS_TOKEN_ID=64AAAD4D306743E692C4A17CBF32E643-01-5
BULKSMS_TOKEN_SECRET=KupKsvrDq4iielNh4f!8iXlXnRd4N
BULKSMS_URL=https://api.bulksms.com/v1/messages

# Internal ESB Credentials (Development/Testing)
INTERNAL_SMS_USERNAME=admin
INTERNAL_SMS_PASSWORD=admin
INTERNAL_SMS_URL=https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages
INTERNAL_SMS_CLIENT_ID=d79b32b5-b9a8-41de-b215-b038a913f619
```

**Note**: All credentials come with defaults from the Elixir backend, so you can start testing immediately without adding env vars.

## Usage Examples

### 1. Basic SMS
```typescript
import { SMSService } from '@/lib/services/sms';

const response = await SMSService.sendSMS(
  '+260977396223',
  'Hello from Next.js!',
  userId // optional
);
```

### 2. Send OTP
```typescript
const response = await SMSService.sendOTP(
  '+260977396223',
  '123456',
  userId
);
```

### 3. Send Account Alert
```typescript
const response = await SMSService.sendAccountAlert(
  '+260977396223',
  'LOW_BALANCE',
  {
    balance: '100',
    currency: 'ZMW',
    threshold: '500'
  },
  userId
);
```

### 4. Send Transaction Notification
```typescript
const response = await SMSService.sendTransactionNotification(
  '+260977396223',
  '1000',
  'ZMW',
  'CREDIT',
  '5000', // new balance
  userId
);
```

### 5. Password Reset
```typescript
const response = await SMSService.sendPasswordReset(
  '+260977396223',
  'RESET123',
  userId
);
```

### 6. Welcome Message
```typescript
const response = await SMSService.sendWelcome(
  '+260977396223',
  'John',
  userId
);
```

## API Endpoint

An API endpoint has been created at `/api/sms/send`

### Test the API

**Send a simple SMS:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+260977396223",
    "message": "Test message from API",
    "type": "generic"
  }'
```

**Send an OTP:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+260977396223",
    "otp": "123456",
    "type": "otp"
  }'
```

**Send an Alert:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+260977396223",
    "alertType": "LOW_BALANCE",
    "alertData": {
      "balance": "100",
      "currency": "ZMW",
      "threshold": "500"
    },
    "type": "alert"
  }'
```

**Get API documentation:**
```bash
curl http://localhost:3000/api/sms/send
```

## Integration with Account Alerts

The `AccountAlertService` has been updated to support SMS notifications alongside push notifications:

```typescript
import { AccountAlertService } from '@/lib/services/account-alert';

// Will send via PUSH and/or SMS based on user preferences
await AccountAlertService.triggerLowBalanceAlert(
  userId,
  accountNumber,
  '100',
  'ZMW',
  '500'
);
```

## Database Schema

The SMS service logs all messages to the `sms_notifications` table:

```prisma
model SMSNotification {
  id           Int       @id @default(autoincrement())
  userId       Int       @default(1)
  msisdn       String    // Phone number
  message      String
  status       String    @default("ready")
  sentAt       DateTime?
  details      Json?     // Provider response
  attemptCount Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

## Response Format

All SMS methods return a `SMSResponse`:

```typescript
interface SMSResponse {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  details?: any;
}
```

**Success Example:**
```json
{
  "success": true,
  "status": "sent",
  "messageId": "abc123",
  "details": { ... }
}
```

**Failure Example:**
```json
{
  "success": false,
  "status": "failed",
  "error": "Invalid phone number"
}
```

## Provider Switching

To switch providers, simply change the `SMS_PROVIDER` environment variable:

```bash
# Use Orbit Mobile (default)
SMS_PROVIDER=orbit

# Use BulkSMS
SMS_PROVIDER=bulksms

# Use Internal ESB
SMS_PROVIDER=internal
```

Restart your application after changing the provider.

## Testing

1. **Start your Next.js application:**
   ```bash
   npm run dev
   ```

2. **Test via API endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/sms/send \
     -H "Content-Type: application/json" \
     -d '{"to": "+260977396223", "message": "Test", "type": "generic"}'
   ```

3. **Test in code:**
   ```typescript
   import { SMSService } from '@/lib/services/sms';
   
   const result = await SMSService.sendSMS('+260977396223', 'Test message');
   console.log(result);
   ```

## Error Handling

All SMS methods are wrapped in try-catch blocks and return consistent error responses:

```typescript
try {
  const response = await SMSService.sendSMS(phoneNumber, message);
  if (response.success) {
    console.log('SMS sent successfully');
  } else {
    console.error('SMS failed:', response.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Production Considerations

1. **Credentials**: Move production credentials to secure environment variables
2. **Rate Limiting**: Consider adding rate limiting to the API endpoint
3. **Authentication**: Add authentication/authorization to the SMS API endpoint
4. **Monitoring**: Monitor SMS delivery rates and failures
5. **Cost Control**: Track SMS usage and set alerts for unusual activity

## Migration from Elixir

The Next.js implementation matches the Elixir backend:
- Same SMS providers (Orbit, BulkSMS, Internal ESB)
- Same credentials
- Same database schema
- Compatible API for easy migration

You can gradually migrate SMS sending from Elixir to Next.js or run both simultaneously.
