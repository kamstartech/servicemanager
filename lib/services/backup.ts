import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { prisma } from "@/lib/db/prisma";
import { uploadFile, downloadFile, deleteFile, BUCKETS } from "@/lib/storage/minio";

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
    async createBackup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `backup-${timestamp}.sql`;
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

            // Upload to MinIO storage
            let storageUrl: string | null = null;
            try {
                const fileBuffer = fs.readFileSync(filepath);
                const result = await uploadFile(
                    BUCKETS.BACKUPS,
                    filename,
                    fileBuffer,
                    {
                        "Content-Type": "application/sql",
                        "X-Backup-Timestamp": timestamp,
                        "X-Database": "service_manager",
                    }
                );
                storageUrl = result.url;
                console.log(`✅ Backup uploaded to MinIO: ${storageUrl}`);
            } catch (storageError) {
                console.error("⚠️ Failed to upload backup to MinIO:", storageError);
                // Continue anyway - we still have local backup
            }

            // Save to database
            await prisma.backup.create({
                data: {
                    filename,
                    sizeBytes: BigInt(stats.size),
                    storageUrl,
                },
            });

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
     * Restore database from a backup
     */
    async restoreBackup(backupId: string): Promise<boolean> {
        const backup = await prisma.backup.findUnique({
            where: { id: backupId },
        });

        if (!backup) throw new Error("Backup not found");

        let filepath = path.join(BACKUP_DIR, backup.filename);
        
        // If file doesn't exist locally but we have storage URL, download from MinIO
        if (!fs.existsSync(filepath) && backup.storageUrl) {
            console.log("📥 Downloading backup from MinIO storage...");
            try {
                const fileBuffer = await downloadFile(BUCKETS.BACKUPS, backup.filename);
                fs.writeFileSync(filepath, fileBuffer);
                console.log("✅ Backup downloaded successfully");
            } catch (error) {
                throw new Error(`Failed to download backup from storage: ${error}`);
            }
        } else if (!fs.existsSync(filepath)) {
            throw new Error("Backup file not found locally or in storage");
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL is not defined");

        try {
            // Use pg_restore (or psql for plain sql) to restore
            // WARNING: This will overwrite data. pg_restore --clean equivalent logic might be needed
            // Since we generate SQL files with pg_dump (default format), we use psql to restore
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
    async deleteBackup(backupId: string): Promise<boolean> {
        const backup = await prisma.backup.findUnique({
            where: { id: backupId },
        });

        if (!backup) return false;

        const filepath = path.join(BACKUP_DIR, backup.filename);

        // Delete from MinIO storage if it exists there
        if (backup.storageUrl) {
            try {
                await deleteFile(BUCKETS.BACKUPS, backup.filename);
                console.log(`✅ Deleted backup from MinIO: ${backup.filename}`);
            } catch (error) {
                console.error("⚠️ Failed to delete backup from MinIO:", error);
                // Continue anyway
            }
        }

        // Delete from DB
        await prisma.backup.delete({
            where: { id: backupId },
        });

        // Then delete local file if it exists
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        return true;
    }

    /**
     * Get absolute path for download
     */
    async getBackupPath(backupId: string): Promise<string> {
        const backup = await prisma.backup.findUnique({
            where: { id: backupId },
        });

        if (!backup) throw new Error("Backup not found");

        const filepath = path.resolve(BACKUP_DIR, backup.filename);
        
        // If file doesn't exist locally but we have storage URL, download from MinIO
        if (!fs.existsSync(filepath) && backup.storageUrl) {
            console.log("📥 Downloading backup from MinIO for download...");
            try {
                const fileBuffer = await downloadFile(BUCKETS.BACKUPS, backup.filename);
                fs.writeFileSync(filepath, fileBuffer);
                console.log("✅ Backup ready for download");
            } catch (error) {
                throw new Error(`Failed to download backup from storage: ${error}`);
            }
        } else if (!fs.existsSync(filepath)) {
            throw new Error("Backup file not found locally or in storage");
        }

        return filepath;
    }

    /**
     * Upload a backup file
     */
    async uploadBackup(fileBuffer: Buffer, originalFilename: string): Promise<string> {
        // Validate filename
        if (!originalFilename.endsWith('.sql')) {
            throw new Error("Only .sql files are allowed");
        }

        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `uploaded-${timestamp}-${sanitizedName}`;
        const filepath = path.join(BACKUP_DIR, filename);

        try {
            // Save file locally
            fs.writeFileSync(filepath, fileBuffer);
            const stats = fs.statSync(filepath);

            // Upload to MinIO storage
            let storageUrl: string | null = null;
            try {
                const result = await uploadFile(
                    BUCKETS.BACKUPS,
                    filename,
                    fileBuffer,
                    {
                        "Content-Type": "application/sql",
                        "X-Backup-Timestamp": timestamp,
                        "X-Backup-Type": "uploaded",
                        "X-Original-Filename": originalFilename,
                    }
                );
                storageUrl = result.url;
                console.log(`✅ Uploaded backup to MinIO: ${storageUrl}`);
            } catch (storageError) {
                console.error("⚠️ Failed to upload backup to MinIO:", storageError);
                // Continue anyway - we still have local backup
            }

            // Save to database
            await prisma.backup.create({
                data: {
                    filename,
                    sizeBytes: BigInt(stats.size),
                    storageUrl,
                },
            });

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
