# System Third-Party API Management - UI Documentation

**File Location**: `app/(dashboard)/system/third-party/`

**Last Updated**: 2026-01-06

## Overview
The third-party API management system allows administrators to manage external API clients, generate authentication tokens, and monitor API usage. It consists of three main pages: clients list, client detail, and new client creation.

---

## 1. Third-Party Clients List Page

**File**: `app/(dashboard)/system/third-party/page.tsx`

### Page Structure

#### Header Section
- **Title**: "Third-Party API Clients"
- **Description**: "Manage external clients and their API access tokens"

#### Migration Warning Banner
- **Condition**: Shows when database tables haven't been created
- **Style**: Yellow warning banner with AlertTriangle icon
- **Content**: Instructions to run Prisma migration
- **Command shown**: `npx prisma migrate dev --name add_third_party_api_management`

#### Quick Stats Cards (3 cards)
1. **Total Clients**
   - Icon: Users (blue background)
   - Display: Total count of all clients
   - Color scheme: Blue-100/Blue-600

2. **Active Clients**
   - Icon: CheckCircle (green background)
   - Display: Count of active clients only
   - Color scheme: Green-100/Green-600

3. **Total Tokens**
   - Icon: Key (orange background)
   - Display: Sum of all API keys across all clients
   - Color scheme: Orange-100/FDH-Orange

### Table Features

#### DataTable Configuration
```typescript
<DataTable<ThirdPartyClient>
  data={clients}
  columns={columns}
  searchableKeys={["name", "description", "contactEmail"]}
  initialSortKey="createdAt"
  pageSize={10}
  searchPlaceholder="Search API clients..."
  showRowNumbers
  rowNumberHeader="#"
/>
```

#### Columns (7 total)

1. **# (Row Number)**
   - Auto-generated sequential numbers
   - Alignment: Center

2. **Name** (sortable)
   - Primary: Client name (font-medium)
   - Secondary: Description (text-sm, muted)
   - Sort key: `name`
   - Alignment: Left

3. **Contact Email** (sortable)
   - Display: Email address or "-" if empty
   - Sort key: `contactEmail`
   - Alignment: Left

4. **Status** (sortable)
   - Type: Badge
   - Variants:
     - **Active**: Green badge with CheckCircle icon
     - **Inactive**: Red badge with XCircle icon
   - Sort key: `isActive`
   - Alignment: Center

5. **Tokens**
   - Icon: Key (fdh-orange color)
   - Display: Count of API keys for this client
   - Data source: `_count.apiKeys`
   - Alignment: Center

6. **API Calls**
   - Icon: Activity (blue-600 color)
   - Display: Formatted count of access logs
   - Data source: `_count.accessLogs`
   - Format: Uses `.toLocaleString()` for thousands separator
   - Alignment: Center

7. **Created** (sortable)
   - Icon: Calendar
   - Format: `MMM DD, YYYY, HH:MM:SS AM/PM`
   - Sort key: `createdAt`
   - Color: Gray-600
   - Alignment: Center

8. **Actions**
   - Button: "Details" with Eye icon
   - Style: Blue outline button
   - Colors: `text-blue-700 bg-blue-50 hover:bg-blue-100`
   - Links to: `/system/third-party/clients/${client.id}`
   - Alignment: Center

### Action Buttons (Header)

1. **Refresh Button**
   - Icon: RefreshCw (animates when refreshing)
   - Variant: Outline
   - Function: Refetches client data
   - Disabled state: During refresh

2. **New Client Button**
   - Icon: Plus
   - Style: FDH orange (`bg-fdh-orange hover:bg-fdh-orange/90`)
   - Links to: `/system/third-party/clients/new`

### Empty State
- Icon: Users (large, muted)
- Title: "No clients yet"
- Description: "Create your first API client to get started"
- Action: "Create Client" button (orange)

### Data Model

```typescript
interface ThirdPartyClient {
  id: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    apiKeys: number;
    accessLogs: number;
  };
}
```

---

## 2. Client Detail Page

**File**: `app/(dashboard)/system/third-party/clients/[id]/page.tsx`

### Page Structure

#### Header
- **Back button**: "Back to clients" with ArrowLeft icon
- **Client name**: H1 heading
- **Description**: Muted text below name (if available)

#### Information Cards (2 cards)

##### 1. Contact Information Card
- **Fields**:
  - Name: `contactName` or "-"
  - Email: `contactEmail` or "-"
  - Phone: `contactPhone` or "-"

