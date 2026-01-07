"use client";

import { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  COMMON_TABLE_HEADERS,
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, CheckCircle, Clock, XCircle, RefreshCw, Activity, AlertCircle, Ban } from "lucide-react";
import { translateStatusOneWord } from "@/lib/utils";

const GET_LOGIN_ATTEMPTS = gql`
  query GetLoginAttempts(
    $limit: Int
    $offset: Int
    $status: String
    $username: String
  ) {
    loginAttempts(
      limit: $limit
      offset: $offset
      status: $status
      username: $username
    ) {
      attempts {
        id
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
        otpAttempts
        attemptedAt
        mobileUser {
          id
          username
          phoneNumber
          customerNumber
        }
      }
      total
    }
  }
`;

type LoginAttemptRow = {
  id: string;
  username: string;
  context?: string;
  deviceName?: string;
  deviceModel?: string;
  deviceOs?: string;
  ipAddress?: string;
  location?: string;
  attemptType: string;
  status: string;
  failureReason?: string;
  otpSentTo?: string;
  otpAttempts: number;
  attemptedAt: string;
  userPhone?: string;
  customerNumber?: string;
};

function mapLoginAttempts(data: any): LoginAttemptRow[] {
  return (data?.loginAttempts?.attempts ?? []).map((attempt: any) => ({
    id: attempt.id,
    username: attempt.username,
    context: attempt.context,
    deviceName: attempt.deviceName,
    deviceModel: attempt.deviceModel,
    deviceOs: attempt.deviceOs,
    ipAddress: attempt.ipAddress,
    location: attempt.location,
    attemptType: attempt.attemptType,
    status: attempt.status,
    failureReason: attempt.failureReason,
    otpSentTo: attempt.otpSentTo,
    otpAttempts: attempt.otpAttempts,
    attemptedAt: attempt.attemptedAt,
    userPhone: attempt.mobileUser?.phoneNumber,
    customerNumber: attempt.mobileUser?.customerNumber,
  }));
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  SUCCESS: "default",
  PENDING_VERIFICATION: "secondary",
  VERIFIED: "default",
  FAILED_CREDENTIALS: "destructive",
  FAILED_OTP: "destructive",
  FAILED_DEVICE_PENDING: "secondary",
  EXPIRED: "destructive",
  PENDING_APPROVAL: "secondary",
};

function getStatusPill(status: string, translate: (key: string) => string) {
  const label = translateStatusOneWord(status, translate, "UNKNOWN");
  const variant = statusColors[status] || "secondary";

  if (variant === "default") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle size={14} />
        {label}
      </span>
    );
  }

  if (variant === "destructive") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle size={14} />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <Clock size={14} />
      {label}
    </span>
  );
}

export default function LoginAttemptsPage() {
  const { translate } = useI18n();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_LOGIN_ATTEMPTS, {
    variables: {
      limit: 1000,
      offset: 0,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    },
    pollInterval: 30000,
  });

  const rows = mapLoginAttempts(data);

  const columns: DataTableColumn<LoginAttemptRow>[] = [
    {
      id: "attemptedAt",
      header: COMMON_TABLE_HEADERS.dateTime,
      accessor: (row) => {
        if (!row.attemptedAt) return "-";
        try {
          const date = new Date(row.attemptedAt);
          if (isNaN(date.getTime())) return row.attemptedAt;
          return (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Calendar size={16} />
              {date.toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          );
        } catch {
          return row.attemptedAt;
        }
      },
      sortKey: "attemptedAt",
      alignCenter: true,
    },
    {
      id: "username",
      header: COMMON_TABLE_HEADERS.user,
      accessor: (row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.username}</div>
          {row.userPhone && (
            <div className="text-xs text-muted-foreground">{row.userPhone}</div>
          )}
        </div>
      ),
      sortKey: "username",
    },
    {
      id: "device",
      header: COMMON_TABLE_HEADERS.device,
      accessor: (row) => (
        <div className="space-y-1">
          <div className="text-sm">{row.deviceName || "Unknown"}</div>
          <div className="text-xs text-muted-foreground">
            {row.deviceModel || ""} {row.deviceOs || ""}
          </div>
        </div>
      ),
    },
    {
      id: "location",
      header: COMMON_TABLE_HEADERS.location,
      accessor: (row) => (
        <div className="space-y-1">
          <div className="text-sm font-mono text-xs">{row.ipAddress}</div>
          {row.location && (
            <div className="text-xs text-muted-foreground">{row.location}</div>
          )}
        </div>
      ),
    },
    {
      id: "attemptType",
      header: COMMON_TABLE_HEADERS.type,
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.attemptType?.replace(/_/g, " ")}
        </Badge>
      ),
      sortKey: "attemptType",
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => getStatusPill(row.status, translate),
      sortKey: "status",
      alignCenter: true,
    },
    {
      id: "details",
      header: COMMON_TABLE_HEADERS.details,
      accessor: (row) => (
        <div className="text-xs space-y-1">
          {row.failureReason && (
            <div className="text-destructive">{row.failureReason}</div>
          )}
          {row.otpSentTo && (
            <div className="text-muted-foreground">
              OTP: {row.otpSentTo}
            </div>
          )}
          {row.otpAttempts > 0 && (
            <div className="text-muted-foreground">
              Attempts: {row.otpAttempts}/5
            </div>
          )}
        </div>
      ),
    },
  ];

  const successCount = rows.filter((r) => r.status === "SUCCESS").length;
  const pendingCount = rows.filter(
    (r) =>
      r.status === "PENDING_VERIFICATION" || r.status === "PENDING_APPROVAL"
  ).length;
  const failedCount = rows.filter(
    (r) => r.status.startsWith("FAILED") || r.status === "EXPIRED"
  ).length;
  const total = rows.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Login Attempts</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and track authentication attempts across the system
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold">{successCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{failedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Login attempts</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="SUCCESS">
                  {translateStatusOneWord("SUCCESS", translate, "SUCCESS")}
                </SelectItem>
                <SelectItem value="PENDING_VERIFICATION">
                  {translateStatusOneWord("PENDING_VERIFICATION", translate, "PENDING")}
                </SelectItem>
                <SelectItem value="VERIFIED">
                  {translateStatusOneWord("VERIFIED", translate, "VERIFIED")}
                </SelectItem>
                <SelectItem value="FAILED_CREDENTIALS">
                  {translateStatusOneWord("FAILED_CREDENTIALS", translate, "FAILED")}
                </SelectItem>
                <SelectItem value="FAILED_OTP">
                  {translateStatusOneWord("FAILED_OTP", translate, "FAILED")}
                </SelectItem>
                <SelectItem value="EXPIRED">
                  {translateStatusOneWord("EXPIRED", translate, "EXPIRED")}
                </SelectItem>
                <SelectItem value="PENDING_APPROVAL">
                  {translateStatusOneWord("PENDING_APPROVAL", translate, "PENDING")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading login attempts...
            </p>
          ) : error ? (
            <p className="text-sm text-red-600">Error loading login attempts: {error.message}</p>
          ) : (
            <DataTable<LoginAttemptRow>
              data={rows}
              columns={columns}
              searchableKeys={["username", "ipAddress", "deviceName"]}
              initialSortKey="attemptedAt"
              pageSize={50}
              searchPlaceholder="Search by username, IP, or device..."
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
