# Registration Workflow Implementation - Complete Summary

## Overview
Complete implementation of a third-party registration request workflow for mobile banking users. The system captures, validates, and processes registration requests from external systems with full audit trail and T24 integration.

---

## System Architecture

### Flow Diagram
```
Third-Party API/Admin Portal
         ↓
   POST /api/registrations
         ↓
   RequestedRegistration (PENDING)
         ↓
   Admin Validation Trigger
         ↓
   POST /api/registrations/[id]/process
         ↓
   T24 Account Lookup & Validation
         ↓
   Status: APPROVED (accounts found)
         ↓
   Awaiting Cron Job Processing
         ↓
   User Creation in Elixir Service
         ↓
   Status: COMPLETED
```

---

## Database Schema

### RequestedRegistration Model
```prisma
model RequestedRegistration {
  id Int @id @default(autoincrement())

  // Request metadata
  sourceIp    String             @map("source_ip") @db.Text
  requestBody Json               @map("request_body")
  source      RegistrationSource @default(THIRD_PARTY_API)

  // Customer data (extracted from request)
  phoneNumber    String  @map("phone_number") @db.Text
  customerNumber String  @map("customer_number") @db.Text
  emailAddress   String? @map("email_address") @db.Text
  firstName      String? @map("first_name") @db.Text
  lastName       String? @map("last_name") @db.Text
  profileType    String? @map("profile_type") @db.Text
  company        String? @db.Text

  // Processing status
  status       RegistrationStatus @default(PENDING)
  processedAt  DateTime?          @map("processed_at")
  elixirUserId Int?               @map("elixir_user_id")
  mobileUserId Int?               @map("mobile_user_id")

  // Error handling
  errorMessage String?   @map("error_message") @db.Text
  retryCount   Int       @default(0) @map("retry_count")
  lastRetryAt  DateTime? @map("last_retry_at")

  // Validation data (stored for cron job)
  validationData Json? @map("validation_data")
  
  // Process stage tracking
  processLog Json[] @default([]) @map("process_log")

  // Audit trail
  processedBy Int?    @map("processed_by")
  notes       String? @db.Text

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  mobileUser      MobileUser?   @relation(fields: [mobileUserId], references: [id])
  processedByUser AdminWebUser? @relation(fields: [processedBy], references: [id])

  @@index([status])
  @@index([customerNumber])
  @@index([phoneNumber])
  @@index([sourceIp])
  @@index([createdAt])
  @@index([source])
}
```

### Enums
```prisma
enum RegistrationStatus {
  PENDING    // Initial state - awaiting validation
  APPROVED   // Validated - accounts found, ready for cron
  COMPLETED  // User created successfully
  FAILED     // Validation or creation failed
  DUPLICATE  // User already exists
}

enum RegistrationSource {
  THIRD_PARTY_API  // External API calls
  ADMIN_PORTAL     // Admin panel manual entry
  SELF_SERVICE     // User self-registration
  T24_SYNC         // Synced from T24 system
}
```

---

## API Endpoints

### 1. Create Registration Request
**POST** `/api/registrations`

Creates new registration request from third-party systems or admin portal.

