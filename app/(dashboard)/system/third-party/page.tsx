"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import {
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  Users,
  Key,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { translateStatusOneWord } from "@/lib/utils";

interface ThirdPartyClient {
  id: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    apiKeys: number;
    accessLogs: number;
  };
}

export default function ThirdPartyClientsPage() {
  const { translate } = useI18n();
  const [clients, setClients] = useState<ThirdPartyClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const columns: DataTableColumn<ThirdPartyClient>[] = [
    {
      id: "name",
      header: translate("common.table.columns.name"),
      accessor: (client) => (
        <div>
          <p className="font-medium">{client.name}</p>
          {client.description && (
            <p className="text-sm text-muted-foreground">{client.description}</p>
          )}
        </div>
      ),
      sortKey: "name",
    },
    {
      id: "contactEmail",
      header: translate("common.table.columns.contactEmail"),
      accessor: (client) =>
        client.contactEmail || <span className="text-muted-foreground">-</span>,
      sortKey: "contactEmail",
    },
    {
      id: "status",
      header: translate("common.table.columns.status"),
      accessor: (client) =>
        client.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            {translateStatusOneWord("ACTIVE", translate, "ACTIVE")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} />
            {translateStatusOneWord("INACTIVE", translate, "INACTIVE")}
          </span>
        ),
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "tokens",
      header: translate("common.table.columns.tokens"),
      accessor: (client) => (
        <span className="inline-flex items-center justify-center gap-1">
          <Key className="h-4 w-4 text-fdh-orange" />
          {client._count.apiKeys}
        </span>
      ),
      alignCenter: true,
    },
    {
      id: "apiCalls",
      header: translate("common.table.columns.apiCalls"),
      accessor: (client) => (
        <span className="inline-flex items-center justify-center gap-1">
          <Activity className="h-4 w-4 text-blue-600" />
          {client._count.accessLogs.toLocaleString()}
        </span>
      ),
      alignCenter: true,
    },
    {
      id: "createdAt",
      header: translate("common.table.columns.created"),
      accessor: (client) => (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          {new Date(client.createdAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      ),
      sortKey: "createdAt",
      alignCenter: true,
    },
    {
      id: "actions",
      header: translate("common.table.columns.actions"),
      accessor: (client) => (
        <div className="flex justify-center">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
          >
            <Link href={`/system/third-party/clients/${client.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {translate("common.actions.details")}
            </Link>
          </Button>
        </div>
      ),
      alignCenter: true,
    },
  ];

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/admin/third-party/clients");
      const result = await response.json();

      if (result.success) {
        setClients(result.data);
        
        // Check if tables not created
        if (result.message?.includes("migrate")) {
          setMigrationNeeded(true);
          toast.warning("Database tables not created. See banner above.", { duration: 5000 });
        }
      } else {
        toast.error("Failed to load clients");
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      {/* Migration Warning Banner */}
      {migrationNeeded && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                Database Migration Required
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                The third-party API tables haven't been created yet. Please run the migration:
              </p>
              <code className="block mt-2 p-2 bg-black text-white rounded text-sm">
                npx prisma migrate dev --name add_third_party_api_management
              </code>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Third-Party API Clients</h1>
        <p className="text-muted-foreground mt-2">
          Manage external clients and their API access tokens
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
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
                <p className="text-sm text-muted-foreground">Active Clients</p>
                <p className="text-2xl font-bold">
                  {clients.filter((c) => c.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Key className="h-6 w-6 text-fdh-orange" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">
                  {clients.reduce((sum, c) => sum + c._count.apiKeys, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>API Clients</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchClients}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Link href="/system/third-party/clients/new">
              <Button size="sm" className="bg-fdh-orange hover:bg-fdh-orange/90">
                <Plus className="h-4 w-4 mr-2" />
                New Client
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading clients...
            </p>
          )}

          {!loading && clients.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No clients yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first API client to get started
              </p>
              <Link href="/system/third-party/clients/new">
                <Button className="bg-fdh-orange hover:bg-fdh-orange/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Client
                </Button>
              </Link>
            </div>
          )}

          {!loading && clients.length > 0 && (
            <DataTable<ThirdPartyClient>
              data={clients}
              columns={columns}
              searchableKeys={["name", "description", "contactEmail"]}
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder="Search API clients..."
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
