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
import { ExternalBankDialog } from "./external-bank-dialog";
import { BranchList } from "./branch-list";
import { ExternalBank, ExternalBankBranch } from "@prisma/client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface ExternalBankDetailsViewProps {
    bank: ExternalBank & { branches: ExternalBankBranch[] };
}

export function ExternalBankDetailsView({ bank }: ExternalBankDetailsViewProps) {
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold">{bank.name}</h1>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Bank Details</CardTitle>
                        <CardDescription>Basic information</CardDescription>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                        Edit Details
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="text-lg">{bank.name}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Code</p>
                            <p className="text-lg font-mono">{bank.code}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Swift Code</p>
                            <p className="text-lg font-mono">{bank.swiftCode || "-"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <BranchList bankId={bank.id} branches={bank.branches} />

            <ExternalBankDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                mode="edit"
                initialData={bank}
            />
        </div>
    );
}
