"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PasskeyRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PasskeyRegisterDialog({
  open,
  onOpenChange,
  onSuccess,
}: PasskeyRegisterDialogProps) {
  const [deviceName, setDeviceName] = useState("");
  const [registering, setRegistering] = useState(false);

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      toast.error("Please enter a device name");
      return;
    }

    setRegistering(true);
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        toast.error("WebAuthn is not supported on this device");
        return;
      }

      // Start registration - get options from server
      const optionsResponse = await fetch("/api/profile/passkeys/register/start", {
        method: "POST",
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to start registration");
      }

      const { options } = await optionsResponse.json();

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
          user: {
            ...options.user,
            id: Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0)),
          },
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      // Get response data
      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Complete registration
      const completeResponse = await fetch("/api/profile/passkeys/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
            response: {
              clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON))),
              attestationObject: btoa(String.fromCharCode(...new Uint8Array(response.attestationObject))),
            },
            type: credential.type,
          },
          deviceName,
        }),
      });

      if (completeResponse.ok) {
        toast.success("Passkey registered successfully");
        setDeviceName("");
        onOpenChange(false);
        onSuccess();
      } else {
        const data = await completeResponse.json();
        toast.error(data.error || "Failed to register passkey");
      }
    } catch (error: any) {
      console.error("Passkey registration error:", error);
      toast.error(error.message || "Failed to register passkey");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Passkey
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register New Passkey</DialogTitle>
          <DialogDescription>
            Give your passkey a name to help you identify it later
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passkey-name">Device Name</Label>
            <Input
              id="passkey-name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., My Laptop, iPhone 15"
            />
          </div>
          <Button
            onClick={handleRegister}
            disabled={registering || !deviceName.trim()}
            className="w-full"
          >
            <Key className="mr-2 h-4 w-4" />
            {registering ? "Registering..." : "Register Passkey"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
