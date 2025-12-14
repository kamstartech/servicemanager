"use client";

import { useMemo, useState } from "react";
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

export type DataTableColumn<T> = {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortKey?: keyof T;
  alignRight?: boolean;
  width?: string | number;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  searchableKeys?: (keyof T)[];
  initialSortKey?: keyof T;
  pageSize?: number;
  searchPlaceholder?: string;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchableKeys = [],
  initialSortKey,
  pageSize = 10,
  searchPlaceholder = "Search",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | undefined>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);

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
        <Table className="min-w-max table-auto">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={
                    (column.sortKey ? "cursor-pointer select-none " : "") +
                    "whitespace-nowrap"
                  }
                  onClick={() => toggleSort(column.sortKey)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={
                      column.alignRight
                        ? "text-right whitespace-normal break-words"
                        : "whitespace-normal break-words"
                    }
                  >
                    {column.accessor(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {pageItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
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
