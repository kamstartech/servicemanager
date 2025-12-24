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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Eye } from "lucide-react";
import Link from "next/link";
import { ExternalBank } from "@prisma/client";
import { ExternalBankDialog } from "./external-bank-dialog";

interface ExternalBanksClientViewProps {
    banks: (ExternalBank & { _count: { branches: number } })[];
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
                        Manage external banks and their branch codes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bank Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Swift Code</TableHead>
                                <TableHead>Branches</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {banks.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="text-center text-muted-foreground h-24"
                                    >
                                        No banks configured yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                banks.map((bank) => (
                                    <TableRow key={bank.id}>
                                        <TableCell className="font-medium">{bank.name}</TableCell>
                                        <TableCell>{bank.code}</TableCell>
                                        <TableCell>{bank.swiftCode || "-"}</TableCell>
                                        <TableCell>{bank._count.branches}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(bank)}
                                                    title="Edit Details"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" asChild title="Manage Branches">
                                                    <Link href={`/system/external-banks/${bank.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
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
