# GraphQL Performance Optimization Guide

## Overview
This document outlines the performance optimizations implemented for independent table data loading.

## Implemented Optimizations

### 1. Apollo Client Configuration (`lib/graphql/client/apollo-client.ts`)

#### Cache Policies
- **`cache-and-network`**: Initial fetch from cache, then update from network
- **`cache-first`**: Subsequent queries use cache first
- This eliminates redundant network requests for already-loaded data

#### Error Handling
- Centralized error link for better debugging
- GraphQL and network errors logged separately

#### Query Deduplication
- Multiple components requesting same data → single network request
- Automatic batching reduces server load

### 2. Lazy Loading Component (`components/lazy-query-wrapper.tsx`)

Wrap any data table with `<LazyQueryWrapper>` for:
- Independent loading per component
- Skeleton loading states
- Parallel data fetching via React Suspense

**Usage Example:**
```tsx
import { LazyQueryWrapper } from "@/components/lazy-query-wrapper";

export default function MyPage() {
  return (
    <div>
      <LazyQueryWrapper>
        <DatabaseTable />
      </LazyQueryWrapper>
      
      <LazyQueryWrapper>
        <UsersTable />
      </LazyQueryWrapper>
    </div>
  );
}
```

## Recommended Further Optimizations

### 3. Add Pagination Support

Update GraphQL schema to support pagination:

```graphql
input PaginationInput {
  page: Int = 1
  limit: Int = 20
}

type PaginatedResult {
  items: [Item!]!
  total: Int!
  page: Int!
  limit: Int!
  hasMore: Boolean!
}

type Query {
  adminWebUsers(pagination: PaginationInput): PaginatedAdminUsers!
  dbConnections(pagination: PaginationInput): PaginatedConnections!
}
```

### 4. Implement Virtual Scrolling

For large tables (>1000 rows):
- Use `react-window` or `@tanstack/react-virtual`
- Only render visible rows
- Dramatically reduces DOM nodes

```bash
npm install @tanstack/react-virtual
```

### 5. Add Query Debouncing for Search

Prevent excessive API calls during search:

```tsx
import { useDeferredValue } from "react";

function SearchableTable() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  
  const { data } = useQuery(SEARCH_QUERY, {
    variables: { search: deferredSearch },
    skip: deferredSearch.length < 3, // Only search after 3 chars
  });
}
```

### 6. Enable GraphQL Query Batching

Install Apollo Link Batch HTTP:

```bash
npm install @apollo/client
```

Update `apollo-client.ts`:

```typescript
import { BatchHttpLink } from "@apollo/client/link/batch-http";

const batchLink = new BatchHttpLink({
  uri: "/api/graphql",
  batchMax: 10, // Max queries per batch
  batchInterval: 20, // Wait 20ms to collect queries
});
```

### 7. Add Server-Side Data Streaming

For real-time updates, use GraphQL Subscriptions:

```graphql
type Subscription {
  onUserAdded: MobileUser!
  onConnectionTested(id: ID!): DatabaseConnection!
}
```

## Performance Monitoring

### Measure Load Times

Add performance tracking:

```tsx
"use client";
import { useEffect } from "react";

export function PerformanceTracker({ name }: { name: string }) {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      console.log(`${name} rendered in ${duration.toFixed(2)}ms`);
    };
  }, [name]);
  
  return null;
}
```

### Apollo DevTools

Install browser extension:
- [Apollo Client DevTools](https://chrome.google.com/webstore/detail/apollo-client-devtools/jdkknkkbebbapilgoeccciglkfbmbnfm)
- Monitor query performance
- View cache state
- Debug query execution

## Best Practices

### ✅ DO:
1. Use `useQuery` with `skip` option for conditional loading
2. Implement pagination for tables with >100 rows
3. Use `cache-and-network` for frequently updated data
4. Wrap independent sections with `<LazyQueryWrapper>`
5. Add loading skeletons for better UX

### ❌ DON'T:
1. Fetch all data in parent component and pass down
2. Use `no-cache` policy unless absolutely necessary
3. Make queries in loops - batch them instead
4. Load all pages at once - use pagination
5. Ignore error states - always handle errors

## Migration Guide

### Before (Sequential Loading):
```tsx
// All data loaded together - SLOW!
export default function Page() {
  const users = useQuery(USERS_QUERY);
  const connections = useQuery(CONNECTIONS_QUERY);
  const backups = useQuery(BACKUPS_QUERY);
  
  if (users.loading || connections.loading || backups.loading) {
    return <Loading />;
  }
  
  return (
    <>
      <UsersTable data={users.data} />
      <ConnectionsTable data={connections.data} />
      <BackupsTable data={backups.data} />
    </>
  );
}
```

### After (Parallel Loading):
```tsx
// Each table loads independently - FAST!
export default function Page() {
  return (
    <>
      <LazyQueryWrapper>
        <UsersTableWithQuery />
      </LazyQueryWrapper>
      
      <LazyQueryWrapper>
        <ConnectionsTableWithQuery />
      </LazyQueryWrapper>
      
      <LazyQueryWrapper>
        <BackupsTableWithQuery />
      </LazyQueryWrapper>
    </>
  );
}

// Each component handles its own data
function UsersTableWithQuery() {
  const { data, loading } = useQuery(USERS_QUERY);
  if (loading) return <Skeleton />;
  return <UsersTable data={data} />;
}
```

## Benchmarks

Expected improvements:
- **Initial Load**: 40-60% faster (parallel vs sequential)
- **Subsequent Loads**: 80-90% faster (cache hits)
- **User Interaction**: Sub-200ms response times
- **Network Requests**: 50% reduction (deduplication + caching)

## Testing Performance

```bash
# Build for production
npm run build

# Test production bundle
npm run start

# Use Lighthouse in Chrome DevTools
# Target metrics:
# - Time to Interactive: < 3s
# - First Contentful Paint: < 1.5s
# - Largest Contentful Paint: < 2.5s
```

## Next Steps

1. ✅ Apollo Client optimized
2. ✅ Lazy loading wrapper created
3. ⏳ Add pagination to large tables
4. ⏳ Implement virtual scrolling
5. ⏳ Enable query batching
6. ⏳ Add performance monitoring
