"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const COMMON_TABLE_HEADERS = {
  index: "#",
  order: "Order",
  icon: "Icon",
  name: "Name",
  category: "Category",
  email: "Email",
  phoneNumber: "Phone number",
  customerNumber: "Customer number",
  username: "Username",
  status: "Status",
  active: "Active",
  testing: "Testing",
  created: "Created",
  createdAt: "Created At",
  dateTime: "Date & Time",
  actions: "Actions",
  accountNumber: "Account Number",
  customerInfo: "Customer Info",
  source: "Source",
  sourceIp: "Source IP",
  retries: "Retries",
  date: "Date",
  reference: "Reference",
  amount: "Amount",
  balance: "Balance",
  schema: "Schema",
  tableName: "Table name",
  serviceName: "Service Name",
  interval: "Interval",
  deviceName: "Device Name",
  modelOs: "Model / OS",
  lastUsed: "Last Used",
  device: "Device",
  ipAddress: "IP Address",
  failureReason: "Failure Reason",
  bank: "Bank",
  context: "Context",
  description: "Description",
  type: "Type",
  details: "Details",
} as const;

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  sortKey?: keyof T;
  alignRight?: boolean;
  alignCenter?: boolean;
  width?: string | number;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  searchableKeys?: (keyof T)[];
  initialSortKey?: keyof T;
  pageSize?: number;
  searchPlaceholder?: string;
  showRowNumbers?: boolean;
  rowNumberHeader?: React.ReactNode;
  initialSortDirection?: "asc" | "desc";
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchableKeys = [],
  initialSortKey,
  pageSize = 10,
  searchPlaceholder = "Search",
  showRowNumbers = false,
  rowNumberHeader = "#",
  initialSortDirection = "asc",
}: DataTableProps<T>) {
  const { translate } = useI18n();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | undefined>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection);
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);

  function normalizeHeader(value: string) {
    return value.toLowerCase().trim().replace(/\s+/g, " ");
  }

  const commonHeaderMap: Record<string, string> = {
    "#": "common.table.columns.index",
    "index": "common.table.columns.index",
    "order": "common.table.columns.order",
    "icon": "common.table.columns.icon",
    "name": "common.table.columns.name",
    "description": "common.table.columns.description",
    "category": "common.table.columns.category",
    "type": "common.table.columns.type",
    "label": "common.table.columns.label",
    "workflow": "common.table.columns.workflow",
    "version": "common.table.columns.version",
    "status": "common.table.columns.status",
    "active": "common.table.columns.active",
    "testing": "common.table.columns.testing",
    "email": "common.table.columns.email",
    "contact email": "common.table.columns.contactEmail",
    "phone": "common.table.columns.phone",
    "user name": "common.table.columns.username",
    "username": "common.table.columns.username",
    "username/phone": "common.table.columns.usernamePhone",
    "phone number": "common.table.columns.phoneNumber",
    "customer number": "common.table.columns.customerNumber",
    "account number": "common.table.columns.accountNumber",
    "context": "common.table.columns.context",
    "device": "common.table.columns.device",
    "device name": "common.table.columns.deviceName",
    "model / os": "common.table.columns.modelOs",
    "model/os": "common.table.columns.modelOs",
    "ip address": "common.table.columns.ipAddress",
    "failure reason": "common.table.columns.failureReason",
    "date": "common.table.columns.date",
    "date & time": "common.table.columns.dateTime",
    "date/time": "common.table.columns.dateTime",
    "reference": "common.table.columns.reference",
    "amount": "common.table.columns.amount",
    "balance": "common.table.columns.balance",
    "customer info": "common.table.columns.customerInfo",
    "source": "common.table.columns.source",
    "source ip": "common.table.columns.sourceIp",
    "retries": "common.table.columns.retries",
    "target table": "common.table.columns.targetTable",
    "last run": "common.table.columns.lastRun",
    "next run": "common.table.columns.nextRun",
    "filename": "common.table.columns.filename",
    "size": "common.table.columns.size",
    "tokens": "common.table.columns.tokens",
    "api calls": "common.table.columns.apiCalls",
    "attached to": "common.table.columns.attachedTo",
    "created": "common.table.columns.created",
    "created at": "common.table.columns.createdAt",
    "expires": "common.table.columns.expires",
    "usage": "common.table.columns.usage",
    "last used": "common.table.columns.lastUsed",
    "actions": "common.table.columns.actions",
    "details": "common.table.columns.details",
    "schema": "common.table.columns.schema",
    "table name": "common.table.columns.tableName",
    "service name": "common.table.columns.serviceName",
    "interval": "common.table.columns.interval",
  };

  function renderHeader(header: React.ReactNode) {
    if (typeof header !== "string") return header;
    const key = commonHeaderMap[normalizeHeader(header)];
    return key ? translate(key) : header;
  }

  const filteredAndSorted = useMemo(() => {
    const text = search.toLowerCase().trim();

    let items = data;

    if (text.length > 0 && searchableKeys.length > 0) {
      items = items.filter((item) => {
        return searchableKeys.some((key) => {
          const value = item[key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(text);
        });
      });
    }

    if (sortKey) {
      items = [...items].sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === "asc" ? -1 : 1;
        if (bValue == null) return sortDirection === "asc" ? 1 : -1;

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [data, search, searchableKeys, sortKey, sortDirection]);

  const total = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSizeState));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSizeState;
  const endIndex = startIndex + pageSizeState;
  const pageItems = filteredAndSorted.slice(startIndex, endIndex);

  function toggleSort(columnSortKey?: keyof T) {
    if (!columnSortKey) return;
    if (sortKey === columnSortKey) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(columnSortKey);
      setSortDirection("asc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="h-8 w-full max-w-xs text-sm"
        />
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-muted-foreground">Rows per page</span>
          <Input
            type="number"
            min={1}
            max={500}
            value={pageSizeState}
            onChange={(event) => {
              const next = Number(event.target.value) || 1;
              const clamped = Math.min(Math.max(next, 1), 500);
              setPageSizeState(clamped);
              setPage(1);
            }}
            className="h-8 w-20 text-sm"
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-max table-auto bg-white">
          <TableHeader className="bg-gray-50">
            <TableRow>
              {showRowNumbers && (
                <TableHead className="whitespace-nowrap text-center">
                  {renderHeader(rowNumberHeader)}
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={
                    (column.sortKey ? "cursor-pointer select-none " : "") +
                    (column.id === "actions"
                      ? "whitespace-nowrap text-center"
                      : column.alignRight
                        ? "whitespace-nowrap text-right"
                        : column.alignCenter
                          ? "whitespace-nowrap text-center"
                          : "whitespace-nowrap")
                  }
                  onClick={() => toggleSort(column.sortKey)}
                >
                  {renderHeader(column.header)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {pageItems.map((row, index) => (
              <TableRow key={index} className="hover:bg-gray-50">
                {showRowNumbers && (
                  <TableCell className="text-center whitespace-nowrap">
                    {startIndex + index + 1}
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={
                      column.id === "actions"
                        ? "text-center whitespace-normal break-words"
                        : column.alignRight
                          ? "text-right whitespace-normal break-words"
                          : column.alignCenter
                            ? "text-center whitespace-normal break-words"
                            : "whitespace-normal break-words"
                    }
                  >
                    {column.id === "actions" ? (
                      <div className="flex justify-center">{column.accessor(row)}</div>
                    ) : (
                      column.accessor(row)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showRowNumbers ? columns.length + 1 : columns.length}
                  className="text-center text-sm text-muted-foreground"
                >
                  No records to display.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Page {currentPage} of {totalPages} - {total} total records
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm">Go to page</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(event) => {
                const next = Number(event.target.value) || 1;
                const clamped = Math.min(Math.max(next, 1), totalPages);
                setPage(clamped);
              }}
              className="h-8 w-20 text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