**Request:**
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
  "company": "ABC Corporation"
}
```

**Features:**
- Auto-captures source IP from headers
- Validates required fields (phone_number, customer_number)
- Checks for duplicate pending registrations
- Returns 409 Conflict if duplicate exists

**Response (Success):**
```json
{
  "success": true,
  "data": { ...registration },
  "message": "Registration request created successfully"
}
```

**Response (Duplicate):**
```json
{
  "error": "Duplicate registration request",
  "existingRequest": {
    "id": 123,
    "createdAt": "2024-12-13T10:00:00Z",
    "status": "PENDING"
  }
}
```

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
  "data": [...registrations],
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

Returns full registration details including:
- All registration fields
- Related MobileUser (if created)
- ProcessedByUser (admin who processed)
- Validation data (accounts found)

### 4. Update Registration
**PATCH** `/api/registrations/[id]`

Update registration status, link created user, or add notes.

**Request:**
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

### 5. Process/Validate Registration ⭐
**POST** `/api/registrations/[id]/process`

Validates customer by checking accounts in T24. Does NOT create user - only validates.

**Request:**
```json
{
  "processedBy": 1,
  "notes": "Validated from admin panel"
}
```

**Process Stages:**
1. **Duplicate Check** - Check if user exists, compare information
2. **Update User Info** (if duplicate with changes) - Update existing user data
3. **T24 Account Lookup** (if new user) - Fetch customer accounts
4. **Account Validation** (if new user) - Validate account data
5. **Status Update** - Update to APPROVED/COMPLETED with validation data

**Response (Success):**
```json
{
  "success": true,
  "status": "APPROVED",
  "data": { ...updated registration },
  "accountsFound": 5,
  "message": "Customer validated successfully. Found 5 accounts.",
  "processLog": [
    {
      "stage": "duplicate_check",
      "status": "completed",
      "timestamp": "2024-12-13T10:00:00Z",
      "duration": 50,
      "details": "No duplicate found"
    },
    {
      "stage": "t24_lookup",
      "status": "completed",
      "timestamp": "2024-12-13T10:00:01Z",
      "duration": 450,
      "details": "Found 5 accounts"
    }
  ],
  "totalDuration": 750
}
```

**Response (Failed - No Accounts):**
```json
{
  "success": false,
  "status": "FAILED",
  "data": { ...updated registration },
  "message": "No accounts found for customer",
  "processLog": [...]
}
```

**Response (Duplicate User - Same Info):**
```json
{
  "success": false,
  "status": "DUPLICATE",
  "message": "User already exists with identical information",
  "existingUserId": 789,
  "processLog": [...],
  "totalDuration": 150
}
```

**Response (Duplicate User - Updated Info):**
```json
{
  "success": true,
  "status": "COMPLETED",
  "message": "User already exists - information updated",
  "updatedFields": ["email", "firstName", "lastName"],
  "processLog": [
    {
      "stage": "duplicate_check",
      "status": "completed",
      "details": "User found - checking for updates"
    },
    {
      "stage": "update_user_info",
      "status": "completed",
      "details": "User information updated successfully"
    }
  ],
  "totalDuration": 250
}
```

### 6. Delete Registration
**DELETE** `/api/registrations/[id]`

Deletes registration request (admin only).

---

## T24 Integration

### T24AccountsService
Location: `/admin/lib/services/t24/accounts.ts`

**Key Methods:**
```typescript
// Get customer accounts with pagination
getCustomerAccounts(customerId: string, pageToken?: string): Promise<T24AccountsResponse>

// Get detailed account information
getCustomerAccountsDetailed(customerId: string): Promise<{
  ok: boolean;
  accounts?: Array<{
    accountId: string;
    customerId?: string;
    category?: string;
    currency?: string;
    title?: string;
  }>;
  error?: string;
}>

// Get all account IDs (paginated)
getAllCustomerAccountIds(customerId: string): Promise<string[]>
```

**T24 Endpoint:**
- URL: `https://fdh-esb.ngrok.dev/esb/customer/accounts/v1/api/{customer_id}`
- Auth: Basic Auth (username:password from env)
- Method: GET

**Response Structure:**
```json
{
  "header": {
    "audit": { "T24_time": 123, ... },
    "page_start": 0,
    "page_token": "next_page_token",
    "total_size": 100,
    "page_size": 50,
    "status": "success"
  },
  "body": [
    {
      "ACCOUNT.ID": "A123456",
      "CUSTOMER.ID": "C123456",
      "CATEGORY": "SAVINGS",
      "CURRENCY": "ZMW",
      "ACCOUNT.TITLE.1": "John Doe Savings"
    }
  ]
}
```

