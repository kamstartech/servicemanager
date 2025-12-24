"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

// ==========================================
// Bank Actions
// ==========================================

export async function getExternalBanks() {
    const result = await prisma.externalBank.findMany({
        orderBy: { name: "asc" },
    });
    return result;
}

export async function getExternalBank(id: string) {
    if (id === "new") return null;
    const result = await prisma.externalBank.findUnique({
        where: { id },
    });
    return result;
}

export async function upsertExternalBank(
    prevState: any,
    formData: FormData
) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const code = formData.get("code") as string; // Sort Code
    const institutionCode = formData.get("institutionCode") as string;

    if (!name || !code) {
        return { success: false, message: "Name and Sort Code are required" };
    }

    try {
        if (id && id !== "new") {
            await prisma.externalBank.update({
                where: { id },
                data: { name, code, institutionCode },
            });
        } else {
            await prisma.externalBank.create({
                data: { name, code, institutionCode },
            });
        }

        revalidatePath("/system/external-banks");
        if (id && id !== "new") {
            revalidatePath(`/system/external-banks/${id}`);
        }

        return { success: true, message: "Bank saved successfully" };
    } catch (error: any) {
        console.error("Error saving external bank:", error);
        if (error.code === 'P2002') {
            return { success: false, message: "Sort Code must be unique." };
        }
        return { success: false, message: "Failed to save external bank" };
    }
}

export async function deleteExternalBank(id: string | undefined) {
    if (!id) return { success: false, message: "ID is required" };
    try {
        await prisma.externalBank.delete({
            where: { id },
        });
        revalidatePath("/system/external-banks");
        return { success: true, message: "Bank deleted successfully" };
    } catch (error) {
        console.error("Error deleting external bank:", error);
        return { success: false, message: "Failed to delete external bank" };
    }
}
