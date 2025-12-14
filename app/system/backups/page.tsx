"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import { toast } from "sonner";
import { Download, Plus, RefreshCw, Trash2, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    const { data, loading, error, refetch } = useQuery(BACKUPS_QUERY, {
        pollInterval: 10000, // Auto-refresh every 10s
    });

    const [createBackup, { loading: creating }] = useMutation(CREATE_BACKUP);
    const [restoreBackup, { loading: restoring }] = useMutation(RESTORE_BACKUP);
    const [deleteBackup, { loading: deleting }] = useMutation(DELETE_BACKUP);

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

    const rows: BackupRow[] = data?.backups ?? [];

    const columns: DataTableColumn<BackupRow>[] = [
        {
            id: "filename",
            header: "Filename",
            accessor: (row) => row.filename,
            sortKey: "filename",
        },
        {
            id: "size",
            header: "Size",
            accessor: (row) => formatBytes(row.sizeBytes),
            sortKey: "sizeBytes",
        },
        {
            id: "created",
            header: "Created At",
            accessor: (row) => new Date(row.createdAt).toLocaleString(),
            sortKey: "createdAt",
        },
        {
            id: "actions",
            header: "Actions",
            accessor: (row) => (
                <div className="flex justify-end gap-2">
                    {/* Download */}
                    <Button asChild variant="outline" size="sm" title="Download">
                        <a href={`/api/backups/${row.id}/download`} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                        </a>
                    </Button>

                    {/* Restore Dialog */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" title="Restore" disabled={restoring}>
                                <RotateCcw className="h-4 w-4" />
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
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestoreBackup(row.id, row.filename)} className="bg-red-600 hover:bg-red-700">
                                    Confirm Restore
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete Dialog */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" title="Delete" disabled={deleting}>
                                <Trash2 className="h-4 w-4" />
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
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBackup(row.id)}>
                                    Delete
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
                            Refresh
                        </Button>
                        <Button size="sm" onClick={handleCreateBackup} disabled={creating}>
                            <Plus className="h-4 w-4 mr-2" />
                            {creating ? "Creating..." : "Create Backup"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
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
                    />
                </CardContent>
            </Card>
        </div>
    );
}
