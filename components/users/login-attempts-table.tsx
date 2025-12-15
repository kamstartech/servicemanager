"use client";

import { gql, useQuery } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react";

const LOGIN_ATTEMPTS_QUERY = gql`
  query LoginAttempts($limit: Int, $offset: Int, $status: String, $username: String) {
    loginAttempts(limit: $limit, offset: $offset, status: $status, username: $username) {
      attempts {
        id
        mobileUserId
        username
        context
        deviceId
        deviceName
        deviceModel
        deviceOs
        ipAddress
        location
        attemptType
        status
        failureReason
        otpSentTo
        otpSentAt
        attemptedAt
        mobileUser {
          id
          username
          phoneNumber
          customerNumber
          context
        }
      }
      total
    }
  }
`;

type LoginAttemptRow = {
  id: string;
  username?: string | null;
  context?: string | null;
  deviceName?: string | null;
  deviceModel?: string | null;
  ipAddress?: string | null;
  attemptType: string;
  status: string;
  failureReason?: string | null;
  attemptedAt: string;
  mobileUser?: {
    phoneNumber?: string | null;
    customerNumber?: string | null;
  } | null;
};

function mapLoginAttempts(data: any): LoginAttemptRow[] {
  return (data?.loginAttempts?.attempts ?? []).map((attempt: any) => ({
    id: attempt.id,
    username: attempt.username,
    context: attempt.context,
    deviceName: attempt.deviceName,
    deviceModel: attempt.deviceModel,
    ipAddress: attempt.ipAddress,
    attemptType: attempt.attemptType,
    status: attempt.status,
    failureReason: attempt.failureReason,
    attemptedAt: attempt.attemptedAt,
    mobileUser: attempt.mobileUser,
  }));
}

function getStatusBadge(status: string) {
  const statusMap: Record<
    string,
    { tone: "success" | "pending" | "error" | "neutral"; label: string }
  > = {
    SUCCESS: { tone: "success", label: "Success" },
    FAILED_CREDENTIALS: { tone: "error", label: "Failed" },
    FAILED_OTP: { tone: "error", label: "Failed" },
    FAILED_DEVICE_BLOCKED: { tone: "error", label: "Device Blocked" },
    PENDING_VERIFICATION: { tone: "pending", label: "Pending OTP" },
    PENDING_APPROVAL: { tone: "pending", label: "Pending Approval" },
    EXPIRED: { tone: "error", label: "Expired" },
  };

  const config = statusMap[status] || {
    tone: "neutral" as const,
    label: status?.replace(/_/g, " ") || "Unknown",
  };

  if (config.tone === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle size={14} />
        {config.label}
      </span>
    );
  }

  if (config.tone === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle size={14} />
        {config.label}
      </span>
    );
  }

  if (config.tone === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock size={14} />
        {config.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      <Clock size={14} />
      {config.label}
    </span>
  );
}

type LoginAttemptsTableProps = {
  context?: "MOBILE_BANKING" | "WALLET";
  title: string;
  searchPlaceholder?: string;
};

export function LoginAttemptsTable({
  context,
  title,
  searchPlaceholder = "Search by username or phone...",
}: LoginAttemptsTableProps) {
  const { data, loading, error, refetch } = useQuery(LOGIN_ATTEMPTS_QUERY, {
    variables: { limit: 100, offset: 0 },
  });

  const rows = mapLoginAttempts(data);
  
  // Filter by context if provided
  const filteredRows = context 
    ? rows.filter(row => row.context === context)
    : rows;

  const columns: DataTableColumn<LoginAttemptRow>[] = [
    {
      id: "attemptedAt",
      header: "Date & Time",
      accessor: (row) => (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          {new Date(row.attemptedAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      ),
      sortKey: "attemptedAt",
      alignCenter: true,
    },
    {
      id: "username",
      header: "Username/Phone",
      accessor: (row) => row.username || row.mobileUser?.phoneNumber || "-",
      sortKey: "username",
    },
    {
      id: "context",
      header: "Context",
      accessor: (row) => row.context || "-",
      sortKey: "context",
    },
    {
      id: "deviceName",
      header: "Device",
      accessor: (row) => {
        const name = row.deviceName || "Unknown";
        const model = row.deviceModel;
        return model ? `${name} (${model})` : name;
      },
    },
    {
      id: "ipAddress",
      header: "IP Address",
      accessor: (row) => row.ipAddress || "-",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => getStatusBadge(row.status),
      sortKey: "status",
      alignCenter: true,
    },
    {
      id: "failureReason",
      header: "Failure Reason",
      accessor: (row) => row.failureReason || "-",
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading login attempts...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-destructive">
            Error loading login attempts: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={filteredRows}
          searchPlaceholder={searchPlaceholder}
          showRowNumbers
          rowNumberHeader="#"
        />
      </CardContent>
    </Card>
  );
}
