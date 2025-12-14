# Elixir App Dynamic Forms Structure - Analysis 📋

## Date: December 13, 2024

Comprehensive analysis of the dynamic forms structure in the Elixir backend application.

---

## 🏗️ Architecture Overview

The Elixir app has **TWO separate form systems**:

### **1. Dynamic Forms (Context-Based)**
- Location: `lib/service_manager/schemas/dynamic/forms/`
- Used for: Backend route-driven forms
- Has context support

### **2. Mobile App Forms (Hierarchy-Based)**
- Location: `lib/service_manager_web/controllers/api/`
- Used for: Mobile app UI forms
- Hierarchical structure

---

## 📊 System 1: Dynamic Forms (Context-Based)

### **Database Schema**

#### **MobileFormContext**
```elixir
schema "mobile_form_contexts" do
  field :name, :string
  field :description, :string
  field :color, :string, default: "#3B82F6"
  field :active, :boolean, default: true
  belongs_to :created_by, AdminUsers
  timestamps()
end
```

**Purpose:** Group forms by context (e.g., "Transfers", "KYC", "Beneficiaries")

---

#### **DynamicForm**
```elixir
schema "dynamic_forms" do
  field :name, :string
  field :description, :string
  field :http_method, :string
  field :form, :map              # JSON form structure
  field :validation_schema, :map # JSON Schema validation
  field :required, :boolean
  
  belongs_to :context, MobileFormContext
  many_to_many :routes, DynamicRoute
  
  timestamps()
end
```

**Key Features:**
- Form structure stored as JSON in `:form` field
- JSON Schema validation in `:validation_schema`
- Linked to routes (API endpoints)
- Has HTTP method (GET, POST, PUT, etc.)

**Example Form Field Structure:**
```json
{
  "fields": [
    {
      "name": "account_number",
      "type": "string",
      "label": "Account Number",
      "required": true,
      "order": 0
    }
  ]
}
```

---

### **Related Schemas**

**FormWizard** - Multi-step forms
```elixir
schema "form_wizards" do
  field :name, :string
  field :description, :string
  has_many :steps, FormWizardStep
end
```

**FormWizardStep** - Individual steps in wizard
```elixir
schema "form_wizard_steps" do
  field :step_number, :integer
  field :name, :string
  belongs_to :wizard, FormWizard
  belongs_to :form, DynamicForm
end
```

---

## 📱 System 2: Mobile App Forms (Hierarchy-Based)

### **Hierarchy Structure**

```
Screens
  └── Pages
        └── Forms
              └── Fields
```

This is the **MAIN system** used for mobile apps!

---

### **Database Schemas**

#### **1. MobileAppFormDefSchema** (Top-Level)
```elixir
schema "mobile_app_form_defs" do
  field :form, :string          # Form identifier
  field :screen, :string        # Screen identifier
  field :page, :string          # Page identifier
  field :version, :string       # Version (e.g., "1.0")
  field :submit_to, :string     # Submit endpoint
  field :active, :boolean
  
  timestamps()
end
```

**Purpose:** Form-level metadata (submit URL, versioning)

---

#### **2. MobileAppFormsSchema** (Field-Level)
```elixir
schema "mobile_app_forms" do
  field :form, :string          # "transfer", "beneficiary"
  field :screen, :string        # "main", "confirmation"
  field :page, :string          # "step1", "step2"
  field :version, :string       # "1.0"
  field :field_name, :string    # "account_number"
  field :field_type, :string    # "string", "number", etc.
  field :label, :string         # "Account Number"
  field :is_required, :boolean
  field :field_order, :integer
  field :active, :boolean
  field :submit_to, :string
  
  timestamps()
end
```

**Valid Field Types:**
- `string`, `number`, `integer`
- `boolean`, `date`, `datetime`
- `email`, `password`, `phone`
- `select`, `multiselect`
- `textarea`, `button`

---

#### **3. FormV2Schema** (Modern Hierarchy)
```elixir
schema "mobile_forms_v2" do
  field :name, :string
  field :order, :integer
  field :active, :boolean
  field :submit_to, :string
  field :route_id, :string
  field :app_view, :boolean     # Show in app?
  field :type, :string          # "form", "confirmation", "summary"
  field :value, :string
  field :prompt_question, :string
  field :prompt_answer, :string
  field :next_step_button_text, :string
  field :previous_step_button_text, :string
  
  belongs_to :page, PageSchema
  belongs_to :context, MobileFormContext
  belongs_to :group, FormGroupSchema
  has_many :fields, FormFieldV2Schema
  
  timestamps()
end
```

