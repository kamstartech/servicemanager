import { backupService } from "@/lib/services/backup";
import { prisma } from "@/lib/db/prisma";

export const backupResolvers = {
    Query: {
        async backups() {
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
        async createBackup() {
            const filename = await backupService.createBackup();
            const backup = await (prisma as any).backup.findUnique({ where: { filename } });

            if (!backup) throw new Error("Backup created but record not found");

            return {
                ...backup,
                createdAt: backup.createdAt.toISOString(),
                sizeBytes: backup.sizeBytes.toString(),
            };
        },

        async restoreBackup(_parent: unknown, args: { id: string }) {
            return await backupService.restoreBackup(args.id);
        },

        async deleteBackup(_parent: unknown, args: { id: string }) {
            return await backupService.deleteBackup(args.id);
        },
    },
};
