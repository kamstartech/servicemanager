"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { gql, useQuery } from "@apollo/client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";

const TABLE_DATA_QUERY = gql`
  query DbConnectionTableData($id: ID!, $schema: String!, $table: String!) {
    dbConnection(id: $id) {
      id
      name
    }
    dbConnectionTableData(id: $id, schema: $schema, table: $table) {
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

type GenericRow = Record<string, string>;

type TablePageParams = {
  id: string;
  schema: string;
  name: string;
};

export default function DatabaseTableShowPage() {
  const params = useParams<TablePageParams>();
  const router = useRouter();

  const id = params.id;
  const schema = params.schema;
  const tableName = params.name;

  const { data, loading, error } = useQuery(TABLE_DATA_QUERY, {
    variables: { id, schema, table: tableName },
    skip: !id || !schema || !tableName,
  });

  const connection = data?.dbConnection;
  const tableData = data?.dbConnectionTableData;

  const { rows, columns } = useMemo(() => {
    if (!tableData) {
      return { rows: [] as GenericRow[], columns: [] as DataTableColumn<GenericRow>[] };
    }

    const columns: DataTableColumn<GenericRow>[] = tableData.columns.map(
      (col: any) => ({
        id: col.name,
        header: col.name,
        accessor: (row: any) => row[col.name] ?? "",
        sortKey: col.name,
      }),
    );

    const rows: GenericRow[] = tableData.rows.map((row: any) => {
      const obj: GenericRow = {};
      tableData.columns.forEach((col: any, index: number) => {
        obj[col.name] = row.values[index] ?? "";
      });
      return obj;
    });

    return { rows, columns };
  }, [tableData]);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              Table {schema}.{tableName}
              {connection?.name ? ` (Connection: ${connection.name})` : ""}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/system/databases/${id}`)}
            >
              Back to connection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading table data...</p>
          )}
          {error && null}
          {!loading && !error && (
            <DataTable<GenericRow>
              data={rows}
              columns={columns}
              searchableKeys={tableData?.columns.map((col: any) => col.name) ?? []}
              initialSortKey={tableData?.columns[0]?.name}
              pageSize={25}
              searchPlaceholder="Search rows"
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
