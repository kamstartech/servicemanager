"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DatabaseConnectionDialog } from "@/components/database-connection-dialog";

const DB_CONNECTION_QUERY = gql`
  query DbConnection($id: ID!) {
    dbConnection(id: $id) {
      id
      name
      engine
      host
      port
      database
      username
      isReadOnly
      createdAt
      updatedAt
      lastTestedAt
      lastTestOk
      lastTestMessage
    }
  }
`;

const DB_TABLES_QUERY = gql`
  query DbConnectionTables($id: ID!) {
    dbConnectionTables(id: $id) {
      schema
      name
    }
  }
`;

type TableRow = {
  schema: string;
  name: string;
};

const TEST_DB_CONNECTION = gql`
  mutation TestDbConnection($id: ID!) {
    testDbConnection(id: $id) {
      ok
      message
    }
  }
`;

export default function DatabaseConnectionShowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data, loading, error, refetch } = useQuery(DB_CONNECTION_QUERY, {
    variables: { id },
    skip: !id,
  });

  const {
    data: tablesData,
    loading: loadingTables,
    error: tablesError,
  } = useQuery(DB_TABLES_QUERY, {
    variables: { id },
    skip: !id,
  });

  const [testConnection, { loading: testing }] = useMutation(TEST_DB_CONNECTION);
  const [lastTestMessage, setLastTestMessage] = useState<string | null>(null);
  const [lastTestSuccessful, setLastTestSuccessful] = useState<boolean | null>(
    null,
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const connection = data?.dbConnection;

  const tableRows: TableRow[] = (tablesData?.dbConnectionTables ?? []).map(
    (row: any) => ({
      schema: row.schema,
      name: row.name,
    }),
  );

  const tableColumns: DataTableColumn<TableRow>[] = [
    {
      id: "schema",
      header: "Schema",
      accessor: (row) => row.schema,
      sortKey: "schema",
    },
    {
      id: "name",
      header: "Table name",
      accessor: (row) => row.name,
      sortKey: "name",
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => (
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/system/databases/${id}/tables/${encodeURIComponent(
              row.schema,
            )}/${encodeURIComponent(row.name)}`}
          >
            View data
          </Link>
        </Button>
      ),
    },
  ];

  async function handleTest() {
    try {
      const result = await testConnection({ variables: { id } });
      const payload = result.data?.testDbConnection;
      if (payload) {
        setLastTestSuccessful(payload.ok);
        setLastTestMessage(
          payload.message ||
            (payload.ok ? "Connection successful." : "Connection failed."),
        );
        // Refresh to pull updated persisted status
        refetch();

        if (payload.ok) {
          toast.success(payload.message || "Connection successful.");
        } else {
          toast.error(payload.message || "Connection failed.");
        }
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
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              Database connection
              {connection?.name ? `: ${connection.name}` : ""}
            </CardTitle>
            {lastTestMessage && (
              <p
                className={`mt-2 text-sm ${
                  lastTestSuccessful ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {lastTestMessage}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/system/databases")}
            >
              Back to list
            </Button>
            {connection && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                Edit
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testing || !connection}
              onClick={handleTest}
            >
              {testing ? "Testing connection..." : "Test connection"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {error && null}
          {!loading && !error && !connection && (
            <p className="text-sm text-muted-foreground">
              Database connection not found.
            </p>
          )}
          {!loading && !error && connection && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Name
                </dt>
                <dd className="text-sm font-medium">{connection.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Engine
                </dt>
                <dd className="text-sm font-medium">{connection.engine}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Host
                </dt>
                <dd className="text-sm font-medium">{connection.host}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Port
                </dt>
                <dd className="text-sm font-medium">{connection.port}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Database name
                </dt>
                <dd className="text-sm font-medium">{connection.database}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  User name
                </dt>
                <dd className="text-sm font-medium">{connection.username}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Mode
                </dt>
                <dd className="text-sm font-medium">
                  {connection.isReadOnly ? "Read only" : "Read and write"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Created at
                </dt>
                <dd className="text-sm font-medium">
                  {new Date(connection.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Updated at
                </dt>
                <dd className="text-sm font-medium">
                  {new Date(connection.updatedAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Last test status
                </dt>
                <dd className="text-sm font-medium">
                  {!connection.lastTestedAt && "Not tested yet"}
                  {connection.lastTestedAt && (
                    <span>
                      {connection.lastTestOk ? "Successful" : "Failed"} at
                      {" "}
                      {new Date(connection.lastTestedAt).toLocaleString()}
                    </span>
                  )}
                </dd>
              </div>
              {connection.lastTestMessage && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Last test message
                  </dt>
                  <dd className="text-sm font-mono">
                    {connection.lastTestMessage}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {connection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Tables</h2>
                {loadingTables && (
                  <span className="text-xs text-muted-foreground">
                    Loading tables...
                  </span>
                )}
                {tablesError && (
                  <span className="text-xs text-destructive">
                    Error loading tables: {tablesError.message}
                  </span>
                )}
              </div>
              {!loadingTables && !tablesError && (
                <DataTable<TableRow>
                  data={tableRows}
                  columns={tableColumns}
                  searchableKeys={["schema", "name"]}
                  initialSortKey="name"
                  pageSize={15}
                  searchPlaceholder="Search tables"
                />
              )}
            </div>
          )}

          {connection && (
            <DatabaseConnectionDialog
              open={editDialogOpen}
              onOpenChange={(open) => {
                setEditDialogOpen(open);
                if (!open) {
                  refetch();
                }
              }}
              mode="edit"
              initialValues={{
                id: connection.id,
                name: connection.name,
                engine: connection.engine,
                host: connection.host,
                port: connection.port,
                database: connection.database,
                username: connection.username,
                isReadOnly: connection.isReadOnly,
              } as any}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
