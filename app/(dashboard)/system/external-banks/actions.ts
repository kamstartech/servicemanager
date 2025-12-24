"use server";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ==========================================
// Bank Actions
// ==========================================

export async function getExternalBanks() {
    return await prisma.externalBank.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { branches: true },
            },
        },
    });
}

export async function getExternalBank(id: string) {
    return await prisma.externalBank.findUnique({
        where: { id },
        include: {
            branches: {
                orderBy: { name: "asc" },
            },
        },
    });
}

export async function upsertExternalBank(
    prevState: any,
    formData: FormData
) {
    const id = formData.get("id") as string | null;
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const swiftCode = formData.get("swiftCode") as string | null;

    try {
        if (id) {
            await prisma.externalBank.update({
                where: { id },
                data: { name, code, swiftCode },
            });
        } else {
            await prisma.externalBank.create({
                data: { name, code, swiftCode },
            });
        }

        revalidatePath("/system/external-banks");
        return { success: true, message: "Bank saved successfully" };
    } catch (error) {
        console.error("Failed to save bank:", error);
        return { success: false, message: "Failed to save bank" };
    }
}

export async function deleteExternalBank(id: string) {
    try {
        await prisma.externalBank.delete({
            where: { id },
        });
        revalidatePath("/system/external-banks");
        return { success: true, message: "Bank deleted successfully" };
    } catch (error) {
        return { success: false, message: "Failed to delete bank" };
    }
}

// ==========================================
// Branch Actions
// ==========================================

export async function getExternalBankBranches(bankId: string) {
    return await prisma.externalBankBranch.findMany({
        where: { externalBankId: bankId },
        orderBy: { name: "asc" },
    });
}

export async function upsertExternalBankBranch(
    prevState: any,
    formData: FormData
) {
    const id = formData.get("id") as string | null;
    const bankId = formData.get("bankId") as string;
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;

    try {
        if (id) {
            await prisma.externalBankBranch.update({
                where: { id },
                data: { name, code },
            });
        } else {
            await prisma.externalBankBranch.create({
                data: {
                    name,
                    code,
                    externalBank: {
                        connect: { id: bankId }
                    }
                },
            });
        }

        revalidatePath(`/system/external-banks/${bankId}`);
        return { success: true, message: "Branch saved successfully" };
    } catch (error) {
        console.error("Failed to save branch:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return { success: false, message: "A branch with this code already exists for this bank." };
            }
        }
        return { success: false, message: "Failed to save branch" };
    }
}

export async function deleteExternalBankBranch(id: string, bankId: string) {
    try {
        await prisma.externalBankBranch.delete({
            where: { id },
        });
        revalidatePath(`/system/external-banks/${bankId}`);
        return { success: true, message: "Branch deleted successfully" };
    } catch (error) {
        return { success: false, message: "Failed to delete branch" };
    }
}
