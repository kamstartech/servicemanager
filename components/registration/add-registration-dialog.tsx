"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegistrationSource } from "@prisma/client";

export type RegistrationRequestFormValues = {
  phoneNumber: string;
  customerNumber: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  profileName?: string;
  profileType?: string;
  company?: string;
  source?: RegistrationSource;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

export function AddRegistrationDialog({
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<RegistrationRequestFormValues>({
    phoneNumber: "",
    customerNumber: "",
    emailAddress: "",
    firstName: "",
    lastName: "",
    profileName: "",
    profileType: "INDIVIDUAL",
    company: "",
    source: RegistrationSource.ADMIN_PORTAL, // Always ADMIN_PORTAL when created from UI
  });

  useEffect(() => {
    if (open) {
      setForm({
        phoneNumber: "",
        customerNumber: "",
        emailAddress: "",
        firstName: "",
        lastName: "",
        profileName: "",
        profileType: "INDIVIDUAL",
        company: "",
        source: RegistrationSource.ADMIN_PORTAL, // Always ADMIN_PORTAL when created from UI
      });
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        service: "REGISTRATION",
        service_action: "MOBILE_BANKING_REGISTRATION",
        phone_number: form.phoneNumber,
        customer_number: form.customerNumber,
        email_address: form.emailAddress || undefined,
        first_name: form.firstName || undefined,
        last_name: form.lastName || undefined,
        profile_name: form.profileName || undefined,
        profile_type: form.profileType || undefined,
        company: form.company || undefined,
      };

      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create registration request");
      }

      onOpenChange(false);
      onCompleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Registration Request</DialogTitle>
          <DialogDescription>
            Create a new mobile banking registration request manually.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="260971234567"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerNumber">
                Customer Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerNumber"
                placeholder="C123456"
                value={form.customerNumber}
                onChange={(e) =>
                  setForm({ ...form, customerNumber: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input
                id="emailAddress"
                type="email"
                placeholder="user@example.com"
                value={form.emailAddress}
                onChange={(e) =>
                  setForm({ ...form, emailAddress: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileType">Profile Type</Label>
              <Select
                value={form.profileType}
                onValueChange={(value) =>
                  setForm({ ...form, profileType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select profile type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="CORPORATE">Corporate</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileName">Profile Name</Label>
              <Input
                id="profileName"
                placeholder="John Doe"
                value={form.profileName}
                onChange={(e) =>
                  setForm({ ...form, profileName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="ABC Corporation"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>

          {/* Source - Read Only */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value="Admin Portal"
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Source is automatically set to Admin Portal for manual registrations
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Registration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
