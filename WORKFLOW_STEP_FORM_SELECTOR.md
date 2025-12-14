# Workflow Step Form Selector Implementation

## Date: December 13, 2024

## Overview

Added form selection capability to workflow steps. When creating/editing a step with type "FORM", users can now select from existing forms in the system instead of manually entering formId in the JSON config.

## Changes Made

### 1. Added Forms Query

```graphql
query Forms($isActive: Boolean) {
  forms(isActive: $isActive, limit: 1000) {
    forms {
      id
      name
      description
      category
      isActive
    }
    total
  }
}
```

### 2. Component State Updates

Added state for form selection:
```typescript
const [selectedFormId, setSelectedFormId] = useState("");
```

### 3. Query Integration

Added forms query to fetch active forms:
```typescript
const { data: formsData, loading: formsLoading } = useQuery(FORMS_QUERY, {
  variables: { isActive: true },
});
```

### 4. Dialog Logic Updates

#### Opening Dialog
- When editing a FORM step, extracts and sets `selectedFormId` from `config.formId`
- When creating new step, resets `selectedFormId`

#### Closing Dialog
- Resets `selectedFormId` to empty string

#### Submitting
- Validates that a form is selected when step type is FORM
- Automatically merges `formId` into config object:
  ```typescript
  if (stepType === "FORM") {
    parsedConfig = { ...parsedConfig, formId: selectedFormId };
  }
  ```

### 5. UI Updates

#### Form Selector Field
- **Conditionally displayed** - Only shows when `stepType === "FORM"`
- **Dropdown select** with searchable list of forms
- **Rich display** - Shows form name, description, and category badge
- **Loading state** - Shows "Loading forms..." while fetching
- **Empty state** - Shows "No forms available" if no active forms
- **Required field** - Marked with asterisk (*)

#### Config Field Updates
- Label changes based on step type:
  - FORM: "Configuration (JSON) (Optional)"
  - Others: "Configuration (JSON) *"
- Placeholder text changes:
  - FORM: `{"submitButtonText": "Continue"}`
  - Others: `{"endpoint": "/api/example"}`
- Help text updates:
  - FORM: "Additional configuration (formId will be added automatically)"
  - Others: "Step-specific configuration in JSON format"

## User Experience

### Creating a FORM Step

1. Click "Add Step" in workflow detail page
2. Select "📝 Form" from Step Type dropdown
3. **Form selector appears automatically**
4. Select form from dropdown (shows name, description, category)
5. Enter step label (e.g., "Customer Information Form")
6. Optionally add JSON config for button text, etc.
7. Click "Create Step"
8. Config is saved with formId automatically included

### Editing a FORM Step

1. Click "Edit" on a FORM step
2. Dialog opens with form pre-selected
3. Can change form selection or other fields
4. Click "Update Step"
5. Config updates with new formId

### Visual Flow

```
Step Type Selector
       ↓
   [FORM Selected]
       ↓
   Form Selector Appears
       ↓
   Select Form (Required)
       ↓
   Config (Optional - formId added automatically)
       ↓
   Create/Update Step
```

## Example Workflow Step Data

### Before (Manual Entry)
```json
{
  "type": "FORM",
  "label": "Enter Details",
  "config": {
    "formId": "clxy123...",  // Had to copy/paste from forms page
    "submitButtonText": "Continue"
  }
}
```

### After (With Selector)
```
Step Type: FORM (selected from dropdown)
Form: Customer Registration Form (selected from dropdown)
Label: Enter Details
Config: {"submitButtonText": "Continue"}

Result: formId automatically merged into config
```

## Benefits

### User Experience
✅ **No manual ID entry** - Select forms visually by name
✅ **Rich context** - See form description and category
✅ **Type safety** - Can't select invalid form
✅ **Validation** - Required field prevents empty submissions
✅ **Auto-completion** - formId added automatically

### Data Integrity
✅ **Valid references** - Can only select existing active forms
✅ **Consistent format** - formId always in correct location
✅ **No typos** - Eliminates manual ID entry errors

### Developer Experience
✅ **Clean API** - formId merged automatically
✅ **Conditional UI** - Only shows for FORM type
✅ **Reusable pattern** - Can extend to other resource types

## Technical Details

### Form Selection Display

Each form option shows:
- **Name** (bold, primary text)
- **Description** (small, muted text) - if available
- **Category** (badge) - if available

### Config Merging Logic

```typescript
// User enters optional config
const userConfig = JSON.parse(stepConfig); // e.g., {"submitButtonText": "Continue"}

// System merges formId
if (stepType === "FORM") {
  parsedConfig = { ...userConfig, formId: selectedFormId };
}

// Result
{
  "submitButtonText": "Continue",
  "formId": "clxy123..."
}
```

### Validation Rules

1. Step type must be selected
2. Step label must not be empty
3. **If step type is FORM**, form must be selected
4. Config JSON must be valid (if provided)
5. Validation JSON must be valid (if provided)

## Future Enhancements

### Possible Improvements

1. **Form Preview** - Show form fields in dialog
2. **Field Mapping** - Map form fields to workflow variables
3. **Form Filtering** - Filter by category or search
4. **Form Creation** - Quick-create form from step dialog
5. **Multiple Forms** - Support multi-step forms in one step
6. **Form Versioning** - Select specific form version
7. **Form Templates** - Pre-configured form patterns

### Other Resource Selectors

Apply same pattern to other step types:
- **API_CALL** → Select from API endpoints
- **VALIDATION** → Select validation rules
- **REDIRECT** → Select screen/page from list

## Testing Checklist

- [x] Form selector only appears for FORM type
- [x] Forms query fetches active forms
- [x] Form dropdown shows name, description, category
- [x] Can create FORM step with selected form
- [x] formId merged into config correctly
- [x] Can edit FORM step and change form
- [x] Selected form pre-populated when editing
- [x] Validation prevents FORM step without form selection
- [x] Config field marked optional for FORM type
- [x] Help text updates based on step type
- [x] Loading state shows while fetching forms
- [x] Empty state shows if no forms available

## Files Modified

1. **app/system/workflows/[id]/page.tsx**
   - Added FORMS_QUERY
   - Added forms data query
   - Added selectedFormId state
   - Updated handleOpenDialog to extract formId
   - Updated handleCloseDialog to reset formId
   - Updated handleSubmit to merge formId and validate
   - Added conditional form selector UI
   - Updated config field label and help text

## Status: ✅ COMPLETE

Form selection fully integrated into workflow step management. Users can now visually select forms when creating/editing FORM type steps.

## Notes

- Forms query fetches up to 1000 active forms (should be enough for most cases)
- If more forms needed, can add pagination or search
- formId is automatically included in config, users don't need to manually add it
- Config JSON is now optional for FORM type (formId is all that's required)
- Pattern can be extended to other step types that reference system resources
