import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { backupService } from "@/lib/services/backup";

/**
 * POST /api/backups/upload
 * Upload a backup file
 */
export const POST = withAuth(async (request: NextRequest) => {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        if (!file.name.endsWith('.sql')) {
            return NextResponse.json({ error: "Only .sql files are allowed" }, { status: 400 });
        }

        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File size exceeds 500MB limit" }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload the backup
        const filename = await backupService.uploadBackup(buffer, file.name);

        return NextResponse.json({
            success: true,
            message: "Backup uploaded successfully",
            filename,
        });
    } catch (error: any) {
        console.error("Upload failed:", error);
        return NextResponse.json(
            { error: error.message || "Upload failed" },
            { status: 500 }
        );
    }
});
