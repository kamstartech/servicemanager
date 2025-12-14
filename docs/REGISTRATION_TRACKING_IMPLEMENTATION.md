# Third-Party Registration Tracking Implementation

## Overview
This implementation tracks third-party mobile user registration requests in the Next.js admin application, capturing source IP, request data, and processing status.

## Database Schema

### RequestedRegistration Model
```prisma
model RequestedRegistration {
  id                Int                 @id @default(autoincrement())
  
  // Request metadata
  sourceIp          String              @map("source_ip")
  requestBody       Json                @map("request_body")
  source            RegistrationSource  @default(THIRD_PARTY_API)
  
  // Customer data
  phoneNumber       String              @map("phone_number")
  customerNumber    String              @map("customer_number")
  emailAddress      String?             @map("email_address")
  firstName         String?             @map("first_name")
  lastName          String?             @map("last_name")
  profileType       String?             @map("profile_type")
  company           String?
  
  // Processing status
  status            RegistrationStatus  @default(PENDING)
  processedAt       DateTime?           @map("processed_at")
  elixirUserId      Int?                @map("elixir_user_id")
  mobileUserId      Int?                @map("mobile_user_id")
  
  // Error handling
  errorMessage      String?             @map("error_message")
  retryCount        Int                 @default(0)
  lastRetryAt       DateTime?           @map("last_retry_at")
  
  // Audit trail
  processedBy       Int?                @map("processed_by")
  notes             String?
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  // Relations
  mobileUser        MobileUser?         @relation(fields: [mobileUserId], references: [id])
  processedByUser   AdminWebUser?       @relation(fields: [processedBy], references: [id])
  
  @@index([status, customerNumber, phoneNumber, sourceIp, createdAt, source])
}

enum RegistrationStatus {
  PENDING
  COMPLETED
  FAILED
  DUPLICATE
}

enum RegistrationSource {
  THIRD_PARTY_API
  ADMIN_PORTAL
  SELF_SERVICE
  T24_SYNC
}
```

## API Endpoints

### 1. Create Registration Request
**POST** `/api/registrations`

Creates a new registration request from third-party systems.

**Request Body:**
```json
{
  "service": "REGISTRATION",
  "service_action": "MOBILE_BANKING_REGISTRATION",
  "phone_number": "260971234567",
  "customer_number": "C123456",
  "email_address": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile_type": "INDIVIDUAL",
  "company": "ABC Corp"
}
```

**Features:**
- Auto-captures source IP from headers (`x-forwarded-for` or `x-real-ip`)
- Validates required fields (phone_number, customer_number)
- Checks for duplicate pending registrations
- Returns 409 Conflict if duplicate exists

### 2. List Registrations
**GET** `/api/registrations`

Query parameters:
- `status` - Filter by RegistrationStatus
- `customerNumber` - Search by customer number
- `phoneNumber` - Search by phone number
- `sourceIp` - Filter by source IP
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### 3. Get Registration Details
**GET** `/api/registrations/[id]`

Returns full registration details including related MobileUser and processed by admin.

### 4. Update Registration
**PATCH** `/api/registrations/[id]`

**Request Body:**
```json
{
  "status": "COMPLETED",
  "mobileUserId": 123,
  "elixirUserId": 456,
  "errorMessage": "Error details",
  "notes": "Admin notes",
  "processedBy": 1
}
```

Auto-sets `processedAt` when status changes to COMPLETED or FAILED.

### 5. Process Registration
**POST** `/api/registrations/[id]/process`

Processes a pending registration by calling the Elixir service.

**Request Body:**
```json
{
  "processedBy": 1,
  "notes": "Processing manually"
}
```

**Features:**
- Calls Elixir `/api/third-party/profile-services` endpoint
- Auto-updates status based on Elixir response
- Increments retry count on failure
- Links created user ID back to registration

### 6. Delete Registration
**DELETE** `/api/registrations/[id]`

Deletes a registration request (admin only).

## Environment Variables

Add to `.env` file:

```env
# Elixir Service Integration
ELIXIR_SERVICE_URL=http://localhost:4000
THIRD_PARTY_API_KEY=your_api_key_here
```

## Database Migration

Run migration to create the table:

```bash
cd admin
npx prisma migrate dev --name add_requested_registrations
npx prisma generate
```

## Integration Flow

### Third-Party Registration Flow:
1. **Third-party system** → POST to `/api/registrations` (Next.js)
2. Next.js validates and stores request with PENDING status
3. Admin reviews pending registrations
4. Admin triggers processing → POST to `/api/registrations/[id]/process`
5. Next.js calls Elixir service → `/api/third-party/profile-services`
6. Elixir processes registration (existing flow)
7. Next.js updates status to COMPLETED/FAILED based on response

### Key Features:
- **IP Tracking**: Captures source IP for audit trail
- **Duplicate Prevention**: Checks for existing pending registrations
- **Retry Logic**: Tracks retry count and last retry timestamp
- **Full Audit Trail**: Links to admin who processed, timestamps
- **Error Handling**: Stores error messages for failed attempts
- **Flexible Processing**: Can be processed automatically or manually

## Usage Example

### Creating a registration request:
```typescript
const response = await fetch('/api/registrations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service: 'REGISTRATION',
    service_action: 'MOBILE_BANKING_REGISTRATION',
    phone_number: '260971234567',
    customer_number: 'C123456',
    email_address: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe'
  })
});
```

### Processing a pending registration:
```typescript
const response = await fetch('/api/registrations/1/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    processedBy: currentAdminId,
    notes: 'Manually approved'
  })
});
```

## Next Steps

1. **Create UI Components** for viewing/managing registrations
2. **Add Authentication** to protect API endpoints
3. **Implement Webhooks** for automatic processing
4. **Add Email Notifications** for registration events
5. **Create Dashboard** showing registration statistics
