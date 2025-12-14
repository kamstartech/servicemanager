# Billers Integration with Workflow System

**Date**: 2025-12-13  
**Integration**: Billers + Workflow Forms

---

## 🎯 Overview

The billers system has been integrated with your existing **workflow form system**. Instead of creating standalone React components, biller configurations can now be managed through **JSON Schema forms** that work with your workflow engine.

---

## ✅ What Was Created

### 1. API Routes (Still Useful) ✅

Even though we're using forms, the API routes provide programmatic access:

**Created Files:**
- `app/api/billers/configs/route.ts` - GET & POST endpoints
- `app/api/billers/configs/[id]/route.ts` - GET, PATCH, DELETE endpoints

**Endpoints:**
```typescript
GET    /api/billers/configs          // List all configs
POST   /api/billers/configs          // Create config
GET    /api/billers/configs/[id]     // Get single config
PATCH  /api/billers/configs/[id]     // Update config
DELETE /api/billers/configs/[id]     // Soft delete (set isActive=false)
```

### 2. JSON Schema Form ✅

**Created File:**
- `prisma/seed/biller-forms.ts` - Form schema for workflows

**Form Details:**
- **Name**: "Biller Configuration Form"
- **Category**: "billers"
- **Type**: JSON Schema (compatible with react-jsonschema-form)
- **Fields**: All biller config fields with validation

**Form Features:**
- ✅ Dynamic field dependencies (auth type changes fields)
- ✅ Input validation (regex, min/max, required fields)
- ✅ Enum dropdowns for biller types
- ✅ Nested objects (endpoints, authentication, features)
- ✅ Array fields (supported currencies)
- ✅ Password masking for sensitive fields
- ✅ Format validation (URI, email, etc.)

---

## 📊 Form Schema Structure

The form follows **JSON Schema Draft-07** format:

```json
{
  "title": "Biller Configuration",
  "type": "object",
  "required": ["billerType", "billerName", ...],
  "properties": {
    "billerType": {
      "type": "string",
      "enum": ["LWB_POSTPAID", "BWB_POSTPAID", ...],
      "title": "Biller Type"
    },
    "authentication": {
      "type": "object",
      "dependencies": {
        "type": {
          "oneOf": [
            // Basic auth fields
            // API key fields
            // OAuth2 fields
          ]
        }
      }
    },
    // ... more fields
  }
}
```

---

## 🚀 How to Use

### 1. Seed the Form

```bash
# Run the seed script
npx ts-node prisma/seed/biller-forms.ts
```

This creates a `Form` record in your database that can be attached to workflows.

### 2. Attach to Workflow

In your workflow system:

1. Create a new workflow
2. Add a step with type `FORM`
3. Select "Biller Configuration Form" from the forms list
4. The form will render with all biller config fields

### 3. Form Submission

When the form is submitted, you can:

**Option A: Use API Routes**
```typescript
// In your workflow step handler
const response = await fetch("/api/billers/configs", {
  method: "POST",
  body: JSON.stringify(formData),
});
```

**Option B: Direct Prisma**
```typescript
// In your workflow processor
const config = await prisma.billerConfig.create({
  data: formData
});
```

---

## 🎨 Form Rendering

Your existing form renderer should handle this automatically. The schema uses standard JSON Schema features:

**Field Types Supported:**
- `string` - Text inputs
- `boolean` - Switches/checkboxes  
- `integer`/`number` - Number inputs
- `object` - Nested field groups
- `array` - List fields
- `enum` - Dropdowns

**Field Formats:**
- `uri` - URL validation
- `password` - Masked input
- `email` - Email validation
- Pattern validation via `pattern` property

**Conditional Fields:**
- Uses `dependencies` and `oneOf` for dynamic forms
- Example: Auth type changes which auth fields are shown

---

## 📁 File Structure

