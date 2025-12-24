
"use client";

import { updateSuspenseAccounts } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

interface SettingsFormProps {
    inboundSuspenseAccount: string | null;
    outboundSuspenseAccount: string | null;
}

export function SettingsForm({ inboundSuspenseAccount, outboundSuspenseAccount }: SettingsFormProps) {
    const { translate } = useI18n();
    const [state, formAction, isPending] = useActionState(updateSuspenseAccounts, {
        message: "",
        success: false,
    });

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast.success("Success", {
                    description: state.message,
                });
            } else {
                toast.error("Error", {
                    description: state.message,
                });
            }
        }
    }, [state]);

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-8">{translate("systemSettings.title")}</h1>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Suspense Accounts</CardTitle>
                        <CardDescription>
                            Configure the accounts used for holding funds during processing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction} className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="suspense_account_inbound">
                                    Inbound Suspense Account
                                </Label>
                                <Input
                                    type="text"
                                    id="suspense_account_inbound"
                                    name="suspense_account_inbound"
                                    defaultValue={inboundSuspenseAccount || ""}
                                    placeholder="e.g. 1520000114607"
                                />
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="suspense_account_outbound">
                                    Outbound Suspense Account
                                </Label>
                                <Input
                                    type="text"
                                    id="suspense_account_outbound"
                                    name="suspense_account_outbound"
                                    defaultValue={outboundSuspenseAccount || ""}
                                    placeholder="e.g. 1520000114608"
                                />
                            </div>

                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Saving..." : "Save Suspense Accounts"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
