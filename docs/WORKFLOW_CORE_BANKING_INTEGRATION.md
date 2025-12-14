# Core Banking Integration for Workflows

## Overview
The workflow system now integrates with core banking endpoints, allowing admins to select existing API endpoints and map parameters from workflow data automatically.

## ✅ What Was Added

### 1. Core Banking Endpoint Selection
When creating an API_CALL step with server execution mode, admins can now:
- Select from existing core banking endpoints
- Auto-populate trigger endpoint and HTTP method
- See endpoint details (name, method, path)
- Organized by banking connection

### 2. Automatic Parameter Mapping
For selected endpoints with body templates:
- Automatically extracts parameters from the endpoint's body template
- Provides UI to map each parameter to workflow data
- Supports dot notation for nested data (e.g., `step_0.amount`)
- Shows available data keys based on step order

### 3. Smart Auto-Population
When an endpoint is selected:
- **Trigger Endpoint**: Auto-filled with endpoint path
- **HTTP Method**: Auto-set to endpoint's method
- **Configuration**: Stores endpoint ID and parameter mappings

## 🎯 User Experience

### Creating an API_CALL Step

**Step 1: Basic Configuration**
1. Click "Add Step"
2. Select "API_CALL" step type
3. Choose execution mode (e.g., SERVER_SYNC)
4. Select trigger timing (e.g., AFTER_STEP)

**Step 2: Endpoint Selection**
1. "Select Core Banking Endpoint" dropdown appears
2. Endpoints grouped by connection name
3. Each endpoint shows: name, method, path
4. Select endpoint (e.g., "Account Transfer")

**Step 3: Parameter Mapping**
1. System extracts parameters from endpoint body template
2. For each parameter, enter data source:
   - `step_0.amount` - Amount from first step
   - `step_0.recipientAccount` - Account from first step
   - `step_1.validationToken` - Token from validation step

**Step 4: Save**
1. Configuration automatically includes:
   - Endpoint ID
   - Endpoint name
   - Parameter mappings
2. Trigger endpoint pre-filled
3. Step ready to use

## 📝 Data Flow

```
Admin configures step
    ↓
Selects "Money Transfer" endpoint
    ↓
System shows parameters:
  - accountNumber
  - amount
  - recipientAccount
  - reference
    ↓
Admin maps parameters:
  accountNumber → "context.userAccount"
  amount → "step_0.amount"
  recipientAccount → "step_0.recipientAccount"
  reference → "step_0.reference"
    ↓
Configuration stored:
{
  "endpointId": "123",
  "endpointName": "Money Transfer",
  "parameterMapping": {
    "accountNumber": "context.userAccount",
    "amount": "step_0.amount",
    "recipientAccount": "step_0.recipientAccount",
    "reference": "step_0.reference"
  }
}
    ↓
During execution:
  - WorkflowExecutor reads parameter mapping
  - Retrieves values from Redis session context
  - Builds request body from template
  - Calls core banking endpoint with mapped data
```

## 🔧 Technical Implementation

### GraphQL Query Added

```graphql
query CoreBankingEndpoints {
  coreBankingConnections {
    id
    name
    baseUrl
    isActive
    endpoints {
      id
      name
      method
      path
      bodyTemplate
      isActive
    }
  }
}
```

### State Variables Added

```typescript
const [selectedEndpointId, setSelectedEndpointId] = useState("");
const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({});
```

### Configuration Storage

Step config now includes:
```typescript
{
  ...existingConfig,
  endpointId: "endpoint-id",
  endpointName: "Endpoint Name",
  parameterMapping: {
    "param1": "step_0.field1",
    "param2": "step_1.field2"
  }
}
```

### Parameter Extraction Logic

```typescript
// Extract parameters from body template
const template = JSON.parse(endpoint.bodyTemplate);
const extractParams = (obj: any, prefix = ''): void => {
  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'string' && 
        obj[key].startsWith('{{') && 
        obj[key].endsWith('}}')) {
      parameters.push(fullKey);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractParams(obj[key], fullKey);
    }
  });
};
```

## 📊 Example Configuration

### Endpoint Body Template
```json
{
  "accountNumber": "{{accountNumber}}",
  "transaction": {
    "amount": "{{amount}}",
    "recipientAccount": "{{recipientAccount}}",
    "reference": "{{reference}}"
  }
}
```

### Parameter Mapping UI
```
accountNumber          [step_0.senderAccount   ]
transaction.amount     [step_0.amount          ]
transaction.recipient  [step_0.recipientAccount]
transaction.reference  [step_0.reference       ]
```

