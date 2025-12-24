
"use server";

import { ConfigurationService } from "@/lib/services/configuration-service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SettingSchema = z.object({
    key: z.string().min(1),
    value: z.string().min(1),
    description: z.string().optional(),
});

export async function updateSystemSetting(prevState: unknown, formData: FormData) {
    try {
        const rawData = {
            key: formData.get("key"),
            value: formData.get("value"),
            description: formData.get("description"),
        };

        const validatedData = SettingSchema.parse(rawData);

        await ConfigurationService.set(
            validatedData.key,
            validatedData.value,
            validatedData.description || undefined
        );

        revalidatePath("/system/settings");

        return { message: "Setting updated successfully", success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update setting";
        return { message, success: false };
    }
}

export async function updateSuspenseAccounts(prevState: unknown, formData: FormData) {
    try {
        const inbound = formData.get("suspense_account_inbound") as string;
        const outbound = formData.get("suspense_account_outbound") as string;

        if (!inbound || !outbound) {
            return { message: "Both Inbound and Outbound accounts are required", success: false };
        }

        await ConfigurationService.set(
            "suspense_account_inbound",
            inbound,
            "Account for holding inbound funds"
        );

        await ConfigurationService.set(
            "suspense_account_outbound",
            outbound,
            "Account for holding outbound funds"
        );

        revalidatePath("/system/settings");

        return { message: "Suspense accounts updated successfully", success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update suspense accounts";
        return { message, success: false };
    }
}
