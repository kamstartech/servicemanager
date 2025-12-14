"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import {
  CoreBankingConnectionDialog,
  type CoreBankingConnection,
  type CoreBankingConnectionDialogMode,
} from "@/components/core-banking/core-banking-connection-dialog";
import {
  CoreBankingEndpointDialog,
  type CoreBankingEndpoint,
  type CoreBankingEndpointDialogMode,
} from "@/components/core-banking/core-banking-endpoint-dialog";
import {
  CoreBankingEndpointTestDialog,
  type CoreBankingEndpointForTest,
} from "@/components/core-banking/core-banking-endpoint-test-dialog";

const CORE_BANKING_CONNECTION_QUERY = gql`
  query CoreBankingConnection($id: ID!) {
    coreBankingConnection(id: $id) {
      id
      name
      username
      baseUrl
      isActive
      createdAt
      updatedAt
      lastTestedAt
      lastTestOk
      lastTestMessage
      endpoints {
        id
        connectionId
        name
        method
        path
        bodyTemplate
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

type EndpointRow = {
  id: number;
  name: string;
  method: string;
  path: string;
  isActive: boolean;
};

const TEST_CORE_BANKING_CONNECTION = gql`
  mutation TestCoreBankingConnection($id: ID!) {
    testCoreBankingConnection(id: $id) {
      ok
      message
      url
      method
      statusCode
      statusText
      requestHeadersJson
      requestBody
      responseBody
    }
  }
`;

const TEST_CORE_BANKING_ENDPOINT = gql`
  mutation TestCoreBankingEndpoint($id: ID!, $variablesJson: String) {
    testCoreBankingEndpoint(id: $id, variablesJson: $variablesJson) {
      ok
      message
      url
      method
      statusCode
      statusText
      requestHeadersJson
      requestBody
      responseBody
    }
  }
