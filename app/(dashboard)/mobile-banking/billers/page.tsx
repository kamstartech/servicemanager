"use client";

import React from "react";
import { useQuery, gql } from "@apollo/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn, COMMON_TABLE_HEADERS } from "@/components/data-table";
import { Receipt, CheckCircle2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { BILLER_DEFINITIONS, getBillerDefinition } from "@/lib/config/biller-constants";
import { useI18n } from "@/components/providers/i18n-provider";
import { translateStatusOneWord } from "@/lib/utils";

const GET_BILLER_STATS = gql`
  query GetBillerStats {
    billerTransactionStats {
      billerType
      status
      count
    }
  }
`;

const GET_BILLER_TRANSACTIONS = gql`
  query GetBillerTransactions($limit: Int, $offset: Int) {
    billerTransactions(limit: $limit, offset: $offset) {
      totalCount
      transactions {
        id
        billerType
        billerName
        ourTransactionId
        externalTransactionId
        transactionType
        accountNumber
        amount
        currency
        status
        errorMessage
        createdAt
        completedAt
      }
    }
  }
`;

interface BillerTransaction {
  id: string;
  billerType: string;
  billerName: string;
  ourTransactionId: string;
  externalTransactionId?: string | null;
  transactionType: string;
  accountNumber: string;
  amount: number;
  currency: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

interface BillerStat {
  billerType: string;
  status: string;
  count: number;
}

function getStatusPill(status: string, translate: (key: string) => string) {
  const label = translateStatusOneWord(status, translate, "UNKNOWN");
  const normalized = status?.toLowerCase?.() || "";

  if (normalized === "completed" || normalized === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle size={14} />
        {label}
      </span>
    );
  }

  if (normalized === "pending" || normalized === "processing") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock size={14} />
        {label}
      </span>
    );
  }

  if (normalized === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle size={14} />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      <AlertCircle size={14} />
      {label}
    </span>
  );
}