**Environment Variables:**
```env
T24_ESB_URL=https://fdh-esb.ngrok.dev
T24_BASE_URL=https://fdh-esb.ngrok.dev
T24_USERNAME=your_username
T24_PASSWORD=your_password
T24_TEST_CUSTOMER=35042058
```

---

## UI Components

### Pages

#### 1. Registration Requests List
**Path:** `/mobile-banking/registration-requests`
**File:** `app/mobile-banking/registration-requests/page.tsx`

**Features:**
- DataTable with sorting, filtering, search
- Status badge with color coding
- Filter by status dropdown
- Manual refresh button
- Add new registration dialog
- Navigate to detail view
- "Validate" button for PENDING requests
- Real-time process feedback with stage logging

**Columns:**
- ID
- Customer Info (name, customer number, phone)
- Email
- Source (THIRD_PARTY_API, ADMIN_PORTAL, etc.)
- Source IP
- Status badge
- Retry count
- Created date
- Actions (View, Validate)

#### 2. Registration Request Detail
**Path:** `/mobile-banking/registration-requests/[id]`
**File:** `app/mobile-banking/registration-requests/[id]/page.tsx`

**Sections:**
- **Header Card**: Status, Validate button
- **Customer Information**: Name, customer number, phone, email, company, profile type
- **Request Metadata**: Source IP, source type, created date, processed date, retry count
- **Validation Results** (APPROVED only): Account list with details
- **Processing Information**: Linked mobile user, processed by admin, notes, errors

**Features:**
- Validate customer button (PENDING only)
- Process feedback with detailed stage logging
- Account information display (APPROVED status)
- Error message display (FAILED status)
- Linked user information (COMPLETED status)

#### 3. Add Registration Dialog
**Component:** `components/registration/add-registration-dialog.tsx`

**Form Fields:**
- Phone Number (required)
- Customer Number (required)
- First Name
- Last Name
- Email Address
- Profile Type (dropdown: Individual, Corporate, Business)
- Profile Name
- Company
- Source (auto-set to ADMIN_PORTAL, read-only)

**Features:**
- Client-side validation
- Auto-clear form on open
- Source automatically set to ADMIN_PORTAL
- Success callback to refresh parent list

### Status Configuration

```typescript
const statusConfig = {
  PENDING: {
    variant: "secondary",
    icon: Clock,
    label: "Pending",
  },
  APPROVED: {
    variant: "default",
    icon: CheckCircle,
    label: "Approved",
  },
  COMPLETED: {
    variant: "default",
    icon: CheckCircle,
    label: "Completed",
  },
  FAILED: {
    variant: "destructive",
    icon: XCircle,
    label: "Failed",
  },
  DUPLICATE: {
    variant: "outline",
    icon: Copy,
    label: "Duplicate",
  },
};
```

---

## TypeScript Types

### Registration Types
**File:** `types/registration.ts`

