"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { Plus, Pencil, Eye } from "lucide-react";
import Link from "next/link";
import { ExternalBank } from "@prisma/client";
import { ExternalBankDialog } from "./external-bank-dialog";

interface ExternalBanksClientViewProps {
    banks: ExternalBank[];
}

export function ExternalBanksClientView({
    banks,
}: ExternalBanksClientViewProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
    const [selectedBank, setSelectedBank] = useState<ExternalBank | null>(null);

    const openCreate = () => {
        setSelectedBank(null);
        setDialogMode("create");
        setIsDialogOpen(true);
    };

    const openEdit = (bank: ExternalBank) => {
        setSelectedBank(bank);
        setDialogMode("edit");
        setIsDialogOpen(true);
    };

    const columns: DataTableColumn<ExternalBank>[] = [
        {
            id: "name",
            header: COMMON_TABLE_HEADERS.name,
            accessor: (row) => row.name,
            sortKey: "name",
        },
        {
            id: "type",
            header: COMMON_TABLE_HEADERS.type,
            accessor: (row) => row.type === "WALLET" ? "WALLET" : "Bank",
            sortKey: "type",
        },
        {
            id: "code",
            header: COMMON_TABLE_HEADERS.code,
            accessor: (row) => row.code,
            sortKey: "code",
        },
        {
            id: "externalRef",
            header: COMMON_TABLE_HEADERS.externalRef,
            accessor: (row) => row.institutionCode || "-",
            sortKey: "institutionCode",
        },
        {
            id: "actions",
            header: COMMON_TABLE_HEADERS.actions,
            accessor: (row) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(row)}
                        title="Edit Details"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="Manage Branches">
                        <Link href={`/system/external-banks/${row.id}`}>
                            <Eye className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">External Banks</h1>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Bank
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configured Banks</CardTitle>
                    <CardDescription>
                        Manage external banks.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        data={banks}
                        columns={columns}
                        searchableKeys={["name", "type", "code", "institutionCode"]}
                        pageSize={25}
                        searchPlaceholder="Search banks..."
                        showRowNumbers
                        emptyStateText="No banks configured yet."
                    />
                </CardContent>
            </Card>

            <ExternalBankDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode={dialogMode}
                initialData={selectedBank}
            />
        </div>
    );
}
