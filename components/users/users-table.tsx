"use client";

import Link from "next/link";
import { gql, useQuery } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useI18n } from "@/components/providers/i18n-provider";
import { Calendar, CheckCircle, Eye, XCircle } from "lucide-react";
import { translateStatusOneWord } from "@/lib/utils";

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
  const { translate } = useI18n();
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
      header: translate("common.table.columns.username"),
      accessor: (row) => row.username ?? "-",
      sortKey: "username",
    },
    {
      id: "phoneNumber",
      header: translate("common.table.columns.phoneNumber"),
      accessor: (row) => row.phoneNumber ?? "-",
      sortKey: "phoneNumber",
    },
    {
      id: "customerNumber",
      header: translate("common.table.columns.customerNumber"),
      accessor: (row) => row.customerNumber ?? "-",
      sortKey: "customerNumber",
    },
    {
      id: "status",
      header: translate("common.table.columns.status"),
      accessor: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            {translateStatusOneWord("ACTIVE", translate, "ACTIVE")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} />
            {translateStatusOneWord("INACTIVE", translate, "INACTIVE")}
          </span>
        ),
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "createdAt",
      header: translate("common.table.columns.created"),
      accessor: (row) => (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          {new Date(row.createdAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      ),
      sortKey: "createdAt",
      alignCenter: true,
    },
    {
      id: "actions",
      header: translate("common.table.columns.actions"),
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
                {translate("common.actions.details")}
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
            {translate("common.actions.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">{translate("common.state.loading")}</p>
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
              rowNumberHeader={translate("common.table.columns.index")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
