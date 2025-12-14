"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { gql, useMutation, useQuery, useLazyQuery } from "@apollo/client";
import { toast } from "sonner";
import parser from "cron-parser";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const MIGRATION_QUERY = gql`
  query Migration($id: ID!) {
    migration(id: $id) {
      id
      name
      description
      sourceConnectionId
      sourceQuery
      targetTable
      targetInsertQuery
      isRecurring
      cronExpression
      nextRunAt
    }
  }
`;

const DB_CONNECTIONS_QUERY = gql`
  query DbConnections {
    dbConnections {
      id
      name
    }
  }
`;

const APP_TABLES_QUERY = gql`
  query AppDatabaseTables {
    appDatabaseTables {
      schema
      name
    }
  }
`;

const APP_TABLE_COLUMNS_QUERY = gql`
  query AppTableColumns($table: String!) {
    appTableColumns(table: $table) {
      name
      dataType
      isNullable
      defaultValue
    }
  }
`;

const PREVIEW_SOURCE_QUERY = gql`
  query PreviewSourceQuery($connectionId: Int!, $query: String!) {
    previewSourceQuery(connectionId: $connectionId, query: $query) {
      columns {
        name
        dataType
      }
      rows {
        values
      }
    }
  }
`;

const UPDATE_MIGRATION = gql`
  mutation UpdateMigration($id: ID!, $input: MigrationInput!) {
    updateMigration(id: $id, input: $input) {
      id
      name
    }
  }
`;

const SCHEDULE_MIGRATION = gql`
  mutation ScheduleMigration($id: ID!, $cron: String!) {
    scheduleMigration(id: $id, cron: $cron) {
      id
      isRecurring
      cronExpression
      nextRunAt
    }
  }
`;

const UNSCHEDULE_MIGRATION = gql`
  mutation UnscheduleMigration($id: ID!) {
    unscheduleMigration(id: $id) {
      id
      isRecurring
      cronExpression
      nextRunAt
    }
  }
`;

