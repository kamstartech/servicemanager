"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  startAuthentication,
} from "@simplewebauthn/browser";

interface PasskeyLoginProps {
  onSuccess?: () => void;
}

export function PasskeyLogin({ onSuccess }: PasskeyLoginProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Start authentication
      const startResponse = await fetch("/api/auth/passkey/login/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!startResponse.ok) {
        const error = await startResponse.json();
        toast.error(error.error || "Failed to start passkey authentication");
        setLoading(false);
        return;
      }

      const { options, userId } = await startResponse.json();

      // Step 2: Show browser passkey prompt
      let credential;
      try {
        credential = await startAuthentication(options);
      } catch (error: any) {
        if (error.name === "NotAllowedError") {
          toast.error("Passkey authentication was cancelled");
        } else {
          console.error("Passkey error:", error);
          toast.error("Failed to authenticate with passkey");
        }
        setLoading(false);
        return;
      }

      // Step 3: Complete authentication
      const completeResponse = await fetch(
        "/api/auth/passkey/login/complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, userId }),
        }
      );

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        toast.error(error.error || "Authentication failed");
        setLoading(false);
        return;
      }

      const result = await completeResponse.json();
      
      // Success!
      toast.success("Login successful!");
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      console.error("Passkey login error:", error);
      toast.error("Failed to authenticate with passkey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handlePasskeyLogin} className="space-y-4">
        <div>
          <Label htmlFor="passkey-email">Email</Label>
          <Input
            id="passkey-email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-fdh-orange hover:bg-fdh-orange/90"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <Fingerprint className="mr-2 h-4 w-4" />
              Sign in with Passkey
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        <p>Use your fingerprint, face, or device PIN</p>
      </div>
    </div>
  );
}