`;

export default function CoreBankingConnectionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, loading, error, refetch } = useQuery(
    CORE_BANKING_CONNECTION_QUERY,
    { variables: { id } },
  );
  const { translate } = useI18n();

  const [testConnection, { loading: testing }] = useMutation(
    TEST_CORE_BANKING_CONNECTION,
  );

  const [testEndpoint, { loading: testingEndpoint }] = useMutation(
    TEST_CORE_BANKING_ENDPOINT,
  );

  const connection = data?.coreBankingConnection;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode] = useState<CoreBankingConnectionDialogMode>("edit");

  const [endpointDialogOpen, setEndpointDialogOpen] = useState(false);
  const [endpointDialogMode, setEndpointDialogMode] =
    useState<CoreBankingEndpointDialogMode>("create");
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<CoreBankingEndpoint | null>(null);

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEndpointSelection, setTestEndpointSelection] =
    useState<CoreBankingEndpointForTest | null>(null);
  const [lastTestResult, setLastTestResult] = useState<any | null>(null);

  const endpointRows: EndpointRow[] = (connection?.endpoints ?? []).map(
    (endpoint: any) => ({
      id: endpoint.id,
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      isActive: endpoint.isActive,
    }),
  );

  const endpointColumns: DataTableColumn<EndpointRow>[] = [
    {
      id: "name",
      header: translate("coreBanking.connectionDetail.endpoints.columns.name"),
      accessor: (row) => row.name,
      sortKey: "name",
    },
    {
      id: "method",
      header: translate("coreBanking.connectionDetail.endpoints.columns.method"),
      accessor: (row) => row.method,
      sortKey: "method",
    },
    {
      id: "path",
      header: translate("coreBanking.connectionDetail.endpoints.columns.path"),
      accessor: (row) => row.path,
      sortKey: "path",
    },
    {
      id: "status",
      header: translate("coreBanking.connectionDetail.endpoints.columns.status"),
      accessor: (row) =>
        row.isActive
          ? translate("common.status.active")
          : translate("common.status.inactive"),
      sortKey: "isActive",
    },
    {
      id: "actions",
      header: translate("coreBanking.connectionDetail.endpoints.columns.actions"),
      accessor: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const endpoint = (connection?.endpoints ?? []).find(
                (e: any) => e.id === row.id,
              );
              if (!endpoint) return;

              setTestEndpointSelection({
                id: endpoint.id,
                name: endpoint.name,
                path: endpoint.path,
                bodyTemplate: endpoint.bodyTemplate,
              });
              setTestDialogOpen(true);
            }}
          >
            {translate("coreBanking.connectionDetail.endpoints.actions.test")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const endpoint = (connection?.endpoints ?? []).find(
                (e: any) => e.id === row.id,
              );
              if (!endpoint) return;

              setSelectedEndpoint({
                id: endpoint.id,
                connectionId: endpoint.connectionId,
                name: endpoint.name,
                method: endpoint.method,
                path: endpoint.path,
                isActive: endpoint.isActive,
                bodyTemplate: endpoint.bodyTemplate,
              });
              setEndpointDialogMode("edit");
              setEndpointDialogOpen(true);
            }}
          >
            {translate("coreBanking.connectionDetail.endpoints.actions.edit")}
          </Button>
        </div>
      ),
      alignRight: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-muted-foreground">
          {translate("common.state.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-red-600">
          {translate("common.state.error")}: {error.message}
        </p>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-muted-foreground">
          {translate("coreBanking.connectionDetail.notFound")}
        </p>
      </div>
    );
  }

  const initialData: CoreBankingConnection = {
    id: connection.id,
    name: connection.name,
    username: connection.username,
    baseUrl: connection.baseUrl,
    isActive: connection.isActive,
  };

  const lastTestLabel = (() => {
    if (!connection.lastTestedAt) return "Never";
    const status = connection.lastTestOk ? "OK" : "Failed";
    return `${status} – ${new Date(connection.lastTestedAt).toLocaleString()}`;
  })();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          {translate("common.actions.back")}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={testing}
            onClick={async () => {
              try {
                const { data: result } = await testConnection({
                  variables: { id: connection.id },
                });

                const outcome = result?.testCoreBankingConnection;
                if (outcome?.ok) {
                  toast.success(
                    outcome.message ||
                    translate("coreBanking.connectionDetail.test.success"),
                  );
                } else {
                  toast.error(
                    outcome?.message ||
                    translate("coreBanking.connectionDetail.test.failed"),
                  );
                }

                await refetch();
              } catch (err: any) {
                toast.error(
                  err?.message ||
                  translate("coreBanking.connectionDetail.test.error"),
                );
              }
            }}
          >
            {translate("coreBanking.connectionDetail.actions.test")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{connection.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {translate("coreBanking.connectionDetail.fields.username")}
              </p>
              <p className="font-medium">{connection.username}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {translate("coreBanking.connectionDetail.fields.baseUrl")}
              </p>
              <p className="font-medium break-all">{connection.baseUrl}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {translate("coreBanking.connectionDetail.fields.status")}
              </p>
              <p className="font-medium">
                {connection.isActive
                  ? translate("common.status.active")
                  : translate("common.status.inactive")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {translate("coreBanking.connectionDetail.fields.lastTest")}
              </p>
              <p className="font-medium">{lastTestLabel}</p>
              {connection.lastTestMessage && (
                <p className="text-xs text-muted-foreground">
                  {connection.lastTestMessage}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {translate("coreBanking.connectionDetail.fields.createdAt")}
              </p>
              <p className="font-medium">
                {new Date(connection.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {translate("coreBanking.connectionDetail.fields.updatedAt")}
              </p>
              <p className="font-medium">
                {new Date(connection.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {translate("coreBanking.connectionDetail.endpoints.title")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate(
                "coreBanking.connectionDetail.endpoints.subtitle",
              )}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedEndpoint(null);
              setEndpointDialogMode("create");
              setEndpointDialogOpen(true);
            }}
          >
            {translate("coreBanking.connectionDetail.endpoints.actions.add")}
          </Button>
        </CardHeader>
        <CardContent>
          {endpointRows.length > 0 ? (
            <DataTable<EndpointRow>
              data={endpointRows}
              columns={endpointColumns}
              searchableKeys={["name", "method", "path"]}
              initialSortKey="name"
              pageSize={10}
              searchPlaceholder={translate(
                "coreBanking.connectionDetail.endpoints.searchPlaceholder",
              )}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {translate(
                "coreBanking.connectionDetail.endpoints.emptyState",
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <CoreBankingConnectionDialog
        open={dialogOpen}
        mode={dialogMode}
        initialData={initialData}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            refetch();
          }
        }}
        onCompleted={refetch}
      />

      <CoreBankingEndpointTestDialog
        open={testDialogOpen}
        endpoint={testEndpointSelection}
        loading={testingEndpoint}
        testResult={lastTestResult}
        onOpenChange={(open) => {
          setTestDialogOpen(open);
          if (!open) {
            setTestEndpointSelection(null);
            setLastTestResult(null);
          }
        }}
        onRunTest={async (variablesJson) => {
          if (!testEndpointSelection) return;

          try {
            const { data: result } = await testEndpoint({
              variables: { id: testEndpointSelection.id, variablesJson },
            });

            const outcome = result?.testCoreBankingEndpoint;
            setLastTestResult(outcome ?? null);
            if (outcome?.ok) {
              toast.success(
                outcome.message || "Core banking endpoint is reachable",
              );
            } else {
              toast.error(
                outcome?.message || "Core banking endpoint test failed",
              );
            }
          } catch (err: any) {
            toast.error(
              err?.message || "Failed to test core banking endpoint",
            );
          }
        }}
      />

      <CoreBankingEndpointDialog
        open={endpointDialogOpen}
        mode={endpointDialogMode}
        connectionId={Number(connection.id)}
        initialData={selectedEndpoint}
        onOpenChange={(open) => {
          setEndpointDialogOpen(open);
          if (!open) {
            refetch();
          }
        }}
        onCompleted={refetch}
      />
    </div>
  );
}