**Form Types:**
- `form` - Regular input form
- `confirmation` - Confirmation screen
- `summary` - Summary/review screen
- `dialog` - Dialog/modal
- `report` - Report display

---

#### **4. FormFieldV2Schema** (Fields for FormV2)
```elixir
schema "mobile_form_fields_v2" do
  field :field_name, :string
  field :field_type, :string
  field :label, :string
  field :is_required, :boolean
  field :field_order, :integer
  field :active, :boolean
  field :options, :string           # For select/multiselect
  field :data_source, :string       # Dynamic data source
  field :data_source_format, :string
  field :value, :string, virtual: true
  
  belongs_to :form, FormV2Schema
  belongs_to :integration, Integration
  belongs_to :context, MobileFormContext
  
  timestamps()
end
```

---

### **Hierarchy Schemas**

#### **ScreenSchema**
```elixir
schema "screens" do
  field :name, :string
  field :order, :integer
  field :version, :string
  field :active, :boolean
  
  has_many :pages, PageSchema
end
```

#### **PageSchema**
```elixir
schema "pages" do
  field :name, :string
  field :order, :integer
  field :active, :boolean
  
  belongs_to :screen, ScreenSchema
  has_many :forms, FormV2Schema
end
```

#### **FormGroupSchema**
```elixir
schema "form_groups" do
  field :name, :string
  field :description, :string
  field :order, :integer
  
  has_many :forms, FormV2Schema
end
```

---

## 🔄 Mobile Forms API Flow

### **Structure Discovery**

**1. List Screens**
```
GET /api/mobile-forms/v3/screens?version=1.0
```

Returns all screens for a version.

**2. List Pages**
```
GET /api/mobile-forms/v3/pages?screen_id=xxx
```

Returns all pages for a screen.

**3. List Forms**
```
GET /api/mobile-forms/v3/forms?page_id=xxx
```

Returns all forms for a page.

**4. Get Form Fields**
```
GET /api/mobile-forms/v3/forms/:form_id/fields
```

Returns all fields for a form (ordered by `field_order`).

---

### **Legacy Endpoint (Name-Based)**

```
POST /api/mobile-forms/form
{
  "form": "transfer",
  "screen": "main",
  "page": "step1",
  "version": "1.0"
}
```

Returns:
```json
{
  "success": true,
  "form_fields": [
    {
      "field": "uuid-here",
      "label": "Account Number",
      "type": "string",
      "isRequired": true
    }
  ]
}
```

---

## 📋 Key Differences Between Systems

| Feature | Dynamic Forms | Mobile App Forms |
|---------|--------------|------------------|
| **Purpose** | Backend routes | Mobile UI |
| **Storage** | JSON in single field | Relational (fields table) |
| **Structure** | Flat form definition | Hierarchical (Screen→Page→Form→Field) |
| **Context** | Has MobileFormContext | Optional context support |
| **Validation** | JSON Schema | Field-level validation |
| **Routing** | Linked to dynamic routes | Uses submit_to URL |
| **Versioning** | No | Yes (version field) |
| **Wizard Support** | Yes (FormWizard) | No |

---

## 🎯 Which System to Use?

### **Use Dynamic Forms When:**
- ✅ Building backend API forms
- ✅ Need JSON Schema validation
- ✅ Forms linked to routes
- ✅ Multi-step wizards
- ✅ Context-based grouping

### **Use Mobile App Forms When:**
- ✅ Building mobile app UI
- ✅ Need hierarchical structure
- ✅ Screen → Page → Form flow
- ✅ Version management
- ✅ Field-level data sources
- ✅ Integration with external APIs

---

## 🏗️ Recommended Structure for App Screens

Based on the existing mobile forms system, here's how **App Screens should work**:

```
Context (MOBILE_BANKING, WALLET, etc.)
  └── AppScreen (Home, Transfer, Profile)
        └── AppScreenPage (Dashboard, Quick Actions)
              └── Forms (from mobile_forms_v2)
                    └── Fields (from mobile_form_fields_v2)
```

