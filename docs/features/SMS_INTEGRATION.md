# SMS Integration for Next.js Application

This document describes the **ESB-only** SMS integration used by the Next.js application.

The application sends SMS exclusively via the **FDH ESB SMS Gateway** using `ESBSMSService`.

For the full details and request/response format, refer to:
- `docs/features/ESB_SMS_INTEGRATION.md`

## Features

✅ Single SMS integration via ESB gateway
✅ Database logging of all SMS messages
✅ Flexible API for different message types
✅ Type-safe TypeScript implementation

## Installation

The SMS service lives in:
```
lib/services/sms/
├── types.ts          # TypeScript interfaces
├── sms-service.ts    # ESB SMS service implementation
└── index.ts          # Exports
```

## Environment Variables

Add these to your `.env.local` file:

```bash
ESB_SMS_URL=https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages
ESB_USERNAME=admin
ESB_PASSWORD=admin
ESB_CLIENT_ID=d79b32b5-b9a8-41de-b215-b038a913f619
```

**Note**: All credentials come with defaults from the Elixir backend, so you can start testing immediately without adding env vars.

## Usage Examples

### 1. Basic SMS
```typescript
import { ESBSMSService } from '@/lib/services/sms';

const response = await ESBSMSService.sendSMS(
  '+260977396223',
  'Hello from Next.js!',
  userId // optional
);
```

### 2. Send OTP
```typescript
const response = await ESBSMSService.sendOTP(
  '+260977396223',
  '123456',
  userId
);
```

### 3. Send Account Alert
```typescript
const response = await ESBSMSService.sendAccountAlert(
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
const response = await ESBSMSService.sendTransactionNotification(
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
const response = await ESBSMSService.sendPasswordReset(
  '+260977396223',
  'RESET123',
  userId
);
```

### 6. Welcome Message
```typescript
const response = await ESBSMSService.sendWelcome(
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
    "phoneNumber": "+260977396223",
    "message": "Test message from API",
    "type": "generic"
  }'
```

**Send an OTP:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+260977396223",
    "otp": "123456",
    "type": "otp"
  }'
```

**Send an Alert:**
```bash
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+260977396223",
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

Provider switching is handled inside the ESB gateway (routing rules). The Next.js application does not support direct provider switching.

## Testing

1. **Start your Next.js application:**
   ```bash
   npm run dev
   ```

2. **Test via API endpoint:**
   ```bash
   curl -X POST http://localhost:3000/api/sms/send \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+260977396223", "message": "Test", "type": "generic"}'
   ```

3. **Test in code:**
   ```typescript
   import { ESBSMSService } from '@/lib/services/sms';
   
   const result = await ESBSMSService.sendSMS('+260977396223', 'Test message');
   console.log(result);
   ```

## Error Handling

All SMS methods are wrapped in try-catch blocks and return consistent error responses:

```typescript
try {
  const response = await ESBSMSService.sendSMS(phoneNumber, message);
  if (response.success) {
    console.log('SMS sent successfully');
  } else {
    console.error('SMS sending failed:', response.error);
  }
} catch (error) {
  console.error('Error sending SMS:', error);
}
```

## Production Considerations

1. **Credentials**: Move production credentials to secure environment variables
2. **Rate Limiting**: Consider adding rate limiting to the API endpoint
3. **Authentication**: Add authentication/authorization to the SMS API endpoint
4. **Monitoring**: Monitor SMS delivery rates and failures
5. **Cost Control**: Track SMS usage and set alerts for unusual activity

## Migration from Elixir

The Next.js implementation matches the Elixir backend's **INTERNAL ESB** SMS flow by sending payloads to the ESB gateway.

You can gradually migrate SMS sending from Elixir to Next.js or run both simultaneously.
