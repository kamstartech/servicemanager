# Account Category Filtering System

## Overview

The system uses account categories from T24 to control which accounts are displayed in the mobile application. This allows administrators to hide certain account types (e.g., internal accounts, loan accounts) from mobile users.

## How It Works

### 1. T24 Category Data

T24 provides category information for each account:
- **categoryId**: Numeric ID (e.g., "1001", "6015", "2001")
- **categoryName**: Human-readable name (e.g., "Platinum Current Account", "Savings Account - Premium")

Example T24 response:
```json
{
  "categoryId": "1001",
  "categoryName": "Platinum Current Account",
  "accountStatus": "Active"
}
```

### 2. Database Schema

**fdh_mobile_user_accounts** - Stores user accounts
```sql
category_id TEXT         -- T24 category ID (e.g., "1001")
category_name TEXT       -- T24 category name
account_status TEXT      -- Account status from T24
```

**fdh_account_categories** - Controls mobile visibility
```sql
id SERIAL PRIMARY KEY
category TEXT UNIQUE              -- Category ID from T24 (e.g., "1001")
display_to_mobile BOOLEAN DEFAULT TRUE  -- Show/hide in mobile app
created_at TIMESTAMP
updated_at TIMESTAMP
```

### 3. Enrichment Flow

```
Account Discovery
        ↓
Account Enrichment Service (every 12 hours)
        ↓
Fetch T24 Account Details
        ↓
Extract categoryId & categoryName
        ↓
Update fdh_mobile_user_accounts
        ↓
Category available for filtering
```

### 4. Mobile API Filtering

When mobile app requests accounts, filter by category visibility:

```sql
SELECT * FROM fdh_mobile_user_accounts a
LEFT JOIN fdh_account_categories c ON a.category_id = c.category
WHERE a.mobile_user_id = ?
  AND a.is_active = true
  AND (c.display_to_mobile = true OR c.category IS NULL);
```

If category doesn't exist in fdh_account_categories, it's shown by default (NULL check).

## Admin Interface

### Location
`/mobile-banking/account-categories`

### Features
1. **View All Categories**
   - Lists all categories currently in use
   - Shows category ID and name
   - Displays mobile visibility status

2. **Toggle Visibility**
   - Turn display_to_mobile ON/OFF
   - Affects all accounts with that category
   - Changes apply immediately

3. **Add New Category**
   - Manually add category rules
   - Set initial visibility preference

## Current Categories

Based on enriched accounts:

| Category ID | Category Name | Accounts | Visible |
|-------------|---------------|----------|---------|
| 1001 | Platinum Current Account | 35 | ✅ Yes |
| 6015 | Savings Account - Premium | 1 | ✅ Yes |

## Setup Process

### Step 1: Discover All Categories

Run account enrichment to get all category IDs:
```bash
# Enrichment runs automatically every 12 hours
# Or trigger manually via admin panel
```

### Step 2: Check Unique Categories

```sql
SELECT DISTINCT category_id, category_name, COUNT(*) as account_count
FROM fdh_mobile_user_accounts
WHERE category_id IS NOT NULL
GROUP BY category_id, category_name
ORDER BY account_count DESC;
```

### Step 3: Create Category Rules

For each unique category, add to fdh_account_categories:

```sql
INSERT INTO fdh_account_categories (category, display_to_mobile)
VALUES ('1001', true),  -- Platinum Current Account - SHOW
       ('6015', true),  -- Savings Account - Premium - SHOW
       ('2001', false), -- Loan Account - HIDE
       ('3005', false); -- Internal Account - HIDE
```

### Step 4: Update Mobile API

Modify the accounts query to filter by category:

```typescript
// app/api/mobile/accounts/route.ts
const accounts = await prisma.mobileUserAccount.findMany({
  where: {
    mobileUserId: userId,
    isActive: true,
    OR: [
      // Category explicitly allowed
      {
        categoryId: {
          in: await prisma.accountCategory
            .findMany({ where: { displayToMobile: true } })
            .then(cats => cats.map(c => c.category))
        }
      },
      // Category not in system (default: show)
      {
        categoryId: {
          notIn: await prisma.accountCategory
            .findMany()
            .then(cats => cats.map(c => c.category))
        }
      }
    ]
  }
});
```

