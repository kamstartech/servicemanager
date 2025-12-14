"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { CheckbookRequestStatus } from "@prisma/client";
import type { CheckbookRequestWithUser } from "@/types/checkbook";
import { 
  BookOpen,
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  MapPin,
  Ban
} from "lucide-react";
import { toast } from "sonner";

interface CheckbookRequest extends Omit<CheckbookRequestWithUser, 'createdAt' | 'updatedAt' | 'requestedAt' | 'approvedAt' | 'readyAt' | 'collectedAt' | 'cancelledAt' | 'rejectedAt'> {
  createdAt: string;
  updatedAt: string;
  requestedAt: string;
  approvedAt: string | null;
  readyAt: string | null;
  collectedAt: string | null;
  cancelledAt: string | null;
  rejectedAt: string | null;
}

const statusConfig = {
  [CheckbookRequestStatus.PENDING]: {
    variant: "secondary" as const,
    icon: Clock,
    label: "Pending",
  },
  [CheckbookRequestStatus.APPROVED]: {
    variant: "default" as const,
    icon: CheckCircle,
    label: "Approved",
  },
  [CheckbookRequestStatus.READY_FOR_COLLECTION]: {
    variant: "default" as const,
    icon: Package,
    label: "Ready for Collection",
  },
  [CheckbookRequestStatus.COLLECTED]: {
    variant: "default" as const,
    icon: CheckCircle,
    label: "Collected",
  },
  [CheckbookRequestStatus.CANCELLED]: {
    variant: "outline" as const,
    icon: Ban,
    label: "Cancelled",
  },
  [CheckbookRequestStatus.REJECTED]: {
    variant: "destructive" as const,
    icon: XCircle,
    label: "Rejected",
  },
};

export default function CheckbookRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<CheckbookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CheckbookRequestStatus | "ALL">("ALL");

  // Initialize status filter from URL params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && Object.values(CheckbookRequestStatus).includes(statusParam as CheckbookRequestStatus)) {
      setStatusFilter(statusParam as CheckbookRequestStatus);
    }
  }, [searchParams]);

  const fetchRequests = async () => {
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

      const response = await fetch(`/api/checkbook-requests?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch checkbook requests");
      }

      const result = await response.json();
      
      if (result.success) {
        setRequests(result.data);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to fetch checkbook requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const handleStatusChange = async (id: number, newStatus: CheckbookRequestStatus) => {
    try {
      const response = await fetch(`/api/checkbook-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Request status updated to ${statusConfig[newStatus].label}`);
        fetchRequests();
      } else {
        throw new Error(result.error || "Failed to update status");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const columns: DataTableColumn<CheckbookRequest>[] = [
    {
      id: "id",
      header: "ID",
      accessor: (request) => `#${request.id}`,
    },
    {
      id: "mobileUser",
      header: "User",
      accessor: (request) => (
        <div className="space-y-1">
          <div className="font-medium">
            {request.mobileUser.username || request.mobileUser.phoneNumber}
          </div>
          {request.mobileUser.customerNumber && (
            <div className="text-sm text-muted-foreground">
              Customer: {request.mobileUser.customerNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "accountNumber",
      header: "Account",
      accessor: (request) => (
        <span className="font-mono text-sm">{request.accountNumber}</span>
      ),
    },
    {
      id: "numberOfCheckbooks",
      header: "Quantity",
      accessor: (request) => (
        <span className="font-semibold">{request.numberOfCheckbooks}</span>
      ),
    },
    {
      id: "collectionPoint",
      header: "Collection Point",
      accessor: (request) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{request.collectionPoint}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (request) => {
        const config = statusConfig[request.status];
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "requestedAt",
      header: "Requested",
      accessor: (request) => new Date(request.requestedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (request) => (
        <div className="flex gap-2">
          {request.status === CheckbookRequestStatus.PENDING && (
            <>
              <Button
                size="sm"
                onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.APPROVED)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.REJECTED)}
              >
                Reject
              </Button>
            </>
          )}
          {request.status === CheckbookRequestStatus.APPROVED && (
            <Button
              size="sm"
              onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.READY_FOR_COLLECTION)}
            >
              Mark Ready
            </Button>
          )}
          {request.status === CheckbookRequestStatus.READY_FOR_COLLECTION && (
            <Button
              size="sm"
              onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.COLLECTED)}
            >
              Mark Collected
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6" />
              <CardTitle>Checkbook Requests</CardTitle>
            </div>
            <Button
              onClick={fetchRequests}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                router.push("/mobile-banking/checkbook-requests");
              }}
            >
              All ({total})
            </Button>
            {Object.entries(statusConfig).map(([status, config]) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter(status as CheckbookRequestStatus);
                  router.push(`/mobile-banking/checkbook-requests?status=${status}`);
                }}
              >
                {config.label}
              </Button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}

          <DataTable
            columns={columns}
            data={requests}
            loading={loading}
            emptyMessage="No checkbook requests found"
          />

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <div className="flex items-center px-4">
                Page {page} of {totalPages}
              </div>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