##### 2. Security Settings Card
- **Fields**:
  - Rate Limits: Shows "X/min, Y/hour"
  - Allowed IPs: Comma-separated list or "All IPs allowed"
  - Status: "✅ Active" or "❌ Inactive"

### API Tokens Section

#### Token Table

**Columns (8 total)**:

1. **# (Index)**
   - Sequential numbering
   - Alignment: Center

2. **Name**
   - Primary: Token name (or "Unnamed token")
   - Secondary: Key prefix (monospace font, muted)
   - Example prefix: `sk_live_abc123...`

3. **Status**
   - Badge variants:
     - **ACTIVE**: Green badge with CheckCircle icon
     - **EXPIRED**: Red badge with XCircle icon
     - **SUSPENDED**: Yellow badge with Clock icon
     - **REVOKED**: Gray badge with Ban icon
   - Alignment: Center

4. **Created**
   - Icon: Calendar
   - Format: Full datetime with locale support
   - Example: "Jan 06, 2026, 09:30:15 PM"

5. **Expires**
   - Primary: Expiration date with Calendar icon
   - Secondary: Days remaining with color coding:
     - Red: < 30 days
     - Yellow: < 90 days
     - Muted: > 90 days
   - Shows "Never" if no expiration
   - Shows "Expired" if past expiration date

6. **Usage**
   - Icon: Activity
   - Display: Formatted usage count
   - Alignment: Center

7. **Last Used**
   - Display: Formatted datetime or "Never"
   - Style: Small text, muted

8. **Actions**
   - Conditional buttons based on status:
     - **ACTIVE**: "Suspend" button (amber theme with Ban icon)
     - **SUSPENDED**: "Reactivate" button (green theme with Play icon)
     - **Not REVOKED**: "Revoke" button (red theme with Trash2 icon)
   - Alignment: Center

#### Empty State (No Tokens)
- Icon: Key (large, muted)
- Title: "No tokens yet"
- Description: "Generate your first token to get started"

#### Generate Token Dialog

**Trigger**: "Generate Token" button (orange) with Plus icon

**Form Fields**:
1. **Token Name** (optional)
   - Placeholder: Translatable
   - Input field

2. **Description** (optional)
   - Placeholder: Translatable
   - Input field

3. **Expires In** (required)
   - Type: Dropdown select
   - Options:
     - 30 days
     - 90 days
     - 180 days
     - 1 year
     - 2 years
   - Default: "1y"
   - Shows calculated expiration date with Calendar icon

**Submit Action**: Generates token via API

#### Token Generated Dialog

**Shows after successful token generation**

**Sections**:

1. **Warning Header**
   - Icon: AlertTriangle (yellow)
   - Title: Translatable warning message
   - Description: Important notice that token won't be shown again

2. **Token Display**
   - Read-only input with monospace font
   - Copy button (Check icon when copied, Copy icon otherwise)
   - Shows full token value

3. **Expiration Info Box** (blue background)
   - Expires on: Full date format
   - Valid for: Days count

4. **Usage Example Box** (yellow background)
   - Shows how to use token in API requests
   - Code example: `Authorization: Bearer {token_prefix}...`

**Actions**:
- "I've Saved It" button to close dialog

### Token Status Management

**Available Actions**:
- **Suspend**: Changes ACTIVE → SUSPENDED
- **Reactivate**: Changes SUSPENDED → ACTIVE
- **Revoke**: Changes any status → REVOKED (permanent)

**Colors by Action**:
- Suspend: Amber (`text-amber-700 bg-amber-50`)
- Reactivate: Green (`text-green-700 bg-green-50`)
- Revoke: Red (`text-red-700 bg-red-50`)

---

## 3. New Client Page

**File**: `app/(dashboard)/system/third-party/clients/new/page.tsx`

### Page Structure

#### Header
- **Back button**: Links to `/system/third-party`
- **Title**: "Create New Client"
- **Description**: "Add a new third-party client to access your API"

### Form Sections

#### 1. Basic Information
- **Client Name*** (required)
  - Placeholder: "e.g., External Registration System"
  - Validation: Required field

- **Description** (optional)
  - Placeholder: "Brief description of this client"

#### 2. Contact Information
- **Contact Name** (optional)
  - Placeholder: "John Doe"

- **Contact Email** (optional)
  - Type: Email input
  - Placeholder: "john@example.com"

- **Contact Phone** (optional)
  - Placeholder: "+265991234567"

#### 3. Security Settings
- **Allowed IP Addresses** (optional)
  - Placeholder: "192.168.1.100, 10.0.0.0/24"
  - Format: Comma-separated list
  - Note: "Leave empty to allow all IPs"
  - Processing: Splits by comma, trims whitespace

