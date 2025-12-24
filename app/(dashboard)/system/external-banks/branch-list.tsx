"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalBankBranch } from "@prisma/client";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useState, useActionState, useEffect } from "react";
import { deleteExternalBankBranch, upsertExternalBankBranch } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BranchListProps {
    bankId: string;
    branches: ExternalBankBranch[];
}

export function BranchList({ bankId, branches }: BranchListProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<ExternalBankBranch | null>(
        null
    );

    const openNew = () => {
        setEditingBranch(null);
        setIsDialogOpen(true);
    };

    const openEdit = (branch: ExternalBankBranch) => {
        setEditingBranch(branch);
        setIsDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Branches</CardTitle>
                    <CardDescription>
                        Manage branch codes for this bank.
                    </CardDescription>
                </div>
                <Button onClick={openNew} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Branch
                </Button>
            </CardHeader>
            <CardContent>
                <BranchDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    bankId={bankId}
                    initialData={editingBranch}
                />

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Branch Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {branches.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="text-center text-muted-foreground h-24"
                                >
                                    No branches added yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            branches.map((branch) => (
                                <TableRow key={branch.id}>
                                    <TableCell>{branch.name}</TableCell>
                                    <TableCell className="font-mono">{branch.code}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(branch)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <DeleteBranchButton id={branch.id} bankId={bankId} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function BranchDialog({
    isOpen,
    onOpenChange,
    bankId,
    initialData,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    bankId: string;
    initialData: ExternalBankBranch | null;
}) {
    const [state, formAction, isPending] = useActionState(
        upsertExternalBankBranch,
        {
            message: "",
            success: false,
        }
    );

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast.success(state.message);
                onOpenChange(false);
            } else {
                toast.error(state.message);
            }
        }
    }, [state, onOpenChange]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? "Edit Branch" : "Add Branch"}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? "Update branch details."
                            : "Add a new branch code for this bank."}
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="bankId" value={bankId} />
                    <input type="hidden" name="id" value={initialData?.id || ""} />

                    <div className="space-y-2">
                        <Label htmlFor="branchName">Branch Name</Label>
                        <Input
                            id="branchName"
                            name="name"
                            placeholder="e.g. Blantyre Branch"
                            defaultValue={initialData?.name}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="branchCode">Branch Code</Label>
                        <Input
                            id="branchCode"
                            name="code"
                            placeholder="e.g. 001"
                            defaultValue={initialData?.code}
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save Branch"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteBranchButton({ id, bankId }: { id: string, bankId: string }) {
    const router = useRouter();
    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this branch?")) return;

        const result = await deleteExternalBankBranch(id, bankId);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    }

    return (
        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
