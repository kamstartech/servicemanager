# Fix: Token Length Error - keyPrefix Column Too Short

## ❌ Error Message:
```
The provided value for the column is too long for the column's type. 
Column: (not available)
```

## 🔍 Root Cause:
The `keyPrefix` column in the database schema was defined as `VarChar(8)`, but the code was trying to store JWT token prefixes which are much longer.

```typescript
// Original schema
keyPrefix String @map("key_prefix") @db.VarChar(8)

// Code was trying to store
keyPrefix: token.substring(0, 16) + "..."  // 19 characters!
```

## ✅ Fix Applied:

### 1. Updated Schema
Changed column size from 8 to 50 characters:

```prisma
// prisma/schema.prisma - Line 1202
keyPrefix String @map("key_prefix") @db.VarChar(50) // First 50 chars for display
```

### 2. Updated Code
Now stores 47 characters + "..." = 50 total:

```typescript
// lib/auth/third-party-jwt.ts - Line 89
keyPrefix: token.substring(0, 47) + "...", // First 50 chars (47 + "...")
```

## 📋 Migration Steps:

### When Database is Available:

1. **Start the database:**
   ```bash
   docker-compose up -d db
   ```

2. **Run the migration:**
   ```bash
   cd /home/jimmykamanga/Documents/Play/service_manager/admin
   npx prisma migrate dev --name update_key_prefix_length
   ```

3. **Verify the change:**
   ```bash
   npx prisma db pull
   ```

### The migration will:
- Alter `third_party_api_keys` table
- Change `key_prefix` column from `VARCHAR(8)` to `VARCHAR(50)`
- Preserve existing data (if any)

## 🧪 After Migration:

### Test token generation:
1. Navigate to `/system/third-party`
2. Create a client (if needed)
3. Click "Generate Token"
4. Fill in the form
5. Click "Generate"
6. ✅ Token should generate successfully!

### The token prefix will now display properly:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJjbGllbnRJZC...
```
(First 50 characters shown)

## 🔄 Manual Migration SQL (if needed):

If automatic migration fails, run this SQL directly:

```sql
-- Connect to your database
\c service_manager

-- Update the column type
ALTER TABLE third_party_api_keys 
ALTER COLUMN key_prefix TYPE VARCHAR(50);

-- Verify
\d third_party_api_keys
```

## ✅ Files Modified:

1. `/prisma/schema.prisma` - Changed `VarChar(8)` to `VarChar(50)`
2. `/lib/auth/third-party-jwt.ts` - Changed substring from 16 to 47

## 🎯 Result:

After migration, token generation will work correctly and display a useful prefix in the UI!

---

**Status:** ✅ Code fixed, migration pending database availability
**Next Step:** Run migration when database is up
