# DataTable Usage Audit - All Pages with Tables

**Date**: 2026-01-06
**Purpose**: Ensure consistency in translations and action buttons across all DataTable implementations

---

## Pages Using DataTable Component

### System Pages
1. `/system/admin-users` - Admin Users management
2. `/system/third-party` - Third-Party API Clients list
3. `/system/login-attempts` - Login Attempts monitoring
4. `/system/backups` - Database Backups
5. `/system/databases` - Database list
6. `/system/databases/[id]` - Database tables
7. `/system/databases/[id]/tables/[schema]/[name]` - Table data viewer
8. `/system/core-banking` - Core Banking configurations
9. `/system/core-banking/[id]` - Core Banking detail
10. `/system/migrations` - Database Migrations
11. `/system/workflows` - Workflows
12. `/system/forms` - Forms

### Admin Users
13. `/admin-users` - Admin Users (duplicate?)

### Mobile Banking
14. `/mobile-banking/registration-requests` - Registration Requests
15. `/mobile-banking/transactions` - Transactions
16. `/mobile-banking/checkbook-requests` - Checkbook Requests
17. `/mobile-banking/accounts` - Accounts
18. `/mobile-banking/accounts/[accountNumber]/transactions` - Account Transactions
19. `/mobile-banking/billers` - Billers
20. `/mobile-banking/account-categories` - Account Categories

### Wallet
21. `/wallet/tiers` - Wallet Tiers

### Mobile Users
22. `/mobile-users` - Mobile Users

### Authenticated
23. `/(authenticated)/services` - Services

---

## Total: 23 pages with DataTable

---

## Next Steps

1. Audit each page for:
   - Translation key consistency
   - Action button styling
   - Loading/error states
   - Stats cards presence
   - Page header format
   - Refresh button implementation

2. Create standardized patterns for:
   - Common action buttons (View, Edit, Delete, etc.)
   - Status badges
   - Date formatting
   - Loading messages
   - Error messages

3. Document current state vs desired state
