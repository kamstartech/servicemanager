"use client";

import React from "react";
import { useQuery, gql } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { translateStatusOneWord } from "@/lib/utils";

const GET_ACCOUNT_TRANSACTIONS = gql`
  query GetAccountTransactions($accountNumber: String!) {
    accountTransactions(accountNumber: $accountNumber) {
      accountNumber
      status
      totalCount
      transactions {
        transactionId
        accountNumber
        transactionDate
        valueDate
        amount
        debitAmount
        creditAmount
        type
        description
        reference
        balance
        currency
        status
        narrative
      }
    }
  }
`;

interface Transaction {
  transactionId: string;
  accountNumber: string;
  transactionDate: string;
  valueDate: string;
  amount: string;
  debitAmount?: string | null;
  creditAmount?: string | null;
  type: string;
  description: string;
  reference: string;
  balance?: string | null;
  currency: string;
  status?: string | null;
  narrative?: string | null;
}

export default function AccountTransactionsPage() {
  const { translate } = useI18n();
  const params = useParams();
  const router = useRouter();
  const accountNumber = params.accountNumber as string;
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const { data, loading, error, refetch } = useQuery(GET_ACCOUNT_TRANSACTIONS, {
    variables: { accountNumber },
    skip: !accountNumber,
  });

  const transactionData = data?.accountTransactions;
  const transactions: Transaction[] = transactionData?.transactions ?? [];
  const totalCount = transactionData?.totalCount ?? 0;
  const fetchStatus = transactionData?.status;
  const hasNoTransactions = fetchStatus === "success" && transactions.length === 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error("Refetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const columns: DataTableColumn<Transaction>[] = [
    {
      id: "transactionDate",
      header: COMMON_TABLE_HEADERS.date,
      accessor: (row) => (
        <div className="text-sm">
          <div className="font-medium">
            {new Date(row.transactionDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
          {row.valueDate !== row.transactionDate && (
            <div className="text-xs text-muted-foreground">
              Value: {new Date(row.valueDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}
            </div>
          )}
        </div>
      ),
      sortKey: "transactionDate",
    },
    {
      id: "reference",
      header: COMMON_TABLE_HEADERS.reference,
      accessor: (row) => (
        <span className="font-mono text-xs">{row.reference || row.transactionId}</span>
      ),
      sortKey: "reference",
    },
    {
      id: "description",
      header: COMMON_TABLE_HEADERS.description,
      accessor: (row) => (
        <div className="max-w-xs">
          <div className="font-medium text-sm truncate">{row.description}</div>
          {row.narrative && row.narrative !== row.description && (
            <div className="text-xs text-muted-foreground truncate">
              {row.narrative}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "type",
      header: COMMON_TABLE_HEADERS.type,
      accessor: (row) => {
        const type = row.type.toLowerCase();
        const variant = 
          type === "credit" || type.includes("credit")
            ? "default"
            : type === "debit" || type.includes("debit")
            ? "destructive"
            : "secondary";

        return (
          <Badge variant={variant} className="text-xs capitalize">
            {row.type}
          </Badge>
        );
      },
    },
    {
      id: "amount",
      header: COMMON_TABLE_HEADERS.amount,
      accessor: (row) => {
        const isDebit = row.debitAmount || row.type.toLowerCase().includes("debit");
        const amount = row.debitAmount || row.creditAmount || row.amount;
        
        return (
          <div className="text-right">
            <div className={`font-semibold ${isDebit ? "text-red-600" : "text-green-600"}`}>
              {isDebit ? "-" : "+"} {row.currency} {parseFloat(amount).toLocaleString()}
            </div>
            {row.debitAmount && row.creditAmount && (
              <div className="text-xs text-muted-foreground">
                Dr: {row.currency} {parseFloat(row.debitAmount).toLocaleString()} / 
                Cr: {row.currency} {parseFloat(row.creditAmount).toLocaleString()}
              </div>
            )}
          </div>
        );
      },
      sortKey: "amount",
      alignRight: true,
    },
    {
      id: "balance",
      header: COMMON_TABLE_HEADERS.balance,
      accessor: (row) => (
        <div className="text-right text-sm">
          {row.balance ? (
            <span className="font-medium">
              {row.currency} {parseFloat(row.balance).toLocaleString()}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
      sortKey: "balance",
      alignRight: true,
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => {
        const status = row.status?.toLowerCase() || "completed";
        const label = translateStatusOneWord(row.status, translate, "COMPLETED");

        if (status === "completed" || status === "success") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle size={14} />
              {label}
            </span>
          );
        }

        if (status === "pending") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Clock size={14} />
              {label}
            </span>
          );
        }

        if (status === "failed") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle size={14} />
              {label}
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock size={14} />
            {label}
          </span>
        );
      },
      alignCenter: true,
    },
  ];

  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    const headers = [
      "Transaction ID",
      "Date",
      "Value Date",
      "Reference",
      "Description",
      "Type",
      "Debit",
      "Credit",
      "Balance",
      "Currency",
      "Status",
    ];

    const rows = transactions.map((txn) => [
      txn.transactionId,
      txn.transactionDate,
      txn.valueDate,
      txn.reference,
      txn.description,
      txn.type,
      txn.debitAmount || "",
      txn.creditAmount || "",
      txn.balance || "",
      txn.currency,
      txn.status || "completed",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions_${accountNumber}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <CardTitle>Account Transactions</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Account: <span className="font-mono font-semibold">{accountNumber}</span>
                {totalCount > 0 && ` (${totalCount} transaction${totalCount !== 1 ? "s" : ""})`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading || isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={transactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(loading || isRefreshing) && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {isRefreshing ? "Refreshing transactions..." : "Loading transactions..."}
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">Error: {error.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Try Again
              </Button>
            </div>
          )}

          {!loading && !isRefreshing && !error && fetchStatus === "error" && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Load Transactions
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Could not fetch transactions from T24 Core Banking System.
                <br />
                The account may not exist or there was a connection issue.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && hasNoTransactions && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Transactions Found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                This account has no transaction history yet.
                <br />
                Transactions will appear here once account activity begins.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Accounts
                </Button>
              </div>
            </div>
          )}

          {!loading && !isRefreshing && !error && fetchStatus === "success" && transactions.length > 0 && (
            <DataTable<Transaction>
              data={transactions}
              columns={columns}
              searchableKeys={[
                "reference",
                "description",
                "narrative",
                "type",
                "transactionId",
              ]}
              initialSortKey="transactionDate"
              pageSize={20}
              searchPlaceholder="Search by reference, description, type..."
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
