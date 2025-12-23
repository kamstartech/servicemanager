"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  CheckCircle,
  Clock,
  Activity,
  TestTube,
  Loader2,
  FileText,
  X,
  XCircle,
} from "lucide-react";
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/i18n-provider";
import { translateStatusOneWord } from "@/lib/utils";

interface ServiceStatus {
  balanceSync: {
    processing: boolean;
    priority: number;
    background: number;
    interval: number;
    intervalMinutes: number;
  };
  accountDiscovery: {
    running: boolean;
    discovering: boolean;
    interval: number;
    intervalHours: number;
    paginationQueueSize: number;
  };
  accountEnrichment: {
    running: boolean;
    enriching: boolean;
    interval: number;
    intervalHours: number;
  };
}

interface SMSStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  retrying: number;
  successRate: number;
}

interface ServiceTableRow {
  serviceKey?: string;
  name: string;
  type: string;
  description: string;
  status: string;
  interval: string;
  details: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  testable?: boolean;
  testConfig?: {
    endpoint: string;
    fields: {
      name: string;
      label: string;
      placeholder: string;
      required?: boolean;
      type?: "text" | "select" | "user-select";
      options?: string[];
      dynamicOptions?: boolean; // For options fetched from API
      userType?: string; // For user-select: filter by user type (MOBILE_BANKING, WALLET, etc.)
    }[];
  };
}

