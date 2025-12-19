import { backupService } from "@/lib/services/backup";
import type { GraphQLContext } from "@/lib/graphql/context";

function requireAdminContext(ctx: GraphQLContext) {
    const context = ctx.auth?.context;
    if (context !== "ADMIN" && context !== "ADMIN_WEB") {
        throw new Error("Forbidden");
    }
}

function getUserContext(ctx: GraphQLContext) {
    const userId = ctx.auth?.userId;
    const adminUser = ctx.adminUser;

    if (!userId) {
        throw new Error("User not authenticated");
    }

    // Extract user info from admin user object or use defaults
    const email = adminUser?.email || "unknown";
    const name = adminUser?.name || `User ${userId}`;

    return {
        userId: userId.toString(),
        email,
        name
    };
}

export const backupResolvers = {
    Query: {
        async backups(_parent: unknown, _args: unknown, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            // Read backups directly from MinIO
            return await backupService.listBackups();
        },
    },

    Mutation: {
        async createBackup(_parent: unknown, _args: unknown, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            const userContext = getUserContext(ctx);
            const filename = await backupService.createBackup(userContext);

            // Return backup info from MinIO metadata
            const backups = await backupService.listBackups();
            const backup = backups.find(b => b.filename === filename);

            if (!backup) throw new Error("Backup created but not found in storage");

            return backup;
        },

        async restoreBackup(_parent: unknown, args: { filename: string }, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            return await backupService.restoreBackup(args.filename);
        },

        async deleteBackup(_parent: unknown, args: { filename: string }, ctx: GraphQLContext) {
            requireAdminContext(ctx);
            return await backupService.deleteBackup(args.filename);
        },
    },
};
