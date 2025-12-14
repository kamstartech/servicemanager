"use client";

import { useState } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const DB_CONNECTIONS_QUERY = gql`
  query {
    dbConnections {
      id
      name
    }
  }
`;

const PREVIEW_QUERY = gql`
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

const APP_TABLES_QUERY = gql`
  query {
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
    }
  }
`;

const CREATE_MIGRATION = gql`
  mutation CreateMigration($input: MigrationInput!) {
    createMigration(input: $input) {
      id
      name
    }
  }
`;

export default function NewMigrationWithMapper() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceConnectionId, setSourceConnectionId] = useState<number | null>(null);
  const [sourceQuery, setSourceQuery] = useState("");
  const [targetTable, setTargetTable] = useState("");
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});

  const { data: connectionsData } = useQuery(DB_CONNECTIONS_QUERY);
  const { data: tablesData } = useQuery(APP_TABLES_QUERY);

  const { data: sourcePreviewData, loading: previewLoading, refetch: refetchPreview } = useQuery(
    PREVIEW_QUERY,
    {
      variables: { connectionId: sourceConnectionId, query: sourceQuery },
      // Keep preview data available across steps once a connection and query are set
      skip: !sourceConnectionId || !sourceQuery,
    }
  );

  const { data: targetColumnsData, loading: targetColumnsLoading } = useQuery(APP_TABLE_COLUMNS_QUERY, {
    variables: { table: targetTable },
    skip: !targetTable,
  });

  const [createMigration, { loading: creating }] = useMutation(CREATE_MIGRATION, {
    onCompleted: (data) => {
      toast.success("Migration created successfully");
      router.push(`/system/migrations/${data.createMigration.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create migration: ${error.message}`);
    },
  });

  const handlePreview = () => {
    if (!sourceConnectionId || !sourceQuery.trim()) {
      toast.error("Please select a connection and enter a query");
      return;
    }
    refetchPreview();
  };

  const handleCreateMigration = () => {
    const trimmedName = name.trim();
    const trimmedQuery = sourceQuery.trim();
    const trimmedTable = targetTable.trim();

    if (!trimmedName) {
      toast.error("Please enter a migration name");
      return;
    }

    if (!sourceConnectionId || !trimmedQuery) {
      toast.error("Please configure the source connection and query first");
      return;
    }

    if (!trimmedTable) {
      toast.error("Please select a target table");
      return;
    }

    const mappedTargetColumns = Object.keys(columnMappings).filter(
      (sourceCol) => columnMappings[sourceCol]
    );

    if (mappedTargetColumns.length === 0) {
      toast.error("Map at least one source column to a target column");
      return;
    }

    const targetColumnNames = mappedTargetColumns
      .map((sourceCol) => {
        const targetCol = columnMappings[sourceCol];
        return `"${targetCol}"`;
      })
      .join(", ");

    const placeholders = mappedTargetColumns
      .map((sourceCol) => `{{${sourceCol}}}`)
      .join(", ");

    const targetInsertQuery = `INSERT INTO ${trimmedTable} (${targetColumnNames}) VALUES (${placeholders})`;

    createMigration({
      variables: {
        input: {
          name: trimmedName,
          description: description.trim() || null,
          sourceConnectionId,
          sourceQuery: trimmedQuery,
          targetTable: trimmedTable,
          targetInsertQuery,
        },
      },
    });
  };

  const sourceColumns = sourcePreviewData?.previewSourceQuery.columns || [];
  const targetColumns = targetColumnsData?.appTableColumns || [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/system/migrations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Visual Migration Builder</h1>
          <p className="text-muted-foreground">
            Build migrations without writing SQL manually - No more syntax errors!
          </p>
        </div>
      </div>

      <div className="max-w-5xl space-y-6">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded transition-all ${
                s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Migration Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Import mobile users from legacy"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this migration does"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setStep(2)} disabled={!name.trim()}>
                  Next: Configure Source
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Source Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sourceConnection">Source Database *</Label>
                <select
                  id="sourceConnection"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={sourceConnectionId || ""}
                  onChange={(e) => setSourceConnectionId(parseInt(e.target.value))}
                >
                  <option value="">Select a connection</option>
                  {connectionsData?.dbConnections.map((conn: any) => (
                    <option key={conn.id} value={conn.id}>{conn.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="sourceQuery">Source Query *</Label>
                <Textarea
                  id="sourceQuery"
                  value={sourceQuery}
                  onChange={(e) => setSourceQuery(e.target.value)}
                  placeholder="SELECT id, username, email FROM users"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <Button
                onClick={handlePreview}
                disabled={!sourceConnectionId || !sourceQuery.trim() || previewLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${previewLoading ? "animate-spin" : ""}`} />
                Preview Data
              </Button>

              {sourcePreviewData && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">
                    Preview ({sourceColumns.length} columns, {sourcePreviewData.previewSourceQuery.rows.length} rows)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {sourceColumns.map((col: any) => (
                            <th key={col.name} className="text-left p-2 font-mono">{col.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sourcePreviewData.previewSourceQuery.rows.slice(0, 3).map((row: any, idx: number) => (
                          <tr key={idx} className="border-b">
                            {row.values.map((val: string, vIdx: number) => (
                              <td key={vIdx} className="p-2 font-mono text-xs">
                                {val || <span className="text-muted-foreground">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!sourcePreviewData}>
                  Next: Select Target Table
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Select Target Table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="targetTable">Target Table *</Label>
                <select
                  id="targetTable"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                >
                  <option value="">Select a table</option>
                  {tablesData?.appDatabaseTables
                    .filter((t: any) => t.schema === "public")
                    .map((table: any) => (
                      <option key={table.name} value={table.name}>{table.name}</option>
                    ))}
                </select>
              </div>

              {targetColumnsData && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2">
                    Target Table Columns ({targetColumns.length} columns)
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {targetColumns.map((col: any) => (
                      <div key={col.name} className="flex items-center gap-2 p-2 border rounded">
                        <code className="font-mono">{col.name}</code>
                        <span className="text-muted-foreground text-xs">({col.dataType})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Back
                </Button>
                <Button onClick={() => setStep(4)} disabled={!targetTable || !targetColumnsData}>
                  Next: Map Columns
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Map Source to Target Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {targetColumnsLoading ? (
                <p className="text-sm text-muted-foreground">Loading target columns...</p>
              ) : !targetColumns.length ? (
                <p className="text-sm text-destructive">No columns found for target table.</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Map each source column to a target column. Unmapped columns will be ignored.
                  </p>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sourceColumns.map((sourceCol: any) => (
                      <div
                        key={sourceCol.name}
                        className="flex items-center gap-4 p-3 border rounded"
                      >
                        <div className="flex-1">
                          <code className="font-mono font-semibold">{sourceCol.name}</code>
                          <span className="text-muted-foreground text-xs ml-2">
                            ({sourceCol.dataType})
                          </span>
                        </div>
                        <ArrowRight className="text-muted-foreground h-4 w-4" />
                        <div className="flex-1">
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={columnMappings[sourceCol.name] || ""}
                            onChange={(e) =>
                              setColumnMappings({
                                ...columnMappings,
                                [sourceCol.name]: e.target.value,
                              })
                            }
                          >
                            <option value="">-- Skip this column --</option>
                            {targetColumns.map((targetCol: any) => (
                              <option key={targetCol.name} value={targetCol.name}>
                                {targetCol.name} ({targetCol.dataType})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                <h3 className="font-semibold mb-2">Generated INSERT Query:</h3>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {(() => {
                    const mappedTargetColumns = Object.keys(columnMappings).filter(
                      (sourceCol) => columnMappings[sourceCol]
                    );
                    const targetColumnNames = mappedTargetColumns
                      .map((sourceCol) => {
                        const targetCol = columnMappings[sourceCol];
                        return `"${targetCol}"`;
                      })
                      .join(", ");
                    const placeholders = mappedTargetColumns
                      .map((sourceCol) => `{{${sourceCol}}}`)
                      .join(", ");
                  return `INSERT INTO ${targetTable} (${targetColumnNames})\nVALUES (${placeholders})`;
                })()}
              </pre>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />Back
              </Button>
              <Button
                onClick={handleCreateMigration}
                disabled={creating || Object.keys(columnMappings).filter((k) => columnMappings[k]).length === 0}
              >
                {creating ? "Creating..." : "Create Migration"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )}
      </div>
    </div>
  );
}
