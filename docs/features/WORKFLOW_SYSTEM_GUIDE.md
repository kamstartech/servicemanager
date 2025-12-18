# Workflow System Implementation Guide

## Overview

The Workflow System enables creating reusable, configurable workflows that define mobile app behavior. Workflows can be attached to screen pages and specify forms, API calls, validations, and navigation sequences.

## Architecture

### Database Schema

#### Workflow Table
```prisma
model Workflow {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  config      Json     // Workflow configuration
  isActive    Boolean  @default(true)
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  screenPages AppScreenPageWorkflow[]
}
```

#### AppScreenPageWorkflow Junction Table
```prisma
model AppScreenPageWorkflow {
  id             String   @id @default(cuid())
  pageId         String
  workflowId     String
  order          Int      @default(0)
  isActive       Boolean  @default(true)
  configOverride Json?    // Optional page-specific config
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  page     AppScreenPage @relation(...)
  workflow Workflow      @relation(...)
  
  @@unique([pageId, workflowId])
}
```

### GraphQL Schema

#### Types
```graphql
type Workflow {
  id: ID!
  name: String!
  description: String
  config: JSON!
  isActive: Boolean!
  version: Int!
  createdAt: String!
  updatedAt: String!
  screenPages: [AppScreenPageWorkflow!]!
}

type AppScreenPageWorkflow {
  id: ID!
  pageId: String!
  workflowId: String!
  order: Int!
  isActive: Boolean!
  configOverride: JSON
  page: AppScreenPage!
  workflow: Workflow!
}
```

#### Queries
```graphql
workflows(page: Int, limit: Int, isActive: Boolean): WorkflowsResult!
workflow(id: ID!): Workflow
pageWorkflows(pageId: ID!): [AppScreenPageWorkflow!]!
```

#### Mutations
```graphql
# Workflow Management
createWorkflow(input: CreateWorkflowInput!): Workflow!
updateWorkflow(id: ID!, input: UpdateWorkflowInput!): Workflow!
deleteWorkflow(id: ID!): Boolean!

# Page-Workflow Association
attachWorkflowToPage(input: AttachWorkflowToPageInput!): AppScreenPageWorkflow!
detachWorkflowFromPage(id: ID!): Boolean!
updatePageWorkflow(id: ID!, input: UpdatePageWorkflowInput!): AppScreenPageWorkflow!
reorderPageWorkflows(pageId: ID!, workflowIds: [ID!]!): [AppScreenPageWorkflow!]!
```

## Workflow Configuration Structure

### Basic Structure
```json
{
  "steps": [
    {
      "order": 0,
      "type": "FORM",
      "label": "Enter Amount",
      "config": {
        "formId": "transfer-amount-form"
      }
    },
    {
      "order": 1,
      "type": "VALIDATION",
      "label": "Validate Balance",
      "config": {
        "rules": [
          {
            "field": "amount",
            "operator": "lessThanOrEqual",
            "compareField": "availableBalance"
          }
        ]
      }
    },
    {
      "order": 2,
      "type": "CONFIRMATION",
      "label": "Confirm Transfer",
      "config": {
        "template": "confirm-transfer",
        "showSummary": true
      }
    },
    {
      "order": 3,
      "type": "API_CALL",
      "label": "Process Transfer",
      "config": {
        "endpoint": "/api/transactions/transfer",
        "method": "POST",
        "mapping": {
          "amount": "{{form.amount}}",
          "recipientAccount": "{{form.recipientAccount}}",
          "sourceAccount": "{{user.activeAccount}}"
        }
      }
    },
    {
      "order": 4,
      "type": "DISPLAY",
      "label": "Show Receipt",
      "config": {
        "template": "transaction-receipt",
        "data": "{{response}}"
      }
    }
  ]
}
```

## Mobile Client Contract (GraphQL)

When a workflow execution is started via `startWorkflowExecution`, the backend will hydrate `FORM` steps for mobile clients so the app can render the form without querying `Form` separately.

- **Authoring time (admin UI / database):** `FORM` steps reference a form using `config.formId`.
- **Runtime (mobile GraphQL):** `startWorkflowExecution` returns `WorkflowExecution.workflow.steps[]` with `FORM` step config enriched:
  - `config.schema` contains the form schema JSON (from `Form.schema`)
  - `config.formMeta` contains basic form metadata
  - `config.formId` is stripped for mobile clients

