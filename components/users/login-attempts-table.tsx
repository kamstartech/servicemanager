"use client";

import { gql, useQuery } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

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
  const statusMap: Record<string, { variant: any; label: string }> = {
    SUCCESS: { variant: "default", label: "Success" },
    FAILED_CREDENTIALS: { variant: "destructive", label: "Failed" },
    PENDING_VERIFICATION: { variant: "secondary", label: "Pending OTP" },
    PENDING_APPROVAL: { variant: "outline", label: "Pending Approval" },
    FAILED_DEVICE_BLOCKED: { variant: "destructive", label: "Device Blocked" },
    EXPIRED: { variant: "secondary", label: "Expired" },
  };

  const config = statusMap[status] || { variant: "outline", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
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
      accessor: (row) => new Date(row.attemptedAt).toLocaleString(),
      sortKey: "attemptedAt",
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
        />
      </CardContent>
    </Card>
  );
}
