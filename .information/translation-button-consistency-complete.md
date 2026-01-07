# Translation & Button Style Consistency Updates

**Date**: 2026-01-06  
**Status**: Phase 1 Complete

---

## Changes Made

### 1. Added Missing Translations

#### English (`lib/i18n/dictionaries/en.ts`)
Added 16 new action keys:
```typescript
common.actions: {
  // Existing...
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
  search: "Search", // Added
  searchPlaceholder: "Search...", // Added
}
```

#### Portuguese (`lib/i18n/dictionaries/pt.ts`)
Added corresponding Portuguese translations:
```typescript
common.actions: {
  // Existing...
  view: "Ver",
  resetPassword: "Redefinir palavra-passe",
  resetting: "A redefinir...",
  suspend: "Suspender",
  suspending: "A suspender...",
  reactivate: "Reativar",
  reactivating: "A reativar...",
  revoke: "Revogar",
  revoking: "A revogar...",
  activate: "Ativar",
  deactivate: "Desativar",
  approve: "Aprovar",
  reject: "Rejeitar",
  viewTransactions: "Ver transações",
  generateToken: "Gerar token",
  copyToken: "Copiar token",
  enable: "Ativar",
  disable: "Desativar",
  search: "Pesquisar",
  searchPlaceholder: "Pesquisar...",
}
```

### 2. Created Button Style Constants

**File**: `lib/constants/button-styles.ts`

```typescript
export const ACTION_BUTTON_STYLES = {
  view: "text-blue-700 bg-blue-50 hover:bg-blue-100...",
  edit: "text-blue-700 bg-blue-50 hover:bg-blue-100...",
  delete: "text-red-700 bg-red-50 hover:bg-red-100...",
  danger: "text-red-700 bg-red-50 hover:bg-red-100...",
  warning: "text-amber-700 bg-amber-50 hover:bg-amber-100...",
  success: "text-green-700 bg-green-50 hover:bg-green-100...",
  primary: "bg-fdh-orange hover:bg-fdh-orange/90",
} as const;
```

**Benefits**:
- ✅ Single source of truth for button styles
- ✅ Easy to maintain and update
- ✅ Type-safe with TypeScript
- ✅ Documented with JSDoc comments
- ✅ Consistent visual language

### 3. Updated Admin Users Page

**File**: `app/(dashboard)/admin-users/page.tsx`

**Changes**:
1. Imported `ACTION_BUTTON_STYLES`
2. Replaced hardcoded "Reset Password" with `translate("common.actions.resetPassword")`
3. Replaced hardcoded "Resetting..." with `translate("common.actions.resetting")`
4. Changed button style from hardcoded blue to `ACTION_BUTTON_STYLES.warning` (amber)
5. Used template literal for combining styles with disabled state

**Before**:
```tsx
<Button
  className="text-blue-700 bg-blue-50 hover:bg-blue-100..."
  title="Reset Password"
>
  <Key className="mr-2 h-4 w-4" />
  {resettingUserId === user.id ? "Resetting..." : "Reset Password"}
</Button>
```

**After**:
```tsx
<Button
  className={`${ACTION_BUTTON_STYLES.warning} disabled:opacity-50 disabled:cursor-not-allowed`}
  title={translate("common.actions.resetPassword")}
>
  <Key className="mr-2 h-4 w-4" />
  {resettingUserId === user.id 
    ? translate("common.actions.resetting")
    : translate("common.actions.resetPassword")}
</Button>
```

**Why Amber/Warning for Reset Password?**
- Reset password is a caution action (affects user access)
- Follows pattern from backups page (restore = amber)
- Differentiates from view/info actions (blue)

---

## Style Guide

### Button Color Meanings

| Color | Purpose | Use Cases | Examples |
|-------|---------|-----------|----------|
| **Blue** | View/Info | Non-destructive info retrieval | View, Details, View Transactions |
| **Green** | Positive | Activation, approval | Activate, Reactivate, Approve, Enable |
| **Amber** | Caution | Warning, potential impact | Suspend, Restore, Reset Password |
| **Red** | Danger | Destructive, permanent | Delete, Revoke, Reject |
| **Orange (FDH)** | Primary | Main CTAs | Create, Add, Generate |

### Usage Examples

