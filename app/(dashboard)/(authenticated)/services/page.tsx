"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, CheckCircle, Clock, Activity, TestTube, Loader2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { toast } from "sonner";

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

interface ServiceTableRow {
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
    paramName: string;
    paramLabel: string;
    paramPlaceholder: string;
  };
}

export default function ServicesMonitorPage() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceTableRow | null>(null);
  const [testParam, setTestParam] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleTestService = (service: ServiceTableRow) => {
    setSelectedService(service);
    setTestParam("");
    setTestDialogOpen(true);
  };

  const runTest = async () => {
    if (!selectedService || !testParam) return;

    setTestLoading(true);
    try {
      const response = await fetch(selectedService.testConfig!.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [selectedService.testConfig!.paramName]: selectedService.testConfig!.paramName === "userId" 
            ? parseInt(testParam) 
            : testParam,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Test Successful", {
          description: data.message || "Service test completed successfully",
        });
      } else {
        toast.error("Test Failed", {
          description: data.error || data.message || "Service test failed",
        });
      }
    } catch (error) {
      toast.error("Test Error", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setTestLoading(false);
      setTestDialogOpen(false);
    }
  };

  // Define DataTable columns
  const serviceColumns: DataTableColumn<ServiceTableRow>[] = [
    {
      id: "name",
      header: "Service Name",
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortKey: "name",
    },
    {
      id: "type",
      header: "Type",
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.type}
        </Badge>
      ),
      sortKey: "type",
    },
    {
      id: "description",
      header: "Description",
      accessor: (row) => (
        <span className="text-sm text-muted-foreground max-w-xs">
          {row.description}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => <Badge variant={row.variant}>{row.status}</Badge>,
      sortKey: "status",
    },
    {
      id: "interval",
      header: "Interval",
      accessor: (row) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {row.interval}
        </div>
      ),
    },
    {
      id: "details",
      header: "Details",
      accessor: (row) => (
        <span className="text-xs text-muted-foreground">{row.details}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => (
        row.testable ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTestService(row)}
            className="h-7 text-xs"
          >
            <TestTube className="h-3 w-3 mr-1" />
            Test
          </Button>
        ) : null
      ),
    },
  ];

  const servicesTableData: ServiceTableRow[] = status ? [
    {
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
        paramName: "userId",
        paramLabel: "User ID",
        paramPlaceholder: "e.g., 1",
      },
    },
    {
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
        paramName: "userId",
        paramLabel: "User ID",
        paramPlaceholder: "e.g., 1",
      },
    },
    {
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
        paramName: "accountNumber",
        paramLabel: "Account Number",
        paramPlaceholder: "e.g., 1520000114607",
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
        paramName: "accountNumber",
        paramLabel: "Account Number",
        paramPlaceholder: "e.g., 1520000114607",
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
        paramName: "customerId",
        paramLabel: "Customer ID",
        paramPlaceholder: "e.g., 35042058",
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
        paramName: "accountNumber",
        paramLabel: "Account Number",
        paramPlaceholder: "e.g., 1520000114607",
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
        endpoint: "/api/services/t24-transactions",
        paramName: "accountNumber",
        paramLabel: "Account Number",
        paramPlaceholder: "e.g., 1520000114607",
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          />
        </CardContent>
      </Card>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test {selectedService?.name}</DialogTitle>
            <DialogDescription>
              {selectedService?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testParam">
                {selectedService?.testConfig?.paramLabel}
              </Label>
              <Input
                id="testParam"
                placeholder={selectedService?.testConfig?.paramPlaceholder}
                value={testParam}
                onChange={(e) => setTestParam(e.target.value)}
                disabled={testLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              disabled={testLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={runTest}
              disabled={testLoading || !testParam}
            >
              {testLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
