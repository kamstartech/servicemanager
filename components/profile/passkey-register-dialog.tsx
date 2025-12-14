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
import { startRegistration } from "@simplewebauthn/browser";

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
      // Start registration - get options from server
      const optionsResponse = await fetch("/api/profile/passkeys/register/start", {
        method: "POST",
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json();
        console.error("Registration start error:", error);
        throw new Error(error.error || "Failed to start registration");
      }

      const { options } = await optionsResponse.json();

      // Use SimpleWebAuthn browser library
      const credential = await startRegistration(options);
      
      // Complete registration
      const completeResponse = await fetch("/api/profile/passkeys/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
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
