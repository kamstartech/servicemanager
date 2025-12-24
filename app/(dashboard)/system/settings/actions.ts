
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
