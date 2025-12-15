"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RegistrationStatus } from "@prisma/client";
import type { RequestedRegistrationWithRelations } from "@/types/registration";
import { useRegistrationUpdates } from "@/lib/hooks/useRegistrationUpdates";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  PlayCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  Building,
  Calendar,
  MapPin,
  FileJson,
  Radio,
} from "lucide-react";

interface RegistrationRequest extends Omit<RequestedRegistrationWithRelations, 'createdAt' | 'updatedAt' | 'processedAt' | 'lastRetryAt'> {
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  lastRetryAt: string | null;
}

const statusConfig = {
  [RegistrationStatus.PENDING]: {
    variant: "secondary" as const,
    icon: Clock,
    label: "Pending",
  },
  [RegistrationStatus.APPROVED]: {
    variant: "default" as const,
    icon: CheckCircle,
    label: "Approved",
  },
  [RegistrationStatus.COMPLETED]: {
    variant: "default" as const,
    icon: CheckCircle,
    label: "Completed",
  },
  [RegistrationStatus.FAILED]: {
    variant: "destructive" as const,
    icon: XCircle,
    label: "Failed",
  },
  [RegistrationStatus.DUPLICATE]: {
    variant: "outline" as const,
    icon: Copy,
    label: "Duplicate",
  },
};

export default function RegistrationRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [registration, setRegistration] = useState<RegistrationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [realtimeUpdate, setRealtimeUpdate] = useState<string | null>(null);

  // Real-time updates via SSE
  const { isConnected, latestUpdate } = useRegistrationUpdates({
    registrationId: parseInt(id),
    onUpdate: (update) => {
      console.log('📢 Real-time update received:', update);
      
      // Show real-time update message
      if (update.stage) {
        setRealtimeUpdate(`${update.stage}: ${update.message || update.status}`);
      }

      // If final status reached, refresh the registration
      const finalStatuses = new Set<RegistrationStatus>([
        RegistrationStatus.COMPLETED,
        RegistrationStatus.FAILED,
        RegistrationStatus.DUPLICATE,
        RegistrationStatus.APPROVED,
      ]);

      if (finalStatuses.has(update.status)) {
        setTimeout(() => {
          fetchRegistration();
          setRealtimeUpdate(null);
        }, 1000);
      }
    },
    onConnected: () => {
      console.log('✅ Connected to registration updates');
    },
  });

  const fetchRegistration = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/registrations/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch registration");
      }

      const result = await response.json();

      if (result.success) {
        setRegistration(result.data);
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
    fetchRegistration();
  }, [id]);

  const handleProcess = async () => {
    if (!registration) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/registrations/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processedBy: 1, // TODO: Get from auth context
          notes: "Processed from admin panel",
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchRegistration();
        
        const stages = result.processLog?.map((log: any) => 
          `${log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '▶️'} ${log.stage}: ${log.details || log.status}${log.duration ? ` (${log.duration}ms)` : ''}`
        ).join('\n');
        
        alert(`Validation successful!\n\nFound ${result.accountsFound} accounts\nTotal time: ${result.totalDuration}ms\n\nProcess stages:\n${stages}`);
      } else {
        await fetchRegistration();
        
        const stages = result.processLog?.map((log: any) => 
          `${log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '▶️'} ${log.stage}: ${log.error || log.details || log.status}${log.duration ? ` (${log.duration}ms)` : ''}`
        ).join('\n');
        
        alert(`Validation failed: ${result.message}\n\nProcess stages:\n${stages || 'No stage information available'}`);
      }
    } catch (err) {
      alert(`Error processing registration: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading registration details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-destructive">
              {error || "Registration not found"}
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = statusConfig[registration.status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Registrations
        </Button>
      </div>

      <div className="grid gap-4">
        {/* Header Card */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Registration Request #{registration.id}
                {isConnected && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Radio className="h-3 w-3 animate-pulse text-green-500" />
                    Live
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created {new Date(registration.createdAt).toLocaleString()}
              </p>
              {realtimeUpdate && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Clock className="h-3 w-3 animate-spin" />
                  {realtimeUpdate}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              {registration.status === RegistrationStatus.PENDING && (
                <Button
                  size="sm"
                  onClick={handleProcess}
                  disabled={processing}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {processing ? "Validating..." : "Validate Customer"}
                </Button>
              )}
              {registration.status === RegistrationStatus.APPROVED && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Validated - Awaiting Cron Processing
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {registration.firstName || ""} {registration.lastName || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileJson className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Customer Number</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {registration.customerNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Phone Number</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {registration.phoneNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {registration.emailAddress || "N/A"}
                  </p>
                </div>
              </div>
              {registration.company && (
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Company</p>
                    <p className="text-sm text-muted-foreground">
                      {registration.company}
                    </p>
                  </div>
                </div>
              )}
              {registration.profileType && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Profile Type</p>
                    <Badge variant="outline" className="text-xs">
                      {registration.profileType}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Source IP</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {registration.sourceIp}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileJson className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Source</p>
                  <Badge variant="outline" className="text-xs">
                    {registration.source}
                  </Badge>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Created At</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(registration.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {registration.processedAt && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Processed At</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(registration.processedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {registration.retryCount > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Retry Count</p>
                    <Badge variant="secondary" className="text-xs">
                      {registration.retryCount} attempts
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Validation Data - Show if APPROVED */}
        {(() => {
          const validationData = (registration as any).validationData as
            | { accounts?: any[] }
            | undefined;

          if (registration.status !== RegistrationStatus.APPROVED || !validationData) {
            return null;
          }

          return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Customer Accounts Found</p>
                  <div className="space-y-2">
                    {validationData.accounts?.map((account: any, index: number) => (
                      <div key={index} className="bg-muted p-3 rounded-md">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Account:</span> {account.accountId}
                          </div>
                          <div>
                            <span className="font-medium">Currency:</span> {account.currency || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Category:</span> {account.category || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Title:</span> {account.title || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    ✅ Customer validated successfully. User will be created when the cron job runs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })()}

        {/* Processing Information */}
        {(registration.mobileUser || registration.processedByUser || registration.notes || registration.errorMessage) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {registration.mobileUser && (
                <div>
                  <p className="text-sm font-medium mb-1">Linked Mobile User</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">ID: {registration.mobileUser.id}</p>
                    <p className="text-sm">Username: {registration.mobileUser.username || "N/A"}</p>
                    <p className="text-sm">Phone: {registration.mobileUser.phoneNumber || "N/A"}</p>
                  </div>
                </div>
              )}
              {registration.processedByUser && (
                <div>
                  <p className="text-sm font-medium mb-1">Processed By</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{registration.processedByUser.name || registration.processedByUser.email}</p>
                  </div>
                </div>
              )}
              {registration.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{registration.notes}</p>
                  </div>
                </div>
              )}
              {registration.errorMessage && (
                <div>
                  <p className="text-sm font-medium mb-1 text-destructive">Error Message</p>
                  <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                    <p className="text-sm text-destructive">{registration.errorMessage}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
