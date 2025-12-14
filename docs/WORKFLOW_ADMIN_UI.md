# Workflow Admin UI - Execution Configuration

## Overview
Extended the workflow step dialog to include execution configuration fields, enabling admins to configure backend triggers, timing, and retry behavior directly from the UI.

## ✅ What Was Added

### 1. New State Variables
Added to workflow detail page (`app/(dashboard)/system/workflows/[id]/page.tsx`):

```typescript
// Execution configuration state
const [executionMode, setExecutionMode] = useState("CLIENT_ONLY");
const [triggerTiming, setTriggerTiming] = useState("");
const [triggerEndpoint, setTriggerEndpoint] = useState("");
const [triggerMethod, setTriggerMethod] = useState("POST");
const [timeoutMs, setTimeoutMs] = useState("30000");
const [maxRetries, setMaxRetries] = useState("0");
```

### 2. UI Components Added to Step Dialog

#### Execution Mode Selector
- **CLIENT_ONLY** - No backend trigger
- **SERVER_SYNC** - Wait for backend response
- **SERVER_ASYNC** - Fire and forget
- **SERVER_VALIDATION** - Validate before proceeding

#### Conditional Trigger Configuration
Shows only when execution mode is not CLIENT_ONLY:

1. **Trigger Timing Selector**
   - BEFORE_STEP - Execute before showing step
   - AFTER_STEP - Execute after user completes step
   - BOTH - Execute before AND after

2. **Trigger Endpoint** (required)
   - Text input for API endpoint path
   - Placeholder: `/api/accounts/validate`

3. **HTTP Method Selector**
   - GET, POST, PUT, PATCH, DELETE
   - Default: POST

4. **Timeout Configuration**
   - Number input in milliseconds
   - Default: 30000 (30 seconds)

5. **Max Retries**
   - Number input (0-10)
   - Default: 0 (no retries)

### 3. Smart Defaults (useEffect Hook)

Automatically sets appropriate execution mode based on step type:

| Step Type | Default Execution Mode | Default Trigger Timing |
|-----------|------------------------|------------------------|
| API_CALL | SERVER_SYNC | AFTER_STEP |
| VALIDATION | SERVER_VALIDATION | BEFORE_STEP |
| FORM | CLIENT_ONLY | - |
| CONFIRMATION | CLIENT_ONLY | - |
| DISPLAY | CLIENT_ONLY | - |
| REDIRECT | CLIENT_ONLY | - |

### 4. Enhanced Step List Display

Added visual indicators in the step table to show execution configuration:

```
Transfer Details
  🔄 Sync • After

Validate Account
  ✅ Validation • Before

Submit Payment
  🚀 Async • After
```

### 5. Validation

Added validation to ensure:
- Trigger timing is selected when execution mode is not CLIENT_ONLY
- Trigger endpoint is provided when execution mode is not CLIENT_ONLY
- All required fields are filled before submission

### 6. GraphQL Integration

Updated queries to fetch execution fields:
```graphql
steps {
  id
  type
  label
  order
  config
  validation
  isActive
  executionMode
  triggerTiming
  triggerEndpoint
  triggerConfig
  timeoutMs
  retryConfig
  createdAt
  updatedAt
}
```

Updated mutations to include execution configuration in create/update operations.

## 🎨 UI/UX Improvements

### 1. Organized Layout
- Execution configuration in a separate bordered section
- Clear visual hierarchy with section header
- Helpful description text at the top

### 2. Contextual Help
- Info text explaining each execution mode
- Placeholder text showing example values
- Helper text below each field

### 3. Conditional Display
- Trigger configuration fields only show when relevant
- Reduces cognitive load for simple client-only steps

### 4. Visual Feedback
- Step list shows execution mode icons (🔄 🚀 ✅)
- Timing information displayed as subtext
- Clear indication of which steps have backend interaction

## 📝 Usage Example

### Creating a Validation Step

1. **Add New Step**
2. **Select Step Type**: VALIDATION
3. **Smart defaults applied**:
   - Execution Mode: SERVER_VALIDATION
   - Trigger Timing: BEFORE_STEP
4. **Fill in**:
   - Label: "Validate Recipient Account"
   - Trigger Endpoint: `/api/accounts/validate`
   - Timeout: 5000ms
5. **Save**

Result: Step will validate with backend before displaying to user.

### Creating an API Call Step

1. **Add New Step**
2. **Select Step Type**: API_CALL
3. **Smart defaults applied**:
   - Execution Mode: SERVER_SYNC
   - Trigger Timing: AFTER_STEP
4. **Fill in**:
   - Label: "Submit Transfer"
   - Trigger Endpoint: `/api/transactions/transfer`
   - HTTP Method: POST
   - Timeout: 30000ms
   - Max Retries: 3
