#!/bin/bash

# Batch update script for button styles
# This script updates hardcoded button class names to use ACTION_BUTTON_STYLES

FILES=(
  "/home/fdh/servicemanager/app/(dashboard)/system/workflows/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/system/forms/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/system/migrations/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/system/core-banking/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/system/core-banking/[id]/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/system/databases/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/system/app-screens/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/system/app-screens/[id]/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/mobile-banking/checkbook-requests/page.tsx"
  "/home/fdh/servicemanager/app/(dashboard)/mobile-banking/transactions/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Add import if not present
    if ! grep -q "ACTION_BUTTON_STYLES" "$file"; then
      # Find the line with translateStatusOneWord import and add after it
      sed -i '/import.*translateStatusOneWord/a import { ACTION_BUTTON_STYLES } from "@/lib/constants/button-styles";' "$file"
    fi
    
    # Replace blue button classes
    sed -i 's/className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"/className={ACTION_BUTTON_STYLES.view}/g' "$file"
    
    # Replace red button classes  
    sed -i 's/className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"/className={ACTION_BUTTON_STYLES.delete}/g' "$file"
    
    # Replace amber button classes
    sed -i 's/className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"/className={ACTION_BUTTON_STYLES.warning}/g' "$file"
    
    # Replace green button classes
    sed -i 's/className="text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200"/className={ACTION_BUTTON_STYLES.success}/g' "$file"
    
    echo "✓ Updated: $file"
  else
    echo "✗ Not found: $file"
  fi
done

echo ""
echo "Done! Updated ${#FILES[@]} files"