Or simpler with LEFT JOIN:

```typescript
const accounts = await prisma.$queryRaw`
  SELECT a.* FROM fdh_mobile_user_accounts a
  LEFT JOIN fdh_account_categories c ON a.category_id = c.category
  WHERE a.mobile_user_id = ${userId}
    AND a.is_active = true
    AND (c.display_to_mobile = true OR c.category IS NULL)
`;
```

## Common Use Cases

### Hide Loan Accounts
```sql
INSERT INTO fdh_account_categories (category, display_to_mobile)
VALUES ('2001', false);
```

### Hide Internal/System Accounts
```sql
INSERT INTO fdh_account_categories (category, display_to_mobile)
VALUES ('9999', false);
```

### Show Only Specific Account Types
```sql
-- Set all to hidden first
UPDATE fdh_account_categories SET display_to_mobile = false;

-- Enable only desired categories
UPDATE fdh_account_categories 
SET display_to_mobile = true 
WHERE category IN ('1001', '6015', '1002');
```

## Testing

### 1. Check Current Categories
```bash
curl http://localhost:3000/mobile-banking/account-categories
```

### 2. Test Mobile API
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/mobile/accounts
```

### 3. Verify Filtering
```sql
-- Count visible accounts
SELECT COUNT(*) FROM fdh_mobile_user_accounts a
LEFT JOIN fdh_account_categories c ON a.category_id = c.category
WHERE c.display_to_mobile = true OR c.category IS NULL;

-- Count hidden accounts
SELECT COUNT(*) FROM fdh_mobile_user_accounts a
JOIN fdh_account_categories c ON a.category_id = c.category
WHERE c.display_to_mobile = false;
```

## Troubleshooting

### Issue: All accounts hidden
**Cause:** All categories set to display_to_mobile = false

**Fix:**
```sql
UPDATE fdh_account_categories SET display_to_mobile = true;
```

### Issue: New account type not filtering
**Cause:** Category doesn't exist in fdh_account_categories

**Solution:** Add the category:
```sql
INSERT INTO fdh_account_categories (category, display_to_mobile)
VALUES ('NEW_CATEGORY_ID', true/false);
```

### Issue: Category ID is NULL
**Cause:** Account not enriched yet

**Solution:** Wait for enrichment cycle or trigger manually

### Issue: Wrong category IDs
**Cause:** Old enrichment used word-based extraction

**Solution:** Re-enrich accounts or manually update:
```sql
-- Update from T24 data
UPDATE fdh_mobile_user_accounts
SET category_id = '1001'
WHERE category_name = 'Platinum Current Account';
```

## API Endpoints

### Get All Categories
```http
GET /mobile-banking/account-categories
```

### Toggle Category Visibility
```http
POST /api/account-categories/:id/toggle
```

### Get Mobile Accounts (Filtered)
```http
GET /api/mobile/accounts
Authorization: Bearer {token}
```

## Future Enhancements

1. **Auto-Discovery**: Automatically add new categories from T24
2. **Bulk Actions**: Toggle multiple categories at once
3. **Category Descriptions**: Add descriptions for each category
4. **Audit Log**: Track who changed category visibility
5. **Per-User Categories**: Allow users to hide specific account types

## Related Documentation

- **Account Enrichment**: [ACCOUNT_ENRICHMENT_SERVICE.md](ACCOUNT_ENRICHMENT_SERVICE.md)
- **T24 Account Details**: [T24_ACCOUNTS_ENDPOINT.md](T24_ACCOUNTS_ENDPOINT.md)
- **Mobile API**: `/docs/guides/MOBILE_API_DOCUMENTATION.md`

---

**Last Updated:** 2025-12-13

**Status:** ✅ Category system operational, filtering implementation needed in mobile API
