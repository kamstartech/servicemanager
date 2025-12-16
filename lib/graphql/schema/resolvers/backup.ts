import { backupService } from "@/lib/services/backup";
import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";

function requireAdminContext(ctx: GraphQLContext) {
    const context = ctx.auth?.context;
    if (context !== "ADMIN" && context !== "ADMIN_WEB") {
        throw new Error("Forbidden");
    }
}

export const backupResolvers = {
    Query: {
        async backups(_parent: unknown, _args: unknown, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            // Cast to any because backup model might not be in types yet
            const backups = await (prisma as any).backup.findMany({
                orderBy: { createdAt: "desc" },
            });

            return backups.map((b: any) => ({
                ...b,
                createdAt: b.createdAt.toISOString(),
                sizeBytes: b.sizeBytes.toString(), // Convert BigInt to string
            }));
        },
    },

    Mutation: {
        async createBackup(_parent: unknown, _args: unknown, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            const filename = await backupService.createBackup();
            const backup = await (prisma as any).backup.findUnique({ where: { filename } });

            if (!backup) throw new Error("Backup created but record not found");

            return {
                ...backup,
                createdAt: backup.createdAt.toISOString(),
                sizeBytes: backup.sizeBytes.toString(),
            };
        },

        async restoreBackup(_parent: unknown, args: { id: string }, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            return await backupService.restoreBackup(args.id);
        },

        async deleteBackup(_parent: unknown, args: { id: string }, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            return await backupService.deleteBackup(args.id);
        },
    },
};
