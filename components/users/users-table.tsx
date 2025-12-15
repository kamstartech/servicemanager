"use client";

import Link from "next/link";
import { gql, useQuery } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { CheckCircle, Eye, XCircle } from "lucide-react";

const USERS_QUERY = gql`
  query Users($context: MobileUserContext!) {
    mobileUsers(context: $context) {
      id
      context
      username
      phoneNumber
      customerNumber
      isActive
      createdAt
    }
  }
`;

type MobileUserRow = {
  id: string;
  context: string;
  username?: string | null;
  phoneNumber?: string | null;
  customerNumber?: string | null;
  isActive: boolean;
  createdAt: string;
};

function mapMobileUsers(data: any): MobileUserRow[] {
  return (data?.mobileUsers ?? []).map((user: any) => ({
    id: String(user.id),
    context: user.context,
    username: user.username,
    phoneNumber: user.phoneNumber,
    customerNumber: user.customerNumber,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }));
}

type UsersTableProps = {
  context: "MOBILE_BANKING" | "WALLET";
  title: string;
  searchPlaceholder?: string;
};

export function UsersTable({ context, title, searchPlaceholder }: UsersTableProps) {
  const { data, loading, error, refetch } = useQuery(USERS_QUERY, {
    variables: { context },
  });

  const rows = mapMobileUsers(data);

  const baseColumns: DataTableColumn<MobileUserRow>[] = [
    // Context column intentionally hidden in UI to keep tables clean
    // {
    //   id: "context",
    //   header: "Context",
    //   accessor: (row) => row.context,
    //   sortKey: "context",
    // },
    {
      id: "username",
      header: "User name",
      accessor: (row) => row.username ?? "-",
      sortKey: "username",
    },
    {
      id: "phoneNumber",
      header: "Phone number",
      accessor: (row) => row.phoneNumber ?? "-",
      sortKey: "phoneNumber",
    },
    {
      id: "customerNumber",
      header: "Customer number",
      accessor: (row) => row.customerNumber ?? "-",
      sortKey: "customerNumber",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} />
            Inactive
          </span>
        ),
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "createdAt",
      header: "Created at",
      accessor: (row) => new Date(row.createdAt).toLocaleString(),
      sortKey: "createdAt",
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => {
        const detailsHref =
          context === "WALLET"
            ? `/wallet/users/${row.id}`
            : `/mobile-banking/users/${row.id}`;

        return (
          <div className="flex justify-center">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
            >
              <Link href={detailsHref}>
                <Eye className="h-4 w-4 mr-2" />
                Details
              </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  const columns = baseColumns.filter((column) => {
    if (context === "WALLET" && column.id === "username") {
      return false;
    }
    if (context === "WALLET" && column.id === "customerNumber") {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          )}
          {!loading && !error && (
            <DataTable<MobileUserRow>
              data={rows}
              columns={columns}
              searchableKeys={
                context === "WALLET"
                  ? ["phoneNumber"]
                  : ["username", "phoneNumber", "customerNumber"]
              }
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder={searchPlaceholder ?? "Search users"}
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
