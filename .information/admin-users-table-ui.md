# Admin Users Page - Table UI Documentation

**File Location**: `app/(dashboard)/admin-users/page.tsx`

**Last Updated**: 2026-01-06

## Overview
The admin users page displays and manages administrator accounts for the FDH Bank Admin Panel. It uses a reusable `DataTable` component with full-featured search, sort, and pagination capabilities.

## Table Structure

### Columns (5 total)
1. **Name** (sortable)
   - Type: Text
   - Display: Plain text with medium font weight
   - Alignment: Left
   - Sort key: `name`

2. **Email** (sortable)
   - Type: Text with icon
   - Display: Mail icon (lucide-react) + email address
   - Alignment: Left
   - Sort key: `email`
   - Color: Gray-600

3. **Status** (sortable)
   - Type: Badge
   - Display: Icon + text badge
   - Alignment: Center
   - Sort key: `isActive`
   - Variants:
     - **Active**: Green badge (bg-green-100, text-green-800) with CheckCircle icon
     - **Inactive**: Red badge (bg-red-100, text-red-800) with XCircle icon
   - Badge style: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium`

4. **Created** (sortable)
   - Type: DateTime
   - Display: Calendar icon + formatted date/time
   - Alignment: Center
   - Sort key: `createdAt`
   - Format: `MMM DD, YYYY, HH:MM:SS AM/PM` (e.g., "Jan 06, 2026, 09:30:15 PM")
   - Color: Gray-600

5. **Actions**
   - Type: Button
   - Display: "Reset Password" button with Key icon
   - Alignment: Center
   - Button style: Outline variant, blue theme
     - Colors: `text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200`
     - Shows "Resetting..." text when in progress
     - Disabled state when resetting

### Additional Features
- **Row Numbers**: Enabled via `showRowNumbers={true}`
  - Header: "#"
  - Displays sequential numbers starting from 1
  - Adjusts for pagination (e.g., page 2 starts at 11)
  - Alignment: Center

## Data Table Features

### Search
- **Searchable fields**: name, email
- **Placeholder**: "Search admin users..."
- **Position**: Top left
- **Behavior**: Filters data in real-time, resets to page 1 on search

### Sorting
- **Initial sort**: `createdAt` in ascending order (most recent first)
- **Sortable columns**: name, email, isActive, createdAt
- **Interaction**: Click column header to toggle sort direction
- **Direction toggle**: asc ↔ desc

### Pagination
- **Default page size**: 10 rows
- **Configurable**: Yes (1-500 rows per page)
- **Controls**:
  - Rows per page selector (top right)
  - Page number input (bottom right)
  - Previous/Next buttons (bottom right)
  - Page info display (bottom left): "Page X of Y - Z total records"

### Styling
- **Header background**: Gray-50 (`bg-gray-50`)
- **Row background**: White (`bg-white`)
- **Row hover**: Gray-50 (`hover:bg-gray-50`)
- **Border**: Rounded with border, rows separated by dividers
- **Responsive**: Horizontal scroll on overflow (`overflow-x-auto`)
- **Table layout**: Auto with minimum width (`min-w-max table-auto`)

## Data Model

```typescript
interface AdminUser {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## GraphQL Query

```graphql
query AdminWebUsers {
  adminWebUsers {
    id
    email
    name
    isActive
    createdAt
    updatedAt
  }
}
```

## User Actions

### Reset Password
- **Trigger**: Click "Reset Password" button in Actions column
- **Flow**:
  1. Shows confirmation dialog with user name
  2. On confirmation, sends GraphQL mutation: `adminWebSendPasswordResetLink`
  3. Displays loading state ("Resetting...") on button
  4. Shows success/error toast notification
  5. Email sent notification if email service is configured
- **Link expiry**: 24 hours (as noted in dialog)

### Add User
- **Trigger**: "Add Admin User" button in card header
- **Button style**: Amber (`bg-[#f59e0b] hover:bg-[#d97706]`)
- **Icon**: Plus icon
- **Opens**: Modal dialog for creating new admin user

## DataTable Component

**Location**: `components/data-table.tsx`

### Props Used
```typescript
<DataTable<AdminUser>
  data={users}
  columns={columns}
  searchableKeys={["name", "email"]}
  initialSortKey="createdAt"
  pageSize={10}
  searchPlaceholder="Search admin users..."
  showRowNumbers
  rowNumberHeader="#"
/>
```

### Column Definition Type
```typescript
type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  sortKey?: keyof T;
  alignRight?: boolean;
  alignCenter?: boolean;
  width?: string | number;
}
```

## Empty State
- **Display**: Centered message in table
- **Text**: "No records to display."
- **Style**: Muted foreground color, center-aligned
- **Column span**: Covers all columns including row numbers

## Loading & Error States
- **Loading**: "Loading users..." text message
- **Error**: Red error message with error details
- **Color**: `text-red-600` for errors, `text-muted-foreground` for loading

## Internationalization
- Table headers use `COMMON_TABLE_HEADERS` constants
- Headers are translatable via `translate()` function from `useI18n` hook
- Translation keys mapped in DataTable component's `commonHeaderMap`

## Related Files
- **Page component**: `app/(dashboard)/admin-users/page.tsx`
- **DataTable component**: `components/data-table.tsx`
- **Table UI components**: `components/ui/table.tsx`
- **API routes**: `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/reset-password/route.ts`