This keeps the workflow authoring model stable while ensuring mobile only receives the data it needs to render the UI.

## Step Types

### 1. FORM
Display a form to collect user input.

**Config:**
```json
{
  "formId": "string"
}
```

**Notes:**

- **Authoring time (admin UI / database):** `formId` is used to reference a `Form`.
- **Runtime (mobile GraphQL):** `startWorkflowExecution` hydrates the step with:
  - `config.schema` (from `Form.schema`) for rendering
  - `config.formMeta` (name/description/version)
  - `config.formId` removed for mobile clients

### 2. API_CALL
Make an API request to backend or external service.

**Config:**
```json
{
  "endpoint": "/api/path",
  "method": "POST|GET|PUT|DELETE",
  "headers": {
    "Custom-Header": "value"
  },
  "mapping": {                  // Map form data to request
    "requestField": "{{form.formField}}"
  },
  "errorHandling": {
    "retry": 3,
    "fallback": "show-error-screen"
  }
}
```

### 3. VALIDATION
Validate data before proceeding.

**Config:**
```json
{
  "rules": [
    {
      "field": "amount",
      "operator": "greaterThan|lessThan|equals|...",
      "value": 0,
      "compareField": "balance",  // Compare with another field
      "errorMessage": "Insufficient balance"
    }
  ]
}
```

### 4. CONFIRMATION
Ask user to confirm before proceeding.

**Config:**
```json
{
  "template": "confirmation-template-id",
  "showSummary": true,
  "summaryFields": ["amount", "recipient"],
  "confirmButton": "Confirm",
  "cancelButton": "Cancel"
}
```

### 5. DISPLAY
Show information to user (success, error, details).

**Config:**
```json
{
  "template": "display-template-id",
  "data": "{{response}}",       // Use response from previous step
  "actions": [
    {
      "label": "Done",
      "action": "close"
    },
    {
      "label": "View History",
      "action": "redirect",
      "target": "/history"
    }
  ]
}
```

### 6. REDIRECT
Navigate to another screen or page.

**Config:**
```json
{
  "target": "screen-name",
  "page": "page-name",          // Optional specific page
  "params": {                   // Optional parameters
    "transactionId": "{{response.id}}"
  }
}
```

## UI Pages

### 1. Workflows List (`/system/workflows`)
- View all workflows
- Filter by active/inactive
- Search by name
- Create new workflow
- Delete workflows

### 2. Create Workflow (`/system/workflows/new`)
- Workflow name & description
- Add/edit/remove steps
- Drag-and-drop step ordering
- JSON config editor for each step
- Step type selector with templates

### 3. Workflow Detail (`/system/workflows/[id]`)
- View workflow configuration
- See attached pages
- Version history
- Edit workflow

### 4. Page Workflows Manager (Component)
Used on screen page detail pages:
- Attach workflows to page
- Reorder attached workflows
- Detach workflows
- View workflow details

## Usage Flow

### Creating a Workflow

1. Navigate to `/system/workflows`
2. Click "New Workflow"
3. Enter name and description
4. Add steps:
   - Select step type
   - Enter label
   - Configure JSON settings
5. Drag to reorder steps
6. Save workflow

### Attaching to Page

1. Navigate to screen detail (`/system/app-screens/[id]`)
2. Click "Manage Workflows" on a page
3. Click "Attach Workflow"
4. Select workflow from dropdown
5. Workflow is now active on that page

### Mobile App Integration

When mobile app requests page configuration:

```graphql
query GetPageConfig($pageId: ID!) {
  pageWorkflows(pageId: $pageId) {
    id
    order
    isActive
    configOverride
    workflow {
      id
      name
      config
      version
    }
  }
}
```

Mobile app receives:
- Ordered list of workflows
- Each workflow's step configuration
- Can execute steps sequentially
- Handle responses and navigation

## Version Management

- Workflows have version numbers
- Version increments when config changes
- Mobile apps can cache workflows by version
- Breaking changes should create new workflow

## Config Override

Pages can override workflow config:

```json
{
  "configOverride": {
    "steps": {
      "0": {
        "config": {
          "formId": "custom-form-for-this-page"
        }
      }
    }
  }
}
```

