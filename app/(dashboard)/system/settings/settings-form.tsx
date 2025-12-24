
"use client";

import { updateSystemSetting } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/providers/i18n-provider";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

interface SettingsFormProps {
    suspenseAccount: string | null;
}

export function SettingsForm({ suspenseAccount }: SettingsFormProps) {
    const { translate } = useI18n();
    const [state, formAction, isPending] = useActionState(updateSystemSetting, {
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
                        <CardTitle>{translate("systemSettings.suspenseAccount.title")}</CardTitle>
                        <CardDescription>
                            {translate("systemSettings.suspenseAccount.description")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={formAction} className="space-y-4">
                            <input type="hidden" name="key" value="suspense_account" />
                            <input
                                type="hidden"
                                name="description"
                                value="Account for holding reserved funds"
                            />

                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="suspense_account_value">
                                    {translate("systemSettings.suspenseAccount.accountNumberLabel")}
                                </Label>
                                <Input
                                    type="text"
                                    id="suspense_account_value"
                                    name="value"
                                    defaultValue={suspenseAccount || "1520000114607"}
                                    placeholder={translate("systemSettings.suspenseAccount.placeholder")}
                                />
                            </div>

                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Saving..." : translate("systemSettings.suspenseAccount.saveButton")}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
