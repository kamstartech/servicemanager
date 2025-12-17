"use client";

import React from "react";
import { gql, useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COMMON_TABLE_HEADERS,
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  Check,
  CheckCircle,
  ChevronsUpDown,
  Clock,
  Plus,
  RefreshCw,
  History,
  MoreVertical,
  XCircle,
} from "lucide-react";
import { translateStatusOneWord } from "@/lib/utils";
import { toast } from "sonner";

const TRANSFER_TYPE_OPTIONS = [
  { value: "FDH_BANK", label: "FDH Bank" },
  { value: "EXTERNAL_BANK", label: "External Bank" },
  { value: "FDH_WALLET", label: "FDH Wallet" },
  { value: "EXTERNAL_WALLET", label: "External Wallet" },
] as const;

function getTransferTypeLabel(value?: string | null): string {
  if (!value) return "-";
  return (
    TRANSFER_TYPE_OPTIONS.find((item) => item.value === value)?.label || value
  );
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

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <XCircle size={14} />
      {label}
    </span>
  );
}

const GET_MOBILE_BANKING_TRANSACTIONS = gql`
  query GetMobileBankingTransactions(
    $filter: TransactionFilterInput
    $page: Int!
    $limit: Int!
  ) {
    proxyTransactions(filter: $filter, page: $page, limit: $limit) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        currentPage
        totalPages
      }
      transactions {
        id
        reference
        type
        source
        status
        transferType
        transferContext
        amount
        currency
        description
        fromAccountNumber
        toAccountNumber
        createdAt
      }
    }
  }
`;

const GET_TRANSACTION_HISTORY = gql`
  query GetTransactionHistory($id: ID!) {
    proxyTransaction(id: $id) {
      id
      reference
      status
      statusHistory {
        id
        fromStatus
        toStatus
        reason
        retryNumber
        createdAt
      }
    }
  }
`;

const GET_MOBILE_BANKING_ACCOUNTS = gql`
  query GetMobileBankingAccountsForTransactions {
    allMobileUserAccounts {
      id
      context
      accountNumber
      holderName
      accountName
      accountType
      isActive
      currency
    }
  }
`;

const CREATE_TRANSACTION = gql`
  mutation CreateTransaction($input: CreateTransactionInput!) {
    createTransaction(input: $input) {
      success
      message
      errors
      transaction {
        id
        reference
        status
        transferContext
      }
    }
  }
`;

type TransactionRow = {
  id: string;
  reference: string;
  type: string;
  source: string;
  status: string;
  transferType?: string | null;
  transferContext?: string | null;
  amount: string | number;
  currency: string;
  description: string;
  fromAccountNumber?: string | null;
  toAccountNumber?: string | null;
  createdAt: string;
};

type TransactionHistoryRow = {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  retryNumber?: number | null;
  createdAt: string;
};

