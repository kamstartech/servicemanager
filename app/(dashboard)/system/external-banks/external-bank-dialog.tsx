"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { ExternalBank } from "@prisma/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { COMMON_TABLE_HEADERS } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { upsertExternalBank } from "./actions";

interface ExternalBankDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: ExternalBank | null;
    mode: "create" | "edit";
}

export function ExternalBankDialog({
    open,
    onOpenChange,
    initialData,
    mode,
}: ExternalBankDialogProps) {
    const [state, formAction, isPending] = useActionState(upsertExternalBank, {
        message: "",
        success: false,
    });
    const [selectedType, setSelectedType] = useState<string>(
        initialData?.type || "BANK"
    );

    // Close dialog on success
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>
                                    {mode === "create" ? COMMON_TABLE_HEADERS.add : COMMON_TABLE_HEADERS.edit}
                                </DialogTitle>
                                <DialogDescription>
                                    {mode === "create" ? COMMON_TABLE_HEADERS.create : COMMON_TABLE_HEADERS.update}
                                </DialogDescription>
                </DialogHeader>
                <form action={formAction}>
                    <div className="grid gap-4 py-4">
                        <input type="hidden" name="id" value={initialData?.id || ""} />
                        <input type="hidden" name="type" value={selectedType} />

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                {COMMON_TABLE_HEADERS.name}
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={initialData?.name}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">
                                {COMMON_TABLE_HEADERS.type}
                            </Label>
                            <Select
                                value={selectedType}
                                onValueChange={setSelectedType}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                            <SelectItem value="BANK">{COMMON_TABLE_HEADERS.bank}</SelectItem>
                            <SelectItem value="WALLET">{COMMON_TABLE_HEADERS.wallet}</SelectItem>
                            </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="code" className="text-right">
                                {COMMON_TABLE_HEADERS.code}
                            </Label>
                            <Input
                                id="code"
                                name="code"
                                defaultValue={initialData?.code}
                                placeholder="e.g. 050015"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="institutionCode" className="text-right">
                                {COMMON_TABLE_HEADERS.institutionCode}
                            </Label>
                            <Input
                                id="institutionCode"
                                name="institutionCode"
                                defaultValue={initialData?.institutionCode || ""}
                                placeholder={COMMON_TABLE_HEADERS.description}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>
                                {COMMON_TABLE_HEADERS.cancel}
                            </Button>
                        </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
