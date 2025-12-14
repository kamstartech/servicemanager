# Icon Usage Standards

## Overview
This project uses **Lucide React** icons consistently across all components and pages for a unified visual language.

## Library
- **Package**: `lucide-react`
- **Version**: Latest
- **Website**: https://lucide.dev/
- **React Docs**: https://lucide.dev/guide/packages/lucide-react

## Why Lucide?
✅ **Consistent Design** - All icons share the same design language  
✅ **Tree-shakeable** - Only import icons you use  
✅ **Customizable** - Easy to resize and color  
✅ **Accessible** - Built with accessibility in mind  
✅ **Well Maintained** - Active community and regular updates  
✅ **React Native Support** - Can be used across platforms  

## Usage Guidelines

### 1. Import Only What You Need
```typescript
// ✅ Good - Named imports
import { Plus, Edit, Trash2, Mail } from "lucide-react";

// ❌ Bad - Don't import everything
import * as Icons from "lucide-react";
```

### 2. Consistent Sizing
Use standard sizes for consistency:

```typescript
// Small icons (16px) - For buttons, badges, inline text
<Mail className="h-4 w-4" />

// Medium icons (20px) - Default for most UI elements
<Plus className="h-5 w-5" />

// Large icons (24px) - For headers, prominent actions
<Settings className="h-6 w-6" />

// Extra Large (32px+) - For empty states, illustrations
<AlertCircle className="h-8 w-8" />
```

### 3. Color Classes
```typescript
// Use Tailwind color classes
<Mail className="h-5 w-5 text-blue-600" />
<AlertCircle className="h-5 w-5 text-red-500" />
<CheckCircle className="h-5 w-5 text-green-600" />

// Current color (inherits from parent)
<Mail className="h-5 w-5 text-current" />
```

### 4. Animation Support
```typescript
// Spinning loader
<RefreshCw className="h-4 w-4 animate-spin" />

// Conditional animation
<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
```

### 5. Icon with Text
```typescript
// Icon before text
<button className="flex items-center gap-2">
  <Plus className="h-4 w-4" />
  Add User
</button>

// Icon after text
<button className="flex items-center gap-2">
  Download
  <Download className="h-4 w-4" />
</button>
```

## Common Icons by Purpose

### Actions
- **Add/Create**: `Plus`
- **Edit**: `Edit`, `Pencil`
- **Delete**: `Trash2`
- **Save**: `Save`
- **Cancel**: `X`
- **Search**: `Search`
- **Filter**: `Filter`
- **Download**: `Download`
- **Upload**: `Upload`
- **Refresh**: `RefreshCw`
- **Copy**: `Copy`

### Navigation
- **Back**: `ArrowLeft`
- **Forward**: `ArrowRight`
- **Up**: `ChevronUp`, `ArrowUp`
- **Down**: `ChevronDown`, `ArrowDown`
- **Menu**: `Menu`, `MoreVertical`, `MoreHorizontal`
- **Home**: `Home`
- **External Link**: `ExternalLink`

### Status & Feedback
- **Success**: `CheckCircle`, `CheckCircle2`
- **Error**: `XCircle`, `AlertCircle`
- **Warning**: `AlertTriangle`
- **Info**: `Info`
- **Loading**: `Loader2`, `RefreshCw` (with spin)
- **Clock/Time**: `Clock`

### Data & Files
- **File**: `File`, `FileText`
- **Folder**: `Folder`
- **Database**: `Database`
- **Receipt**: `Receipt`
- **Document**: `FileText`

### User & People
- **User**: `User`
- **Users**: `Users`
- **User Plus**: `UserPlus`
- **User Check**: `UserCheck`

### Communication
- **Email**: `Mail`
- **Phone**: `Phone`, `Smartphone`
- **Message**: `MessageSquare`
- **Bell/Notification**: `Bell`

### Settings & System
- **Settings**: `Settings`
- **Lock**: `Lock`, `Unlock`
- **Shield**: `Shield`, `ShieldAlert`
- **Power**: `Power`
- **Activity**: `Activity`

