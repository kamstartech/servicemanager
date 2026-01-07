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
                        {mode === "create" ? "Add External Bank" : "Edit External Bank"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Add a new external bank to the system."
                            : "Update external bank details."}
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction}>
                    <div className="grid gap-4 py-4">
                        <input type="hidden" name="id" value={initialData?.id || ""} />
                        <input type="hidden" name="type" value={selectedType} />

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
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
                                Type
                            </Label>
                            <Select
                                value={selectedType}
                                onValueChange={setSelectedType}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BANK">Bank</SelectItem>
                                    <SelectItem value="WALLET">Mobile Network Operator</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">
                                Sort Code
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
                                Inst. Code
                            </Label>
                            <Input
                                id="institutionCode"
                                name="institutionCode"
                                defaultValue={initialData?.institutionCode || ""}
                                placeholder="Optional"
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
