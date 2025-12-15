# Checkbook Requests - GraphQL Implementation

## Summary
Checkbook requests have been migrated from REST API to GraphQL, following the project standard. Mobile users can now create and manage checkbook requests through the GraphQL endpoint.

---

## What Was Done

### 1. GraphQL Schema Added (`lib/graphql/schema/typeDefs.ts`)
- Added `CheckbookRequestStatus` enum
- Added `CheckbookRequest` type with full field definitions
- Added queries for mobile users and admins
- Added mutations for creating, updating, cancelling, and deleting requests
- Added filter and pagination support

### 2. Resolver Created (`lib/graphql/schema/resolvers/checkbookRequest.ts`)
- Implemented all query resolvers
- Implemented all mutation resolvers
- Added authentication and authorization checks
- Added account ownership validation
- Automatic timestamp updates based on status changes

### 3. Resolver Integration (`lib/graphql/schema/resolvers/index.ts`)
- Imported checkbook resolver
- Added to Query resolvers
- Added to Mutation resolvers
- Added CheckbookRequest type resolver

---

## Mobile API Endpoints (GraphQL)

### Queries
- `myCheckbookRequests` - Get user's own requests with filtering
- `myCheckbookRequest(id)` - Get specific request (only if owned by user)

### Mutations
- `createCheckbookRequest(input)` - Create new checkbook request
- `cancelMyCheckbookRequest(id)` - Cancel pending request

---

## Admin API Endpoints (GraphQL)

### Queries
- `checkbookRequests(filter)` - Get all requests with filters
- `checkbookRequest(id)` - Get any request by ID
- `checkbookRequestStats` - Get counts by status

### Mutations
- `updateCheckbookRequest(id, input)` - Update request (approve, mark ready, etc.)
- `deleteCheckbookRequest(id)` - Delete request

---

## Example Usage

### Mobile User Creates Request
```graphql
mutation {
  createCheckbookRequest(input: {
    accountNumber: "1234567890"
    collectionPoint: "Main Branch"
    numberOfCheckbooks: 1
    notes: "Urgent"
  }) {
    id
    status
    requestedAt
  }
}
```

### Mobile User Views Their Requests
```graphql
query {
  myCheckbookRequests(status: PENDING) {
    requests {
      id
      status
      collectionPoint
      requestedAt
    }
    total
  }
}
```

### Admin Approves Request
```graphql
mutation {
  updateCheckbookRequest(
    id: "123"
    input: { status: APPROVED }
  ) {
    id
    status
    approvedAt
  }
}
```

---

## Status Workflow
```
PENDING → APPROVED → READY_FOR_COLLECTION → COLLECTED
        ↓
    REJECTED/CANCELLED
```

---

## Key Features

✅ **Authentication**: All endpoints require JWT authentication  
✅ **Authorization**: Users can only access/modify their own requests  
✅ **Validation**: Account ownership is verified before creating requests  
✅ **Automatic Timestamps**: Status changes automatically update corresponding timestamps  
✅ **Audit Trail**: Tracks which admin approved requests via `approvedBy` field  
✅ **Pagination**: All list queries support pagination  
✅ **Filtering**: Admin queries support filtering by status, account, or user  

---

## Files Modified

1. `lib/graphql/schema/typeDefs.ts` - Added checkbook schema
2. `lib/graphql/schema/resolvers/checkbookRequest.ts` - New resolver file
3. `lib/graphql/schema/resolvers/index.ts` - Integrated resolver

---

## Migration from REST

The old REST endpoints at `/api/checkbook-requests` can now be replaced with GraphQL queries/mutations. The GraphQL implementation provides the same functionality with better type safety and flexibility.

---

## Next Steps

1. Update mobile app to use GraphQL checkbook mutations
2. Update admin panel to use GraphQL checkbook queries
3. Consider deprecating REST endpoints once migration is complete
4. Add integration with notification system for status updates

---

## Documentation

Full GraphQL API documentation has been created. See the complete examples and field descriptions in the GraphQL documentation.
