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
                            <Label htmlFor="code" className="text-right">
                                Code
                            </Label>
                            <Input
                                id="code"
                                name="code"
                                defaultValue={initialData?.code}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="swiftCode" className="text-right">
                                Swift Code
                            </Label>
                            <Input
                                id="swiftCode"
                                name="swiftCode"
                                defaultValue={initialData?.swiftCode || ""}
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
        </Dialog>
    );
}
