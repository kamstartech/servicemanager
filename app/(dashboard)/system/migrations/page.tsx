"use client";

import Link from "next/link";
import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { Clock, Repeat } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";
import { RunMigrationDialog } from "@/components/migrations/run-migration-dialog";

const MIGRATIONS_QUERY = gql`
  query Migrations {
    migrations {
      id
      name
      description
      sourceConnectionName
      targetTable
      status
      lastRunAt
      lastRunSuccess
      lastRunRowsAffected
      createdAt
      isRecurring
      nextRunAt
    }
  }
`;

const DELETE_MIGRATION = gql`
  mutation DeleteMigration($id: ID!) {
    deleteMigration(id: $id)
  }
`;

type MigrationRow = {
  id: number;
  name: string;
  description?: string | null;
  sourceConnectionName: string;
  targetTable: string;
  status: string;
  lastRunAt?: string | null;
  lastRunSuccess?: boolean | null;
  lastRunRowsAffected?: number | null;
  createdAt: string;
  isRecurring: boolean;
  nextRunAt?: string | null;
};

function mapMigrations(data: any): MigrationRow[] {
  return (data?.migrations ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    sourceConnectionName: m.sourceConnectionName,
    targetTable: m.targetTable,
    status: m.status,
    lastRunAt: m.lastRunAt,
    lastRunSuccess: m.lastRunSuccess,
    lastRunRowsAffected: m.lastRunRowsAffected,
    createdAt: m.createdAt,
    isRecurring: m.isRecurring,
    nextRunAt: m.nextRunAt,
  }));
}

export default function MigrationsPage() {
  const { data, loading, error, refetch } = useQuery(MIGRATIONS_QUERY, {
    pollInterval: 15000,
  });
  const [deleteMigration, { loading: deleting }] = useMutation(DELETE_MIGRATION);

  const rows: MigrationRow[] = mapMigrations(data);

  const columns: DataTableColumn<MigrationRow>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (row) => (
        <div className="flex items-center gap-2">
          {row.name}
          {row.isRecurring && (
            <span title="Recurring Migration" className="text-blue-600">
              <Repeat className="h-3 w-3" />
            </span>
          )}
        </div>
      ),
      sortKey: "name",
    },
    {
      id: "source",
      header: "Source",
      accessor: (row) => row.sourceConnectionName,
      sortKey: "sourceConnectionName",
    },
    {
      id: "target",
      header: "Target Table",
      accessor: (row) => row.targetTable,
      sortKey: "targetTable",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => {
        const statusColors: Record<string, string> = {
          PENDING: "text-gray-600",
          RUNNING: "text-blue-600",
          COMPLETED: "text-green-600",
          FAILED: "text-red-600",
        };
        return (
          <span className={statusColors[row.status] || ""}>
            {row.status}
          </span>
        );
      },
      sortKey: "status",
    },
    {
      id: "lastRun",
      header: "Last Run",
      accessor: (row) => {
        if (!row.lastRunAt) return "Never";
        const when = new Date(row.lastRunAt).toLocaleString();
        const result = row.lastRunSuccess ? "✓" : "✗";
        const rows = row.lastRunRowsAffected ?? 0;
        return `${result} ${when} (${rows} rows)`;
      },
      sortKey: "lastRunAt",
    },
    {
      id: "nextRun",
      header: "Next Run",
      accessor: (row) => {
        if (!row.isRecurring || !row.nextRunAt) return "";
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(row.nextRunAt).toLocaleString()}
          </div>
        )
      },
      sortKey: "nextRunAt",
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/system/migrations/${row.id}`}>Details</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/system/migrations/${row.id}/edit`}>Edit</Link>
          </Button>
          <RunMigrationDialog
            id={row.id}
            name={row.name}
            status={row.status}
            onCompleted={refetch}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting || row.status === "RUNNING"}
              >
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete migration "{row.name}"?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this migration definition. Executed
                  runs and any data already migrated will not be affected, but you
                  will not be able to run or edit this migration again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await deleteMigration({
                        variables: { id: String(row.id) },
                      });
                      toast.success("Migration deleted.");
                      await refetch();
                    } catch (mutationError: any) {
                      toast.error(
                        `Delete failed: ${mutationError?.message ?? String(mutationError)
                        }`,
                      );
                    }
                  }}
                >
                  Confirm delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
            <CardTitle>Database Migrations</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage data migrations from external databases to your application database
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/system/migrations/new">Manual Mode</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/system/migrations/new-with-mapper">Visual Builder (Recommended)</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {error && (
            <p className="text-sm text-red-600">Error: {error.message}</p>
          )}
          {!loading && !error && (
            <DataTable<MigrationRow>
              data={rows}
              columns={columns}
              searchableKeys={["name", "sourceConnectionName", "targetTable"]}
              initialSortKey="name"
              pageSize={10}
              searchPlaceholder="Search migrations"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

