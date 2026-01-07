# Table Headers Audit - Non-Standardized Pages

**Date**: 2026-01-06  
**Time**: 22:40 UTC

---

## Pages NOT Using COMMON_TABLE_HEADERS

### 1. ❌ wallet/tiers/page.tsx
**Status**: Using hardcoded English strings
```typescript
header: 'Name',
header: 'Position',
header: 'Balance Limits',
header: 'Transaction Limits',
header: 'Transaction Counts',
header: 'KYC Fields',
header: 'Users',
header: 'Actions',
```
**Fix Needed**: Convert to COMMON_TABLE_HEADERS or create domain-specific translations

### 2. ❌ mobile-banking/account-categories/page.tsx
**Status**: Using domain-specific translations (OK for specialized page)
```typescript
header: translate("accountCategories.columns.category"),
header: translate("accountCategories.columns.categoryName"),
header: translate("accountCategories.columns.displayToMobile"),
header: translate("accountCategories.columns.actions"),
```
**Fix Needed**: None - domain-specific is appropriate here

### 3. ❌ system/databases/page.tsx
**Status**: Using domain-specific translations
```typescript
header: translate("databaseConnections.name"),
header: translate("databaseConnections.engine"),
header: translate("databaseConnections.host"),
header: translate("databaseConnections.database"),
header: translate("databaseConnections.user"),
header: COMMON_TABLE_HEADERS.status, // ✅ Mixed
header: translate("databaseConnections.mode"),
header: translate("databaseConnections.actions"),
```
**Fix Needed**: Keep domain-specific but standardize actions/status to COMMON_TABLE_HEADERS

### 4. ❌ system/admin-users/page.tsx
**Status**: Using domain-specific translations
```typescript
header: translate("adminUsers.columns.email"),
header: translate("adminUsers.columns.name"),
header: translate("adminUsers.columns.status"),
header: COMMON_TABLE_HEADERS.created, // ✅ Mixed
```
**Fix Needed**: Standardize to COMMON_TABLE_HEADERS where possible

### 5. ❌ system/core-banking/[id]/page.tsx
**Status**: Using domain-specific translations (OK for specialized page)
```typescript
header: translate("coreBanking.connectionDetail.endpoints.columns.name"),
header: translate("coreBanking.connectionDetail.endpoints.columns.method"),
header: translate("coreBanking.connectionDetail.endpoints.columns.path"),
header: translate("coreBanking.connectionDetail.endpoints.columns.status"),
header: translate("coreBanking.connectionDetail.endpoints.columns.actions"),
```
**Fix Needed**: None - specialized technical page

### 6. ❌ system/core-banking/page.tsx
**Status**: Using domain-specific translations
```typescript
header: translate("coreBanking.connections.columns.name"),
header: translate("coreBanking.connections.columns.username"),
header: translate("coreBanking.connections.columns.baseUrl"),
header: translate("coreBanking.connections.columns.status"),
header: translate("coreBanking.connections.columns.lastTest"),
header: COMMON_TABLE_HEADERS.created, // ✅ Mixed
header: translate("coreBanking.connections.columns.actions"),
```
**Fix Needed**: Standardize common columns (name, status, created, actions)

### 7. ❌ mobile-users/page.tsx
**Status**: Using domain-specific translations
```typescript
header: translate("mobileUsers.columns.context"),
header: translate("mobileUsers.columns.username"),
header: translate("mobileUsers.columns.phone"),
header: translate("mobileUsers.columns.status"),
header: COMMON_TABLE_HEADERS.created, // ✅ Mixed
```
**Fix Needed**: Standardize common columns

### 8. ✅ system/databases/[id]/tables/[schema]/[name]/page.tsx
**Status**: Dynamic columns from database
```typescript
header: col.name, // Dynamic column names
```
**Fix Needed**: None - this is correct for database viewer

---

## Summary

### ✅ Already Using COMMON_TABLE_HEADERS (15 pages)
1. mobile-banking/registration-requests
2. mobile-banking/transactions
3. mobile-banking/checkbook-requests
4. mobile-banking/accounts
5. mobile-banking/accounts/[accountNumber]/transactions
6. mobile-banking/billers
7. services
8. admin-users
9. system/forms
10. system/third-party
11. system/login-attempts
12. system/databases/[id]
13. system/migrations
14. system/workflows
15. system/backups

### ❌ NOT Using COMMON_TABLE_HEADERS (7 pages)
1. wallet/tiers - **NEEDS FIX** (hardcoded strings)
2. mobile-banking/account-categories - **OK** (domain-specific)
3. system/databases - **PARTIAL** (mix of both)
4. system/admin-users - **PARTIAL** (mix of both)
5. system/core-banking - **PARTIAL** (mix of both)
6. system/core-banking/[id] - **OK** (domain-specific)
7. mobile-users - **PARTIAL** (mix of both)

### ✅ Special Case (1 page)
1. system/databases/[id]/tables/[schema]/[name] - Dynamic columns (correct)

---

## Action Plan

### Priority 1: Fix Hardcoded Strings ⚠️
- **wallet/tiers** - Replace ALL hardcoded strings with COMMON_TABLE_HEADERS

### Priority 2: Standardize Common Columns 🔧
For pages with mixed usage, standardize common columns:
- name → COMMON_TABLE_HEADERS.name
- email → COMMON_TABLE_HEADERS.email
- status → COMMON_TABLE_HEADERS.status
- created → COMMON_TABLE_HEADERS.created
- actions → COMMON_TABLE_HEADERS.actions
- username → COMMON_TABLE_HEADERS.username
- phone → COMMON_TABLE_HEADERS.phone

Keep domain-specific columns as translate() calls.

### Priority 3: Document Domain-Specific ✅
- Account categories - Keep as-is
- Core banking endpoints - Keep as-is

---

## Pages to Update

1. **wallet/tiers** - Complete conversion needed
2. **system/databases** - Standardize: status, actions
3. **system/admin-users** - Standardize: email, name, status
4. **system/core-banking** - Standardize: name, status, created, actions
5. **mobile-users** - Standardize: username, phone, status, created

Total: 5 pages need updates