5. **Save**

Result: Step will submit data to API after user completes the step, with retry on failure.

## 🔍 Implementation Details

### Data Flow

```
User fills form → handleSubmit() called
  ↓
Validate all fields including execution config
  ↓
Build triggerConfig object: { method: "POST" }
  ↓
Build retryConfig object: { maxRetries: 3, initialDelayMs: 1000 }
  ↓
Send mutation with all fields
  ↓
Backend saves to database
  ↓
Refetch workflow data
  ↓
Display updated step list with execution indicators
```

### State Management

#### On Dialog Open (Edit Mode)
```typescript
// Populate all fields from existing step
setExecutionMode(step.executionMode || "CLIENT_ONLY");
setTriggerTiming(step.triggerTiming || "");
setTriggerEndpoint(step.triggerEndpoint || "");
setTriggerMethod(step.triggerConfig?.method || "POST");
setTimeoutMs(step.timeoutMs?.toString() || "30000");
setMaxRetries(step.retryConfig?.maxRetries?.toString() || "0");
```

#### On Dialog Open (Create Mode)
```typescript
// Reset to defaults
setExecutionMode("CLIENT_ONLY");
setTriggerTiming("");
setTriggerEndpoint("");
setTriggerMethod("POST");
setTimeoutMs("30000");
setMaxRetries("0");

// Smart defaults will be applied by useEffect when stepType changes
```

### Mutation Variables

```typescript
{
  input: {
    workflowId,
    type: stepType,
    label: stepLabel,
    order: steps.length,
    config: parsedConfig,
    validation: parsedValidation,
    isActive: true,
    
    // Execution configuration
    executionMode,
    triggerTiming: triggerTiming || null,
    triggerEndpoint: triggerEndpoint || null,
    triggerConfig: {
      method: triggerMethod
    },
    timeoutMs: parseInt(timeoutMs),
    retryConfig: maxRetries !== "0" ? {
      maxRetries: parseInt(maxRetries),
      initialDelayMs: 1000
    } : null
  }
}
```

## 🎯 Best Practices

### 1. Client-Only Steps
Use for:
- Forms (data collection)
- Confirmations (user approval)
- Display (showing information)
- Redirects (navigation)

### 2. Server Sync Steps
Use for:
- Final API submissions
- Critical operations that must complete
- Operations where you need the response immediately

### 3. Server Async Steps
Use for:
- Sending notifications
- Logging/analytics
- Non-critical background tasks

### 4. Server Validation Steps
Use for:
- Account validation
- Data verification before proceeding
- Eligibility checks

## 🔧 Configuration Examples

### Money Transfer Workflow

**Step 1: Form** (CLIENT_ONLY)
- Collect transfer details
- No backend interaction

**Step 2: Validation** (SERVER_VALIDATION, BEFORE_STEP)
- Endpoint: `/api/accounts/validate`
- Validates recipient account exists
- Shows error if invalid

**Step 3: Confirmation** (CLIENT_ONLY)
- User confirms transfer details
- No backend interaction

**Step 4: API Call** (SERVER_SYNC, AFTER_STEP)
- Endpoint: `/api/transactions/transfer`
- Submits transfer to backend
- Waits for transaction ID
- Retries 3 times on failure

**Step 5: Display** (CLIENT_ONLY)
- Shows success message with transaction ID
- No backend interaction

## 🐛 Troubleshooting

### Issue: Trigger fields not showing
**Solution**: Check that execution mode is not CLIENT_ONLY

### Issue: Validation error on save
**Solution**: Ensure trigger timing and endpoint are filled when execution mode requires them

### Issue: Smart defaults not applying
**Solution**: Smart defaults only apply when creating new steps, not when editing

### Issue: Step shows CLIENT_ONLY but has trigger endpoint
**Solution**: Edit the step and change execution mode to appropriate server mode

## 📊 Testing Checklist

- [ ] Create step with CLIENT_ONLY mode
- [ ] Create step with SERVER_SYNC mode
- [ ] Create step with SERVER_ASYNC mode
- [ ] Create step with SERVER_VALIDATION mode
- [ ] Edit existing step to add execution config
- [ ] Verify smart defaults for each step type
- [ ] Test validation when fields are missing
- [ ] Verify execution indicators appear in step list
- [ ] Test form step with form selector
- [ ] Save and reload page to verify persistence

## 🎉 Summary

The admin UI now provides a complete interface for configuring workflow execution behavior:

- ✅ Visual execution mode selection
- ✅ Conditional trigger configuration
- ✅ Smart defaults based on step type
- ✅ Clear validation feedback
- ✅ Visual indicators in step list
- ✅ Intuitive workflow for common scenarios

Admins can now fully configure how workflows interact with the backend without touching code!
