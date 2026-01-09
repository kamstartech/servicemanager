"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
 import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Activity,
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Key,
  Link2,
  Loader2,
  Pause,
  Play,
  PlayCircle,
  Trash2,
  XCircle,
} from "lucide-react";
import { formatStatusOneWord } from "@/lib/utils";
import { toast } from "sonner";

interface Token {
  id: string;
  keyPrefix: string;
  name: string | null;
  description: string | null;
  status: string;
  permissions: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  daysUntilExpiry: number | null;
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { translate, locale } = useI18n();

  const columns: DataTableColumn<any>[] = [
    {
      id: "index",
      header: COMMON_TABLE_HEADERS.index,
      accessor: (row) => row.index + 1,
    },
    {
      id: "name",
      header: COMMON_TABLE_HEADERS.name,
      accessor: (row) => (
        <div>
          <p className="font-medium">
            {row.name || translate("thirdParty.clientDetail.unnamedToken")}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {row.keyPrefix}
          </p>
        </div>
      ),
      sortKey: "name",
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => {
        let statusConfig = { variant: "secondary", label: "Active" };
        
        if (row.status === "SUSPENDED") {
          statusConfig = { variant: "secondary", label: "Suspended" };
        } else if (row.status === "ACTIVE") {
          statusConfig = { variant: "default", label: "Active" };
        } else if (row.status === "REVOKED") {
          statusConfig = { variant: "outline", label: "Revoked" };
        }
        
        return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
      },
      sortKey: "status",
    },
    {
      id: "createdAt",
      header: COMMON_TABLE_HEADERS.createdAt,
      accessor: (row) => (
        <div className="text-sm">
          <span className="inline-flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} />
            {new Date(row.expiresAt).toLocaleString(dateLocale, {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          {row.daysUntilExpiry !== null && (
            <span className="text-xs text-muted-foreground">
              ({row.daysUntilExpiry} {translate("thirdParty.clientDetail.daysLeft")})
            </span>
          )}
        </div>
      ),
      sortKey: "expiresAt",
    },
    {
      id: "lastUsed",
      header: COMMON_TABLE_HEADERS.lastUsed,
      accessor: (row) => (
        <div className="text-xs text-muted-foreground">
          {new Date(row.lastUsedAt).toLocaleString()}
        </div>
      ),
      sortKey: "lastUsedAt",
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <div className="flex gap-1 justify-center">
          {row.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
              onClick={() => updateTokenStatus(row.id, "suspend")}
            >
              <Ban className="h-4 w-4 mr-2" />
              {translate("thirdParty.clientDetail.actions.suspend")}
            </Button>
          )}
          {row.status === "SUSPENDED" && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200"
              onClick={() => updateTokenStatus(row.id, "reactivate")}
            >
              <Play className="h-4 w-4 mr-2" />
              {translate("thirdParty.clientDetail.actions.reactivate")}
            </Button>
          )}
          {row.status !== "REVOKED" && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
              onClick={() => updateTokenStatus(row.id, "revoke")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {translate("thirdParty.clientDetail.actions.revoke")}
            </Button>
          )}
        </div>
      ),
    },
  ];
  const [client, setClient] = useState<any>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<{
    expiresAt: string;
    expiresInDays: number;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Token generation form
  const [tokenForm, setTokenForm] = useState({
    name: "",
    description: "",
    expiresIn: "1y",
  });

  useEffect(() => {
    fetchClientDetails();
    fetchTokens();
  }, [id]);

  const dateLocale = locale === "pt" ? "pt-PT" : "en-US";

  const fetchClientDetails = async () => {
    try {
      const response = await fetch(`/api/admin/third-party/clients/${id}`);
      const result = await response.json();
      if (result.success) {
        setClient(result.data);
      }
    } catch (error) {
      console.error("Error fetching client:", error);
      toast.error(translate("thirdParty.clientDetail.toasts.loadClientFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchTokens = async () => {
    try {
      const response = await fetch(
        `/api/admin/third-party/clients/${id}/tokens`
      );
      const result = await response.json();
      if (result.success) {
        setTokens(result.data.tokens);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  };

  const generateToken = async () => {
    try {
      const response = await fetch(
        `/api/admin/third-party/clients/${id}/tokens`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokenForm),
        }
      );

      const result = await response.json();

      if (result.success) {
        setGeneratedToken(result.data.token);
        setTokenMetadata({
          expiresAt: result.data.expiresAt,
          expiresInDays: result.data.expiresInDays,
        });
        setShowTokenDialog(true);
        fetchTokens(); // Refresh token list
        toast.success(translate("thirdParty.clientDetail.toasts.tokenGenerated"));
        
        // Reset form
        setTokenForm({
          name: "",
          description: "",
          expiresIn: "1y",
        });
      } else {
        toast.error(result.error || translate("thirdParty.clientDetail.toasts.tokenGenerateFailed"));
      }
    } catch (error) {
      console.error("Error generating token:", error);
      toast.error(translate("thirdParty.clientDetail.toasts.tokenGenerateFailed"));
    }
  };

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopiedToken(true);
      toast.success(translate("thirdParty.clientDetail.toasts.tokenCopied"));
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const updateTokenStatus = async (
    tokenId: string,
    action: "suspend" | "reactivate" | "revoke"
  ) => {
    try {
      const response = await fetch(
        `/api/admin/third-party/tokens/${tokenId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(translate(`thirdParty.clientDetail.toasts.tokenStatus.${action}.success`));
        fetchTokens();
      } else {
        toast.error(
          result.error ||
            translate(`thirdParty.clientDetail.toasts.tokenStatus.${action}.failed`)
        );
      }
    } catch (error) {
      console.error(`Error ${action}ing token:`, error);
      toast.error(translate(`thirdParty.clientDetail.toasts.tokenStatus.${action}.failed`));
    }
  };

  const getStatusBadge = (status: string) => {
    const label = formatStatusOneWord(status, "UNKNOWN");

    if (status === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={14} />
          {label}
        </span>
      );
    }

    if (status === "EXPIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle size={14} />
          {label}
        </span>
      );
    }

    if (status === "SUSPENDED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={14} />
          {label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Ban size={14} />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-center">{translate("common.state.loading")}</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-center">{translate("thirdParty.clientDetail.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/system/third-party">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {translate("thirdParty.clientDetail.backToClients")}
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{client.name}</h1>
              {client.description && (
                <p className="text-muted-foreground mt-2">
                  {client.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {translate("thirdParty.clientDetail.contactInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  {translate("thirdParty.clientDetail.fields.name")}
                </p>
                <p>{client.contactName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {translate("thirdParty.clientDetail.fields.email")}
                </p>
                <p>{client.contactEmail || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {translate("thirdParty.clientDetail.fields.phone")}
                </p>
                <p>{client.contactPhone || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {translate("thirdParty.clientDetail.securitySettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  {translate("thirdParty.clientDetail.fields.rateLimits")}
                </p>
                <p>{client.rateLimitPerMinute}/min, {client.rateLimitPerHour}/hour</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {translate("thirdParty.clientDetail.fields.allowedIps")}
                </p>
                <p>
                  {client.allowedIps && client.allowedIps.length > 0
                    ? client.allowedIps.join(", ")
                    : translate("thirdParty.clientDetail.allIpsAllowed")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {translate("thirdParty.clientDetail.fields.status")}
                </p>
                <p>{client.isActive ? "✅ Active" : "❌ Inactive"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Tokens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{translate("thirdParty.clientDetail.apiTokens")}</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-fdh-orange hover:bg-fdh-orange/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {translate("thirdParty.clientDetail.generateToken")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {translate("thirdParty.clientDetail.generateNewApiToken")}
                  </DialogTitle>
                  <DialogDescription>
                    {translate("thirdParty.clientDetail.generateTokenDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="tokenName">
                      {translate("thirdParty.clientDetail.form.tokenName")}
                    </Label>
                    <Input
                      id="tokenName"
                      placeholder={translate(
                        "thirdParty.clientDetail.form.tokenNamePlaceholder"
                      )}
                      value={tokenForm.name}
                      onChange={(e) =>
                        setTokenForm({ ...tokenForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="tokenDescription">
                      {translate("thirdParty.clientDetail.form.descriptionOptional")}
                    </Label>
                    <Input
                      id="tokenDescription"
                      placeholder={translate(
                        "thirdParty.clientDetail.form.descriptionPlaceholder"
                      )}
                      value={tokenForm.description}
                      onChange={(e) =>
                        setTokenForm({
                          ...tokenForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiresIn">
                      {translate("thirdParty.clientDetail.form.expiresIn")}
                    </Label>
                    <select
                      id="expiresIn"
                      className="w-full p-2 border rounded-md"
                      value={tokenForm.expiresIn}
                      onChange={(e) =>
                        setTokenForm({ ...tokenForm, expiresIn: e.target.value })
                      }
                    >
                      <option value="30d">{translate("thirdParty.clientDetail.form.duration.30d")}</option>
                      <option value="90d">{translate("thirdParty.clientDetail.form.duration.90d")}</option>
                      <option value="180d">{translate("thirdParty.clientDetail.form.duration.180d")}</option>
                      <option value="1y">{translate("thirdParty.clientDetail.form.duration.1y")}</option>
                      <option value="2y">{translate("thirdParty.clientDetail.form.duration.2y")}</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {translate("thirdParty.clientDetail.form.tokenWillExpireOn")} {" "}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          Date.now() +
                            (tokenForm.expiresIn.endsWith("d")
                              ? parseInt(tokenForm.expiresIn) * 24 * 60 * 60 * 1000
                              : parseInt(tokenForm.expiresIn) * 365 * 24 * 60 * 60 * 1000)
                        ).toLocaleString(dateLocale, {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={generateToken}
                    className="bg-fdh-orange hover:bg-fdh-orange/90"
                  >
                    {translate("thirdParty.clientDetail.generateToken")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {tokens.length === 0 ? (
              <div className="text-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">
                  {translate("thirdParty.clientDetail.empty.noTokens")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {translate("thirdParty.clientDetail.empty.generateFirstToken")}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">{translate("common.table.columns.index")}</TableHead>
                    <TableHead>{translate("common.table.columns.name")}</TableHead>
                    <TableHead className="text-center">
                      {translate("common.table.columns.status")}
                    </TableHead>
                    <TableHead>{translate("common.table.columns.created")}</TableHead>
                    <TableHead>{translate("common.table.columns.expires")}</TableHead>
                    <TableHead className="text-center">
                      {translate("common.table.columns.usage")}
                    </TableHead>
                    <TableHead>{translate("common.table.columns.lastUsed")}</TableHead>
                    <TableHead className="text-center">
                      {translate("common.table.columns.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token, index) => (
                    <TableRow key={token.id}>
                      <TableCell className="text-center whitespace-nowrap">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {token.name || translate("thirdParty.clientDetail.unnamedToken")}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {token.keyPrefix}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(token.status)}</TableCell>
                      <TableCell>
                        {token.expiresAt ? (
                          <div>
                            <p className="text-sm">
                              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                                <Calendar size={16} />
                                {new Date(token.expiresAt).toLocaleString(dateLocale, {
                                  year: "numeric",
                                  month: "short",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </p>
                            {token.daysUntilExpiry !== null && (
                              <p
                                className={`text-xs ${
                                  token.daysUntilExpiry < 30
                                    ? "text-red-600"
                                    : token.daysUntilExpiry < 90
                                    ? "text-yellow-600"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {token.daysUntilExpiry > 0
                                  ? `${token.daysUntilExpiry} ${translate("thirdParty.clientDetail.daysLeft")}`
                                  : translate("thirdParty.clientDetail.expired")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {translate("thirdParty.clientDetail.never")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {token.usageCount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {token.lastUsedAt
                          ? new Date(token.lastUsedAt).toLocaleString(dateLocale)
                          : translate("thirdParty.clientDetail.never")}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          {token.status === "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
onClick={() => updateTokenStatus(token.id, "suspend")}
                            >
                                <Ban className="h-4 w-4 mr-2" />
                                {COMMON_TABLE_HEADERS.suspend}
                            </Button>
                          )}
                          {token.status === "SUSPENDED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200"
                              onClick={() => updateTokenStatus(token.id, "reactivate")}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              {translate("thirdParty.clientDetail.actions.reactivate")}
                            </Button>
                          )}
                          {token.status !== "REVOKED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
                              onClick={() => updateTokenStatus(token.id, "revoke")}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {translate("thirdParty.clientDetail.actions.revoke")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Generated Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {translate("thirdParty.clientDetail.tokenGeneratedDialog.title")}
            </DialogTitle>
            <DialogDescription>
              <strong>{translate("thirdParty.clientDetail.tokenGeneratedDialog.importantLabel")}</strong> {" "}
              {translate("thirdParty.clientDetail.tokenGeneratedDialog.importantBody")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Label>{translate("thirdParty.clientDetail.tokenGeneratedDialog.yourApiToken")}</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={generatedToken || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToken}
                  className="flex-shrink-0"
                >
                  {copiedToken ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Token Expiration Info */}
            {tokenMetadata && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <p className="text-sm font-medium mb-2">
                  {translate("thirdParty.clientDetail.tokenGeneratedDialog.expiration.title")}
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>{translate("thirdParty.clientDetail.tokenGeneratedDialog.expiration.expiresLabel")}</strong>{" "}
                    {new Date(tokenMetadata.expiresAt).toLocaleDateString(dateLocale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p>
                    <strong>{translate("thirdParty.clientDetail.tokenGeneratedDialog.expiration.validForLabel")}</strong> {" "}
                    {tokenMetadata.expiresInDays} {translate("thirdParty.clientDetail.days")}
                  </p>
                </div>
              </div>
            )}
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
              <p className="text-sm">
                <strong>{translate("thirdParty.clientDetail.tokenGeneratedDialog.usageLabel")}</strong>{" "}
                {translate("thirdParty.clientDetail.tokenGeneratedDialog.usageBody")}
              </p>
              <code className="block mt-2 p-2 bg-black text-white rounded text-xs">
                Authorization: Bearer {generatedToken?.substring(0, 50)}...
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTokenDialog(false)}>
              {translate("thirdParty.clientDetail.tokenGeneratedDialog.savedButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
