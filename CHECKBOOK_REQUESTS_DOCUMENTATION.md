# Checkbook Requests Feature

This document describes the implementation of the Checkbook Requests feature for managing customer checkbook requests in the mobile banking admin portal.

## Overview

The Checkbook Requests feature allows customers to request physical checkbooks for their accounts, and enables administrators to manage these requests through a comprehensive workflow with status tracking.

## Database Schema

### CheckbookRequest Model

```prisma
model CheckbookRequest {
  id            Int                    @id @default(autoincrement())
  mobileUserId  Int                    @map("mobile_user_id")
  accountNumber String                 @map("account_number")
  
  numberOfCheckbooks Int    @default(1) @map("number_of_checkbooks")
  collectionPoint    String @map("collection_point")
  
  status       CheckbookRequestStatus @default(PENDING)
  requestedAt  DateTime               @default(now())
  approvedAt   DateTime?
  approvedBy   Int?
  readyAt      DateTime?
  collectedAt  DateTime?
  cancelledAt  DateTime?
  rejectedAt   DateTime?
  
  notes           String?
  rejectionReason String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  mobileUser      MobileUser    @relation(...)
  approvedByUser  AdminWebUser? @relation(...)
}
```

### Status Flow

```
PENDING → APPROVED → READY_FOR_COLLECTION → COLLECTED
   ↓          ↓
REJECTED   CANCELLED
```

**Status Types:**
- `PENDING` - Initial state when request is created
- `APPROVED` - Admin has approved the request
- `READY_FOR_COLLECTION` - Checkbooks are ready at collection point
- `COLLECTED` - Customer has collected the checkbooks
- `CANCELLED` - Request was cancelled
- `REJECTED` - Request was rejected by admin

## API Endpoints

### GET /api/checkbook-requests

List all checkbook requests with filtering and pagination.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `pageSize` (number, default: 20) - Items per page
- `status` (CheckbookRequestStatus | "ALL") - Filter by status
- `accountNumber` (string) - Filter by account number
- `mobileUserId` (number) - Filter by user ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "mobileUserId": 123,
      "accountNumber": "1234567890",
      "numberOfCheckbooks": 1,
      "collectionPoint": "Main Branch",
      "status": "PENDING",
      "requestedAt": "2025-12-13T21:00:00Z",
      "mobileUser": {
        "id": 123,
        "username": "john.doe",
        "phoneNumber": "+265999123456",
        "customerNumber": "C000123"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### POST /api/checkbook-requests

Create a new checkbook request.

**Request Body:**
```json
{
  "mobileUserId": 123,
  "accountNumber": "1234567890",
  "numberOfCheckbooks": 1,
  "collectionPoint": "Main Branch",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "mobileUserId": 123,
    "accountNumber": "1234567890",
    "numberOfCheckbooks": 1,
    "collectionPoint": "Main Branch",
    "status": "PENDING",
    "requestedAt": "2025-12-13T21:00:00Z"
  }
}
```

### GET /api/checkbook-requests/[id]

Get a specific checkbook request by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "mobileUserId": 123,
    "accountNumber": "1234567890",
    "numberOfCheckbooks": 1,
    "collectionPoint": "Main Branch",
    "status": "APPROVED",
    "requestedAt": "2025-12-13T21:00:00Z",
    "approvedAt": "2025-12-13T21:30:00Z",
    "approvedBy": 5,
    "mobileUser": { ... },
    "approvedByUser": { ... }
  }
}
```

### PATCH /api/checkbook-requests/[id]

Update a checkbook request (typically to change status).

**Request Body:**
```json
{
  "status": "APPROVED",
  "notes": "Approved for processing",
  "numberOfCheckbooks": 2,
  "collectionPoint": "Downtown Branch",
  "rejectionReason": "Optional rejection reason"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated checkbook request
  }
}
```

### DELETE /api/checkbook-requests/[id]

Delete a checkbook request.

**Response:**
```json
{
  "success": true,
  "message": "Checkbook request deleted successfully"
}
```

## Frontend Interface

### Page Location
`/mobile-banking/checkbook-requests`

### Features

1. **List View**
   - Displays all checkbook requests in a data table
   - Filter by status (All, Pending, Approved, Ready for Collection, Collected, Cancelled, Rejected)
   - Pagination support
   - Real-time refresh

2. **Request Details**
   - User information (username, phone, customer number)
   - Account number
   - Number of checkbooks requested
   - Collection point location
   - Current status with visual badge
   - Request date

3. **Status Management Actions**
   - Pending requests: `Approve` or `Reject` buttons
   - Approved requests: `Mark Ready` button
   - Ready requests: `Mark Collected` button
   - Automatic timestamp tracking for each status change

4. **Visual Status Indicators**
   - Color-coded badges
   - Status-specific icons
   - Clear visual hierarchy

## TypeScript Types

Location: `/types/checkbook.ts`

```typescript
export interface CheckbookRequestWithUser extends CheckbookRequest {
  mobileUser: {
    id: number;
    username: string | null;
    phoneNumber: string | null;
    customerNumber: string | null;
  };
  approvedByUser?: {
    id: number;
    name: string | null;
    email: string;
  } | null;
}

export interface CheckbookRequestCreate {
  mobileUserId: number;
  accountNumber: string;
  numberOfCheckbooks: number;
  collectionPoint: string;
  notes?: string;
}

export interface CheckbookRequestUpdate {
  status?: CheckbookRequestStatus;
  numberOfCheckbooks?: number;
  collectionPoint?: string;
  notes?: string;
  rejectionReason?: string;
}
```

## Navigation

The feature is accessible via the admin sidebar under:
**Mobile Banking → Checkbook Requests**

Icon: `BookOpen` (lucide-react)

## Migration

Run the database migration:

```bash
npx prisma migrate deploy
```

Or if in development:

```bash
npx prisma migrate dev
```

Migration file: `20251213210658_add_checkbook_requests/migration.sql`

## Future Enhancements

Potential improvements for this feature:

1. **Notification System**
   - Email/SMS notifications when status changes
   - Push notifications to mobile app

2. **Audit Trail**
   - Track all status changes
   - Record admin user who made each change
   - Add comments/notes for each action

3. **Batch Operations**
   - Approve/reject multiple requests at once
   - Export requests to CSV/PDF

4. **Analytics Dashboard**
   - Request volume by branch
   - Average processing time
   - Status distribution charts

5. **Integration with T24**
   - Automatic checkbook ordering in core banking
   - Real-time stock checking at branches

6. **Collection Verification**
   - QR code or PIN for collection verification
   - Photo capture of customer signature

## Testing

To test the feature locally:

1. Ensure database is running
2. Run migrations: `npx prisma migrate dev`
3. Generate Prisma client: `npx prisma generate`
4. Start dev server: `npm run dev`
5. Navigate to `/mobile-banking/checkbook-requests`
6. Use the API endpoints to create test requests

Example test request:
```bash
curl -X POST http://localhost:3000/api/checkbook-requests \
  -H "Content-Type: application/json" \
  -d '{
    "mobileUserId": 1,
    "accountNumber": "1234567890",
    "numberOfCheckbooks": 1,
    "collectionPoint": "Main Branch"
  }'
```

## Support

For questions or issues with this feature, contact the development team or refer to the project's main documentation.
