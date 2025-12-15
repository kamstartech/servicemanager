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
    icon: Clock,
    label: "Pending",
  },
  [CheckbookRequestStatus.APPROVED]: {
    icon: CheckCircle,
    label: "Approved",
  },
  [CheckbookRequestStatus.READY_FOR_COLLECTION]: {
    icon: Package,
    label: "Ready for Collection",
  },
  [CheckbookRequestStatus.COLLECTED]: {
    icon: CheckCircle,
    label: "Collected",
  },
  [CheckbookRequestStatus.CANCELLED]: {
    icon: Ban,
    label: "Cancelled",
  },
  [CheckbookRequestStatus.REJECTED]: {
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

        const tone =
          request.status === CheckbookRequestStatus.PENDING
            ? "pending"
            : request.status === CheckbookRequestStatus.REJECTED
            ? "error"
            : request.status === CheckbookRequestStatus.CANCELLED
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
      id: "requestedAt",
      header: "Requested",
      accessor: (request) => new Date(request.requestedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (request) => (
        <div className="flex flex-wrap justify-center gap-2">
          {request.status === CheckbookRequestStatus.PENDING && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200"
                onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.APPROVED)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
                onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.REJECTED)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {request.status === CheckbookRequestStatus.APPROVED && (
            <Button
              size="sm"
              variant="outline"
              className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
              onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.READY_FOR_COLLECTION)}
            >
              <Package className="h-4 w-4 mr-2" />
              Mark Ready
            </Button>
          )}
          {request.status === CheckbookRequestStatus.READY_FOR_COLLECTION && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
              onClick={() => handleStatusChange(request.id, CheckbookRequestStatus.COLLECTED)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
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

          {loading && requests.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading checkbook requests...</p>
          )}

          {!loading && !error && requests.length === 0 && (
            <p className="text-sm text-muted-foreground">No checkbook requests found</p>
          )}

          {requests.length > 0 && (
            <DataTable
              columns={columns}
              data={requests}
              showRowNumbers
              rowNumberHeader="#"
            />
          )}

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
