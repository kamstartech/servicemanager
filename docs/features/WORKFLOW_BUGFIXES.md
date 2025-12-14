# Workflow System - Bug Fixes

## Issue
Error: `Cannot query field "screen" on type "AppScreenPage"`

## Root Cause
The `AppScreenPage` GraphQL type didn't have a `screen` field defined, and there was no field resolver to fetch the related screen data.

## Fixes Applied

### 1. GraphQL Schema (`lib/graphql/schema/typeDefs.ts`)
**Added** `screen` field to `AppScreenPage` type:
```graphql
type AppScreenPage {
  id: ID!
  name: String!
  icon: String!
  order: Int!
  isActive: Boolean!
  isTesting: Boolean!
  screenId: String!
  screen: AppScreen!      # ← Added this field
  createdAt: String!
  updatedAt: String!
}
```

### 2. AppScreen Resolver (`lib/graphql/schema/resolvers/appScreen.ts`)
**Added** field resolver for `AppScreenPage.screen`:
```typescript
AppScreenPage: {
  screen: async (parent: any) => {
    if (parent.screen) return parent.screen;

    const screen = await prisma.appScreen.findUnique({
      where: { id: parent.screenId },
    });

    if (!screen) throw new Error("Screen not found");

    return {
      ...screen,
      createdAt: screen.createdAt.toISOString(),
      updatedAt: screen.updatedAt.toISOString(),
    };
  },
}
```

### 3. Resolver Registration (`lib/graphql/schema/resolvers/index.ts`)
**Registered** `AppScreenPage` resolver:
```typescript
AppScreenPage: {
  ...appScreenResolvers.AppScreenPage,
}
```

### 4. Workflow Resolver (`lib/graphql/schema/resolvers/workflow.ts`)
**Updated** to format nested dates for `page.screen`:
```typescript
screenPages: workflow.screenPages.map((sp) => ({
  ...sp,
  createdAt: sp.createdAt.toISOString(),
  updatedAt: sp.updatedAt.toISOString(),
  page: sp.page ? {
    ...sp.page,
    createdAt: sp.page.createdAt.toISOString(),
    updatedAt: sp.page.updatedAt.toISOString(),
    screen: sp.page.screen ? {
      ...sp.page.screen,
      createdAt: sp.page.screen.createdAt.toISOString(),
      updatedAt: sp.page.screen.updatedAt.toISOString(),
    } : undefined,
  } : undefined,
}))
```

### 5. Page Detail Query (`app/system/app-screens/[id]/pages/[pageId]/page.tsx`)
**Added** `screen` field to query:
```graphql
page {
  id
  name
  icon
  isActive
  isTesting
  createdAt
  updatedAt
  screen {        # ← Added this
    id
    name
    context
    icon
  }
}
```

### 6. PageWorkflowsManager Component (`components/workflows/page-workflows-manager.tsx`)
**Added** missing import:
```typescript
import { Label } from "@/components/ui/label";
```

## Files Modified

1. ✅ `lib/graphql/schema/typeDefs.ts` - Added screen field to AppScreenPage
2. ✅ `lib/graphql/schema/resolvers/appScreen.ts` - Added field resolver
3. ✅ `lib/graphql/schema/resolvers/index.ts` - Registered resolver
4. ✅ `lib/graphql/schema/resolvers/workflow.ts` - Fixed date formatting
5. ✅ `app/system/app-screens/[id]/pages/[pageId]/page.tsx` - Updated query
6. ✅ `components/workflows/page-workflows-manager.tsx` - Added Label import

## Testing

After these fixes, the following should work:

1. ✅ Navigate to `/system/workflows`
2. ✅ View workflow details with attached pages showing screen info
3. ✅ Navigate to page detail and see workflows with proper screen data
4. ✅ All GraphQL queries return properly formatted data

## Status
🟢 **RESOLVED** - All workflow pages should now load without errors.
