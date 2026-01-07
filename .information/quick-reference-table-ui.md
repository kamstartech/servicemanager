# Quick Reference: Consistent Table UI Patterns

## Button Styles

```tsx
import { ACTION_BUTTON_STYLES } from "@/lib/constants/button-styles";

// View/Details (Blue)
<Button className={ACTION_BUTTON_STYLES.view}>
  <Eye className="h-4 w-4 mr-2" />
  {translate("common.actions.view")}
</Button>

// Edit (Blue)
<Button className={ACTION_BUTTON_STYLES.edit}>
  <Edit className="h-4 w-4 mr-2" />
  {translate("common.actions.edit")}
</Button>

// Delete (Red)
<Button className={ACTION_BUTTON_STYLES.delete}>
  <Trash2 className="h-4 w-4 mr-2" />
  {translate("common.actions.delete")}
</Button>

// Suspend/Reset (Amber)
<Button className={ACTION_BUTTON_STYLES.warning}>
  <Ban className="h-4 w-4 mr-2" />
  {translate("common.actions.suspend")}
</Button>

// Activate/Approve (Green)
<Button className={ACTION_BUTTON_STYLES.success}>
  <CheckCircle className="h-4 w-4 mr-2" />
  {translate("common.actions.activate")}
</Button>

// Create/Primary (Orange)
<Button className={ACTION_BUTTON_STYLES.primary}>
  <Plus className="h-4 w-4 mr-2" />
  {translate("common.actions.create")}
</Button>
```

## Translation Keys

### Actions
```typescript
translate("common.actions.view")           // View
translate("common.actions.edit")           // Edit
translate("common.actions.delete")         // Delete
translate("common.actions.details")        // Details
translate("common.actions.create")         // Create
translate("common.actions.refresh")        // Refresh
translate("common.actions.save")           // Save
translate("common.actions.cancel")         // Cancel
translate("common.actions.resetPassword")  // Reset Password
translate("common.actions.suspend")        // Suspend
translate("common.actions.reactivate")     // Reactivate
translate("common.actions.revoke")         // Revoke
translate("common.actions.activate")       // Activate
translate("common.actions.approve")        // Approve
translate("common.actions.reject")         // Reject
```

### Loading States
```typescript
translate("common.state.loading")      // Loading...
translate("common.state.creating")     // Creating...
translate("common.state.saving")       // Saving...
translate("common.actions.resetting")  // Resetting...
```

### Table Columns
```typescript
translate("common.table.columns.name")
translate("common.table.columns.email")
translate("common.table.columns.status")
translate("common.table.columns.created")
translate("common.table.columns.actions")
```

## Page Structure

```tsx
<div className="min-h-screen bg-background px-4 py-6">
  {/* Page Header */}
  <div className="mb-6">
    <h1 className="text-3xl font-bold">Page Title</h1>
    <p className="text-muted-foreground mt-2">
      Page description
    </p>
  </div>

  {/* Stats Cards (Optional) */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Label</p>
            <p className="text-2xl font-bold">Value</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Main Table Card */}
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Table Title</CardTitle>
      <div className="flex gap-2">
        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {translate("common.actions.refresh")}
        </Button>
        
        {/* Primary Action */}
        <Button 
          size="sm"
          className="bg-fdh-orange hover:bg-fdh-orange/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          {translate("common.actions.create")}
        </Button>
      </div>
    </CardHeader>
    
    <CardContent>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {translate("common.state.loading")}
        </p>
      ) : error ? (
        <p className="text-sm text-red-600">
          Error: {error.message}
        </p>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          searchableKeys={["name", "email"]}
          initialSortKey="createdAt"
          pageSize={10}
          searchPlaceholder="Search..."
          showRowNumbers
          rowNumberHeader="#"
        />
      )}
    </CardContent>
  </Card>
</div>
```

## Color Meanings

| Color | Meaning | Actions |
|-------|---------|---------|
| 🔵 Blue | Info/View | View, Details, Edit |
| 🟢 Green | Success/Positive | Activate, Approve, Enable |
| 🟡 Amber | Warning/Caution | Suspend, Restore, Reset |
| 🔴 Red | Danger/Destructive | Delete, Revoke, Reject |
| 🟠 Orange | Primary CTA | Create, Add, Generate |

## Status Badge Patterns

```tsx
// Active/Success (Green)
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  <CheckCircle size={14} />
  {translateStatusOneWord("ACTIVE", translate, "ACTIVE")}
</span>

// Inactive/Error (Red)
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
  <XCircle size={14} />
  {translateStatusOneWord("INACTIVE", translate, "INACTIVE")}
</span>

// Pending/Warning (Yellow)
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
  <Clock size={14} />
  {translateStatusOneWord("PENDING", translate, "PENDING")}
</span>
```

## Date Formatting

```tsx
// Standard format
{new Date(row.createdAt).toLocaleString(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})}
// Output: "Jan 06, 2026, 09:30:15 PM"
```

## Stats Card Colors

| Purpose | Background | Icon Color |
|---------|------------|------------|
| General/Count | Blue-100 | Blue-600 |
| Success/Active | Green-100 | Green-600 |
| Warning/Pending | Yellow-100 | Yellow-600 |
| Error/Failed | Red-100 | Red-600 |
| Storage/Capacity | Purple-100 | Purple-600 |
| Time/Schedule | Orange-100 | Orange-600 |

---

**Files**: 17 updated | **Pages**: 14/20 complete | **Languages**: 2 (EN/PT)
