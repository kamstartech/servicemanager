"use client";

import { useState } from "react";
import Link from "next/link";
import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";
import {
  CoreBankingConnectionDialog,
  type CoreBankingConnection,
  type CoreBankingConnectionDialogMode,
} from "@/components/core-banking/core-banking-connection-dialog";

const CORE_BANKING_CONNECTIONS_QUERY = gql`
  query CoreBankingConnections {
    coreBankingConnections {
      id
      name
      username
      baseUrl
      isActive
      createdAt
      lastTestedAt
      lastTestOk
      lastTestMessage
    }
  }
`;

const TEST_CORE_BANKING_CONNECTION = gql`
  mutation TestCoreBankingConnection($id: ID!) {
    testCoreBankingConnection(id: $id) {
      ok
      message
    }
  }
`;

type CoreBankingConnectionRow = {
  id: number;
  name: string;
  username: string;
  baseUrl: string;
  isActive: boolean;
  createdAt: string;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
  lastTestMessage?: string | null;
};

function mapConnections(data: any): CoreBankingConnectionRow[] {
  return (data?.coreBankingConnections ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    username: c.username,
    baseUrl: c.baseUrl,
    isActive: c.isActive,
    createdAt: c.createdAt,
    lastTestedAt: c.lastTestedAt,
    lastTestOk: c.lastTestOk,
    lastTestMessage: c.lastTestMessage,
  }));
}

export default function CoreBankingConnectionsPage() {
  const { data, loading, error, refetch } = useQuery(
    CORE_BANKING_CONNECTIONS_QUERY,
  );
  const { translate } = useI18n();

  const [testConnection, { loading: testing }] = useMutation(
    TEST_CORE_BANKING_CONNECTION,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] =
    useState<CoreBankingConnectionDialogMode>("create");
  const [selectedConnection, setSelectedConnection] =
    useState<CoreBankingConnection | null>(null);

  const rows = mapConnections(data);

  const columns: DataTableColumn<CoreBankingConnectionRow>[] = [
    {
      id: "name",
      header: translate("coreBanking.connections.columns.name"),
      accessor: (row) => row.name,
      sortKey: "name",
    },
    {
      id: "username",
      header: translate("coreBanking.connections.columns.username"),
      accessor: (row) => row.username,
      sortKey: "username",
    },
    {
      id: "baseUrl",
      header: translate("coreBanking.connections.columns.baseUrl"),
      accessor: (row) => row.baseUrl,
      sortKey: "baseUrl",
    },
    {
      id: "status",
      header: translate("coreBanking.connections.columns.status"),
      accessor: (row) =>
        row.isActive
          ? translate("common.status.active")
          : translate("common.status.inactive"),
      sortKey: "isActive",
    },
    {
      id: "lastTest",
      header: translate("coreBanking.connections.columns.lastTest"),
      accessor: (row) => {
        if (!row.lastTestedAt)
          return translate("coreBanking.connections.lastTest.never");

        const statusKey = row.lastTestOk
          ? "coreBanking.connections.lastTest.ok"
          : "coreBanking.connections.lastTest.failed";
        const when = new Date(row.lastTestedAt).toLocaleString();
        return `${translate(statusKey)} – ${when}`;
      },
    },
    {
      id: "createdAt",
      header: translate("coreBanking.connections.columns.createdAt"),
      accessor: (row) => new Date(row.createdAt).toLocaleString(),
      sortKey: "createdAt",
    },
    {
      id: "actions",
      header: translate("coreBanking.connections.columns.actions"),
      accessor: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={testing}
            onClick={async () => {
              try {
                const { data: result } = await testConnection({
                  variables: { id: row.id },
                });

                const outcome = result?.testCoreBankingConnection;
                if (outcome?.ok) {
                  toast.success(
                    outcome.message ||
                      translate("coreBanking.connections.test.success"),
                  );
                } else {
                  toast.error(
                    outcome?.message ||
                      translate("coreBanking.connections.test.failed"),
                  );
                }

                await refetch();
              } catch (error: any) {
                toast.error(
                  error?.message ||
                    translate("coreBanking.connections.test.error"),
                );
              }
            }}
          >
            {translate("coreBanking.connections.actions.test")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedConnection({
                id: row.id,
                name: row.name,
                username: row.username,
                baseUrl: row.baseUrl,
                isActive: row.isActive,
              });
              setDialogMode("edit");
              setDialogOpen(true);
            }}
          >
            Edit
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/system/core-banking/${row.id}`}>
              {translate("coreBanking.connections.actions.details")}
            </Link>
          </Button>
        </div>
      ),
      alignRight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {translate("coreBanking.connections.title")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate("coreBanking.connections.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {translate("common.actions.refresh")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedConnection(null);
                setDialogMode("create");
                setDialogOpen(true);
              }}
            >
              {translate("coreBanking.connections.actions.newConnection")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">
              {translate("common.state.loading")}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600">
              {translate("common.state.error")}: {error.message}
            </p>
          )}
          {!loading && !error && (
            <DataTable<CoreBankingConnectionRow>
              data={rows}
              columns={columns}
              searchableKeys={["name", "username", "baseUrl"]}
              initialSortKey="name"
              pageSize={10}
              searchPlaceholder={translate(
                "coreBanking.connections.searchPlaceholder",
              )}
            />
          )}
        </CardContent>
      </Card>

      <CoreBankingConnectionDialog
        open={dialogOpen}
        mode={dialogMode}
        initialData={selectedConnection}
        onOpenChange={setDialogOpen}
        onCompleted={refetch}
      />
    </div>
  );
}
