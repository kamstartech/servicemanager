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
import { Calendar, CheckCircle, Eye, FlaskConical, Pencil, XCircle } from "lucide-react";

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
        row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            {translate("common.status.active")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} />
            {translate("common.status.inactive")}
          </span>
        ),
      sortKey: "isActive",
      alignCenter: true,
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
    {
      id: "actions",
      header: translate("coreBanking.connections.columns.actions"),
      accessor: (row) => (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
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
            <FlaskConical className="h-4 w-4 mr-2" />
            {translate("coreBanking.connections.actions.test")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
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
            <Pencil className="h-4 w-4 mr-2" />
            {translate("common.actions.edit")}
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
          >
            <Link href={`/system/core-banking/${row.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {translate("coreBanking.connections.actions.details")}
            </Link>
          </Button>
        </div>
      ),
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
              showRowNumbers
              rowNumberHeader="#"
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
