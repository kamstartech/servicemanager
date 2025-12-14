# Workflow Steps Refactoring Plan

## Current Implementation

### Current Structure
```prisma
model Workflow {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  config      Json     // ❌ Steps stored as JSON
  isActive    Boolean  @default(true)
  version     Int      @default(1)
  createdAt   DateTime
  updatedAt   DateTime
}
```

**Problems:**
- ❌ Can't query individual steps
- ❌ Can't filter/search by step type
- ❌ No referential integrity
- ❌ Difficult to validate step data
- ❌ Can't track step-level changes
- ❌ No proper indexing for step queries

## Proposed Implementation

### New Database Schema

```prisma
model Workflow {
  id          String   @id @default(cuid())
  name        String   @unique @db.Text
  description String?  @db.Text
  isActive    Boolean  @default(true) @map("is_active")
  version     Int      @default(1)
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  steps       WorkflowStep[]
  screenPages AppScreenPageWorkflow[]
  
  @@index([isActive])
  @@map("workflows")
}

model WorkflowStep {
  id         String   @id @default(cuid())
  workflowId String   @map("workflow_id")
  
  // Step details
  type       WorkflowStepType
  label      String   @db.Text
  order      Int      @default(0)
  
  // Step configuration (still JSON for flexibility)
  config     Json
  
  // Validation rules (optional)
  validation Json?
  
  // Status
  isActive   Boolean  @default(true) @map("is_active")
  
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  
  // Relations
  workflow   Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  @@index([workflowId])
  @@index([type])
  @@index([order])
  @@index([isActive])
  @@map("workflow_steps")
}

enum WorkflowStepType {
  FORM
  API_CALL
  VALIDATION
  CONFIRMATION
  DISPLAY
  REDIRECT
}
```

### Benefits of New Structure

✅ **Query individual steps**: `SELECT * FROM workflow_steps WHERE type = 'API_CALL'`
✅ **Better indexing**: Fast queries by type, workflow, order
✅ **Referential integrity**: Foreign keys enforce relationships
✅ **Easier migrations**: Add/remove steps without touching JSON
✅ **Step-level tracking**: Individual created/updated timestamps
✅ **Type safety**: Enum for step types
✅ **Validation**: Database-level constraints
✅ **Analytics**: Easy to count steps by type, analyze usage

## Migration Strategy

### Phase 1: Schema Changes
1. Create new `WorkflowStep` model
2. Add `WorkflowStepType` enum
3. Remove `config` field from `Workflow` (or keep temporarily)
4. Update relations

### Phase 2: Data Migration
1. Read existing workflows with JSON config
2. Parse `config.steps` array
3. Create `WorkflowStep` records for each step
4. Preserve order, type, label, config
5. Link to parent workflow

### Phase 3: Code Updates
1. Update GraphQL schema
2. Update resolvers
3. Update frontend components
4. Update queries/mutations

### Phase 4: Testing & Cleanup
1. Test all workflow operations
2. Verify data integrity
3. Remove old config field
4. Update documentation

## GraphQL Schema Changes

### Types

```graphql
enum WorkflowStepType {
  FORM
  API_CALL
  VALIDATION
  CONFIRMATION
  DISPLAY
  REDIRECT
}

type WorkflowStep {
  id: ID!
  workflowId: String!
  type: WorkflowStepType!
  label: String!
  order: Int!
  config: JSON!
  validation: JSON
  isActive: Boolean!
  createdAt: String!
  updatedAt: String!
  workflow: Workflow!
}

type Workflow {
  id: ID!
  name: String!
  description: String
  isActive: Boolean!
  version: Int!
  createdAt: String!
  updatedAt: String!
  steps: [WorkflowStep!]!        # ← Changed from config
  screenPages: [AppScreenPageWorkflow!]!
}
```

### Queries

```graphql
extend type Query {
  workflows(page: Int, limit: Int, isActive: Boolean): WorkflowsResult!
  workflow(id: ID!): Workflow
  workflowSteps(workflowId: ID!): [WorkflowStep!]!
  workflowStep(id: ID!): WorkflowStep
  pageWorkflows(pageId: ID!): [AppScreenPageWorkflow!]!
}
```

### Mutations

```graphql
extend type Mutation {
  # Workflow management
  createWorkflow(input: CreateWorkflowInput!): Workflow!
  updateWorkflow(id: ID!, input: UpdateWorkflowInput!): Workflow!
  deleteWorkflow(id: ID!): Boolean!
  
  # Step management (NEW)
  createWorkflowStep(input: CreateWorkflowStepInput!): WorkflowStep!
  updateWorkflowStep(id: ID!, input: UpdateWorkflowStepInput!): WorkflowStep!
  deleteWorkflowStep(id: ID!): Boolean!
  reorderWorkflowSteps(workflowId: ID!, stepIds: [ID!]!): [WorkflowStep!]!
  
  # Page-Workflow management
  attachWorkflowToPage(input: AttachWorkflowToPageInput!): AppScreenPageWorkflow!
  detachWorkflowFromPage(id: ID!): Boolean!
  updatePageWorkflow(id: ID!, input: UpdatePageWorkflowInput!): AppScreenPageWorkflow!
  reorderPageWorkflows(pageId: ID!, workflowIds: [ID!]!): [AppScreenPageWorkflow!]!
}
```