```typescript
// Incoming request format
export interface ThirdPartyRegistrationRequest {
  service: 'REGISTRATION';
  service_action: 'MOBILE_BANKING_REGISTRATION';
  phone_number: string;
  customer_number: string;
  email_address?: string;
  first_name?: string;
  last_name?: string;
  profile_name?: string;
  profile_type?: string;
  company?: string;
  account_officer?: string;
  inputter?: string;
  authoriser?: string;
  user_id?: string;
  password?: string;
}

// Create operation data
export interface RequestedRegistrationCreate {
  sourceIp: string;
  requestBody: ThirdPartyRegistrationRequest;
  source?: RegistrationSource;
  phoneNumber: string;
  customerNumber: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  profileType?: string;
  company?: string;
}

// Update operation data
export interface RequestedRegistrationUpdate {
  status?: RegistrationStatus;
  processedAt?: Date;
  elixirUserId?: number;
  mobileUserId?: number;
  errorMessage?: string;
  retryCount?: number;
  lastRetryAt?: Date;
  processedBy?: number;
  notes?: string;
}

// Full record with relations
export interface RequestedRegistrationWithRelations {
  id: number;
  sourceIp: string;
  requestBody: any;
  source: RegistrationSource;
  phoneNumber: string;
  customerNumber: string;
  emailAddress: string | null;
  firstName: string | null;
  lastName: string | null;
  profileType: string | null;
  company: string | null;
  status: RegistrationStatus;
  processedAt: Date | null;
  elixirUserId: number | null;
  mobileUserId: number | null;
  errorMessage: string | null;
  retryCount: number;
  lastRetryAt: Date | null;
  processedBy: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  mobileUser?: {
    id: number;
    username: string | null;
    phoneNumber: string | null;
    customerNumber: string | null;
  } | null;
  processedByUser?: {
    id: number;
    email: string;
    name: string | null;
  } | null;
}

// Filters for queries
export interface RegistrationFilters {
  status?: RegistrationStatus;
  source?: RegistrationSource;
  customerNumber?: string;
  phoneNumber?: string;
  sourceIp?: string;
  fromDate?: Date;
  toDate?: Date;
}
```

### Process Stage Types
**File:** `types/process-stages.ts`

```typescript
export type ProcessStageStatus = 'started' | 'completed' | 'failed' | 'skipped';

export interface ProcessStage {
  stage: string;
  status: ProcessStageStatus;
  timestamp: string;
  duration?: number;
  details?: string;
  error?: string;
}

export const VALIDATION_STAGES = {
  DUPLICATE_CHECK: 'duplicate_check',
  T24_LOOKUP: 't24_lookup',
  ACCOUNT_VALIDATION: 'account_validation',
  STATUS_UPDATE: 'status_update',
} as const;

export const STAGE_LABELS: Record<string, string> = {
  duplicate_check: 'Duplicate Check',
  t24_lookup: 'T24 Account Lookup',
  account_validation: 'Account Validation',
  status_update: 'Status Update',
};
```

---

## Navigation Integration

### Sidebar
**File:** `components/admin-sidebar.tsx`

Added to Mobile Banking section:
```typescript
{
  href: "/mobile-banking/registration-requests",
  icon: UserPlus,
  label: translate("sidebar.registrationRequests")
}
```

### i18n Translations
**Files:** `lib/i18n/dictionaries/en.ts`, `lib/i18n/dictionaries/pt.ts`

```typescript
sidebar: {
  registrationRequests: "Registration Requests", // en
  registrationRequests: "Pedidos de Registo",    // pt
}
```

---

## Complete Workflow Example

### Scenario: Third-party system registering a new user

**Step 1: Create Registration Request**
```bash
curl -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "service": "REGISTRATION",
    "service_action": "MOBILE_BANKING_REGISTRATION",
    "phone_number": "260971234567",
    "customer_number": "C123456",
    "email_address": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "profile_type": "INDIVIDUAL"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "PENDING",
    "phoneNumber": "260971234567",
    "customerNumber": "C123456",
    ...
  }
}
```

**Step 2: Admin Reviews in UI**
1. Navigate to `/mobile-banking/registration-requests`
2. See new PENDING request #42
3. Click "View" or click on row
4. Review customer details

**Step 3: Admin Validates Customer**
1. Click "Validate Customer" button
2. System performs:
   - Duplicate check (no existing user)
   - T24 account lookup (finds 5 accounts)
   - Account validation
   - Status update to APPROVED
3. Shows success message: "Found 5 accounts"
4. Shows process log with timing

**Step 4: Validation Data Stored**
```json
{
  "id": 42,
  "status": "APPROVED",
  "validationData": {
    "accounts": [
      {
        "accountId": "A123456",
        "customerId": "C123456",
        "category": "SAVINGS",
        "currency": "ZMW",
        "title": "John Doe Savings"
      },
      ...4 more accounts
    ],
    "validatedAt": "2024-12-13T10:05:00Z",
    "validatedBy": 1
  },
  "notes": "Validated successfully. Found 5 accounts. Ready for cron processing."
}
```

