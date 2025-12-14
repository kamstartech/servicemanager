# Database Migrations Feature

## Overview
The migrations feature allows you to create reusable queries that read data from external databases and write it to your application database. This is useful for importing legacy data, syncing from external systems, or performing regular data transfers.

## Architecture

### Database Schema
- **Table**: `fdh_migrations`
- **Key Fields**:
  - `sourceConnectionId`: References an external database connection
  - `sourceQuery`: SELECT query to fetch data from source
  - `targetTable`: Destination table in your database
  - `targetInsertQuery`: INSERT query template with placeholders
  - `status`: PENDING, RUNNING, COMPLETED, or FAILED

### How It Works
1. **Source Query**: Executes on the external database to fetch rows
2. **Placeholder Replacement**: For each row, replaces `{{column_name}}` in the target query with actual values
3. **Transaction**: All inserts are wrapped in a transaction (rollback on error)
4. **Status Tracking**: Records last run time, success status, rows affected, and error messages

## Usage

### Creating a Migration

1. Navigate to **System → Migrations** (http://localhost:4000/adminpanel/system/migrations)
2. Click **New Migration**
3. Fill in the form:

#### Example: Import Mobile Users

**Name**: `Import Mobile Banking Users`

**Description**: `Import active users from legacy mobile banking system`

**Source Connection**: Select your external database connection

**Source Query**:
```sql
SELECT 
  user_id, 
  username, 
  phone_number, 
  created_at 
FROM legacy_users 
WHERE status = 'ACTIVE' 
  AND created_at > '2024-01-01'
```

**Target Table**: `fdh_mobile_users`

**Target Insert Query**:
```sql
INSERT INTO fdh_mobile_users (
  username, 
  phone_number, 
  context, 
  "isActive", 
  "created_at"
) VALUES (
  {{username}}, 
  {{phone_number}}, 
  'MOBILE_BANKING', 
  true, 
  {{created_at}}
)
ON CONFLICT (username) DO NOTHING
```

### Placeholder Syntax

Use `{{column_name}}` to reference columns from your source query:
- String values are automatically quoted and escaped
- NULL values are converted to SQL NULL
- Numbers are inserted as-is

### Running Migrations

1. From the migrations list, click **Run** next to any migration
2. Confirm the action
3. Status updates in real-time
4. View execution details including rows affected and any error messages

### Migration Status

- **PENDING**: Never run or ready to run again
- **RUNNING**: Currently executing (do not run again)
- **COMPLETED**: Last run was successful
- **FAILED**: Last run encountered an error

## Best Practices

### 1. Test with Small Datasets
Start with a limited source query (e.g., `LIMIT 10`) to verify the migration works correctly.

### 2. Use Conflict Handling
Add `ON CONFLICT` clauses to prevent duplicate key errors:
```sql
INSERT INTO table (col1, col2) VALUES ({{col1}}, {{col2}})
ON CONFLICT (col1) DO NOTHING
```

### 3. Data Type Compatibility
Ensure source columns match target column types. Use CAST in source query if needed:
```sql
SELECT 
  id::text as user_id,
  created_at::timestamp as signup_date
FROM legacy_table
```

### 4. Transaction Safety
All inserts run in a transaction. If any row fails:
- Entire migration rolls back
- Status set to FAILED
- Error message recorded

### 5. Idempotency
Design migrations to be safely re-runnable:
- Use `ON CONFLICT DO NOTHING` or `DO UPDATE`
- Filter already-migrated records in source query
- Use timestamps to track what's been processed

## Security Considerations

- Source database connections are read-only by default
- Migrations execute with the same privileges as your application database
- SQL injection protection: values are properly escaped
- Always validate source data before migration

## Monitoring

Each migration tracks:
- **Last Run Time**: When it was last executed
- **Success Status**: Whether it completed successfully
- **Rows Affected**: Number of records inserted
- **Error Messages**: Full error details if it failed

## GraphQL API

### Queries
```graphql
query {
  migrations {
    id
    name
    status
    lastRunSuccess
    lastRunRowsAffected
  }
}
```

### Mutations
```graphql
mutation {
  runMigration(id: "1") {
    ok
    message
    rowsAffected
  }
}
```

## Troubleshooting

### Connection Timeout
If source database is slow:
- Reduce result set with WHERE/LIMIT
- Index source table columns used in WHERE clause
- Consider breaking into multiple smaller migrations

### Duplicate Key Errors
Add conflict resolution:
```sql
ON CONFLICT (unique_column) DO UPDATE SET 
  column1 = EXCLUDED.column1,
  updated_at = NOW()
```

### Type Mismatch Errors
Cast columns in source query:
```sql
SELECT 
  amount::numeric as amount,
  date::timestamp as created_at
FROM source_table
```

### Migration Stuck in RUNNING
This can happen if the process crashed. Manually update status:
```sql
UPDATE fdh_migrations 
SET status = 'PENDING' 
WHERE id = <migration_id> AND status = 'RUNNING';
```

## Future Enhancements

Potential improvements:
- Scheduled migrations (cron-like execution)
- Batch processing for large datasets
- Data transformation functions
- Migration dependencies/ordering
- Dry-run mode to preview changes
- Migration history/audit log
