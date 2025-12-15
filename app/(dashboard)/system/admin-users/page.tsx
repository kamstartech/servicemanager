"use client";

import { gql, useQuery } from "@apollo/client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { Calendar } from "lucide-react";
import { translateStatusOneWord } from "@/lib/utils";

const ADMIN_WEB_USERS_QUERY = gql`
  query AdminWebUsers {
    adminWebUsers {
      id
      email
      name
      isActive
      createdAt
    }
  }
`;

export default function AdminWebUsersPage() {
  const { data, loading, error, refetch } = useQuery(ADMIN_WEB_USERS_QUERY);
  const { translate } = useI18n();

  const rows = (data?.adminWebUsers ?? []) as any[];

  const columns: DataTableColumn<any>[] = [
    {
      id: "email",
      header: translate("adminUsers.columns.email"),
      accessor: (row) => row.email,
      sortKey: "email",
    },
    {
      id: "name",
      header: translate("adminUsers.columns.name"),
      accessor: (row) => row.name ?? "-",
      sortKey: "name",
    },
    {
      id: "status",
      header: translate("adminUsers.columns.status"),
      accessor: (row) =>
        row.isActive
          ? translateStatusOneWord("ACTIVE", translate, "ACTIVE")
          : translateStatusOneWord("INACTIVE", translate, "INACTIVE"),
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "createdAt",
      header: COMMON_TABLE_HEADERS.created,
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
          <CardTitle>{translate("adminUsers.title")}</CardTitle>
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
              searchableKeys={["email", "name"]}
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder={translate("common.actions.search") || "Search admin users..."}
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