### Input Types

```graphql
input CreateWorkflowInput {
  name: String!
  description: String
  isActive: Boolean
}

input UpdateWorkflowInput {
  name: String
  description: String
  isActive: Boolean
}

input CreateWorkflowStepInput {
  workflowId: ID!
  type: WorkflowStepType!
  label: String!
  order: Int
  config: JSON!
  validation: JSON
  isActive: Boolean
}

input UpdateWorkflowStepInput {
  type: WorkflowStepType
  label: String
  order: Int
  config: JSON
  validation: JSON
  isActive: Boolean
}
```

## Frontend Changes

### 1. Create Workflow Page
**Before:**
- Create workflow with steps in single mutation
- Steps stored as JSON array

**After:**
- Create workflow first (no steps)
- Add steps individually via `createWorkflowStep` mutation
- Or: Provide a batch create option

### 2. Edit Workflow Page
**Before:**
- Load workflow with config.steps
- Edit entire JSON structure
- Save entire config

**After:**
- Load workflow with `steps` relation
- Edit individual steps
- CRUD operations on steps independently
- Drag-and-drop reordering updates step order

### 3. Workflow Step Manager Component
**New component needed:**
```tsx
<WorkflowStepManager workflowId={id}>
  - List all steps
  - Add new step
  - Edit step
  - Delete step
  - Reorder steps (drag-drop)
</WorkflowStepManager>
```

## API Examples

### Create Workflow with Steps (Two approaches)

**Approach 1: Separate Mutations**
```graphql
# Step 1: Create workflow
mutation {
  createWorkflow(input: {
    name: "Transfer Workflow"
    description: "Complete transfer flow"
  }) {
    id
  }
}

# Step 2: Add steps
mutation {
  createWorkflowStep(input: {
    workflowId: "workflow-id"
    type: FORM
    label: "Enter Amount"
    order: 0
    config: { formId: "transfer-form" }
  }) {
    id
  }
}
```

**Approach 2: Batch Create (Recommended)**
```graphql
mutation {
  createWorkflowWithSteps(input: {
    workflow: {
      name: "Transfer Workflow"
      description: "Complete transfer flow"
    }
    steps: [
      {
        type: FORM
        label: "Enter Amount"
        order: 0
        config: { formId: "transfer-form" }
      },
      {
        type: API_CALL
        label: "Process Transfer"
        order: 1
        config: { endpoint: "/api/transfer", method: "POST" }
      }
    ]
  }) {
    id
    name
    steps {
      id
      type
      label
    }
  }
}
```

### Query Workflow with Steps
```graphql
query {
  workflow(id: "xxx") {
    id
    name
    description
    version
    steps {
      id
      type
      label
      order
      config
      isActive
    }
  }
}
```

### Update Step
```graphql
mutation {
  updateWorkflowStep(
    id: "step-id"
    input: {
      label: "Updated Label"
      config: { newField: "value" }
    }
  ) {
    id
    label
    config
  }
}
```

### Reorder Steps
```graphql
mutation {
  reorderWorkflowSteps(
    workflowId: "workflow-id"
    stepIds: ["step-3", "step-1", "step-2"]
  ) {
    id
    order
  }
}
```

## Version Management

### Current Approach
- Version increments when config JSON changes

### New Approach
- Version increments when:
  - Steps are added/removed
  - Step order changes
  - Step config changes
  - Step type changes

### Implementation
```typescript
// Increment version on step mutations
async updateWorkflowStep(id, input) {
  const step = await prisma.workflowStep.findUnique({ where: { id } });
  
  // Update step
  await prisma.workflowStep.update({
    where: { id },
    data: input
  });
  
  // Increment workflow version
  await prisma.workflow.update({
    where: { id: step.workflowId },
    data: { version: { increment: 1 } }
  });
}
```

## Data Migration Script

```typescript
// scripts/migrate-workflow-steps.ts
import { prisma } from '@/lib/db/prisma';

async function migrateWorkflowSteps() {
  const workflows = await prisma.workflow.findMany({
    where: { config: { not: null } }
  });

  for (const workflow of workflows) {
    const config = workflow.config as any;
    const steps = config?.steps || [];

    console.log(`Migrating ${steps.length} steps for workflow: ${workflow.name}`);

    for (const step of steps) {
      await prisma.workflowStep.create({
        data: {
          workflowId: workflow.id,
          type: step.type,
          label: step.label,
          order: step.order || 0,
          config: step.config || {},
          validation: step.validation || null,
          isActive: true,
        },
      });
    }

    console.log(`✓ Migrated workflow: ${workflow.name}`);
  }

  console.log('Migration complete!');
}

migrateWorkflowSteps();
```

## File Changes Required

### Backend

1. **prisma/schema.prisma**
   - Add `WorkflowStep` model
   - Add `WorkflowStepType` enum
   - Update `Workflow` model relations
   - Remove or deprecate `config` field