#### 4. Rate Limits
- **Requests per Minute*** (required)
  - Type: Number input
  - Default: "60"
  - Min: 1
  - Required field

- **Requests per Hour*** (required)
  - Type: Number input
  - Default: "1000"
  - Min: 1
  - Required field

### Form Actions

**Submit Button**:
- Icon: Save
- Style: Orange (`bg-fdh-orange hover:bg-fdh-orange/90`)
- Text: "Create Client" (or "Creating..." when loading)
- On success: Redirects to client detail page

**Cancel Button**:
- Variant: Outline
- Links back to: `/system/third-party`

### Form Data Structure

```typescript
{
  name: string;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  allowedIps: string[];  // Converted from comma-separated
  rateLimitPerMinute: number;  // Converted from string
  rateLimitPerHour: number;     // Converted from string
}
```

---

## API Endpoints

### 1. List Clients
- **Endpoint**: `GET /api/admin/third-party/clients`
- **Query params**: page, pageSize, search
- **Response**: Clients array with counts

### 2. Get Client Details
- **Endpoint**: `GET /api/admin/third-party/clients/[id]`
- **Response**: Single client object

### 3. Create Client
- **Endpoint**: `POST /api/admin/third-party/clients`
- **Body**: Client form data
- **Response**: Created client object

### 4. List Tokens
- **Endpoint**: `GET /api/admin/third-party/clients/[id]/tokens`
- **Response**: Tokens array for specific client

### 5. Generate Token
- **Endpoint**: `POST /api/admin/third-party/clients/[id]/tokens`
- **Body**: { name, description, expiresIn }
- **Response**: { token, expiresAt, expiresInDays }

### 6. Update Token Status
- **Endpoint**: `PATCH /api/admin/third-party/tokens/[tokenId]`
- **Body**: { action: "suspend" | "reactivate" | "revoke" }
- **Response**: Success/error status

---

## Internationalization

All pages use the `useI18n` hook with translation keys:

**Common keys**:
- `common.table.columns.*` - Table headers
- `common.actions.*` - Button labels
- `common.state.*` - Loading states
- `common.entities.*` - Entity names

**Third-party specific**:
- `thirdParty.clientDetail.*` - Client detail page strings
- `thirdParty.clientDetail.toasts.*` - Toast notifications
- `thirdParty.clientDetail.form.*` - Form labels and placeholders
- `thirdParty.clientDetail.tokenGeneratedDialog.*` - Dialog content

**Locale support**:
- Date formatting uses locale-aware formatting
- Portuguese (pt-PT) and English (en-US) supported

---

## Color Scheme

**FDH Orange**: Used for primary actions
- Class: `bg-fdh-orange hover:bg-fdh-orange/90`
- Applied to: Generate Token, New Client, Create buttons

**Status Colors**:
- Active/Success: Green (bg-green-100, text-green-800)
- Inactive/Error: Red (bg-red-100, text-red-800)
- Warning/Suspended: Yellow/Amber (bg-yellow-100, text-yellow-800)
- Neutral/Revoked: Gray (bg-gray-100, text-gray-800)

**Action Colors**:
- Details: Blue (text-blue-700, bg-blue-50)
- Suspend: Amber (text-amber-700, bg-amber-50)
- Reactivate: Green (text-green-700, bg-green-50)
- Revoke: Red (text-red-700, bg-red-50)

---

## Key Features

1. **Real-time Search**: Searches across name, description, and contact email
2. **Pagination**: Configurable page size (default: 10)
3. **Sorting**: Multi-column sorting support
4. **Row Numbers**: Sequential numbering across pages
5. **Toast Notifications**: Success/error feedback for all actions
6. **Loading States**: Disabled buttons and loading text during operations
7. **Empty States**: Helpful guidance when no data exists
8. **Migration Detection**: Automatic detection of missing database tables
9. **Token Security**: One-time display of generated tokens
10. **Locale Support**: Internationalized dates and text
11. **Responsive Design**: Mobile-friendly layouts

---

## Related Files

- **List page**: `app/(dashboard)/system/third-party/page.tsx`
- **Detail page**: `app/(dashboard)/system/third-party/clients/[id]/page.tsx`
- **New client page**: `app/(dashboard)/system/third-party/clients/new/page.tsx`
- **API routes**: `app/api/admin/third-party/**/*.ts`
- **DataTable component**: `components/data-table.tsx`
- **UI components**: `components/ui/*`