**Key Points:**
1. ✅ AppScreen = Top-level navigation (tabs/drawer)
2. ✅ AppScreenPage = Sub-pages within a screen
3. ✅ Forms are **attached to pages** (already done!)
4. ✅ Fields are **attached to forms** (already done!)

---

## 📊 Comparison with Next.js Implementation

### **What Next.js Has:**
```typescript
type AppScreen {
  id: ID!
  name: String!
  context: MobileUserContext!
  icon: String!
  order: Int!
  isActive: Boolean!
  isTesting: Boolean!
  pages: [AppScreenPage!]!
}

type AppScreenPage {
  id: ID!
  name: String!
  icon: String!
  order: Int!
  isActive: Boolean!
  isTesting: Boolean!
}
```

### **What Elixir Has (Similar):**
```elixir
# ScreenSchema
schema "screens" do
  field :name, :string
  field :order, :integer
  field :version, :string
  field :active, :boolean
  has_many :pages, PageSchema
end

# PageSchema
schema "pages" do
  field :name, :string
  field :order, :integer
  field :active, :boolean
  belongs_to :screen, ScreenSchema
  has_many :forms, FormV2Schema
end
```

---

## 🎨 Mapping Concept

### **Elixir → Next.js Mapping**

**Next.js AppScreen** ≈ **Elixir ScreenSchema**
- Both have: name, order, active
- Difference: Next.js adds context, icon, isTesting

**Next.js AppScreenPage** ≈ **Elixir PageSchema**
- Both have: name, order, active
- Difference: Next.js adds icon, isTesting

**Forms** - Already exist in Elixir!
- `mobile_forms_v2` table
- Belongs to page
- Has fields

---

## 💡 Integration Suggestion

### **Option 1: Reuse Existing Tables**

Update Elixir `screens` and `pages` tables:
```sql
ALTER TABLE screens ADD COLUMN context VARCHAR(50);
ALTER TABLE screens ADD COLUMN icon VARCHAR(50);
ALTER TABLE screens ADD COLUMN is_testing BOOLEAN DEFAULT FALSE;

ALTER TABLE pages ADD COLUMN icon VARCHAR(50);
ALTER TABLE pages ADD COLUMN is_testing BOOLEAN DEFAULT FALSE;
```

Then Next.js can query directly!

---

### **Option 2: Separate Tables (Current Implementation)**

Keep Next.js `AppScreen` and `AppScreenPage` separate.

**Benefits:**
- ✅ Independent management
- ✅ Different permissions
- ✅ Cleaner separation

**Drawbacks:**
- ❌ Duplicate data
- ❌ Need sync mechanism

---

## 📝 Summary

### **Elixir Has:**
1. ✅ **Two form systems** (Dynamic + Mobile)
2. ✅ **Hierarchical structure** (Screen → Page → Form → Field)
3. ✅ **Context support** (MobileFormContext)
4. ✅ **Field types** (string, number, select, etc.)
5. ✅ **Validation** (JSON Schema + field-level)
6. ✅ **Versioning** (version field)
7. ✅ **Dynamic data sources** (integrations)
8. ✅ **Wizard forms** (multi-step)

### **Next.js Should:**
1. ✅ **Build on existing structure** (reuse FormV2Schema)
2. ✅ **Add app-level screens** (navigation layer)
3. ✅ **Support same contexts** (MOBILE_BANKING, WALLET, etc.)
4. ✅ **Enable dynamic forms** (fetch from Elixir)
5. ✅ **Support testing mode** (isTesting flag)

---

## 🚀 Next Steps

### **1. Connect Forms to Pages**

Update Next.js to fetch forms for each page:

```typescript
type AppScreenPage {
  id: ID!
  name: String!
  icon: String!
  order: Int!
  forms: [MobileForm!]!  // ← Add this
}

type MobileForm {
  id: ID!
  name: String!
  type: String!  // "form" | "confirmation" | "summary"
  fields: [MobileFormField!]!
}
```

### **2. Sync with Elixir**

Option A: Query Elixir API directly
Option B: Replicate data to Next.js DB
Option C: Hybrid (metadata in Next.js, fields from Elixir)

---

**Complete analysis! The Elixir app has a mature forms system that Next.js can leverage!** 🎉
