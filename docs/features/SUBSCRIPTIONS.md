# GraphQL Subscriptions Guide

## Overview

The admin panel now supports GraphQL subscriptions using **graphql-yoga**'s built-in subscription support with Server-Sent Events (SSE).

## Available Subscriptions

### 1. `mobileUserCreated`
Subscribe to newly created mobile users.

```graphql
subscription {
  mobileUserCreated {
    id
    context
    username
    phoneNumber
    isActive
    createdAt
    updatedAt
  }
}
```

### 2. `mobileUserUpdated`
Subscribe to mobile user updates.

```graphql
subscription {
  mobileUserUpdated {
    id
    context
    isActive
    updatedAt
  }
}
```

## How It Works

1. **PubSub System**: Uses graphql-yoga's `createPubSub()` for event publishing
2. **Event Constants**: Defined in `lib/graphql/pubsub.ts`
3. **Auto-Publishing**: Mutations automatically publish events when data changes

## Example Mutations

### Create User (triggers `mobileUserCreated`)
```graphql
mutation {
  createMobileUser(input: {
    context: MOBILE_BANKING
    username: "john_doe"
    phoneNumber: "+265991234567"
    passwordHash: "hashed_password"
  }) {
    id
    username
    phoneNumber
  }
}
```

### Update User (triggers `mobileUserUpdated`)
```graphql
mutation {
  updateMobileUser(input: {
    id: "123"
    isActive: false
  }) {
    id
    isActive
    updatedAt
  }
}
```

## Testing Subscriptions

### Using GraphiQL (Built into graphql-yoga)
1. Navigate to `/api/graphql` in your browser
2. Open a new tab for subscription query
3. Run subscription query
4. In another tab, run mutation
5. Watch subscription tab receive real-time updates

### Using curl (SSE)
```bash
curl -N -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"query":"subscription { mobileUserCreated { id username } }"}' \
  http://localhost:4000/app/graphql
```

## Transport Protocol

**graphql-yoga uses Server-Sent Events (SSE)** by default for subscriptions, which:
- Works over HTTP (no WebSocket needed)
- Supported by all modern browsers
- Auto-reconnects on connection loss
- Simpler than WebSocket for server-to-client streaming

The nginx WebSocket headers are configured but **SSE doesn't require them** - they're there for future extensibility if you switch to WebSocket transport.

## Adding New Subscriptions

1. Add event constant to `lib/graphql/pubsub.ts`:
```typescript
export const EVENTS = {
  MY_EVENT: "MY_EVENT",
} as const;
```

2. Add subscription type to `typeDefs.ts`:
```graphql
type Subscription {
  myEvent: MyType!
}
```

3. Add resolver in `resolvers/subscription.ts`:
```typescript
myEvent: {
  subscribe: () => pubsub.subscribe(EVENTS.MY_EVENT),
}
```

4. Publish from mutation/business logic:
```typescript
pubsub.publish(EVENTS.MY_EVENT, data);
```