### Financial
- **Wallet**: `Wallet`
- **Credit Card**: `CreditCard`
- **Dollar**: `DollarSign`
- **Tag**: `Tag`
- **Receipt**: `Receipt`

## Project-Specific Mappings

### Sidebar Icons
```typescript
// Mobile Banking
<Smartphone /> - Mobile Banking section
<Wallet /> - Wallet operations

// Checkbook Management
<BookOpen /> - Checkbook section
<Receipt /> - Requests

// Admin & System
<Users /> - User management
<ShieldAlert /> - Security/Login attempts
<Database /> - Core Banking
<Activity /> - Activity logs
<Settings /> - System settings
```

### Status Badges
```typescript
// Active/Success
<CheckCircle className="h-4 w-4 text-green-500" />

// Inactive/Error
<XCircle className="h-4 w-4 text-red-500" />

// Pending/Processing
<Clock className="h-4 w-4 text-yellow-500" />

// In Progress
<Activity className="h-4 w-4 text-blue-500" />
```

### Empty States
```typescript
// No data/records
<FileText className="h-12 w-12 text-gray-400" />

// Error state
<AlertCircle className="h-12 w-12 text-red-500" />

// No results
<Search className="h-12 w-12 text-gray-400" />
```

## DO NOT Use

❌ **Other Icon Libraries**
- Don't use React Icons
- Don't use Font Awesome
- Don't use Heroicons
- Don't use Material Icons

❌ **Inline SVG Icons**
- Don't create custom SVG icons unless absolutely necessary
- Use Lucide icons instead

❌ **Icon Images**
- Don't use PNG/JPG images as icons
- Use Lucide icons for consistency

## Exceptions

The only acceptable non-Lucide icons are:
1. **Brand Logos** - FDH Bank logo, partner logos
2. **Product Images** - Screenshots, photos
3. **Illustrations** - Custom artwork for marketing

## Migration Guide

If you find an inline SVG or other icon:

**Before:**
```typescript
<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>
```

**After:**
```typescript
import { AlertCircle } from "lucide-react";

<AlertCircle className="h-6 w-6" />
```

## Finding the Right Icon

1. **Browse**: Visit https://lucide.dev/icons
2. **Search**: Use the search bar with keywords
3. **Similar**: Check "Similar icons" suggestions
4. **Aliases**: Many icons have alternate names

## Examples in Project

### Admin Users Page
```typescript
import { Plus, Mail, Calendar, CheckCircle, XCircle } from "lucide-react";

// Add button
<Plus className="h-5 w-5" />

// Email display
<Mail className="h-4 w-4" />

// Date display
<Calendar className="h-4 w-4" />

// Status badges
<CheckCircle className="h-4 w-4 text-green-500" />
<XCircle className="h-4 w-4 text-red-500" />
```

### Transaction Page
```typescript
import { RefreshCw, Download, AlertCircle, FileText } from "lucide-react";

// Refresh button
<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />

// Download button
<Download className="h-4 w-4" />

// Error state
<AlertCircle className="h-8 w-8 text-red-500" />

// Empty state
<FileText className="h-8 w-8 text-blue-500" />
```

## Best Practices

1. ✅ **Import at top** - Keep all icon imports together
2. ✅ **Consistent sizing** - Use standard sizes (h-4, h-5, h-6, h-8)
3. ✅ **Semantic naming** - Use icons that match their meaning
4. ✅ **Accessibility** - Add aria-label for icon-only buttons
5. ✅ **Performance** - Only import icons you use

## Resources

- **Icon Browser**: https://lucide.dev/icons
- **React Docs**: https://lucide.dev/guide/packages/lucide-react
- **GitHub**: https://github.com/lucide-icons/lucide
- **NPM**: https://www.npmjs.com/package/lucide-react

## Questions?

When choosing an icon:
1. Search Lucide first
2. Check similar projects for conventions
3. Be consistent with existing usage
4. When in doubt, ask the team
