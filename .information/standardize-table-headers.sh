#!/bin/bash

# Script to replace translate("common.table.columns.X") with COMMON_TABLE_HEADERS.X

FILES=(
  "app/(dashboard)/mobile-banking/transactions/page.tsx"
  "app/(dashboard)/mobile-banking/checkbook-requests/page.tsx"
  "app/(dashboard)/mobile-banking/accounts/page.tsx"
  "app/(dashboard)/mobile-banking/billers/page.tsx"
  "app/(dashboard)/system/forms/page.tsx"
  "app/(dashboard)/system/third-party/page.tsx"
  "app/(dashboard)/system/login-attempts/page.tsx"
  "app/(dashboard)/system/workflows/page.tsx"
  "app/(dashboard)/system/migrations/page.tsx"
  "app/(dashboard)/system/databases/page.tsx"
  "app/(dashboard)/system/core-banking/page.tsx"
)

cd /home/fdh/servicemanager

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Make sure COMMON_TABLE_HEADERS is imported
    if ! grep -q "COMMON_TABLE_HEADERS" "$file"; then
      sed -i 's/import { DataTable, type DataTableColumn } from/import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from/' "$file"
      sed -i 's/import {$/import {\n  COMMON_TABLE_HEADERS,/' "$file" 
    fi
    
    # Replace translate calls with COMMON_TABLE_HEADERS
    sed -i 's/translate("common\.table\.columns\.type")/COMMON_TABLE_HEADERS.type/g' "$file"
    sed -i 's/translate("common\.table\.columns\.transactionType")/COMMON_TABLE_HEADERS.transactionType/g' "$file"
    sed -i 's/translate("common\.table\.columns\.fromAccount")/COMMON_TABLE_HEADERS.fromAccount/g' "$file"
    sed -i 's/translate("common\.table\.columns\.toAccount")/COMMON_TABLE_HEADERS.toAccount/g' "$file"
    sed -i 's/translate("common\.table\.columns\.user")/COMMON_TABLE_HEADERS.user/g' "$file"
    sed -i 's/translate("common\.table\.columns\.account")/COMMON_TABLE_HEADERS.account/g' "$file"
    sed -i 's/translate("common\.table\.columns\.quantity")/COMMON_TABLE_HEADERS.quantity/g' "$file"
    sed -i 's/translate("common\.table\.columns\.collectionPoint")/COMMON_TABLE_HEADERS.collectionPoint/g' "$file"
    sed -i 's/translate("common\.table\.columns\.status")/COMMON_TABLE_HEADERS.status/g' "$file"
    sed -i 's/translate("common\.table\.columns\.requested")/COMMON_TABLE_HEADERS.requested/g' "$file"
    sed -i 's/translate("common\.table\.columns\.actions")/COMMON_TABLE_HEADERS.actions/g' "$file"
    sed -i 's/translate("common\.table\.columns\.accountNumber")/COMMON_TABLE_HEADERS.accountNumber/g' "$file"
    sed -i 's/translate("common\.table\.columns\.holderName")/COMMON_TABLE_HEADERS.holderName/g' "$file"
    sed -i 's/translate("common\.table\.columns\.category")/COMMON_TABLE_HEADERS.category/g' "$file"
    sed -i 's/translate("common\.table\.columns\.biller")/COMMON_TABLE_HEADERS.biller/g' "$file"
    sed -i 's/translate("common\.table\.columns\.externalRef")/COMMON_TABLE_HEADERS.externalRef/g' "$file"
    sed -i 's/translate("common\.table\.columns\.name")/COMMON_TABLE_HEADERS.name/g' "$file"
    sed -i 's/translate("common\.table\.columns\.description")/COMMON_TABLE_HEADERS.description/g' "$file"
    sed -i 's/translate("common\.table\.columns\.version")/COMMON_TABLE_HEADERS.version/g' "$file"
    sed -i 's/translate("common\.table\.columns\.created")/COMMON_TABLE_HEADERS.created/g' "$file"
    sed -i 's/translate("common\.table\.columns\.contactEmail")/COMMON_TABLE_HEADERS.contactEmail/g' "$file"
    sed -i 's/translate("common\.table\.columns\.tokens")/COMMON_TABLE_HEADERS.tokens/g' "$file"
    sed -i 's/translate("common\.table\.columns\.apiCalls")/COMMON_TABLE_HEADERS.apiCalls/g' "$file"
    sed -i 's/translate("common\.table\.columns\.dateTime")/COMMON_TABLE_HEADERS.dateTime/g' "$file"
    sed -i 's/translate("common\.table\.columns\.details")/COMMON_TABLE_HEADERS.details/g' "$file"
    sed -i 's/translate("common\.table\.columns\.device")/COMMON_TABLE_HEADERS.device/g' "$file"
    sed -i 's/translate("common\.table\.columns\.location")/COMMON_TABLE_HEADERS.location/g' "$file"
    sed -i 's/translate("common\.table\.columns\.source")/COMMON_TABLE_HEADERS.source/g' "$file"
    sed -i 's/translate("common\.table\.columns\.targetTable")/COMMON_TABLE_HEADERS.targetTable/g' "$file"
    sed -i 's/translate("common\.table\.columns\.lastRun")/COMMON_TABLE_HEADERS.lastRun/g' "$file"
    sed -i 's/translate("common\.table\.columns\.nextRun")/COMMON_TABLE_HEADERS.nextRun/g' "$file"
    
    echo "✓ Updated: $file"
  else
    echo "✗ Not found: $file"
  fi
done

echo ""
echo "Done! Updated ${#FILES[@]} files"
echo ""
echo "Verifying remaining translate calls:"
grep -rn "translate(\"common\.table\.columns\." "${FILES[@]}" 2>/dev/null || echo "✓ All translate calls replaced!"
