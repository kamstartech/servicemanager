"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { Calendar, Download, Plus, RefreshCw, Trash2, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DataTable,
    type DataTableColumn,
} from "@/components/data-table";

const BACKUPS_QUERY = gql`
  query Backups {
    backups {
      id
      filename
      sizeBytes
      createdAt
    }
  }
`;

const CREATE_BACKUP = gql`
  mutation CreateBackup {
    createBackup {
      id
      filename
    }
  }
`;

const RESTORE_BACKUP = gql`
  mutation RestoreBackup($id: ID!) {
    restoreBackup(id: $id)
  }
`;

const DELETE_BACKUP = gql`
  mutation DeleteBackup($id: ID!) {
    deleteBackup(id: $id)
  }
`;

const BACKUP_SCHEDULE_QUERY = gql`
  query BackupSchedule {
    backupSchedule {
      id
      enabled
      time
      timeZone
      lastRunAt
      isRunning
    }
  }
`;

const UPDATE_BACKUP_SCHEDULE = gql`
  mutation UpdateBackupSchedule($input: BackupScheduleInput!) {
    updateBackupSchedule(input: $input) {
      id
      enabled
      time
      timeZone
      lastRunAt
      isRunning
    }
  }
`;

type BackupRow = {
    id: string;
    filename: string;
    sizeBytes: string; // BigInt serialized as string usually
    createdAt: string;
};

