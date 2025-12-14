import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { backupService } from "@/lib/services/backup";
import fs from "fs";

/**
 * GET /api/backups/[id]/download
 * Download a backup file
 */
export const GET = withAuth(async (request: NextRequest, user: any, params: any) => {
    // Ensure we have an ID
    const id = params?.id;
    if (!id) {
        return NextResponse.json({ error: "Backup ID required" }, { status: 400 });
    }

    try {
        const filepath = await backupService.getBackupPath(String(id));

        // Read file stream
        const fileBuffer = fs.readFileSync(filepath);
        const stats = fs.statSync(filepath);
        const fileName = filepath.split('/').pop() || 'backup.sql';

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/sql",
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Content-Length": stats.size.toString(),
            },
        });
    } catch (error) {
        console.error("Download failed:", error);
        return NextResponse.json({ error: "File not found or inaccessible" }, { status: 404 });
    }
});
