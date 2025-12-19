import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

import { uploadFile, downloadFile, deleteFile, listFiles, getFileMetadata, BUCKETS } from "@/lib/storage/minio";
import type { GraphQLContext } from "@/lib/graphql/context";

const execAsync = promisify(exec);
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");

// Ensure backup directory exists with proper error handling
try {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
} catch (error) {
    console.warn(`Warning: Could not create backup directory at ${BACKUP_DIR}. Backups may fail.`, error);
}

export class BackupService {
    /**
     * Create a new backup of the database
     */
    async createBackup(userContext?: { userId: string; email: string; name: string }): Promise<string> {
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const filenameSafeTimestamp = isoTimestamp.replace(/[:.]/g, "-");
        const filename = `backup-${filenameSafeTimestamp}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        // Database connection string from environment
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL is not defined");

        try {
            // Use pg_dump to create backup
            // Note: This requires pg_dump to be installed in the environment (e.g. Docker container)
            const command = `pg_dump "${dbUrl}" -f "${filepath}"`;
            await execAsync(command);

            const stats = fs.statSync(filepath);

            // Upload to MinIO storage with user attribution metadata
            try {
                const fileBuffer = fs.readFileSync(filepath);
                const metadata: Record<string, string> = {
                    "Content-Type": "application/sql",
                    "X-Backup-Timestamp": isoTimestamp, // Store valid ISO timestamp
                    "X-Database": "service_manager",
                    "X-Backup-Type": "manual",
                };

                // Add user attribution if provided
                if (userContext) {
                    metadata["X-Created-By-User-Id"] = userContext.userId;
                    metadata["X-Created-By-User-Email"] = userContext.email;
                    metadata["X-Created-By-User-Name"] = userContext.name;
                }

                const result = await uploadFile(
                    BUCKETS.BACKUPS,
                    filename,
                    fileBuffer,
                    metadata
                );
                console.log(`✅ Backup uploaded to MinIO: ${result.url}`);
            } catch (storageError) {
                console.error("⚠️ Failed to upload backup to MinIO:", storageError);
                throw new Error(`Failed to upload backup to storage: ${storageError}`);
            }

            return filename;
        } catch (error) {
            console.error("Backup failed:", error);
            // Cleanup file if it was created partially
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            throw new Error(`Backup failed: ${error}`);
        }
    }

    /**
     * List all backups from MinIO storage  
     */
    async listBackups(): Promise<Array<{
        filename: string;
        sizeBytes: string;
        createdAt: string;
        storageUrl: string;
        type: string;
        createdBy?: {
            userId: string;
            email: string;
            name: string;
        };
    }>> {
        try {
            const files = await listFiles(BUCKETS.BACKUPS);

            const backups = await Promise.all(
                files.filter(f => !!f.name).map(async (file) => {
                    try {
                        const metadata = await getFileMetadata(BUCKETS.BACKUPS, file.name!);
                        const meta = metadata.metaData || {};

                        return {
                            filename: file.name!,
                            sizeBytes: file.size?.toString() || "0",
                            createdAt: meta["x-backup-timestamp"] || file.lastModified?.toISOString() || new Date().toISOString(),
                            storageUrl: this.getMinIOUrl(file.name!),
                            type: meta["x-backup-type"] || "unknown",
                            createdBy: meta["x-created-by-user-id"] ? {
                                userId: meta["x-created-by-user-id"],
                                email: meta["x-created-by-user-email"] || "",
                                name: meta["x-created-by-user-name"] || "",
                            } : undefined,
                        };
                    } catch (error) {
                        console.error(`Failed to get metadata for ${file.name}:`, error);
                        return {
                            filename: file.name!,
                            sizeBytes: file.size?.toString() || "0",
                            createdAt: file.lastModified?.toISOString() || new Date().toISOString(),
                            storageUrl: this.getMinIOUrl(file.name!),
                            type: "unknown",
                        };
                    }
                })
            );
            return backups.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        } catch (error) {
            console.error("Failed to list backups:", error);
            throw new Error(`Failed to list backups: ${error}`);
        }
    }

    /**
     * Helper to generate MinIO URL
     */
    private getMinIOUrl(filename: string): string {
        const endpoint = process.env.MINIO_ENDPOINT || "localhost";
        const port = process.env.MINIO_PORT || "9000";
        const useSSL = process.env.MINIO_USE_SSL === "true";
        return `${useSSL ? "https" : "http"}://${endpoint}:${port}/${BUCKETS.BACKUPS}/${filename}`;
    }

