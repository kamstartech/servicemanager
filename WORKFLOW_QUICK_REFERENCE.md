# Workflow System - Quick Reference

## Quick Start

1. **Create Workflow**: `/system/workflows/new`
2. **Attach to Page**: Navigate to screen page → "Manage Workflows" → "Attach Workflow"
3. **Mobile queries**: `pageWorkflows(pageId: "xxx")`

## Step Types Cheat Sheet

| Type | Icon | Purpose | Key Config |
|------|------|---------|------------|
| `FORM` | 📝 | Collect user input | `formId`, `fields` |
| `API_CALL` | 🌐 | Backend request | `endpoint`, `method`, `mapping` |
| `VALIDATION` | ✅ | Validate data | `rules`, `operator` |
| `CONFIRMATION` | ⚠️ | User confirmation | `template`, `showSummary` |
| `DISPLAY` | 📄 | Show information | `template`, `data` |
| `REDIRECT` | 🔄 | Navigate | `target`, `page` |

## Common Config Patterns

### API Call with Mapping
```json
{
  "endpoint": "/api/transfer",
  "method": "POST",
  "mapping": {
    "amount": "{{form.amount}}",
    "account": "{{user.activeAccount}}"
  }
}
```

### Validation Rule
```json
{
  "rules": [
    {
      "field": "amount",
      "operator": "lessThanOrEqual",
      "compareField": "balance",
      "errorMessage": "Insufficient balance"
    }
  ]
}
```

## GraphQL Quick Reference

### Get Page Workflows
```graphql
query {
  pageWorkflows(pageId: "xxx") {
    id
    order
    workflow {
      name
      config
      version
    }
  }
}
```

### Create Workflow
```graphql
mutation {
  createWorkflow(input: {
    name: "Transfer"
    config: { steps: [...] }
  }) {
    id
  }
}
```

### Attach Workflow
```graphql
mutation {
  attachWorkflowToPage(input: {
    pageId: "xxx"
    workflowId: "yyy"
  }) {
    id
  }
}
```

## Key Features

✅ **Reusable** - Create once, use on multiple pages  
✅ **Configurable** - JSON-based step configuration  
✅ **Orderable** - Drag-and-drop step ordering  
✅ **Versionable** - Track config changes  
✅ **Overridable** - Page-specific customization  

## File Locations

- **Backend**: `lib/graphql/schema/resolvers/workflow.ts`
- **Frontend**: `app/system/workflows/`
- **Component**: `components/workflows/page-workflows-manager.tsx`
- **Schema**: `prisma/schema.prisma` (Workflow, AppScreenPageWorkflow)

## Navigation Paths

- Workflows List: `/system/workflows`
- Create: `/system/workflows/new`
- Detail: `/system/workflows/[id]`
- Page Workflows: `/system/app-screens/[id]/pages/[pageId]`

## Best Practices

1. ✅ Use descriptive names
2. ✅ Add VALIDATION before API_CALL
3. ✅ Show CONFIRMATION for destructive actions
4. ✅ Test with `isTesting` flag first
5. ✅ Keep steps focused (single responsibility)

## Common Patterns

### Basic Flow
```
FORM → VALIDATION → API_CALL → DISPLAY
```

### Transfer Flow
```
FORM → VALIDATION → CONFIRMATION → API_CALL → DISPLAY
```

### Info Display Flow
```
API_CALL → DISPLAY
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow not showing | Check `isActive` on workflow and page |
| Wrong order | Verify step `order` field, re-save |
| Config not updating | Version should increment |
| Can't attach | Check if already attached |

## Data Model

```
Workflow (1) ──── (many) AppScreenPageWorkflow
                              │
                              │
                              │
AppScreenPage (1) ──────── (many)
```

## Version Control

- Auto-increments on config change
- Mobile apps cache by version
- Breaking changes = new workflow

## Access Control

All workflow operations require:
- Admin authentication
- `/system/*` route access

## Migration Command

```bash
npx prisma migrate dev --name add_workflows
```

## See Also

- Full Guide: `WORKFLOW_SYSTEM_GUIDE.md`
- App Screens: `/system/app-screens`
- Forms System: `/system/forms`