This allows page-specific customization while reusing workflow logic.

## Best Practices

### 1. Naming
- Use clear, descriptive names: "Money Transfer Workflow"
- Not: "workflow1", "new-wf"

### 2. Reusability
- Create generic workflows when possible
- Use configOverride for page-specific changes
- Don't duplicate similar workflows

### 3. Step Organization
- Keep steps focused (single responsibility)
- Use VALIDATION steps before API calls
- Always show CONFIRMATION for destructive actions
- End with DISPLAY or REDIRECT

### 4. Error Handling
- Add validation steps to prevent errors
- Configure API retry logic
- Provide clear error messages
- Have fallback navigation

### 5. Testing
- Use `isTesting` flag on workflows
- Test with test users before production
- Verify all edge cases

## Example Workflows

### Simple Balance Check
```json
{
  "steps": [
    {
      "type": "API_CALL",
      "label": "Fetch Balance",
      "config": {
        "endpoint": "/api/accounts/balance",
        "method": "GET"
      }
    },
    {
      "type": "DISPLAY",
      "label": "Show Balance",
      "config": {
        "template": "balance-display",
        "data": "{{response}}"
      }
    }
  ]
}
```

### Complete Transfer Workflow
See "Workflow Configuration Structure" section above.

## Migration Guide

When database is available, run:

```bash
npx prisma generate
npx prisma migrate dev --name add_workflows
```

This creates:
- `workflows` table
- `app_screen_page_workflows` junction table
- Updates `app_screen_pages` with workflow relation

## API Examples

### Create Workflow
```graphql
mutation CreateWorkflow {
  createWorkflow(input: {
    name: "Transfer Workflow"
    description: "Complete money transfer flow"
    isActive: true
    config: {
      steps: [...]
    }
  }) {
    id
    name
  }
}
```

### Attach to Page
```graphql
mutation AttachWorkflow {
  attachWorkflowToPage(input: {
    pageId: "page-id"
    workflowId: "workflow-id"
    order: 0
  }) {
    id
  }
}
```

### Query Page Workflows
```graphql
query PageWorkflows {
  pageWorkflows(pageId: "page-id") {
    id
    order
    workflow {
      name
      config
    }
  }
}
```

## Files Created

### Backend
- `prisma/schema.prisma` - Updated with Workflow models
- `lib/graphql/schema/typeDefs.ts` - Workflow types
- `lib/graphql/schema/resolvers/workflow.ts` - Resolvers
- `lib/graphql/schema/resolvers/index.ts` - Updated

### Frontend
- `app/system/workflows/page.tsx` - Workflows list
- `app/system/workflows/new/page.tsx` - Create workflow
- `app/system/workflows/[id]/page.tsx` - Workflow detail
- `app/system/app-screens/[id]/pages/[pageId]/page.tsx` - Page detail with workflows
- `components/workflows/page-workflows-manager.tsx` - Workflow manager component
- `components/admin-sidebar.tsx` - Updated with Workflows link

## Navigation Structure

```
System
├── Workflows
│   ├── List all workflows
│   ├── Create new
│   └── [id] - Detail view
│       └── Edit
└── App Screens
    └── [id] - Screen detail
        └── Pages
            └── [pageId] - Page detail
                └── Workflow Manager
```

## Future Enhancements

1. **Workflow Templates** - Pre-built workflows for common tasks
2. **Visual Builder** - Drag-and-drop workflow designer
3. **Testing Mode** - Sandbox for testing workflows
4. **Analytics** - Track workflow completion rates
5. **A/B Testing** - Compare workflow variants
6. **Conditional Steps** - Branch based on conditions
7. **Parallel Steps** - Execute multiple steps simultaneously
8. **Workflow History** - Audit log of changes

## Troubleshooting

### Workflow not appearing in mobile app
- Check `isActive` on workflow
- Verify workflow is attached to page
- Check page's `isActive` status
- Ensure correct `pageId` in query

### Config changes not reflecting
- Version number should increment
- Mobile app may need to clear cache
- Check if configOverride is active

### Steps executing in wrong order
- Verify `order` field on steps
- Check drag-and-drop saved correctly
- Query `pageWorkflows` to see actual order
