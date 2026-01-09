# Workflow Executor Modularization - Implementation Plan

## Progress So Far

### ✅ Completed
1. Created directory structure
2. Extracted shared types (`types/handler-types.ts`)
3. Extracted variable resolver (`utils/variable-resolver.ts`)
4. Extracted response formatter (`utils/response-formatter.ts`)
5. Extracted API client (`utils/api-client.ts`)

### 🔄 Next Steps

#### Remaining Large Tasks

1. **Extract Transaction Handler** (~280 lines)
   - `handlePostTransactionStep` method
   - FDH_BANK and EXTERNAL_BANK logic
   - Fund reservation flow
   
2. **Extract Bill Payment Handler** (~300 lines)
   - `handleBillTransactionStep` method
   - `handleDirectBillerTransaction` method
   - Hold-Execute-Release pattern

3. **Extract Airtime Handler** (~220 lines)
   - `handleAirtimeTransaction` method
   - Airtime-specific validation

4. **Extract Step Handlers** (~200 lines)
   - `handleServerSyncStep`
   - `handleServerAsyncStep`
   - `handleServerValidationStep`

5. **Refactor Main Executor** (~400 lines)
   - Import and use extracted handlers
   - Delegate to handler modules
   - Keep orchestration logic

6. **Update All Imports**
   - Find all files that import WorkflowExecutor
   - Update import paths if needed

7. **Testing**
   - Verify nothing breaks
   - Test each handler independently

## Estimated Impact

### Files to Create (8)
- ✅ `types/handler-types.ts`
- ✅ `utils/variable-resolver.ts`
- ✅ `utils/response-formatter.ts`
- ✅ `utils/api-client.ts`
- ⏳ `handlers/transaction-handler.ts`
- ⏳ `handlers/bill-payment-handler.ts`
- ⏳ `handlers/airtime-handler.ts`
- ⏳ `handlers/step-handlers.ts`

### Files to Modify (2+)
- ⏳ `workflow-executor.ts` (major refactor)
- ⏳ Any files importing WorkflowExecutor

### Risk Assessment

**Risk Level**: Medium-High
- Large refactoring of critical business logic
- Many interdependencies
- Needs thorough testing

**Mitigation**:
- Extract handlers as standalone functions first
- Keep original file as backup
- Test after each extraction
- Gradual migration

## Recommendation

Given the complexity and risk, I recommend:

**Option A: Continue Full Refactor** (2-3 hours)
- Complete all extractions
- Thorough testing needed
- Higher risk but better long-term structure

**Option B: Incremental Approach** (safer)
- Extract one handler at a time
- Test after each extraction
- Keep original file until all tested
- Lower risk, longer timeline

**Option C: Defer Refactor** (safest)
- Current changes are already documented
- File is large but functional
- Refactor when there's more time/testing capacity
- Focus on new features instead

## Your Call

Would you like me to:
1. Continue with full refactor now?
2. Do one handler at a time (which one first)?
3. Defer and focus on documentation/testing instead?

Current state: Utilities extracted, handlers remain in main file.
