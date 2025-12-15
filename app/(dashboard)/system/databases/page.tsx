"use client";

import { useState } from "react";
import Link from "next/link";
import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { CheckCircle, Clock, Eye, FlaskConical, XCircle } from "lucide-react";
import { DatabaseConnectionDialog } from "@/components/database-connection-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";

const DB_CONNECTIONS_QUERY = gql`
  query DbConnections {
    dbConnections {
      id
      name
      engine
      host
      port
      database
      username
      isReadOnly
      createdAt
      lastTestedAt
      lastTestOk
      lastTestMessage
    }
  }
`;

const TEST_DB_CONNECTION = gql`
  mutation TestDbConnection($id: ID!) {
    testDbConnection(id: $id) {
      ok
      message
    }
  }
`;

type ConnectionRow = {
  id: number;
  name: string;
  engine: string;
  host: string;
  port: number;
  database: string;
  username: string;
  isReadOnly: boolean;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
  lastTestMessage?: string | null;
};

function mapConnections(data: any): ConnectionRow[] {
  return (data?.dbConnections ?? []).map((conn: any) => ({
    id: conn.id,
    name: conn.name,
    engine: conn.engine,
    host: conn.host,
    port: conn.port,
    database: conn.database,
    username: conn.username,
    isReadOnly: conn.isReadOnly,
    lastTestedAt: conn.lastTestedAt,
    lastTestOk: conn.lastTestOk,
    lastTestMessage: conn.lastTestMessage,
  }));
}

export default function DatabaseConnectionsPage() {
  const { data, loading, error, refetch } = useQuery(DB_CONNECTIONS_QUERY);
  const { translate } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [testConnection, { loading: testing }] = useMutation(TEST_DB_CONNECTION);
  const [lastTestMessage, setLastTestMessage] = useState<string | null>(null);
  const [lastTestSuccessful, setLastTestSuccessful] = useState<boolean | null>(
    null,
  );

  const rows: ConnectionRow[] = mapConnections(data);

  const columns: DataTableColumn<ConnectionRow>[] = [
    {
      id: "name",
      header: translate("databaseConnections.name"),
      accessor: (row) => row.name,
      sortKey: "name",
    },
    {
      id: "engine",
      header: translate("databaseConnections.engine"),
      accessor: (row) => row.engine,
      sortKey: "engine",
    },
    {
      id: "host",
      header: translate("databaseConnections.host"),
      accessor: (row) => `${row.host}:${row.port}`,
      sortKey: "host",
    },
    {
      id: "database",
      header: translate("databaseConnections.database"),
      accessor: (row) => row.database,
      sortKey: "database",
    },
    {
      id: "username",
      header: translate("databaseConnections.user"),
      accessor: (row) => row.username,
      sortKey: "username",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => {
        const hasTest = !!row.lastTestedAt;
        const when = hasTest
          ? new Date(row.lastTestedAt as string).toLocaleString()
          : null;

        const tooltip = !hasTest
          ? "Not tested yet"
          : row.lastTestOk
          ? `Last test successful at ${when}`
          : `Last test failed at ${when}`;

        if (!hasTest) {
          return (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
              title={tooltip}
              aria-label={tooltip}
            >
              <Clock size={14} />
              Not tested
            </span>
          );
        }

        if (row.lastTestOk) {
          return (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              title={tooltip}
              aria-label={tooltip}
            >
              <CheckCircle size={14} />
              OK
            </span>
          );
        }

        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
            title={tooltip}
            aria-label={tooltip}
          >
            <XCircle size={14} />
            Failed
          </span>
        );
      },
      sortKey: "lastTestedAt",
      alignCenter: true,
    },
    {
      id: "mode",
      header: translate("databaseConnections.mode"),
      accessor: (row) =>
        row.isReadOnly
          ? translate("databaseConnections.readOnly")
          : translate("databaseConnections.readWrite"),
      sortKey: "isReadOnly",
    },
    {
      id: "actions",
      header: translate("databaseConnections.actions"),
      accessor: (row) => (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
          >
            <Link href={`/system/databases/${row.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              Details
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
            disabled={testing}
            onClick={async () => {
              try {
                const result = await testConnection({
                  variables: { id: String(row.id) },
                });
                const payload = result.data?.testDbConnection;
                if (payload) {
                  setLastTestSuccessful(payload.ok);
                  setLastTestMessage(
                    payload.message ||
                      (payload.ok
                        ? "Connection successful."
                        : "Connection failed."),
                  );
                  if (payload.ok) {
                    toast.success(
                      payload.message || "Connection successful.",
                    );
                  } else {
                    toast.error(payload.message || "Connection failed.");
                  }
                  await refetch();
                }
              } catch (mutationError: any) {
                setLastTestSuccessful(false);
                setLastTestMessage(
                  `Connection test failed: ${
                    mutationError?.message ?? String(mutationError)
                  }`,
                );
                toast.error(
                  `Connection test failed: ${
                    mutationError?.message ?? String(mutationError)
                  }`,
                );
                await refetch();
              }
            }}
          >
            <FlaskConical className="h-4 w-4 mr-2" />
            {translate("databaseConnections.test")}
          </Button>
        </div>
      ),
      alignRight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{translate("databaseConnections.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate("databaseConnections.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              {translate("databaseConnections.newConnection")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {error && null}
          {!loading && !error && (
            <DataTable<ConnectionRow>
              data={rows}
              columns={columns}
              searchableKeys={["name", "engine", "host", "database", "username"]}
              initialSortKey="name"
              pageSize={10}
              searchPlaceholder="Search connections"
              showRowNumbers
              rowNumberHeader="#"
            />
          )}

          <DatabaseConnectionDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                refetch();
              }
            }}
            mode="create"
          />
        </CardContent>
      </Card>
    </div>
  );
}