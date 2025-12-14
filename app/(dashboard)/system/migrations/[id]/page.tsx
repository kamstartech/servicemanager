"use client";

import { useParams, useRouter } from "next/navigation";
import { gql, useQuery } from "@apollo/client";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RunMigrationDialog } from "@/components/migrations/run-migration-dialog";

const MIGRATION_QUERY = gql`
  query Migration($id: ID!) {
    migration(id: $id) {
      id
      name
      description
      sourceConnectionId
      sourceConnectionName
      sourceQuery
      targetTable
      targetInsertQuery
      status
      lastRunAt
      lastRunSuccess
      lastRunMessage
      lastRunRowsAffected
      createdAt
      updatedAt
    }
  }
`;

export default function MigrationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, loading, error, refetch } = useQuery(MIGRATION_QUERY, {
    variables: { id },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data?.migration) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-red-600">Migration not found</p>
      </div>
    );
  }

  const migration = data.migration;


  const statusColors: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-800",
    RUNNING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{migration.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {migration.description || "No description"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/system/migrations">Back</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/system/migrations/${id}/edit`}>Edit</Link>
            </Button>
            <RunMigrationDialog
              id={id}
              name={migration.name}
              status={migration.status}
              onCompleted={refetch}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge className={statusColors[migration.status]}>
                {migration.status}
              </Badge>
            </div>

            {migration.lastRunAt && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Last Run:</span>
                    <p className="text-muted-foreground">
                      {new Date(migration.lastRunAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Success:</span>
                    <p className="text-muted-foreground">
                      {migration.lastRunSuccess ? "✓ Yes" : "✗ No"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Rows Affected:</span>
                    <p className="text-muted-foreground">
                      {migration.lastRunRowsAffected ?? "N/A"}
                    </p>
                  </div>
                </div>

                {migration.lastRunMessage && (
                  <div>
                    <span className="text-sm font-medium">Message:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {migration.lastRunMessage}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium">Connection:</span>
              <p className="text-sm text-muted-foreground">
                {migration.sourceConnectionName}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Query:</span>
              <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-x-auto">
                {migration.sourceQuery}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium">Table:</span>
              <p className="text-sm text-muted-foreground">
                {migration.targetTable}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Insert Query Template:</span>
              <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-x-auto">
                {migration.targetInsertQuery}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Created:</span>
              <p className="text-muted-foreground">
                {new Date(migration.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="font-medium">Updated:</span>
              <p className="text-muted-foreground">
                {new Date(migration.updatedAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
