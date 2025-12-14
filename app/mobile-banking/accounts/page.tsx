"use client";

import { useQuery, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";

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
  const { data, loading, error, refetch } = useQuery(GET_ACCOUNTS);

  const accounts: Account[] = data?.allMobileUserAccounts ?? [];

  const columns: DataTableColumn<Account>[] = [
    {
      id: "accountNumber",
      header: "Account Number",
      accessor: (row) => (
        <span className="font-medium font-mono">{row.accountNumber}</span>
      ),
      sortKey: "accountNumber",
    },
    {
      id: "holderName",
      header: "Holder Name",
      accessor: (row) => row.holderName || row.accountName || "-",
      sortKey: "holderName",
    },
    {
      id: "type",
      header: "Type",
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.accountType || "N/A"}
        </Badge>
      ),
    },
    {
      id: "category",
      header: "Category",
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
      header: "Balance",
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
      header: "Status",
      accessor: (row) => (
        <div className="flex flex-col gap-1">
          {row.isPrimary && (
            <Badge variant="default" className="text-xs">
              Primary
            </Badge>
          )}
          {row.accountStatus && (
            <Badge
              variant={
                row.accountStatus.toLowerCase() === "active"
                  ? "default"
                  : "secondary"
              }
              className="text-xs"
            >
              {row.accountStatus}
            </Badge>
          )}
          {!row.isActive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex justify-end">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => router.push(`/mobile-banking/accounts/${row.accountNumber}`)}
          >
            View
          </Button>
        </div>
      ),
      alignRight: true,
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