export default function EditMigrationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: migrationData, loading: migrationLoading, refetch: refetchMigration } = useQuery(MIGRATION_QUERY, {
    variables: { id },
  });
  const { data: connectionsData, loading: connectionsLoading } = useQuery(DB_CONNECTIONS_QUERY);
  const { data: tablesData, loading: tablesLoading } = useQuery(APP_TABLES_QUERY);
  const [updateMigration, { loading: updating }] = useMutation(UPDATE_MIGRATION);
  const [scheduleMigration, { loading: scheduling }] = useMutation(SCHEDULE_MIGRATION);
  const [unscheduleMigration, { loading: unscheduling }] = useMutation(UNSCHEDULE_MIGRATION);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sourceConnectionId: "",
    sourceQuery: "",
    targetTable: "",
    targetInsertQuery: "",
  });

  const [schedulingState, setSchedulingState] = useState({
    isRecurring: false,
    cronExpression: "",
  });

  const connections = connectionsData?.dbConnections ?? [];
  const tables = tablesData?.appDatabaseTables ?? [];

  // Populate form when migration data loads
  useEffect(() => {
    if (migrationData?.migration) {
      const m = migrationData.migration;
      setFormData({
        name: m.name || "",
        description: m.description || "",
        sourceConnectionId: String(m.sourceConnectionId) || "",
        sourceQuery: m.sourceQuery || "",
        targetTable: m.targetTable || "",
        targetInsertQuery: m.targetInsertQuery || "",
      });
      setSchedulingState({
        isRecurring: m.isRecurring,
        cronExpression: m.cronExpression || "",
      });
    }
  }, [migrationData]);

  // Fetch columns when target table changes
  const { data: columnsData } = useQuery(APP_TABLE_COLUMNS_QUERY, {
    variables: { table: formData.targetTable },
    skip: !formData.targetTable,
  });

  const columns = columnsData?.appTableColumns ?? [];

  // State for source query preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [loadPreview, { data: previewResponse, loading: previewLoading, error: previewQueryError }] =
    useLazyQuery(PREVIEW_SOURCE_QUERY);

  const previewData = previewResponse?.previewSourceQuery;

  const handlePreviewQuery = async () => {
    if (!formData.sourceConnectionId || !formData.sourceQuery) {
      toast.error("Please select a source connection and enter a query");
      return;
    }

    setPreviewError(null);
    setShowPreview(false);

    try {
      const result = await loadPreview({
        variables: {
          connectionId: parseInt(formData.sourceConnectionId, 10),
          query: formData.sourceQuery,
        },
      });

      if (result.data) {
        setShowPreview(true);
        toast.success("Query preview loaded successfully");
      }
    } catch (error: any) {
      setPreviewError(error.message);
      toast.error("Failed to preview query");
    }
  };

  if (previewQueryError && !previewError) {
    setPreviewError(previewQueryError.message);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.sourceConnectionId || !formData.sourceQuery || !formData.targetTable || !formData.targetInsertQuery) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // 1. Update basic migration details
      await updateMigration({
        variables: {
          id,
          input: {
            name: formData.name,
            description: formData.description || null,
            sourceConnectionId: parseInt(formData.sourceConnectionId, 10),
            sourceQuery: formData.sourceQuery,
            targetTable: formData.targetTable,
            targetInsertQuery: formData.targetInsertQuery,
          },
        },
      });

      // 2. Handle scheduling updates
      const originalIsRecurring = migrationData?.migration?.isRecurring;
      const originalCron = migrationData?.migration?.cronExpression;

      if (schedulingState.isRecurring) {
        // If it's now recurring, and wasn't before OR the cron changed
        if (!originalIsRecurring || schedulingState.cronExpression !== originalCron) {
          if (!schedulingState.cronExpression) {
            toast.error("Cron expression is required for recurring migrations");
            return; // Stop here, but migration update succeeded
          }
          try {
            // Validate cron client-side briefly
            parser.parse(schedulingState.cronExpression);
            await scheduleMigration({
              variables: { id, cron: schedulingState.cronExpression }
            });
          } catch (e) {
            toast.error("Invalid cron expression");
            return;
          }
        }
      } else {
        // If it's NOT recurring, but WAS before
        if (originalIsRecurring) {
          await unscheduleMigration({ variables: { id } });
        }
      }

      toast.success("Migration updated successfully");
      router.push(`/system/migrations/${id}`);
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  if (migrationLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Migration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update the migration configuration
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Import Users from Legacy DB"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of what this migration does"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceConnection">Source Connection *</Label>
              <select
                id="sourceConnection"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.sourceConnectionId}
                onChange={(e) => setFormData({ ...formData, sourceConnectionId: e.target.value })}
                required
                disabled={connectionsLoading}
              >
                <option value="">Select a database connection</option>
                {connections.map((conn: any) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceQuery">Source Query (SELECT) *</Label>
              <Textarea
                id="sourceQuery"
                value={formData.sourceQuery}
                onChange={(e) => setFormData({ ...formData, sourceQuery: e.target.value })}
                placeholder="SELECT id, name, email FROM users WHERE created_at > '2024-01-01'"
                rows={5}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Query to fetch data from the source database
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreviewQuery}
                disabled={previewLoading || !formData.sourceConnectionId || !formData.sourceQuery}
              >
                {previewLoading ? "Loading Preview..." : "Preview Query Results"}
              </Button>
            </div>

            {previewError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  <strong>Error:</strong> {previewError}
                </p>
              </div>
            )}

            {showPreview && previewData && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    Query Preview ({previewData.rows.length} rows)
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    Close
                  </Button>
                </div>
                <div className="max-h-96 overflow-auto rounded border bg-background">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b">
                        {previewData.columns.map((col: any, idx: number) => (
                          <th key={idx} className="p-2 text-left font-medium">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row: any, rowIdx: number) => (
                        <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/50">
                          {row.values.map((val: string, colIdx: number) => (
                            <td key={colIdx} className="p-2 font-mono text-[11px]">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing first 10 rows. Column names can be used as {`{{placeholders}}`} in your INSERT query.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="targetTable">Target Table *</Label>
              <select
                id="targetTable"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.targetTable}
                onChange={(e) => setFormData({ ...formData, targetTable: e.target.value })}
                required
                disabled={tablesLoading}
              >
                <option value="">Select a table in your database</option>
                {tables.map((table: any) => (
                  <option key={`${table.schema}.${table.name}`} value={table.name}>
                    {table.schema === 'public' ? table.name : `${table.schema}.${table.name}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Select the destination table in your application database
              </p>
            </div>

            {formData.targetTable && columns.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
                <h4 className="text-sm font-semibold">Table Structure: {formData.targetTable}</h4>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b">
                        <th className="p-2 text-left font-medium">Column</th>
                        <th className="p-2 text-left font-medium">Type</th>
                        <th className="p-2 text-left font-medium">Nullable</th>
                        <th className="p-2 text-left font-medium">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col: any) => (
                        <tr key={col.name} className="border-b border-border/50">
                          <td className="p-2 font-mono">{col.name}</td>
                          <td className="p-2 text-muted-foreground">{col.dataType}</td>
                          <td className="p-2">
                            {col.isNullable ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                          <td className="p-2 font-mono text-muted-foreground text-[10px]">
                            {col.defaultValue || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use {`{{column_name}}`} placeholders in your INSERT query to map from source data
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="targetInsertQuery">Target Insert Query *</Label>
              <Textarea
                id="targetInsertQuery"
                value={formData.targetInsertQuery}
                onChange={(e) => setFormData({ ...formData, targetInsertQuery: e.target.value })}
                placeholder="INSERT INTO fdh_mobile_users (username, phone_number) VALUES ({{username}}, {{phone_number}})"
                rows={5}
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use {`{{column_name}}`} as placeholders for values from source query
              </p>
            </div>

            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <CardTitle className="text-lg">Scheduling</CardTitle>
                <p className="text-sm text-muted-foreground">Configure this migration to run automatically on a schedule</p>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="recurring"
                    checked={schedulingState.isRecurring}
                    onCheckedChange={(checked) => setSchedulingState({ ...schedulingState, isRecurring: checked })}
                  />
                  <Label htmlFor="recurring">Run Recurringly</Label>
                </div>

                {schedulingState.isRecurring && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="cron">Cron Expression</Label>
                    <Input
                      id="cron"
                      value={schedulingState.cronExpression}
                      onChange={(e) => setSchedulingState({ ...schedulingState, cronExpression: e.target.value })}
                      placeholder="* * * * *"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: Minute Hour Day Month DayOfWeek. E.g., "0 0 * * *" = Daily at Midnight.
                    </p>
                  </div>
                )}

                {migrationData?.migration?.nextRunAt && (
                  <div className="rounded bg-muted p-2 text-sm">
                    Next run: <strong>{new Date(migrationData.migration.nextRunAt).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/system/migrations/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating || scheduling || unscheduling}>
                {updating || scheduling || unscheduling ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