**Step 5: Cron Job Processes (Future)**
- Scheduled job picks up APPROVED registrations
- Creates user in Elixir service
- Creates wallet accounts
- Links accounts to user
- Updates status to COMPLETED
- Sets mobileUserId and elixirUserId

**Step 6: Completed**
```json
{
  "id": 42,
  "status": "COMPLETED",
  "mobileUserId": 789,
  "elixirUserId": 456,
  "processedAt": "2024-12-13T10:10:00Z",
  "mobileUser": {
    "id": 789,
    "username": "john.doe",
    "phoneNumber": "260971234567",
    "customerNumber": "C123456"
  }
}
```

---

### Scenario: Duplicate user with updated information

**Step 1: Create Registration Request** (same as above)

**Step 2: Admin Validates Customer**
1. Click "Validate Customer" button
2. System performs:
   - Duplicate check (finds existing user #789)
   - Compares information (email changed)
   - Updates user profile with new email
   - Status set to COMPLETED
3. Shows success message: "User already exists - information updated"
4. Lists updated fields: ["email"]

**Step 3: Completed Immediately**
```json
{
  "id": 42,
  "status": "COMPLETED",
  "mobileUserId": 789,
  "notes": "User already existed - information updated with new data",
  "processedAt": "2024-12-13T10:05:00Z"
}
```

No cron job needed - process completes immediately.

---

## Error Handling

### Duplicate User - Same Information
- Status: DUPLICATE
- Error message: "User already exists with identical information"
- Links to existing user ID
- No retry possible

### Duplicate User - Updated Information
- Status: COMPLETED
- Message: "User already existed - information updated with new data"
- Updates: phone number, email, first name, last name
- Process completes immediately (no cron job needed)

### No Accounts Found
- Status: FAILED
- Error message: "No accounts found for customer"
- Retry count incremented
- Can retry validation after fixing in T24

### T24 Connection Error
- Status: PENDING (unchanged)
- Error message: "Failed to fetch accounts from T24"
- Retry count incremented
- Can retry when T24 is available

### Unexpected Error
- Status: PENDING (unchanged)
- Error message: Actual error details
- Retry count incremented
- Admin can investigate and retry

---

## Key Features

### ✅ Implemented Features

1. **Request Capture**
   - Auto-capture source IP
   - Store full request body
   - Extract customer data
   - Source tracking (API, Admin, etc.)

2. **Duplicate Prevention**
   - Check for pending requests
   - Check for existing users
   - Prevent duplicate processing

3. **T24 Integration**
   - Account lookup API
   - Pagination support
   - Error handling
   - Connection testing

4. **Validation Process**
   - Multi-stage validation
   - Detailed process logging
   - Performance metrics
   - Error tracking

5. **Admin UI**
   - List view with filtering
   - Detail view with full info
   - Status badges
   - Manual validation trigger
   - Add registration dialog

6. **Audit Trail**
   - Source IP tracking
   - Timestamp tracking
   - Admin tracking (who processed)
   - Retry tracking
   - Process stage logging

7. **Status Management**
   - PENDING → APPROVED → COMPLETED flow
   - PENDING → DUPLICATE (dead end)
   - PENDING → FAILED → (retry) → APPROVED
   - Auto-set processed date

8. **Data Validation**
   - Required field validation
   - Phone number validation
   - Customer number validation
   - Email validation

---

## Future Enhancements

### 🔄 Pending Implementation

1. **Cron Job Processing**
   - Scheduled job to process APPROVED requests
   - User creation in Elixir service
   - Wallet account creation
   - Status update to COMPLETED
   - Error handling and retry logic

2. **Webhook Integration**
   - Real-time processing triggers
   - Status update callbacks
   - Event notifications

3. **Email Notifications**
   - Admin notification on new request
   - Customer notification on completion
   - Error notifications

4. **Advanced Filtering**
   - Date range filters
   - Multiple status selection
   - Source filter
   - Search by multiple fields

5. **Bulk Operations**
   - Bulk approve
   - Bulk retry
   - Bulk delete

6. **Statistics Dashboard**
   - Request volume metrics
   - Success/failure rates
   - Processing time analytics
   - Source distribution

7. **Authentication**
   - API key validation
   - Role-based access control
   - Rate limiting

8. **Logging & Monitoring**
   - Structured logging
   - Error tracking
   - Performance monitoring
   - Alerts

---

## File Structure

```
admin/
├── app/
│   ├── api/
│   │   └── registrations/
│   │       ├── route.ts              # List & Create
│   │       └── [id]/
│   │           ├── route.ts          # Get, Update, Delete
│   │           └── process/
│   │               └── route.ts      # Validate
│   └── mobile-banking/
│       └── registration-requests/
│           ├── page.tsx              # List page
│           └── [id]/
│               └── page.tsx          # Detail page
├── components/
│   └── registration/
│       └── add-registration-dialog.tsx
├── lib/
│   └── services/
│       └── t24/
│           ├── accounts.ts           # T24 integration
│           ├── balance.ts
│           ├── transactions.ts
│           └── account-details.ts
├── types/
│   ├── registration.ts               # TypeScript types
│   └── process-stages.ts             # Process tracking types
├── prisma/
│   └── schema.prisma                 # Database schema
└── docs/
    └── REGISTRATION_TRACKING_IMPLEMENTATION.md
```

---

## Testing Checklist

### Manual Testing

- [x] Create registration via API
- [x] Create registration via admin UI
- [x] View registration list
- [x] Filter by status
- [x] Search by customer number
- [x] View registration detail
- [x] Validate pending registration (success)
- [x] Validate with no accounts (failure)
- [x] Validate duplicate user
- [x] Retry failed validation
- [x] Update registration status
- [x] Delete registration

### Integration Testing

- [ ] T24 account lookup
- [ ] Duplicate detection
- [ ] Error handling
- [ ] Process logging
- [ ] Status transitions

### Performance Testing

- [ ] List page with 1000+ records
- [ ] T24 API response time
- [ ] Validation process timing
- [ ] Database query performance

---

## Documentation References

1. **REGISTRATION_TRACKING_IMPLEMENTATION.md** - Original implementation doc
2. **REGISTRATION_WORKFLOW_SUMMARY.md** - This document (comprehensive guide)
3. **types/registration.ts** - TypeScript type definitions
4. **types/process-stages.ts** - Process stage types
5. **prisma/schema.prisma** - Database schema

---

## Support & Maintenance

### Common Issues

**Issue: T24 connection timeout**
- Check T24_ESB_URL environment variable
- Verify network connectivity
- Check T24 service status
- Review credentials

**Issue: Duplicate detection not working**
- Check database indexes
- Verify customerNumber uniqueness
- Review query logic

**Issue: Validation stuck in PENDING**
- Check process log for errors
- Review retry count
- Check T24 service availability
- Verify error messages

### Monitoring

Watch these metrics:
- Registration request volume
- Validation success rate
- T24 API response time
- Process duration
- Error frequency by type

### Maintenance Tasks

Weekly:
- Review failed registrations
- Check T24 integration health
- Monitor disk space (JSON storage)

Monthly:
- Archive old completed registrations
- Review and optimize queries
- Update documentation
- Review error patterns

---

## Contributors

Implementation completed: December 13, 2024

**Components:**
- Database schema & migrations
- API endpoints (Create, List, Get, Update, Delete, Process)
- T24 integration service
- UI components (List, Detail, Add Dialog)
- TypeScript types
- Process stage tracking
- Documentation

**Next Phase:** Cron job implementation for user creation
