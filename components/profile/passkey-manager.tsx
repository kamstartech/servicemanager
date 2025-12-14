"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, Laptop, Smartphone, Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PasskeyRegisterDialog } from "./passkey-register-dialog";

interface Passkey {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  transports: string[];
}

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadPasskeys = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/profile/passkeys");
      if (response.ok) {
        const data = await response.json();
        setPasskeys(data.passkeys);
      } else {
        toast.error("Failed to load passkeys");
      }
    } catch (error) {
      toast.error("Error loading passkeys");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (passkeyId: string) => {
    try {
      const response = await fetch(`/api/profile/passkeys/${passkeyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Passkey removed successfully");
        await loadPasskeys();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to remove passkey");
      }
    } catch (error) {
      toast.error("Error removing passkey");
    }
  };

  useEffect(() => {
    loadPasskeys();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Passkeys</CardTitle>
            <CardDescription>
              Manage your passkeys for passwordless authentication
            </CardDescription>
          </div>
          <PasskeyRegisterDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSuccess={loadPasskeys}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading passkeys...</p>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No passkeys registered yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a passkey for secure, passwordless authentication
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    {passkey.transports.includes("usb") ? (
                      <Key className="h-5 w-5 text-primary" />
                    ) : passkey.transports.includes("nfc") ? (
                      <Smartphone className="h-5 w-5 text-primary" />
                    ) : (
                      <Laptop className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{passkey.deviceName || "Unnamed Device"}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(passkey.createdAt).toLocaleDateString()}
                      {passkey.lastUsedAt && (
                        <> • Last used {new Date(passkey.lastUsedAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Passkey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove{" "}
                        <strong>{passkey.deviceName || "this passkey"}</strong>?
                        You won't be able to use it for authentication anymore.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(passkey.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
