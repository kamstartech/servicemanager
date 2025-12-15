"use client";

import { gql, useQuery } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Calendar } from "lucide-react";

const MOBILE_USERS_QUERY = gql`
  query MobileUsers($context: MobileUserContext) {
    mobileUsers(context: $context) {
      id
      context
      username
      phoneNumber
      isActive
      createdAt
    }
  }
`;

export default function MobileUsersPage() {
  const { data, loading, error, refetch } = useQuery(MOBILE_USERS_QUERY);
  const { translate } = useI18n();

  const rows = (data?.mobileUsers ?? []) as any[];

  const columns: DataTableColumn<any>[] = [
    {
      id: "context",
      header: translate("mobileUsers.columns.context"),
      accessor: (row) => row.context,
      sortKey: "context",
    },
    {
      id: "username",
      header: translate("mobileUsers.columns.username"),
      accessor: (row) => row.username ?? "-",
      sortKey: "username",
    },
    {
      id: "phoneNumber",
      header: translate("mobileUsers.columns.phone"),
      accessor: (row) => row.phoneNumber ?? "-",
      sortKey: "phoneNumber",
    },
    {
      id: "status",
      header: translate("mobileUsers.columns.status"),
      accessor: (row) =>
        row.isActive
          ? translate("common.status.active")
          : translate("common.status.inactive"),
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "createdAt",
      header: "Created",
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
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{translate("mobileUsers.title")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {translate("common.actions.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">
              {translate("common.state.loading")}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {translate("common.state.error")}: {error.message}
            </p>
          )}
          {!loading && !error && (
            <DataTable<any>
              data={rows}
              columns={columns}
              searchableKeys={["context", "username", "phoneNumber"]}
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder={translate("common.actions.search") || "Search mobile users..."}
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