### Stored Configuration
```json
{
  "endpointId": "transfer-endpoint-123",
  "endpointName": "Account Transfer",
  "parameterMapping": {
    "accountNumber": "step_0.senderAccount",
    "transaction.amount": "step_0.amount",
    "transaction.recipientAccount": "step_0.recipientAccount",
    "transaction.reference": "step_0.reference"
  }
}
```

### Runtime Data Mapping

**Redis Session Context:**
```json
{
  "userId": "user123",
  "context": {
    "userAccount": "1234567890"
  },
  "step_0": {
    "senderAccount": "1234567890",
    "amount": 5000,
    "recipientAccount": "9876543210",
    "reference": "Salary payment"
  }
}
```

**Mapped Request Body:**
```json
{
  "accountNumber": "1234567890",
  "transaction": {
    "amount": 5000,
    "recipientAccount": "9876543210",
    "reference": "Salary payment"
  }
}
```

## 🎨 UI Components

### 1. Endpoint Selector
- Dropdown grouped by connection
- Shows endpoint name, method, path
- Only visible for API_CALL steps with server execution
- Auto-populates trigger endpoint and method

### 2. Parameter Mapping Interface
- Dynamically generates inputs based on template
- One input per parameter
- Placeholder shows example syntax
- Helper text explains available data keys
- Only shown when endpoint is selected

### 3. Visual Indicators
- Step list shows endpoint name if configured
- Example: "Submit Transfer → Money Transfer endpoint"

## ✅ Validation

The system validates:
1. ✓ Endpoint must be selected for API_CALL with server execution
2. ✓ Parameter mappings are optional but recommended
3. ✓ Invalid JSON in body template is caught gracefully

## 🔄 Workflow Execution with Mapped Parameters

### Phase 1: Configuration (Admin)
Admin configures workflow with endpoint and parameter mapping

### Phase 2: Execution (Mobile App)
1. User completes step 0 (form), data stored in Redis as `step_0`
2. User completes step 1 (validation), data stored as `step_1`
3. Mobile app triggers step 2 (API_CALL)

### Phase 3: Backend Processing
1. **WorkflowExecutor** receives execution request
2. Retrieves step configuration including `parameterMapping`
3. Gets accumulated context from Redis:
   ```json
   {
     "context": {...},
     "step_0": {...},
     "step_1": {...}
   }
   ```
4. For each parameter mapping:
   - Split mapping key by dot notation
   - Navigate context object to retrieve value
   - Example: `"step_0.amount"` → context.step_0.amount → 5000
5. Build request body by replacing template variables
6. Call core banking endpoint with mapped data

### Phase 4: Response Handling
1. Store response in Redis as `step_2_result`
2. Return success/failure to mobile app
3. Mobile app proceeds to next step or shows error

## 🛠️ Backend Enhancement Needed

To complete the integration, the **WorkflowExecutor** needs to be enhanced:

```typescript
// In workflow-executor.ts, update makeAPICall method

private async makeAPICall(
  endpoint: string,
  config: any,
  context: ExecutionContext,
  input: any,
  timeoutMs: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  
  // If endpointId and parameterMapping exist, build request from template
  if (config.endpointId && config.parameterMapping) {
    const mappedBody = this.buildRequestFromMapping(
      config.parameterMapping,
      context.variables
    );
    input = mappedBody;
  }

  // ... rest of existing makeAPICall logic
}

private buildRequestFromMapping(
  mapping: Record<string, string>,
  contextData: any
): any {
  const result: any = {};
  
  for (const [paramPath, dataPath] of Object.entries(mapping)) {
    const value = this.getNestedValue(contextData, dataPath);
    this.setNestedValue(result, paramPath, value);
  }
  
  return result;
}

private setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}
```

## 📚 Benefits

### For Admins
- ✅ No manual endpoint URL entry for core banking APIs
- ✅ Consistent with existing endpoint configuration
- ✅ Visual parameter mapping reduces errors
- ✅ Reuse existing endpoint definitions

### For Developers
- ✅ Centralized endpoint management
- ✅ Automatic data mapping reduces code
- ✅ Type-safe endpoint selection
- ✅ Easy to maintain and update

### For End Users
- ✅ Reliable API calls
- ✅ Consistent data flow
- ✅ Better error handling
- ✅ Faster workflows

## 🎉 Summary

The core banking integration enhances the workflow system by:

1. **Simplifying Configuration**: Select endpoints instead of manual URLs
2. **Automating Mapping**: Visual parameter mapping UI
3. **Ensuring Consistency**: Reuse validated endpoint definitions
4. **Reducing Errors**: Type-safe selection and validation
5. **Improving Maintainability**: Central endpoint management

Admins can now create sophisticated workflows that integrate with core banking systems without deep technical knowledge!