export default function ServicesMonitorPage() {
  const { translate } = useI18n();
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [smsStats, setSmsStats] = useState<SMSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceTableRow | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; data: any; timestamp: string } | null>(null);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsConnected, setLogsConnected] = useState(false);
  const logsEventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch SMS stats
  useEffect(() => {
    const fetchSMSStats = async () => {
      try {
        const response = await fetch('/api/sms/stats?hours=24');
        const data = await response.json();
        if (data.success) {
          setSmsStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch SMS stats:', error);
      }
    };

    fetchSMSStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSMSStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Create SSE connection
    const eventSource = new EventSource("/api/services/status/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("✅ SSE Connected");
      setConnected(true);
      setLoading(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle initial full status
        if (data.balanceSync && data.accountDiscovery && data.accountEnrichment) {
          setStatus({
            balanceSync: data.balanceSync,
            accountDiscovery: data.accountDiscovery,
            accountEnrichment: data.accountEnrichment,
          });
        }
        // Handle individual service updates
        else if (data.service && data.status) {
          setStatus((prev) => {
            if (!prev) return prev;

            const serviceKey = data.service === "balance-sync"
              ? "balanceSync"
              : data.service === "account-discovery"
                ? "accountDiscovery"
                : "accountEnrichment";

            return {
              ...prev,
              [serviceKey]: {
                ...data.status,
                // Ensure calculated fields are present
                intervalMinutes: serviceKey === "balanceSync"
                  ? Math.round(data.status.interval / 1000 / 60)
                  : undefined,
                intervalHours: serviceKey !== "balanceSync"
                  ? Math.round(data.status.interval / 1000 / 60 / 60)
                  : undefined,
              },
            };
          });
        }
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      setConnected(false);
      eventSource.close();

      // Reconnect after 5 seconds
      setTimeout(() => {
        console.log("🔄 Reconnecting SSE...");
        window.location.reload();
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleTestService = async (service: ServiceTableRow) => {
    setSelectedService(service);
    setTestParams({});
    setTestResult(null); // Clear previous results

    // Fetch dynamic options for user-select fields
    if (service.testConfig?.fields) {
      const userFields = service.testConfig.fields.filter(f => f.type === "user-select");
      if (userFields.length > 0) {
        setLoadingOptions(true);
        try {
          // Get context from first user field (if specified)
          const context = userFields[0].userType; // Still named userType in config for clarity
          const url = context
            ? `/api/services/users?context=${context}`
            : `/api/services/users`;

          const response = await fetch(url);
          const data = await response.json();
          if (data.success) {
            setDynamicOptions({ users: data.users });
          }
        } catch (error) {
          console.error("Failed to fetch users:", error);
        } finally {
          setLoadingOptions(false);
        }
      }
    }

    setTestDialogOpen(true);
  };

  const handleViewLogs = (service: ServiceTableRow) => {
    setSelectedService(service);
    setLogs([]);
    setLogsDialogOpen(true);

    // Create SSE connection for logs
    const key = service.serviceKey || "all";
    const logsEventSource = new EventSource(
      `/api/services/logs/stream?service=${encodeURIComponent(key)}`
    );
    logsEventSourceRef.current = logsEventSource;

    logsEventSource.onopen = () => {
      console.log("✅ Logs SSE Connected");
      setLogsConnected(true);
    };

    logsEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.log) {
          setLogs((prev) => [...prev, data.log]);
        }
      } catch (error) {
        console.error("Failed to parse log data:", error);
      }
    };

    logsEventSource.onerror = () => {
      setLogsConnected(false);
      logsEventSource.close();
    };
  };

  const closeLogsDialog = () => {
    if (logsEventSourceRef.current) {
      logsEventSourceRef.current.close();
      logsEventSourceRef.current = null;
    }
    setLogsDialogOpen(false);
    setLogs([]);
    setLogsConnected(false);
  };

  const runTest = async () => {
    if (!selectedService || !selectedService.testConfig) return;

    // Check required fields
    const requiredFields = selectedService.testConfig.fields.filter(f => f.required !== false);
    const missingFields = requiredFields.filter(f => !testParams[f.name]);

    if (missingFields.length > 0) {
      setTestResult({
        success: false,
        data: {
          error: `Missing required fields: ${missingFields.map(f => f.label).join(", ")}`,
          payload: testParams,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      // Build payload from testParams
      const payload: Record<string, any> = { ...testParams };

      // Special handling for SMS service
      if (
        selectedService.serviceKey === "sms" &&
        selectedService.testConfig?.endpoint === "/api/sms/send"
      ) {
        payload.message = "Test message from Services Overview";
        payload.type = "generic";
      }

      const response = await fetch(selectedService.testConfig.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Log the full result
      setTestResult({
        success: data.success || response.ok,
        data: {
          request: {
            endpoint: selectedService.testConfig.endpoint,
            method: "POST",
            payload,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            data,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setTestResult({
        success: false,
        data: {
          error: error instanceof Error ? error.message : "Unexpected error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Define DataTable columns
  const serviceColumns: DataTableColumn<ServiceTableRow>[] = [
    {
      id: "name",
      header: COMMON_TABLE_HEADERS.serviceName,
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortKey: "name",
    },
    {
      id: "type",
      header: COMMON_TABLE_HEADERS.type,
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.type}
        </Badge>
      ),
      sortKey: "type",
    },
    {
      id: "description",
      header: COMMON_TABLE_HEADERS.description,
      accessor: (row) => (
        <span className="text-sm text-muted-foreground max-w-xs">
          {row.description}
        </span>
      ),
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => {
        const tone =
          row.variant === "default"
            ? "success"
            : row.variant === "destructive"
              ? "error"
              : row.variant === "secondary"
                ? "pending"
                : "neutral";

        const classes =
          tone === "success"
            ? "bg-green-100 text-green-800"
            : tone === "error"
              ? "bg-red-100 text-red-800"
              : tone === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-gray-100 text-gray-800";

        const Icon =
          tone === "success"
            ? CheckCircle
            : tone === "error"
              ? XCircle
              : Clock;

        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
          >
            <Icon size={14} />
            {translateStatusOneWord(row.status, translate, "UNKNOWN")}
          </span>
        );
      },
      sortKey: "status",
      alignCenter: true,
    },
    {
      id: "interval",
      header: COMMON_TABLE_HEADERS.interval,
      accessor: (row) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {row.interval}
        </div>
      ),
    },
    {
      id: "details",
      header: COMMON_TABLE_HEADERS.details,
      accessor: (row) => (
        <span className="text-xs text-muted-foreground">{row.details}</span>
      ),
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewLogs(row)}
            className="h-7 text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            {translate("common.actions.logs")}
          </Button>
          {row.testable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTestService(row)}
              className="h-7 text-xs"
            >
              <TestTube className="h-3 w-3 mr-1" />
              {translate("common.actions.test")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const servicesTableData: ServiceTableRow[] = status ? [
    {
      serviceKey: "balance-sync",
      name: "Balance Sync Service",
      type: "Background Service",
      description: "Syncs account balances from T24 every 5 minutes",
      status: status.balanceSync.processing ? "Processing" : "Idle",
      interval: `${status.balanceSync.intervalMinutes}m`,
      details: `Priority: ${status.balanceSync.priority}, Background: ${status.balanceSync.background}`,
      variant: (status.balanceSync.processing ? "default" : "secondary") as "default" | "secondary",
      testable: true,
      testConfig: {
        endpoint: "/api/services/balance-sync",
        fields: [
          {
            name: "userId",
            label: "User (Mobile Banking)",
            placeholder: "Select a mobile banking user",
            type: "user-select",
            userType: "MOBILE_BANKING"
          },
        ],
      },
    },
    {
      serviceKey: "account-discovery",
      name: "Account Discovery Service",
      type: "Background Service",
      description: "Discovers new accounts from T24 every 24 hours",
      status: status.accountDiscovery.running ? (status.accountDiscovery.discovering ? "Discovering" : "Running") : "Stopped",
      interval: `${status.accountDiscovery.intervalHours}h`,
      details: `Pagination Queue: ${status.accountDiscovery.paginationQueueSize}`,
      variant: (status.accountDiscovery.discovering ? "default" : (status.accountDiscovery.running ? "secondary" : "destructive")) as "default" | "secondary" | "destructive",
      testable: true,
      testConfig: {
        endpoint: "/api/services/account-discovery",
        fields: [
          { name: "userId", label: "User", placeholder: "Select a user", type: "user-select" },
        ],
      },
    },
    {
      serviceKey: "account-enrichment",
      name: "Account Enrichment Service",
      type: "Background Service",
      description: "Enriches account records with T24 details every 12 hours",
      status: status.accountEnrichment.running ? (status.accountEnrichment.enriching ? "Enriching" : "Running") : "Stopped",
      interval: `${status.accountEnrichment.intervalHours}h`,
      details: "Auto-creates categories, updates profiles",
      variant: (status.accountEnrichment.enriching ? "default" : (status.accountEnrichment.running ? "secondary" : "destructive")) as "default" | "secondary" | "destructive",
      testable: true,
      testConfig: {
        endpoint: "/api/services/account-enrichment",
        fields: [
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 1520000114607" },
        ],
      },
    },
    {
      name: "T24 Balance API",
      type: "Integration Service",
      description: "Fetches account balances from T24 core banking",
      status: "Available",
      interval: "On-demand",
      details: "4 balance types: working, available, cleared, online",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/t24-test",
        fields: [
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 1520000114607" },
        ],
      },
    },
    {
      name: "T24 Accounts API",
      type: "Integration Service",
      description: "Retrieves customer account lists from T24",
      status: "Available",
      interval: "On-demand",
      details: "Supports pagination for 100+ accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/t24-test",
        fields: [
          { name: "customerId", label: "Customer ID", placeholder: "e.g., 35042058" },
        ],
      },
    },
    {
      name: "T24 Account Details API",
      type: "Integration Service",
      description: "Fetches detailed account information from T24",
      status: "Available",
      interval: "On-demand",
      details: "Includes holder, category, status, customer info",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/account-details",
        fields: [
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 1520000114607" },
        ],
      },
    },
    {
      name: "T24 Transactions API",
      type: "Integration Service",
      description: "Retrieves transaction history from T24",
      status: "Available",
      interval: "On-demand",
      details: "Handles empty results gracefully",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/t24-accounts",
        fields: [
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 1520000114607" },
        ],
      },
    },
    {
      name: "Email Service",
      type: "Core Service",
      description: "Sends email notifications via SMTP",
      status: "Available",
      interval: "On-demand",
      details: "OTP, password reset, welcome, transaction emails",
      variant: "outline" as const,
    },
    {
      serviceKey: "sms",
      name: "SMS Notification Service",
      type: "Core Service",
      description: "Sends SMS via ESB Gateway",
      status: smsStats ? (smsStats.successRate >= 90 ? "Healthy" : "Degraded") : "Unknown",
      interval: "On-demand",
      details: smsStats
        ? `Last 24h: ${smsStats.sent}/${smsStats.total} sent (${smsStats.successRate.toFixed(1)}%)`
        : "Loading stats...",
      variant: smsStats
        ? (smsStats.successRate >= 90 ? "outline" as const : "destructive" as const)
        : "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/notification-test",
        fields: [
          { name: "phoneNumber", label: "Phone Number", placeholder: "e.g., +265888123456" },
        ],
      },
    },
    {
      serviceKey: "tnm-airtime",
      name: "TNM Airtime/Bundle Topup (ESB)",
      type: "Integration Service",
      description: "Posts a TNM bundle purchase/topup request via ESB",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /api/esb/topup/tnm/v1/ERSTopup",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/notification-test",
        fields: [
          { name: "phoneNumber", label: "Phone Number", placeholder: "e.g., 0881234567" },
        ],
      },
    },
    {
      serviceKey: "lwb-postpaid",
      name: "LWB Postpaid Water Bill (ESB)",
      type: "Integration Service",
      description: "Lilongwe Water Board postpaid bill lookup and payment",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/lwb-postpaid-test/v1/accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "LWB_POSTPAID", required: true },
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 123456", required: true },
        ],
      },
    },
    {
      serviceKey: "lwb-prepaid",
      name: "LWB Prepaid Water Bill (ESB)",
      type: "Integration Service",
      description: "Lilongwe Water Board prepaid (voucher) bill lookup and payment",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/lwb-prepaid-test/v1/accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "LWB_PREPAID", required: true },
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 123456", required: true },
        ],
      },
    },
    {
      serviceKey: "bwb-postpaid",
      name: "BWB Postpaid Water Bill (ESB)",
      type: "Integration Service",
      description: "Blantyre Water Board postpaid bill lookup and payment",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/bwb-postpaid-test/v1/accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "BWB_POSTPAID", required: true },
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 123456", required: true },
        ],
      },
    },
    {
      serviceKey: "srwb-postpaid",
      name: "SRWB Postpaid Water Bill (ESB)",
      type: "Integration Service",
      description: "Southern Region Water Board postpaid bill lookup and payment",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/srwb-postpaid-test/v1/accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "SRWB_POSTPAID", required: true },
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 123456", required: true },
        ],
      },
    },
    {
      serviceKey: "srwb-prepaid",
      name: "SRWB Prepaid Water Bill (ESB)",
      type: "Integration Service",
      description: "Southern Region Water Board prepaid (voucher) bill lookup and payment",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/srwb-prepaid-test/v1/accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "SRWB_PREPAID", required: true },
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 123456", required: true },
        ],
      },
    },
    {
      serviceKey: "masm",
      name: "MASM Health Coverage (ESB)",
      type: "Integration Service",
      description: "MASM health coverage lookup and payment (prepaid/postpaid)",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/masm-test/v1/accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "MASM", required: true },
          { name: "accountNumber", label: "Account Number", placeholder: "e.g., 123456", required: true },
          { name: "accountType", label: "Account Type", placeholder: "Select type", type: "select", options: ["PREPAID", "POSTPAID"], required: false },
        ],
      },
    },
    {
      serviceKey: "register-general",
      name: "Register General (ESB)",
      type: "Integration Service",
      description: "Government service payments and invoice lookup",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /api/billers/register-general/v1/accounts",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "REGISTER_GENERAL", required: true },
          { name: "invoiceNumber", label: "Invoice Number", placeholder: "e.g., INV123456", required: true },
        ],
      },
    },
    {
      serviceKey: "tnm-bundles",
      name: "TNM Bundles Validation (ESB)",
      type: "Integration Service",
      description: "TNM bundle validation and purchase",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/tnm-bundles/v1/validation",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "TNM_BUNDLES", required: true },
          { name: "phoneNumber", label: "Phone Number", placeholder: "e.g., 0881234567", required: true },
          { name: "bundleId", label: "Bundle ID (Optional)", placeholder: "e.g., BUNDLE123", required: false },
        ],
      },
    },
    {
      serviceKey: "airtel-validation",
      name: "Airtel Validation Service (ESB)",
      type: "Integration Service",
      description: "Airtel number validation for topup eligibility",
      status: "Available",
      interval: "On-demand",
      details: "Endpoint: /esb/api/airtel/v1/validation",
      variant: "outline" as const,
      testable: true,
      testConfig: {
        endpoint: "/api/services/biller-test",
        fields: [
          { name: "billerType", label: "Biller Type", placeholder: "AIRTEL_VALIDATION", required: true },
          { name: "phoneNumber", label: "Phone Number", placeholder: "e.g., 0991234567", required: true },
        ],
      },
    },
    {
      name: "Backup Service",
      type: "Core Service",
      description: "Database backup and restore with MinIO storage",
      status: "Available",
      interval: "On-demand",
      details: "PostgreSQL backups with cloud sync",
      variant: "outline" as const,
    },
    {
      name: "Migration Scheduler",
      type: "Core Service",
      description: "Schedules and runs database migrations",
      status: "Running",
      interval: "1m",
      details: "Supports recurring migrations with cron",
      variant: "secondary" as const,
    },
  ] : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Background Services Monitor</h1>
          <p className="text-muted-foreground">
            Real-time service status updates via Server-Sent Events
            {connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Connected
              </span>
            )}
            {!connected && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-600">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Disconnected
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status?.balanceSync.processing ? (
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Balance Sync Service
            </CardTitle>
            <CardDescription>Syncs account balances from T24</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status:</span>
              <Badge variant={status?.balanceSync.processing ? "default" : "secondary"}>
                {status?.balanceSync.processing ? "Processing" : "Idle"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Priority Queue:</span>
              <Badge variant="outline">{status?.balanceSync.priority || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Background Queue:</span>
              <Badge variant="outline">{status?.balanceSync.background || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Interval:</span>
              <span className="text-sm text-muted-foreground">
                {status?.balanceSync.intervalMinutes} minutes
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status?.accountDiscovery.discovering ? (
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Account Discovery Service
            </CardTitle>
            <CardDescription>Discovers new accounts from T24</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status:</span>
              <Badge variant={status?.accountDiscovery.running ? "default" : "destructive"}>
                {status?.accountDiscovery.running ? "Running" : "Stopped"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Currently Discovering:</span>
              <Badge variant={status?.accountDiscovery.discovering ? "default" : "secondary"}>
                {status?.accountDiscovery.discovering ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pagination Queue:</span>
              <Badge variant="outline">{status?.accountDiscovery.paginationQueueSize || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Interval:</span>
              <span className="text-sm text-muted-foreground">
                {status?.accountDiscovery.intervalHours} hours
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status?.accountEnrichment.enriching ? (
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Account Enrichment Service
            </CardTitle>
            <CardDescription>Enriches accounts with T24 details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status:</span>
              <Badge variant={status?.accountEnrichment.running ? "default" : "destructive"}>
                {status?.accountEnrichment.running ? "Running" : "Stopped"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Currently Enriching:</span>
              <Badge variant={status?.accountEnrichment.enriching ? "default" : "secondary"}>
                {status?.accountEnrichment.enriching ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Interval:</span>
              <span className="text-sm text-muted-foreground">
                {status?.accountEnrichment.intervalHours} hours
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {smsStats && smsStats.successRate >= 90 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Activity className="h-5 w-5 text-orange-500" />
              )}
              SMS Notifications
            </CardTitle>
            <CardDescription>ESB Gateway SMS delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Success Rate:</span>
              <Badge variant={smsStats && smsStats.successRate >= 90 ? "default" : "destructive"}>
                {smsStats ? `${smsStats.successRate.toFixed(1)}%` : "Loading..."}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sent (24h):</span>
              <Badge variant="outline">{smsStats?.sent || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Failed (24h):</span>
              <Badge variant={smsStats && smsStats.failed > 0 ? "destructive" : "outline"}>
                {smsStats?.failed || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending:</span>
              <Badge variant="secondary">{smsStats?.pending || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Services Overview
          </CardTitle>
          <CardDescription>
            All available services and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={servicesTableData}
            columns={serviceColumns}
            searchableKeys={["name", "type", "description", "status"]}
            pageSize={10}
            searchPlaceholder="Search services..."
            showRowNumbers
            rowNumberHeader="#"
          />
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test {selectedService?.name}</DialogTitle>
            <DialogDescription>
              {selectedService?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedService?.testConfig?.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required !== false && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === "user-select" ? (
                  <select
                    id={field.name}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={testParams[field.name] || ""}
                    onChange={(e) =>
                      setTestParams({ ...testParams, [field.name]: e.target.value })
                    }
                    disabled={testLoading || loadingOptions}
                  >
                    <option value="">{loadingOptions ? "Loading users..." : field.placeholder}</option>
                    {dynamicOptions.users?.map((user) => (
                      <option key={user.value} value={user.value}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "select" ? (
                  <select
                    id={field.name}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={testParams[field.name] || ""}
                    onChange={(e) =>
                      setTestParams({ ...testParams, [field.name]: e.target.value })
                    }
                    disabled={testLoading}
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    placeholder={field.placeholder}
                    value={testParams[field.name] || ""}
                    onChange={(e) =>
                      setTestParams({ ...testParams, [field.name]: e.target.value })
                    }
                    disabled={testLoading}
                  />
                )}
              </div>
            ))}

            {/* Test Result Log */}
            {testResult && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Test Result</Label>
                  <Badge variant={testResult.success ? "default" : "destructive"}>
                    {testResult.success ? "Success" : "Failed"}
                  </Badge>
                </div>
                <div className="rounded-md border bg-muted/30 p-3 max-h-96 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(testResult.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              disabled={testLoading}
            >
              {translate("common.actions.cancel")}
            </Button>
            <Button onClick={runTest} disabled={testLoading}>
              {testLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {translate("common.actions.runTest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={closeLogsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedService?.name} - Realtime Logs
                </DialogTitle>
                <DialogDescription>
                  Live streaming logs from the service
                  {logsConnected && (
                    <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Connected
                    </span>
                  )}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLogsDialog}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <div className="bg-slate-950 text-green-400 p-4 rounded-lg h-[500px] overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Waiting for logs...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="whitespace-pre-wrap break-words">
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogs([])}
            >
              {translate("common.actions.clearLogs")}
            </Button>
            <Button onClick={closeLogsDialog}>
              {translate("common.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
