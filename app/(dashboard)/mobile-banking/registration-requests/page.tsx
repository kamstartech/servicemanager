"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { RegistrationStatus, RegistrationSource } from "@prisma/client";
import type { RequestedRegistrationWithRelations } from "@/types/registration";
import { AddRegistrationDialog } from "@/components/registration/add-registration-dialog";
import { 
  UserPlus, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Copy,
  Eye,
  PlayCircle,
  Plus 
} from "lucide-react";

interface RegistrationRequest extends Omit<RequestedRegistrationWithRelations, 'createdAt' | 'updatedAt' | 'processedAt' | 'lastRetryAt'> {
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  lastRetryAt: string | null;
}

const statusConfig = {
  [RegistrationStatus.PENDING]: {
    icon: Clock,
    label: "Pending",
  },
  [RegistrationStatus.APPROVED]: {
    icon: CheckCircle,
    label: "Approved",
  },
  [RegistrationStatus.COMPLETED]: {
    icon: CheckCircle,
    label: "Completed",
  },
  [RegistrationStatus.FAILED]: {
    icon: XCircle,
    label: "Failed",
  },
  [RegistrationStatus.DUPLICATE]: {
    icon: Copy,
    label: "Duplicate",
  },
};

export default function RegistrationRequestsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });

      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/registrations?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch registrations");
      }

      const result = await response.json();
      
      if (result.success) {
        setRegistrations(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [page, statusFilter]);

  const handleProcess = async (id: number) => {
    try {
      const response = await fetch(`/api/registrations/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processedBy: 1, // TODO: Get from auth context
          notes: "Validated from admin panel",
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const stages = result.processLog?.map((log: any) => 
          `${log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '▶️'} ${log.stage}: ${log.details || log.status}${log.duration ? ` (${log.duration}ms)` : ''}`
        ).join('\n');
        
        alert(`Validation successful!\n\nFound ${result.accountsFound} accounts\nTotal time: ${result.totalDuration}ms\n\nProcess stages:\n${stages}`);
        fetchRegistrations();
      } else {
        const stages = result.processLog?.map((log: any) => 
          `${log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '▶️'} ${log.stage}: ${log.error || log.details || log.status}${log.duration ? ` (${log.duration}ms)` : ''}`
        ).join('\n');
        
        alert(`Validation failed: ${result.message}\n\nProcess stages:\n${stages || 'No stage information available'}`);
        fetchRegistrations();
      }
    } catch (err) {
      alert(`Error validating registration: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  };

  const columns: DataTableColumn<RegistrationRequest>[] = [
    {
      id: "customer",
      header: "Customer Info",
      accessor: (row) => (
        <div className="space-y-1">
          <div className="font-medium">
            {row.firstName || ""} {row.lastName || ""}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {row.customerNumber}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.phoneNumber}
          </div>
        </div>
      ),
      sortKey: "customerNumber",
    },
    {
      id: "email",
      header: "Email",
      accessor: (row) => (
        <span className="text-sm">{row.emailAddress || "-"}</span>
      ),
    },
    {
      id: "source",
      header: "Source",
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.source}
        </Badge>
      ),
    },
    {
      id: "sourceIp",
      header: "Source IP",
      accessor: (row) => (
        <span className="font-mono text-xs">{row.sourceIp}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => {
        const config = statusConfig[row.status];
        const Icon = config.icon;

        const tone =
          row.status === RegistrationStatus.PENDING
            ? "pending"
            : row.status === RegistrationStatus.FAILED
            ? "error"
            : row.status === RegistrationStatus.DUPLICATE
            ? "neutral"
            : "success";

        const classes =
          tone === "success"
            ? "bg-green-100 text-green-800"
            : tone === "error"
            ? "bg-red-100 text-red-800"
            : tone === "pending"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-gray-100 text-gray-800";

        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
          >
            <Icon size={14} />
            {config.label}
          </span>
        );
      },
      alignCenter: true,
    },
    {
      id: "retry",
      header: "Retries",
      accessor: (row) => (
        <div className="text-center">
          {row.retryCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {row.retryCount}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          )}
        </div>
      ),
    },
    {
      id: "created",
      header: "Created",
      accessor: (row) => (
        <div className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleString()}
        </div>
      ),
      sortKey: "createdAt",
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
            onClick={() => router.push(`/mobile-banking/registration-requests/${row.id}`)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          {row.status === RegistrationStatus.PENDING && (
            <Button
              size="sm"
              variant="outline"
              className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
              onClick={() => handleProcess(row.id)}
            >
              <PlayCircle className="h-3 w-3 mr-2" />
              Validate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Registration Requests</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Third-party mobile banking registration requests
                {total > 0 && ` (${total} total)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Registration
            </Button>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RegistrationStatus | "ALL")}
            >
              <option value="ALL">All Status</option>
              <option value={RegistrationStatus.PENDING}>Pending</option>
              <option value={RegistrationStatus.APPROVED}>Approved</option>
              <option value={RegistrationStatus.COMPLETED}>Completed</option>
              <option value={RegistrationStatus.FAILED}>Failed</option>
              <option value={RegistrationStatus.DUPLICATE}>Duplicate</option>
            </select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchRegistrations()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !registrations.length && (
            <p className="text-sm text-muted-foreground">Loading registrations...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">Error: {error}</p>
          )}
          {!loading && !error && registrations.length === 0 && (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No registration requests found.
              </p>
            </div>
          )}
          {!loading && !error && registrations.length > 0 && (
            <DataTable<RegistrationRequest>
              data={registrations}
              columns={columns}
              searchableKeys={[
                "customerNumber",
                "phoneNumber",
                "emailAddress",
                "firstName",
                "lastName",
                "sourceIp",
              ]}
              initialSortKey="createdAt"
              pageSize={20}
              searchPlaceholder="Search by customer number, phone, email, name..."
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddRegistrationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCompleted={fetchRegistrations}
      />
    </div>
  );
}