```
admin/
├── app/
│   └── api/
│       └── billers/
│           └── configs/
│               ├── route.ts              ✅ List & Create
│               └── [id]/
│                   └── route.ts          ✅ Get, Update, Delete
├── prisma/
│   └── seed/
│       ├── billers.ts                    ✅ Seed biller configs
│       └── biller-forms.ts               ✅ Seed form schema
└── lib/
    └── services/
        └── billers/
            ├── base.ts                   ✅ Base service
            ├── factory.ts                ✅ Service factory
            └── transactions.ts            ✅ Transaction service
```

---

## 🔄 Workflow Integration Flow

```
User Creates Workflow
        ↓
Adds "Form" Step
        ↓
Selects "Biller Configuration Form"
        ↓
Form Renders with JSON Schema
        ↓
User Fills Out Form
        ↓
Form Submits Data
        ↓
Workflow Processor Handles Submission
        ↓
    ┌───┴───┐
    ↓       ↓
API Route  Direct Prisma
    ↓       ↓
BillerConfig Created
    ↓
Workflow Continues to Next Step
```

---

## 🧪 Testing the Form

### 1. Seed the Form
```bash
npx ts-node prisma/seed/biller-forms.ts
```

### 2. Query the Form
```graphql
query {
  forms(category: "billers", isActive: true) {
    forms {
      id
      name
      description
      schema
    }
  }
}
```

### 3. Test in Workflow
1. Go to workflow management
2. Create new workflow
3. Add step type: FORM
4. Select: "Biller Configuration Form"
5. Preview the form
6. Fill and submit

---

## 💡 Advantages of This Approach

### ✅ Pros:
1. **Consistency** - Uses your existing form system
2. **Flexibility** - Easy to modify via JSON schema
3. **Workflow Integration** - Can be part of multi-step workflows
4. **Versioning** - Form schema can be versioned
5. **Validation** - Built-in JSON Schema validation
6. **No Custom UI** - Reuses existing form renderer

### 🤔 Considerations:
1. **Complex Fields** - JSON editor fields might need custom widgets
2. **Nested Objects** - Deep nesting can be tricky in forms
3. **UI Customization** - Limited to form renderer capabilities

---

## 🔮 Next Steps

### Phase 2: Create Workflow
1. Create a "Configure Biller" workflow
2. Add the form as step 1
3. Add validation step
4. Add API call step (creates config)
5. Add confirmation step

### Phase 3: Additional Forms
Create more forms for:
- Payment processing
- Account lookup
- Transaction viewing
- Analytics filters

### Phase 4: Form Widgets
If needed, create custom widgets for:
- JSON editor (for endpoints, features)
- Code editor with syntax highlighting
- Secure password field with encryption
- URL validator with connection test

---

## 📝 Example Workflow Config

```json
{
  "name": "Configure Biller Workflow",
  "steps": [
    {
      "type": "FORM",
      "label": "Biller Details",
      "config": {
        "formId": "<biller-config-form-id>",
        "submitLabel": "Next"
      }
    },
    {
      "type": "VALIDATION",
      "label": "Validate Input",
      "config": {
        "rules": ["required", "format"]
      }
    },
    {
      "type": "API_CALL",
      "label": "Create Config",
      "config": {
        "endpoint": "/api/billers/configs",
        "method": "POST"
      }
    },
    {
      "type": "CONFIRMATION",
      "label": "Success",
      "config": {
        "message": "Biller configured successfully"
      }
    }
  ]
}
```

---

## 📚 Related Documentation

- [Billers README](./BILLERS_README.md)
- [Implementation Plan](./BILLERS_ADMIN_IMPLEMENTATION_PLAN.md)
- [Phase 1 Summary](./BILLERS_PHASE1_SUMMARY.md)
- [Quick Start](./BILLERS_QUICK_START.md)

---

**Status**: ✅ Form Integration Complete  
**Next**: Create workflows using the form  
**Maintainer**: Development Team