export default function BillersPage() {
  const { translate } = useI18n();
  const configs = BILLER_DEFINITIONS;

  const { data: statsData, loading: statsLoading } = useQuery(GET_BILLER_STATS);
  const { data: transactionsData, loading: transactionsLoading, refetch } = useQuery(
    GET_BILLER_TRANSACTIONS,
    {
      variables: {
        limit: 100,
        offset: 0,
      },
    }
  );
  const stats: any[] = statsData?.billerTransactionStats ?? [];
  const usedBillerTypes = new Set(stats.map((s) => s.billerType));
  const activeConfigs = configs.filter((c) => usedBillerTypes.has(c.type));

  const transactions: BillerTransaction[] = transactionsData?.billerTransactions?.transactions ?? [];
  const totalTransactions = transactionsData?.billerTransactions?.totalCount ?? 0;

  // Calculate aggregated stats from actual transaction count for accuracy
  const completedTx = transactions.filter((t) => t.status === "COMPLETED").length;
  const failedTx = transactions.filter((t) => t.status === "FAILED").length;
  const pendingTx = transactions.filter((t) => t.status === "PENDING" || t.status === "PROCESSING").length;
  // Success rate based on displayed transactions (100 most recent)
  const successRate = transactions.length > 0 ? Math.round((completedTx / transactions.length) * 100) : 0;

  const columns: DataTableColumn<BillerTransaction>[] = [
    {
      id: "ourTransactionId",
      header: COMMON_TABLE_HEADERS.reference,
      accessor: (row) => (
        <span className="font-mono font-medium text-xs">{row.ourTransactionId}</span>
      ),
      sortKey: "ourTransactionId",
    },
    {
      id: "billerName",
      header: translate("common.table.columns.biller"),
      accessor: (row) => {
        const biller = getBillerDefinition(row.billerType);
        return (
          <div className="text-sm">
            <div className="font-medium">{biller?.name || row.billerName}</div>
            <div className="text-xs text-muted-foreground">
              {biller?.displayName || row.billerType?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
          </div>
        );
      },
      sortKey: "billerName",
    },
    {
      id: "transactionType",
      header: translate("common.table.columns.type"),
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.transactionType === "POST_TRANSACTION" ? "Payment" : row.transactionType?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      ),
      sortKey: "transactionType",
      alignCenter: true,
    },
    {
      id: "accountNumber",
      header: translate("common.table.columns.accountNumber"),
      accessor: (row) => <span className="font-mono text-xs">{row.accountNumber}</span>,
    },
    {
      id: "amount",
      header: COMMON_TABLE_HEADERS.amount,
      accessor: (row) => (
        <span className="font-medium text-sm">
          {row.amount.toLocaleString()} {row.currency}
        </span>
      ),
      sortKey: "amount",
      alignRight: true,
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => getStatusPill(row.status, translate),
      sortKey: "status",
      alignCenter: true,
    },
    {
      id: "externalTransactionId",
      header: translate("common.table.columns.externalRef"),
      accessor: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.externalTransactionId || "-"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: COMMON_TABLE_HEADERS.createdAt,
      accessor: (row) => {
        if (!row.createdAt) return <span className="text-xs text-muted-foreground">-</span>;
        try {
          const date = new Date(row.createdAt);
          if (isNaN(date.getTime())) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          return <span className="text-xs">{date.toLocaleString()}</span>;
        } catch {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
      },
      sortKey: "createdAt",
      alignCenter: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{translate("sidebar.billers")}</h1>
            <p className="text-muted-foreground">
              {translate("common.descriptions.manageBillers")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {translate("common.actions.refresh")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {translate("common.labels.totalBillers")}
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configs.length}</div>
              <p className="text-xs text-muted-foreground">
                {configs.filter((c) => c.isActive).length} {translate("common.status.active")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {translate("common.labels.totalTransactions")}
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {completedTx} {translate("common.status.completed")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {translate("common.labels.successRate")}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">{translate("common.labels.last30Days")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Billers List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Biller Performance Breakdown
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeConfigs.map((config) => {
              const configStats = stats.filter((s) => s.billerType === config.type);
              const totalTx = configStats.reduce((acc, s) => acc + s.count, 0);
              const completedTx = configStats
                .filter((s) => s.status === "COMPLETED")
                .reduce((acc, s) => acc + s.count, 0);

              return (
                <Card key={config.type}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{config.displayName}</CardTitle>
                        <CardDescription>{config.name}</CardDescription>
                      </div>
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive
                          ? translate("common.status.active")
                          : translate("common.status.inactive")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {translate("common.table.columns.type")}:
                        </span>
                        <span className="font-medium text-xs">
                          {config.type?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {translate("common.labels.transactions")}:
                        </span>
                        <span className="font-medium">{totalTx}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {translate("common.labels.successRate")}:
                        </span>
                        <span className="font-medium">
                          {totalTx > 0 ? Math.round((completedTx / totalTx) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between"></div>

                      {config.description && (
                        <p className="mt-3 text-xs text-muted-foreground">{config.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Biller Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>{translate("common.labels.recentTransactions")}</CardTitle>
            <CardDescription>
              {translate("common.descriptions.billerTransactionHistory")} ({totalTransactions} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading && (
              <p className="text-sm text-muted-foreground">{translate("common.state.loading")}</p>
            )}
            {!transactionsLoading && transactions.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {translate("common.state.noTransactionsFound")}
              </p>
            )}
            {!transactionsLoading && transactions.length > 0 && (
              <DataTable<BillerTransaction>
                data={transactions}
                columns={columns}
                searchableKeys={[
                  "ourTransactionId",
                  "billerName",
                  "billerType",
                  "accountNumber",
                  "externalTransactionId",
                ]}
                initialSortKey="createdAt"
                initialSortDirection="desc"
                pageSize={20}
                searchPlaceholder={
                  translate("common.actions.searchPlaceholder") || "Search transactions..."
                }
                showRowNumbers
                rowNumberHeader={translate("common.table.columns.index")}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
