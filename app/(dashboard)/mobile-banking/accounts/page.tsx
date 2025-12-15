"use client";

import { useQuery, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useI18n } from "@/components/providers/i18n-provider";
import { CheckCircle, Eye, Star, XCircle } from "lucide-react";
import { translateStatusOneWord } from "@/lib/utils";

const GET_ACCOUNTS = gql`
  query GetMobileUserAccounts {
    allMobileUserAccounts {
      id
      accountNumber
      accountName
      accountType
      currency
      categoryId
      categoryName
      accountStatus
      holderName
      balance
      workingBalance
      isPrimary
      isActive
      mobileUserId
      createdAt
      updatedAt
    }
  }
`;

interface Account {
  id: string;
  accountNumber: string;
  accountName?: string | null;
  accountType?: string | null;
  currency: string;
  categoryId?: string | null;
  categoryName?: string | null;
  accountStatus?: string | null;
  holderName?: string | null;
  balance?: number | null;
  workingBalance?: number | null;
  isPrimary: boolean;
  isActive: boolean;
  mobileUserId: string;
  createdAt: string;
  updatedAt: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const { translate } = useI18n();
  const { data, loading, error, refetch } = useQuery(GET_ACCOUNTS);

  const accounts: Account[] = data?.allMobileUserAccounts ?? [];

  const columns: DataTableColumn<Account>[] = [
    {
      id: "accountNumber",
      header: translate("common.table.columns.accountNumber"),
      accessor: (row) => (
        <span className="font-medium font-mono">{row.accountNumber}</span>
      ),
      sortKey: "accountNumber",
    },
    {
      id: "holderName",
      header: translate("common.table.columns.holderName"),
      accessor: (row) => row.holderName || row.accountName || "-",
      sortKey: "holderName",
    },
    {
      id: "type",
      header: translate("common.table.columns.type"),
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.accountType || "N/A"}
        </Badge>
      ),
    },
    {
      id: "category",
      header: translate("common.table.columns.category"),
      accessor: (row) => (
        <div className="text-sm">
          {row.categoryName ? (
            <>
              <div className="font-medium">{row.categoryName}</div>
              {row.categoryId && (
                <div className="text-xs text-muted-foreground">
                  ID: {row.categoryId}
                </div>
              )}
            </>
          ) : (
            <span className="text-gray-400 italic">N/A</span>
          )}
        </div>
      ),
    },
    {
      id: "balance",
      header: translate("common.table.columns.balance"),
      accessor: (row) => (
        <div className="text-right">
          {row.balance != null ? (
            <div className="font-medium">
              {row.currency} {parseFloat(String(row.balance)).toLocaleString()}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
          {row.workingBalance != null &&
            row.workingBalance !== row.balance && (
              <div className="text-xs text-muted-foreground">
                Working: {row.currency}{" "}
                {parseFloat(String(row.workingBalance)).toLocaleString()}
              </div>
            )}
        </div>
      ),
      sortKey: "balance",
      alignRight: true,
    },
    {
      id: "status",
      header: translate("common.table.columns.status"),
      accessor: (row) => (
        <div className="flex flex-col gap-1">
          {row.isPrimary && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Star size={14} />
              {translateStatusOneWord("PRIMARY", translate, "PRIMARY")}
            </span>
          )}
          {row.accountStatus && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                row.accountStatus.toLowerCase() === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <CheckCircle size={14} />
              {translateStatusOneWord(row.accountStatus, translate, "UNKNOWN")}
            </span>
          )}
          {!row.isActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle size={14} />
              {translateStatusOneWord("INACTIVE", translate, "INACTIVE")}
            </span>
          )}
        </div>
      ),
      alignCenter: true,
    },
    {
      id: "actions",
      header: translate("common.table.columns.actions"),
      accessor: (row) => (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
            onClick={() => router.push(`/mobile-banking/accounts/${row.accountNumber}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {translate("common.actions.details")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Accounts</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              All accounts linked to mobile banking users
              {accounts.length > 0 && ` (${accounts.length} total)`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          )}
          {!loading && !error && accounts.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No accounts found in the system.
            </p>
          )}
          {!loading && !error && accounts.length > 0 && (
            <DataTable<Account>
              data={accounts}
              columns={columns}
              searchableKeys={[
                "accountNumber",
                "accountName",
                "holderName",
                "accountType",
                "categoryName",
              ]}
              initialSortKey="accountNumber"
              pageSize={20}
              searchPlaceholder="Search by account number, holder name, type..."
              showRowNumbers
              rowNumberHeader={translate("common.table.columns.index")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
