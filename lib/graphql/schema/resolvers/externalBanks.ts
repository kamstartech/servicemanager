import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";
import { requireAuth } from "@/lib/graphql/auth-guard";

export const externalBanksResolvers = {
    Query: {
        externalBanks: async (_: unknown, __: unknown, context: GraphQLContext) => {
            requireAuth(context);

            return await prisma.externalBank.findMany({
                where: { isActive: true },
                orderBy: { name: "asc" },
            });
        },
    },
    ExternalBank: {
        // No resolved fields needed as we query direct properties
    },
};
