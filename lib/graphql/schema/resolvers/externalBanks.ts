import { prisma } from "@/lib/db/prisma";

export const externalBanksResolvers = {
    Query: {
        externalBanks: async () => {
            return await prisma.externalBank.findMany({
                where: { isActive: true },
                orderBy: { name: "asc" },
                include: {
                    branches: {
                        where: { isActive: true },
                        orderBy: { name: "asc" },
                    },
                },
            });
        },
    },
    ExternalBank: {
        branches: async (parent: any) => {
            // If branches are already included (via include above), return them.
            // Otherwise fetch them.
            if (parent.branches) return parent.branches;

            return await prisma.externalBankBranch.findMany({
                where: { externalBankId: parent.id, isActive: true },
                orderBy: { name: "asc" },
            });
        },
    },
};
