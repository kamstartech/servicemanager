# Table UI Consistency Audit & Action Plan

**Date**: 2026-01-06  
**Goal**: Ensure all DataTable implementations use consistent translations and action button styling

---

## Current State Analysis

### Translation Usage

**Already Using Translations:**
- ✅ `/system/third-party` - Uses `translate("common.actions.details")`
- ✅ `/system/backups` - Uses `translate("common.actions.*")` for all actions
- ✅ `/system/login-attempts` - Uses `translate("common.table.columns.*")`

**Needs Translation Updates:**
- ❌ `/admin-users` - Hardcoded "Reset Password"
- ❓ Other 20 pages - Need to audit

### Action Button Styles

**Consistent Pattern (from our work):**
```tsx
// Blue - View/Details
className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"

// Green - Activate/Reactivate  
className="text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200"

// Amber/Yellow - Warning/Suspend/Restore
className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"

// Red - Delete/Revoke/Danger
className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"

// Orange - Primary Actions (Create/Add)
className="bg-fdh-orange hover:bg-fdh-orange/90"
```

---

## Required Translation Keys

### Existing in `en.ts`:
```typescript
common.actions: {
  actions: "Actions",
  add: "Add",
  back: "Back",
  cancel: "Cancel",
  confirm: "Confirm",
  confirmRestore: "Confirm Restore",
  create: "Create",
  delete: "Delete",
  details: "Details", // ✅
  download: "Download", // ✅
  edit: "Edit", // ✅
  refresh: "Refresh", // ✅
  restore: "Restore", // ✅
  save: "Save",
  upload: "Upload", // ✅
  viewDetails: "View Details",
}
```

### Missing Translation Keys Needed:
```typescript
common.actions: {
  view: "View",
  resetPassword: "Reset Password",
  resetting: "Resetting...",
  suspend: "Suspend",
  suspending: "Suspending...",
  reactivate: "Reactivate",
  reactivating: "Reactivating...",
  revoke: "Revoke",
  revoking: "Revoking...",
  activate: "Activate",
  deactivate: "Deactivate",
  approve: "Approve",
  reject: "Reject",
  viewTransactions: "View Transactions",
  generateToken: "Generate Token",
  copyToken: "Copy Token",
  enable: "Enable",
  disable: "Disable",
}
```

---

## Action Plan

### Phase 1: Add Missing Translations ✅
1. Update `/lib/i18n/dictionaries/en.ts`
2. Update `/lib/i18n/dictionaries/pt.ts`
3. Add all missing action keys

### Phase 2: Create Reusable Button Style Constants
Create `/lib/constants/button-styles.ts`:
```typescript
export const ACTION_BUTTON_STYLES = {
  view: "text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200",
  edit: "text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200",
  delete: "text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200",
  danger: "text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200",
  warning: "text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200",
  success: "text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200",
  primary: "bg-fdh-orange hover:bg-fdh-orange/90",
};
```

### Phase 3: Update Each Page

**Priority 1 (System Pages):**
1. ✅ `/system/third-party` - Already correct
2. ✅ `/system/backups` - Already correct
3. ✅ `/system/login-attempts` - Already correct
4. `/admin-users` - Update action buttons
5. `/system/admin-users` - Update (may be duplicate)
6. `/system/databases` - Audit & update
7. `/system/core-banking` - Audit & update
8. `/system/migrations` - Audit & update
9. `/system/workflows` - Audit & update
10. `/system/forms` - Audit & update

**Priority 2 (Mobile Banking Pages):**
11. `/mobile-banking/registration-requests`
12. `/mobile-banking/transactions`
13. `/mobile-banking/checkbook-requests`
14. `/mobile-banking/accounts`
15. `/mobile-banking/billers`
16. `/mobile-banking/account-categories`

**Priority 3 (Other Pages):**
17. `/mobile-users`
18. `/wallet/tiers`
19. `/(authenticated)/services`

---

## Standardization Rules

### 1. Table Headers
Always use translation keys:
```tsx
header: translate("common.table.columns.name")
```

### 2. Action Buttons in Tables
```tsx
// View/Details
<Button ... className={ACTION_BUTTON_STYLES.view}>
  <Eye className="h-4 w-4 mr-2" />
  {translate("common.actions.details")}
</Button>

// Edit
<Button ... className={ACTION_BUTTON_STYLES.edit}>
  <Edit className="h-4 w-4 mr-2" />
  {translate("common.actions.edit")}
</Button>

// Delete
<Button ... className={ACTION_BUTTON_STYLES.delete}>
  <Trash2 className="h-4 w-4 mr-2" />
  {translate("common.actions.delete")}
</Button>
```

### 3. Primary Actions (Header Buttons)
```tsx
<Button className="bg-fdh-orange hover:bg-fdh-orange/90">
  <Plus className="h-4 w-4 mr-2" />
  {translate("common.actions.create")} {translate("common.entities.client")}
</Button>
```

### 4. Loading States
```tsx
{loading ? (
  <p className="text-sm text-muted-foreground text-center py-8">
    {translate("common.state.loading")}
  </p>
) : ( ... )}
```

### 5. Search Placeholders
```tsx
searchPlaceholder={translate("common.actions.searchPlaceholder")}
```

---

## Implementation Checklist

### Step 1: Update Translation Files
- [ ] Add missing keys to `en.ts`
- [ ] Add missing keys to `pt.ts`

### Step 2: Create Constants File
- [ ] Create `/lib/constants/button-styles.ts`
- [ ] Export style constants

### Step 3: Update Admin Users Page
- [ ] Replace "Reset Password" with translation
- [ ] Replace "Resetting..." with translation
- [ ] Use consistent button styles

### Step 4: Audit Remaining Pages
For each page:
- [ ] Check if using translations
- [ ] Check button styles
- [ ] Check loading/error states
- [ ] Check search placeholder
- [ ] Update as needed

---

## Expected Outcome

All DataTable pages will have:
✅ Consistent translations for all text
✅ Consistent button styling based on action type
✅ Consistent loading/error messages
✅ Consistent search placeholders
✅ Easy maintenance (change once, applies everywhere)
✅ Full i18n support (English/Portuguese)

---

## Notes

- Some pages may have domain-specific actions (e.g., "Approve Registration")
- These should still follow the color/style patterns
- Add specific translations as needed for domain actions
- Maintain backward compatibility during updates
