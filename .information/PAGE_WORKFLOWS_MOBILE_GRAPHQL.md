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
- `workflowExecution(id: ID!): WorkflowExecution`
- `accountTransactions(accountNumber: String!): T24TransactionConnection!`
- `proxyTransaction(id: ID!): Transaction`
- `proxyTransactionByReference(reference: String!): Transaction`
- `proxyAccountTransactions(accountId: Int!, page: Int, limit: Int): TransactionConnection!`

### Mutations
- `startWorkflowExecution(workflowId: ID!, pageId: ID!, initialContext: JSON): WorkflowExecution!`
- `executeWorkflowStep(executionId: ID!, stepId: ID!, input: JSON, timing: TriggerTiming!): StepExecutionResponse!`
- `completeWorkflowExecution(executionId: ID!): WorkflowCompletionResult!`
- `createTransaction(input: CreateTransactionInput!): CreateTransactionResponse!`
- `createTransfer(input: CreateTransferInput!): CreateTransactionResponse!`
- `retryTransaction(id: ID!): CreateTransactionResponse!`
- `reverseTransaction(id: ID!, reason: String!): CreateTransactionResponse!`

## Authorization / Security
- `pageWorkflows` requires an authenticated context (mobile user or admin).
- Workflow execution mutations require an authenticated mobile user.
- Execution ownership is enforced for step execution and completion to prevent cross-user access.

## Client Step Navigation
- After a successful `executeWorkflowStep(..., timing: AFTER_STEP)` with `shouldProceed = true`, the backend advances `WorkflowExecution.currentStepId` to the next active step.
- Mobile clients should query `workflowExecution(id)` after a successful step execution to retrieve the updated `currentStepId` and the hydrated step config (e.g., variable-resolved `CONFIRMATION` message).

## Implementation Notes
- Mobile whitelist configuration: `lib/graphql/schema/mobile/index.ts`
- `pageWorkflows` resolver: `lib/graphql/schema/resolvers/workflow.ts`
- Workflow execution resolvers: `lib/graphql/schema/resolvers/workflowExecution.ts`