2. **lib/graphql/schema/typeDefs.ts**
   - Add `WorkflowStep` type
   - Add `WorkflowStepType` enum
   - Update `Workflow` type
   - Add step mutations

3. **lib/graphql/schema/resolvers/workflowStep.ts** (NEW)
   - Create step resolvers
   - CRUD operations
   - Reordering logic
   - Version increment logic

4. **lib/graphql/schema/resolvers/workflow.ts**
   - Update to query steps relation
   - Remove config-based logic
   - Add `steps` field resolver

5. **lib/graphql/schema/resolvers/index.ts**
   - Register `WorkflowStep` resolver

6. **scripts/migrate-workflow-steps.ts** (NEW)
   - Data migration script

### Frontend

1. **app/system/workflows/new/page.tsx**
   - Update to create workflow + steps separately
   - Or use batch create mutation

2. **app/system/workflows/[id]/edit/page.tsx** (NEW)
   - Edit workflow metadata
   - Manage steps via WorkflowStepManager

3. **components/workflows/workflow-step-manager.tsx** (NEW)
   - List steps
   - Add/edit/delete steps
   - Drag-and-drop reordering

4. **components/workflows/workflow-step-form.tsx** (NEW)
   - Form for creating/editing individual steps
   - Step type selector
   - Config editor

### Documentation

1. **WORKFLOW_STEPS_MIGRATION.md** (NEW)
   - Migration guide
   - Before/after comparison
   - Breaking changes

2. **WORKFLOW_SYSTEM_GUIDE.md**
   - Update with new API
   - New examples
   - Step management section

3. **WORKFLOW_QUICK_REFERENCE.md**
   - Update queries/mutations
   - New step operations

## Breaking Changes

### API Changes
- ❌ `workflow.config` field removed
- ✅ `workflow.steps` field added
- ❌ Cannot update entire workflow config in one mutation
- ✅ Must use step mutations for modifications

### Frontend Changes
- Workflow creation flow changes
- Step management becomes separate operations
- Drag-and-drop updates database directly

### Mobile App Changes
- Query structure changes
- Must adapt to new `steps` array format
- Version checking still works

## Rollout Plan

### Phase 1: Development (Week 1)
- [ ] Create schema changes
- [ ] Write migration script
- [ ] Create step resolvers
- [ ] Update workflow resolver

### Phase 2: Frontend (Week 1-2)
- [ ] Create step manager component
- [ ] Update create workflow page
- [ ] Create edit workflow page
- [ ] Update detail page

### Phase 3: Testing (Week 2)
- [ ] Test data migration
- [ ] Test all CRUD operations
- [ ] Test drag-and-drop
- [ ] Test version incrementing
- [ ] Test mobile queries

### Phase 4: Deployment (Week 3)
- [ ] Backup production data
- [ ] Run migration script
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor for issues

## Advantages Summary

| Aspect | Before (JSON) | After (Table) |
|--------|---------------|---------------|
| **Query Steps** | Parse JSON | `SELECT * FROM workflow_steps` |
| **Filter by Type** | Impossible | `WHERE type = 'API_CALL'` |
| **Indexing** | No | Yes (type, order, workflow) |
| **Step Tracking** | No timestamps | Individual created/updated |
| **Validation** | App-level only | Database + App |
| **Analytics** | Difficult | Easy (COUNT, GROUP BY) |
| **Version Control** | Entire config | Step-level changes |
| **Performance** | Parse JSON | Direct queries |
| **Flexibility** | High | High (config still JSON) |
| **Type Safety** | Low | High (enum types) |

## Recommendations

### Immediate Actions
1. ✅ Review and approve this plan
2. ✅ Create feature branch: `feature/workflow-steps-table`
3. ✅ Start with schema changes
4. ✅ Write migration script

### Best Practices
- Keep `config` field as JSON for step-specific data
- Use enum for step types (type safety)
- Cascade delete steps when workflow deleted
- Index on workflowId, type, order for performance
- Increment version on any step change
- Batch operations where possible (reduce DB calls)

### Future Enhancements
- Step templates (reusable step configs)
- Step versioning (track individual step changes)
- Step conditions (conditional execution)
- Step dependencies (step A requires step B)
- Step analytics (track execution, failures)

## Questions to Consider

1. **Should we keep config field temporarily?**
   - Yes → Safer migration, fallback option
   - No → Clean break, forces migration

2. **Batch create or individual mutations?**
   - Batch → Better UX, fewer DB calls
   - Individual → More flexible, easier to implement

3. **How to handle existing workflows?**
   - Migration script (one-time)
   - Lazy migration (on-access)
   - Dual support (read old, write new)

4. **Version increment strategy?**
   - On any step change → More versions
   - On step add/remove only → Fewer versions
   - Manual version bump → User control

## Conclusion

Moving workflow steps to a dedicated table provides:
- ✅ Better data integrity
- ✅ Improved query performance
- ✅ Easier maintenance
- ✅ Better analytics
- ✅ More flexibility for future features

**Recommendation**: Proceed with this refactoring. The benefits far outweigh the migration effort.