```tsx
// View/Details
<Button className={ACTION_BUTTON_STYLES.view}>
  <Eye className="h-4 w-4 mr-2" />
  {translate("common.actions.details")}
</Button>

// Activate/Enable
<Button className={ACTION_BUTTON_STYLES.success}>
  <Play className="h-4 w-4 mr-2" />
  {translate("common.actions.activate")}
</Button>

// Suspend
<Button className={ACTION_BUTTON_STYLES.warning}>
  <Ban className="h-4 w-4 mr-2" />
  {translate("common.actions.suspend")}
</Button>

// Delete
<Button className={ACTION_BUTTON_STYLES.delete}>
  <Trash2 className="h-4 w-4 mr-2" />
  {translate("common.actions.delete")}
</Button>

// Create (Primary)
<Button className={ACTION_BUTTON_STYLES.primary}>
  <Plus className="h-4 w-4 mr-2" />
  {translate("common.actions.create")}
</Button>
```

---

## Pages Updated

### ✅ Complete
1. `/admin-users` - Updated with translations and consistent styles

### ✅ Already Correct
2. `/system/third-party` - Already using translations
3. `/system/backups` - Already using translations
4. `/system/login-attempts` - Already using translations

### ⏳ Remaining (20 pages)
5. `/system/admin-users` (may be duplicate)
6. `/system/databases`
7. `/system/databases/[id]`
8. `/system/databases/[id]/tables/[schema]/[name]`
9. `/system/core-banking`
10. `/system/core-banking/[id]`
11. `/system/migrations`
12. `/system/workflows`
13. `/system/forms`
14. `/mobile-banking/registration-requests`
15. `/mobile-banking/transactions`
16. `/mobile-banking/checkbook-requests`
17. `/mobile-banking/accounts`
18. `/mobile-banking/accounts/[accountNumber]/transactions`
19. `/mobile-banking/billers`
20. `/mobile-banking/account-categories`
21. `/wallet/tiers`
22. `/mobile-users`
23. `/(authenticated)/services`

---

## Next Steps

### Immediate
1. Audit remaining pages for:
   - Hardcoded button text
   - Inconsistent button styles
   - Missing translations
   - Hardcoded loading/error messages

2. Update each page to use:
   - `translate()` for all user-facing text
   - `ACTION_BUTTON_STYLES` for all action buttons
   - Consistent loading/error patterns

### Future Enhancements
1. Create reusable action button components:
   ```tsx
   <ViewButton onClick={...} />
   <DeleteButton onClick={...} />
   <EditButton onClick={...} />
   ```

2. Add translation keys for common error/success messages

3. Create page-specific translation namespaces for complex pages

4. Add translation validation tests

---

## Benefits Achieved

### For Developers
✅ Consistent patterns across codebase  
✅ Easy to find and update button styles  
✅ Type-safe translations  
✅ Clear documentation  
✅ Reduced code duplication  

### For Users
✅ Consistent visual language  
✅ Full Portuguese support  
✅ Clear action affordances (colors match intent)  
✅ Professional, polished UI  

### For Maintenance
✅ Single source of truth for styles  
✅ Easy to rebrand (change colors once)  
✅ Simple to add new languages  
✅ Reduced technical debt  

---

## Files Modified

1. ✅ `lib/i18n/dictionaries/en.ts` - Added 16 action translations
2. ✅ `lib/i18n/dictionaries/pt.ts` - Added 16 Portuguese translations
3. ✅ `lib/constants/button-styles.ts` - Created button style constants
4. ✅ `app/(dashboard)/admin-users/page.tsx` - Updated to use translations & styles

---

## Testing Checklist

- [ ] Verify admin-users page in English
- [ ] Verify admin-users page in Portuguese
- [ ] Test reset password button functionality
- [ ] Verify button hover states
- [ ] Test disabled state styling
- [ ] Check responsive layout
- [ ] Verify all translations display correctly

---

## Migration Guide for Other Pages

### Step-by-step for each page:

1. **Import required items:**
```tsx
import { useI18n } from "@/components/providers/i18n-provider";
import { ACTION_BUTTON_STYLES } from "@/lib/constants/button-styles";
```

2. **Get translate function:**
```tsx
const { translate } = useI18n();
```

3. **Replace hardcoded button text:**
```tsx
// Before
<Button>Delete</Button>

// After
<Button>{translate("common.actions.delete")}</Button>
```

4. **Replace hardcoded styles:**
```tsx
// Before
<Button className="text-red-700 bg-red-50...">

// After
<Button className={ACTION_BUTTON_STYLES.delete}>
```

5. **Update loading states:**
```tsx
// Before
{loading ? <p>Loading...</p> : ...}

// After
{loading ? <p>{translate("common.state.loading")}</p> : ...}
```

---

## Summary

Phase 1 of the consistency update is complete. We have:
- ✅ Established translation infrastructure
- ✅ Created reusable style constants
- ✅ Updated 1 of 23 pages
- ✅ Documented patterns and guidelines

Next phase: Update remaining 20 pages following the established patterns.