    /**
     * Restore database from a backup
     */
    async restoreBackup(filename: string): Promise<boolean> {
        const filepath = path.join(BACKUP_DIR, filename);

        // Download from MinIO if not exists locally
        if (!fs.existsSync(filepath)) {
            console.log("📥 Downloading backup from MinIO storage...");
            try {
                const fileBuffer = await downloadFile(BUCKETS.BACKUPS, filename);
                fs.writeFileSync(filepath, fileBuffer);
                console.log("✅ Backup downloaded successfully");
            } catch (error) {
                throw new Error(`Failed to download backup from storage: ${error}`);
            }
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL is not defined");

        try {
            const command = `psql "${dbUrl}" < "${filepath}"`;
            await execAsync(command);
            return true;
        } catch (error) {
            console.error("Restore failed:", error);
            throw new Error(`Restore failed: ${error}`);
        }
    }

    /**
     * Delete a backup
     */
    async deleteBackup(filename: string): Promise<boolean> {
        const filepath = path.join(BACKUP_DIR, filename);

        // Delete from MinIO storage
        try {
            await deleteFile(BUCKETS.BACKUPS, filename);
            console.log(`✅ Deleted backup from MinIO: ${filename}`);
        } catch (error) {
            console.error("⚠️ Failed to delete backup from MinIO:", error);
            throw new Error(`Failed to delete backup: ${error}`);
        }

        // Delete local file if it exists
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        return true;
    }

    /**
     * Get absolute path for download
     */
    async getBackupPath(filename: string): Promise<string> {
        const filepath = path.resolve(BACKUP_DIR, filename);

        // Download from MinIO if not exists locally
        if (!fs.existsSync(filepath)) {
            console.log("📥 Downloading backup from MinIO for download...");
            try {
                const fileBuffer = await downloadFile(BUCKETS.BACKUPS, filename);
                fs.writeFileSync(filepath, fileBuffer);
                console.log("✅ Backup ready for download");
            } catch (error) {
                throw new Error(`Failed to download backup from storage: ${error}`);
            }
        }

        return filepath;
    }

    /**
     * Upload a backup file
     */
    async uploadBackup(
        fileBuffer: Buffer,
        originalFilename: string,
        userContext?: { userId: string; email: string; name: string }
    ): Promise<string> {
        // Validate filename
        if (!originalFilename.endsWith('.sql')) {
            throw new Error("Only .sql files are allowed");
        }

        // Generate unique filename with timestamp
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const filenameSafeTimestamp = isoTimestamp.replace(/[:.]/g, "-");
        const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `uploaded-${filenameSafeTimestamp}-${sanitizedName}`;
        const filepath = path.join(BACKUP_DIR, filename);

        try {
            // Save file locally
            fs.writeFileSync(filepath, fileBuffer);

            // Upload to MinIO storage with user attribution
            try {
                const metadata: Record<string, string> = {
                    "Content-Type": "application/sql",
                    "X-Backup-Timestamp": isoTimestamp, // Store valid ISO timestamp
                    "X-Backup-Type": "uploaded",
                    "X-Original-Filename": originalFilename,
                };

                // Add user attribution if provided
                if (userContext) {
                    metadata["X-Created-By-User-Id"] = userContext.userId;
                    metadata["X-Created-By-User-Email"] = userContext.email;
                    metadata["X-Created-By-User-Name"] = userContext.name;
                }

                const result = await uploadFile(
                    BUCKETS.BACKUPS,
                    filename,
                    fileBuffer,
                    metadata
                );
                console.log(`✅ Uploaded backup to MinIO: ${result.url}`);
            } catch (storageError) {
                console.error("⚠️ Failed to upload backup to MinIO:", storageError);
                throw new Error(`Failed to upload backup to storage: ${storageError}`);
            }

            return filename;
        } catch (error) {
            console.error("Upload failed:", error);
            // Cleanup file if it was created
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            throw new Error(`Upload failed: ${error}`);
        }
    }
}

export const backupService = new BackupService();