// Helper to format bytes
function formatBytes(bytes: string | number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(+bytes) / Math.log(k));
    return `${parseFloat((+bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function BackupsPage() {
    const { translate } = useI18n();
    const { data, loading, error, refetch } = useQuery(BACKUPS_QUERY, {
        pollInterval: 10000, // Auto-refresh every 10s
    });

    const {
        data: scheduleData,
        loading: scheduleLoading,
        error: scheduleError,
        refetch: refetchSchedule,
    } = useQuery(BACKUP_SCHEDULE_QUERY);

    const [createBackup, { loading: creating }] = useMutation(CREATE_BACKUP);
    const [restoreBackup, { loading: restoring }] = useMutation(RESTORE_BACKUP);
    const [deleteBackup, { loading: deleting }] = useMutation(DELETE_BACKUP);
    const [updateBackupSchedule, { loading: savingSchedule }] = useMutation(UPDATE_BACKUP_SCHEDULE);
    
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const schedule = scheduleData?.backupSchedule;
    const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
    const [scheduleTime, setScheduleTime] = useState<string>("02:00");
    const [scheduleTimeZone, setScheduleTimeZone] = useState<string>("UTC");

    const scheduleInitializedRef = useRef(false);
    useEffect(() => {
        if (!schedule) return;
        if (scheduleInitializedRef.current) return;

        scheduleInitializedRef.current = true;
        setScheduleEnabled(Boolean(schedule.enabled));
        setScheduleTime(schedule.time || "02:00");
        setScheduleTimeZone(schedule.timeZone || "UTC");
    }, [schedule]);

    const handleCreateBackup = async () => {
        try {
            toast.info("Starting backup process...");
            await createBackup();
            toast.success("Backup created successfully!");
            refetch();
        } catch (err: any) {
            toast.error(`Backup failed: ${err.message}`);
        }
    };

    const handleSaveSchedule = async () => {
        try {
            await updateBackupSchedule({
                variables: {
                    input: {
                        enabled: scheduleEnabled,
                        time: scheduleTime,
                        timeZone: scheduleTimeZone,
                    },
                },
            });
            toast.success("Backup schedule saved.");
            refetchSchedule();
        } catch (err: any) {
            toast.error(`Failed to save schedule: ${err.message}`);
        }
    };

    const handleRestoreBackup = async (id: string, filename: string) => {
        try {
            toast.info("Starting restore process... The system might be unresponsive.");
            const result = await restoreBackup({ variables: { id } });
            if (result.data?.restoreBackup) {
                toast.success(`Restored from ${filename} successfully.`);
                refetch();
            } else {
                toast.error("Restore failed.");
            }
        } catch (err: any) {
            toast.error(`Restore failed: ${err.message}`);
        }
    };

    const handleDeleteBackup = async (id: string) => {
        try {
            await deleteBackup({ variables: { id } });
            toast.success("Backup deleted.");
            refetch();
        } catch (err: any) {
            toast.error(`Delete failed: ${err.message}`);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.sql')) {
            toast.error("Only .sql files are allowed");
            return;
        }

        // Validate file size (max 500MB)
        const maxSize = 500 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("File size exceeds 500MB limit");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            toast.info(`Uploading ${file.name}...`);
            
            const response = await fetch("/api/backups/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Upload failed");
            }

            toast.success(`Backup uploaded successfully: ${result.filename}`);
            refetch();
        } catch (err: any) {
            toast.error(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const rows: BackupRow[] = data?.backups ?? [];

    const columns: DataTableColumn<BackupRow>[] = [
        {
            id: "filename",
            header: translate("common.table.columns.filename"),
            accessor: (row) => row.filename,
            sortKey: "filename",
        },
        {
            id: "size",
            header: translate("common.table.columns.size"),
            accessor: (row) => formatBytes(row.sizeBytes),
            sortKey: "sizeBytes",
        },
        {
            id: "createdAt",
            header: translate("common.table.columns.created"),
            accessor: (row) => (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    {new Date(row.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })}
                </div>
            ),
            sortKey: "createdAt",
            alignCenter: true,
        },
        {
            id: "actions",
            header: translate("common.table.columns.actions"),
            accessor: (row) => (
                <div className="flex flex-wrap justify-center gap-2">
                    {/* Download */}
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                        title="Download"
                    >
                        <a href={`/api/backups/${row.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            {translate("common.actions.download")}
                        </a>
                    </Button>

                    {/* Restore Dialog */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
                                title="Restore"
                                disabled={restoring}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {translate("common.actions.restore")}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Restore Database?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to restore from <strong>{row.filename}</strong>?
                                    <br /><br />
                                    <span className="text-red-500 font-bold">WARNING: This will overwrite the current database state! This action cannot be undone.</span>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{translate("common.actions.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestoreBackup(row.id, row.filename)} className="bg-red-600 hover:bg-red-700">
                                    {translate("common.actions.confirmRestore")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete Dialog */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
                                title="Delete"
                                disabled={deleting}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {translate("common.actions.delete")}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete <strong>{row.filename}</strong>? This file will be permanently removed from the server.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{translate("common.actions.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBackup(row.id)}>
                                    {translate("common.actions.delete")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            ),
            alignRight: true,
        },
    ];

    return (
        <div className="min-h-screen bg-background px-4 py-6">
            <Card className="w-full">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Database Backups</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage database snapshots for disaster recovery.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {translate("common.actions.refresh")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={uploading}>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading
                              ? translate("common.state.uploading")
                              : `${translate("common.actions.upload")} ${translate("common.entities.backup")}`}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".sql"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button size="sm" onClick={handleCreateBackup} disabled={creating}>
                            <Plus className="h-4 w-4 mr-2" />
                            {creating
                              ? translate("common.state.creating")
                              : `${translate("common.actions.create")} ${translate("common.entities.backup")}`}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 rounded-lg border border-border bg-muted/20 p-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium">Recurring Backups</p>
                                    <p className="text-xs text-muted-foreground">
                                        Automatically create one backup per day at the configured time.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Label htmlFor="backup-schedule-enabled" className="text-sm">
                                        Enabled
                                    </Label>
                                    <Switch
                                        id="backup-schedule-enabled"
                                        checked={scheduleEnabled}
                                        onCheckedChange={(v) => setScheduleEnabled(Boolean(v))}
                                        disabled={scheduleLoading || savingSchedule}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="backup-schedule-time">Time (HH:MM)</Label>
                                    <Input
                                        id="backup-schedule-time"
                                        type="time"
                                        value={scheduleTime}
                                        onChange={(e) => setScheduleTime(e.target.value)}
                                        disabled={scheduleLoading || savingSchedule}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="backup-schedule-timezone">Time Zone</Label>
                                    <Input
                                        id="backup-schedule-timezone"
                                        type="text"
                                        value={scheduleTimeZone}
                                        onChange={(e) => setScheduleTimeZone(e.target.value)}
                                        placeholder="UTC"
                                        disabled={scheduleLoading || savingSchedule}
                                    />
                                </div>

                                <div className="flex flex-col gap-2 items-start justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={handleSaveSchedule}
                                        disabled={scheduleLoading || savingSchedule}
                                    >
                                        {savingSchedule
                                          ? translate("common.state.saving")
                                          : `${translate("common.actions.save")} ${translate("common.entities.schedule")}`}
                                    </Button>
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                {scheduleError ? (
                                    <span className="text-red-600">Error loading schedule: {scheduleError.message}</span>
                                ) : schedule?.isRunning ? (
                                    <span>Backup is currently running...</span>
                                ) : schedule?.lastRunAt ? (
                                    <span>Last run: {new Date(schedule.lastRunAt).toLocaleString()}</span>
                                ) : (
                                    <span>Last run: never</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p className="mb-4 text-sm text-red-600">Error loading backups: {error.message}</p>
                    )}

                    <DataTable<BackupRow>
                        data={rows}
                        columns={columns}
                        searchableKeys={["filename"]}
                        initialSortKey="createdAt"
                        pageSize={10}
                        searchPlaceholder="Search backups..."
                        showRowNumbers
                        rowNumberHeader={translate("common.table.columns.index")}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
