# Page Workflows (Mobile GraphQL)

## Overview
The mobile app fetches page workflows from the backend GraphQL endpoint.

Important: the backend has **two** GraphQL endpoints:
- `/api/graphql` (admin-only)
- `/api/mobile/graphql` (mobile-only)

The mobile app must use `/api/mobile/graphql` with a `Bearer <token>` header.

## Mobile GraphQL Whitelist
The `/api/mobile/graphql` endpoint uses a restricted schema (`mobileSchema`) that explicitly whitelists allowed root fields.

To support page workflows on mobile, the following fields are enabled on the mobile schema:

### Queries
- `pageWorkflows(pageId: ID!): [AppScreenPageWorkflow!]!`

### Mutations
- `startWorkflowExecution(workflowId: ID!, pageId: ID!, initialContext: JSON): WorkflowExecution!`
- `executeWorkflowStep(executionId: ID!, stepId: ID!, input: JSON, timing: TriggerTiming!): StepExecutionResponse!`
- `completeWorkflowExecution(executionId: ID!): WorkflowCompletionResult!`

## Authorization / Security
- `pageWorkflows` requires an authenticated context (mobile user or admin).
- Workflow execution mutations require an authenticated mobile user.
- Execution ownership is enforced for step execution and completion to prevent cross-user access.

## Implementation Notes
- Mobile whitelist configuration: `lib/graphql/schema/mobile/index.ts`
- `pageWorkflows` resolver: `lib/graphql/schema/resolvers/workflow.ts`
- Workflow execution resolvers: `lib/graphql/schema/resolvers/workflowExecution.ts`
