import { prisma } from "@/lib/db/prisma";

export const externalBanksResolvers = {
    Query: {
        externalBanks: async () => {
            return await prisma.externalBank.findMany({
                where: { isActive: true },
                orderBy: { name: "asc" },
            });
        },
        externalBankProviders: async () => {
            return await prisma.externalBank.findMany({
                where: { 
                    isActive: true,
                    type: "BANK"
                },
                orderBy: { name: "asc" },
            });
        },
        externalWalletProviders: async () => {
            return await prisma.externalBank.findMany({
                where: { 
                    isActive: true,
                    type: "WALLET"
                },
                orderBy: { name: "asc" },
            });
        },
    },
    ExternalBank: {
        // No resolved fields needed as we query direct properties
    },
};
