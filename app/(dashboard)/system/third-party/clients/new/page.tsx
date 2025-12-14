"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    allowedIps: "",
    rateLimitPerMinute: "60",
    rateLimitPerHour: "1000",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/third-party/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          allowedIps: formData.allowedIps
            ? formData.allowedIps.split(",").map((ip) => ip.trim())
            : [],
          rateLimitPerMinute: parseInt(formData.rateLimitPerMinute),
          rateLimitPerHour: parseInt(formData.rateLimitPerHour),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Client created successfully");
        router.push(`/system/third-party/clients/${result.data.id}`);
      } else {
        toast.error(result.error || "Failed to create client");
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/system/third-party">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Create New Client</h1>
          <p className="text-muted-foreground mt-2">
            Add a new third-party client to access your API
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Client Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., External Registration System"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of this client"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      placeholder="John Doe"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData({ ...formData, contactName: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, contactEmail: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      placeholder="+265991234567"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, contactPhone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Security Settings */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="allowedIps">
                      Allowed IP Addresses (optional)
                    </Label>
                    <Input
                      id="allowedIps"
                      placeholder="192.168.1.100, 10.0.0.0/24"
                      value={formData.allowedIps}
                      onChange={(e) =>
                        setFormData({ ...formData, allowedIps: e.target.value })
                      }
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Comma-separated list. Leave empty to allow all IPs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Rate Limits</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rateLimitPerMinute">
                      Requests per Minute
                    </Label>
                    <Input
                      id="rateLimitPerMinute"
                      type="number"
                      min="1"
                      value={formData.rateLimitPerMinute}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rateLimitPerMinute: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="rateLimitPerHour">Requests per Hour</Label>
                    <Input
                      id="rateLimitPerHour"
                      type="number"
                      min="1"
                      value={formData.rateLimitPerHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rateLimitPerHour: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-fdh-orange hover:bg-fdh-orange/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Creating..." : "Create Client"}
                </Button>
                <Link href="/system/third-party">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
