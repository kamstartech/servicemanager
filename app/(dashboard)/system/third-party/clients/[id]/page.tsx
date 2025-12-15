"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Ban,
  Play,
  Trash2,
  RefreshCw,
  Key,
  AlertTriangle,
  Clock,
  Activity,
  Calendar,
} from "lucide-react";
import { CheckCircle, XCircle } from "lucide-react";
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

  const fetchClientDetails = async () => {
    try {
      const response = await fetch(`/api/admin/third-party/clients/${id}`);
      const result = await response.json();
      if (result.success) {
        setClient(result.data);
      }
    } catch (error) {
      console.error("Error fetching client:", error);
      toast.error("Failed to load client details");
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
        toast.success("Token generated successfully");
        
        // Reset form
        setTokenForm({
          name: "",
          description: "",
          expiresIn: "1y",
        });
      } else {
        toast.error(result.error || "Failed to generate token");
      }
    } catch (error) {
      console.error("Error generating token:", error);
      toast.error("Failed to generate token");
    }
  };

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopiedToken(true);
      toast.success("Token copied to clipboard");
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
        toast.success(`Token ${action}d successfully`);
        fetchTokens();
      } else {
        toast.error(result.error || `Failed to ${action} token`);
      }
    } catch (error) {
      console.error(`Error ${action}ing token:`, error);
      toast.error(`Failed to ${action} token`);
    }
  };

  const getStatusBadge = (status: string) => {
    const label = status?.replace(/_/g, " ") || "Unknown";

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
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-center">Client not found</p>
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
              Back to Clients
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
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p>{client.contactName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{client.contactEmail || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p>{client.contactPhone || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Rate Limits</p>
                <p>{client.rateLimitPerMinute}/min, {client.rateLimitPerHour}/hour</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allowed IPs</p>
                <p>
                  {client.allowedIps && client.allowedIps.length > 0
                    ? client.allowedIps.join(", ")
                    : "All IPs allowed"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p>{client.isActive ? "✅ Active" : "❌ Inactive"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Tokens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>API Tokens</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-fdh-orange hover:bg-fdh-orange/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New API Token</DialogTitle>
                  <DialogDescription>
                    Create a new API token for this client. The token will be shown only once.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="tokenName">Token Name</Label>
                    <Input
                      id="tokenName"
                      placeholder="Production Token"
                      value={tokenForm.name}
                      onChange={(e) =>
                        setTokenForm({ ...tokenForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="tokenDescription">Description (optional)</Label>
                    <Input
                      id="tokenDescription"
                      placeholder="Main API token for production"
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
                    <Label htmlFor="expiresIn">Expires In</Label>
                    <select
                      id="expiresIn"
                      className="w-full p-2 border rounded-md"
                      value={tokenForm.expiresIn}
                      onChange={(e) =>
                        setTokenForm({ ...tokenForm, expiresIn: e.target.value })
                      }
                    >
                      <option value="30d">30 days</option>
                      <option value="90d">90 days (3 months)</option>
                      <option value="180d">180 days (6 months)</option>
                      <option value="1y">1 year (recommended)</option>
                      <option value="2y">2 years</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Token will expire on{" "}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          Date.now() +
                            (tokenForm.expiresIn.endsWith("d")
                              ? parseInt(tokenForm.expiresIn) * 24 * 60 * 60 * 1000
                              : parseInt(tokenForm.expiresIn) * 365 * 24 * 60 * 60 * 1000)
                        ).toLocaleString(undefined, {
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
                  <Button onClick={generateToken} className="bg-fdh-orange hover:bg-fdh-orange/90">
                    Generate Token
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {tokens.length === 0 ? (
              <div className="text-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No tokens yet</p>
                <p className="text-sm text-muted-foreground">
                  Generate your first API token to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-center">Usage</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
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
                          <p className="font-medium">{token.name || "Unnamed Token"}</p>
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
                                {new Date(token.expiresAt).toLocaleString(undefined, {
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
                                  ? `${token.daysUntilExpiry} days left`
                                  : "Expired"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
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
                          ? new Date(token.lastUsedAt).toLocaleString()
                          : "Never"}
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
                              Suspend
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
                              Reactivate
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
                              Revoke
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
              API Token Generated
            </DialogTitle>
            <DialogDescription>
              <strong>⚠️ Important:</strong> This token will only be shown once.
              Make sure to copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Label>Your API Token</Label>
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
                <p className="text-sm font-medium mb-2">Token Expiration</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Expires:</strong>{" "}
                    {new Date(tokenMetadata.expiresAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p>
                    <strong>Valid for:</strong> {tokenMetadata.expiresInDays} days
                  </p>
                </div>
              </div>
            )}
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
              <p className="text-sm">
                <strong>Usage:</strong> Add this token to the Authorization header:
              </p>
              <code className="block mt-2 p-2 bg-black text-white rounded text-xs">
                Authorization: Bearer {generatedToken?.substring(0, 50)}...
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTokenDialog(false)}>
              I've Saved the Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