export default function MobileBankingTransactionsPage() {
  const { translate } = useI18n();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [fromAccountOpen, setFromAccountOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyTransactionId, setHistoryTransactionId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<{
    transferType: string;
    amount: string;
    currency: string;
    description: string;
    toAccountNumber: string;
    fromAccountId: string;
  }>({
    transferType: "FDH_BANK",
    amount: "",
    currency: "MWK",
    description: "Transfer",
    toAccountNumber: "",
    fromAccountId: "",
  });

  const [loadHistory, { data: historyData, loading: historyLoading, error: historyError }] =
    useLazyQuery(GET_TRANSACTION_HISTORY, {
      fetchPolicy: "network-only",
    });

  const {
    data: accountsData,
    loading: accountsLoading,
    error: accountsError,
  } = useQuery(GET_MOBILE_BANKING_ACCOUNTS);
  const mobileBankingAccounts = ((accountsData?.allMobileUserAccounts ?? []) as any[]).filter(
    (a) => a?.context === "MOBILE_BANKING" && a?.isActive
  );
  const selectedFromAccount = mobileBankingAccounts.find(
    (a) => String(a?.id) === String(form.fromAccountId)
  );

  const { data, loading, error, refetch } = useQuery(
    GET_MOBILE_BANKING_TRANSACTIONS,
    {
      variables: {
        filter: {
          context: "MOBILE_BANKING",
        },
        page: 1,
        limit: 50,
      },
    }
  );

  const [createTransaction, { loading: creating }] = useMutation(CREATE_TRANSACTION, {
    onCompleted: async (result) => {
      const payload = result?.createTransaction;
      if (payload?.success) {
        toast.success(payload.message || "Transaction created");
        setDialogOpen(false);
        setForm({
          transferType: "FDH_BANK",
          amount: "",
          currency: "MWK",
          description: "Transfer",
          toAccountNumber: "",
          fromAccountId: "",
        });
        await refetch();
      } else {
        toast.error(payload?.message || "Failed to create transaction", {
          description: (payload?.errors || []).join("\n"),
        });
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create transaction");
    },
  });

  const rows = (data?.proxyTransactions?.transactions ?? []) as TransactionRow[];

  const columns: DataTableColumn<TransactionRow>[] = [
    {
      id: "reference",
      header: COMMON_TABLE_HEADERS.reference,
      accessor: (row) => (
        <span className="font-mono font-medium">{row.reference}</span>
      ),
      sortKey: "reference",
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => getStatusPill(row.status, translate),
      sortKey: "status",
      alignCenter: true,
    },
    {
      id: "type",
      header: translate("common.table.columns.type"),
      accessor: (row) => row.type,
      sortKey: "type",
      alignCenter: true,
    },
    {
      id: "transferType",
      header: translate("common.table.columns.transactionType"),
      accessor: (row) => getTransferTypeLabel(row.transferType),
      sortKey: "transferType",
      alignCenter: true,
    },
    {
      id: "fromAccountNumber",
      header: translate("common.table.columns.fromAccount"),
      accessor: (row) => (
        <span className="font-mono">{row.fromAccountNumber ?? "-"}</span>
      ),
    },
    {
      id: "toAccountNumber",
      header: translate("common.table.columns.toAccount"),
      accessor: (row) => (
        <span className="font-mono">{row.toAccountNumber ?? "-"}</span>
      ),
    },
    {
      id: "amount",
      header: COMMON_TABLE_HEADERS.amount,
      accessor: (row) => (
        <span className="font-medium">
          {row.amount} {row.currency}
        </span>
      ),
      sortKey: "amount",
      alignRight: true,
    },
    {
      id: "createdAt",
      header: COMMON_TABLE_HEADERS.createdAt,
      accessor: (row) => new Date(row.createdAt).toLocaleString(),
      sortKey: "createdAt",
      alignCenter: true,
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => {
        const actions = [
          {
            key: "history",
            label: translate("common.actions.history"),
            icon: <History className="h-4 w-4" />,
            onClick: () => {
              setHistoryTransactionId(row.id);
              setHistoryOpen(true);
              void loadHistory({ variables: { id: row.id } });
            },
          },
        ];

        if (actions.length <= 3) {
          return (
            <div className="flex justify-center gap-2">
              {actions.map((action) => (
                <Button
                  key={action.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                  onClick={action.onClick}
                >
                  <span className="mr-2">{action.icon}</span>
                  {action.label}
                </Button>
              ))}
            </div>
          );
        }

        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  {translate("common.actions.actions")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => (
                  <DropdownMenuItem key={action.key} onClick={action.onClick}>
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      alignCenter: true,
    },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fromAccountId) {
      toast.error("Please select a source account");
      return;
    }

    if (!form.toAccountNumber?.trim()) {
      toast.error("Please provide a destination account number");
      return;
    }

    await createTransaction({
      variables: {
        input: {
          type: "TRANSFER",
          context: "MOBILE_BANKING",
          transferType: form.transferType,
          amount: form.amount,
          currency: form.currency,
          description: form.description,
          fromAccountId: Number(form.fromAccountId),
          toAccountNumber: form.toAccountNumber.trim(),
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{translate("sidebar.transactions")}</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {translate("common.actions.add")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {translate("common.actions.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">
              {translate("common.state.loading")}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {translate("common.state.error")}: {error.message}
            </p>
          )}
          {!loading && !error && (
            <DataTable<TransactionRow>
              data={rows}
              columns={columns}
              searchableKeys={[
                "reference",
                "status",
                "type",
                "fromAccountNumber",
                "toAccountNumber",
                "description",
              ]}
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder={
                translate("common.actions.search") || "Search transactions..."
              }
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (!open) {
            setHistoryTransactionId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate("common.actions.history")}</DialogTitle>
            <DialogDescription>
              {historyData?.proxyTransaction?.reference
                ? `#${historyData.proxyTransaction.reference}`
                : historyTransactionId
                  ? `#${historyTransactionId}`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          {historyLoading && (
            <div className="text-sm text-muted-foreground">
              {translate("common.state.loading")}
            </div>
          )}

          {historyError && (
            <div className="text-sm text-destructive">{historyError.message}</div>
          )}

          {!historyLoading && !historyError && (
            <div className="space-y-2">
              {((historyData?.proxyTransaction?.statusHistory ?? []) as TransactionHistoryRow[])
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {translateStatusOneWord(item.fromStatus, translate, item.fromStatus)}
                        {" "}→{" "}
                        {translateStatusOneWord(item.toStatus, translate, item.toStatus)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                        {item.retryNumber != null ? ` • Retry #${item.retryNumber}` : ""}
                      </div>
                      {item.reason ? (
                        <div className="text-sm text-muted-foreground">
                          {item.reason}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

              {((historyData?.proxyTransaction?.statusHistory ?? []) as TransactionHistoryRow[])
                .length === 0 && (
                <div className="text-sm text-muted-foreground">No history found</div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHistoryOpen(false)}>
              {translate("common.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate("common.actions.create")}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{translate("common.table.columns.transactionType")}</Label>
              <Select
                value={form.transferType}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, transferType: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFER_TYPE_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{translate("common.table.columns.amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{translate("common.table.columns.currency")}</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{translate("common.table.columns.description")}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{translate("common.table.columns.fromAccount")}</Label>
                <Popover open={fromAccountOpen} onOpenChange={setFromAccountOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={fromAccountOpen}
                      className="w-full justify-between"
                      disabled={accountsLoading || !!accountsError || mobileBankingAccounts.length === 0}
                    >
                      {selectedFromAccount ? (
                        <div className="flex flex-col items-start">
                          <span className="font-mono font-medium">
                            {selectedFromAccount.accountNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(
                              selectedFromAccount.holderName ||
                              selectedFromAccount.accountName ||
                              "-"
                            ).toString()} • {(selectedFromAccount.accountType || "-").toString()}
                          </span>
                        </div>
                      ) : accountsLoading ? (
                        <span>Loading accounts...</span>
                      ) : accountsError ? (
                        <span>Failed to load accounts</span>
                      ) : mobileBankingAccounts.length === 0 ? (
                        <span>No MOBILE_BANKING accounts found</span>
                      ) : (
                        <span>Select account</span>
                      )}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search accounts..." />
                      <CommandList>
                        <CommandEmpty>No account found.</CommandEmpty>
                        <CommandGroup>
                          {mobileBankingAccounts.map((account) => {
                            const isSelected = String(form.fromAccountId) === String(account.id);
                            const sub = `${(account.holderName || account.accountName || "-").toString()} • ${(account.accountType || "-").toString()}`;

                            return (
                              <CommandItem
                                key={account.id}
                                value={`${account.accountNumber} ${sub}`}
                                onSelect={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    fromAccountId: String(account.id),
                                  }));
                                  setFromAccountOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 size-4 ${
                                    isSelected ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-mono font-medium">
                                    {account.accountNumber}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {sub}
                                  </span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{translate("common.table.columns.toAccount")}</Label>
                <Input
                  value={form.toAccountNumber}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, toAccountNumber: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {translate("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={creating || accountsLoading || mobileBankingAccounts.length === 0 || !form.fromAccountId}>
                {creating ? translate("common.state.creating") : translate("common.actions.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
