"use client";

import { useEffect, useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CREATE_CORE_BANKING_CONNECTION = gql`
  mutation CreateCoreBankingConnection($input: CoreBankingConnectionInput!) {
    createCoreBankingConnection(input: $input) {
      id
      name
    }
  }
`;

const UPDATE_CORE_BANKING_CONNECTION = gql`
  mutation UpdateCoreBankingConnection($id: ID!, $input: CoreBankingConnectionInput!) {
    updateCoreBankingConnection(id: $id, input: $input) {
      id
      name
    }
  }
`;

export type CoreBankingConnection = {
  id?: string | number;
  name: string;
  username: string;
  baseUrl: string;
  isActive?: boolean | null;
  authType?: "BASIC" | "BEARER";
};

export type CoreBankingConnectionDialogMode = "create" | "edit";

type Props = {
  open: boolean;
  mode: CoreBankingConnectionDialogMode;
  initialData?: CoreBankingConnection | null;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => Promise<unknown> | void;
};

export function CoreBankingConnectionDialog({
  open,
  mode,
  initialData,
  onOpenChange,
  onCompleted,
}: Props) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    baseUrl: "",
    authType: "BASIC" as "BASIC" | "BEARER",
    token: "",
  });

  const [createConnection, { loading: creating }] = useMutation(
    CREATE_CORE_BANKING_CONNECTION,
  );
  const [updateConnection, { loading: updating }] = useMutation(
    UPDATE_CORE_BANKING_CONNECTION,
  );

  useEffect(() => {
    if (initialData && mode === "edit") {
      setFormData({
        name: initialData.name,
        username: initialData.username,
        password: "",
        baseUrl: initialData.baseUrl,
        authType: initialData.authType ?? "BASIC",
        token: "",
      });
    } else if (mode === "create") {
      setFormData({
        name: "",
        username: "",
        password: "",
        baseUrl: "",
        authType: "BASIC",
        token: "",
      });
    }
  }, [initialData, mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name || !formData.baseUrl) {
      toast.error("Name and base URL are required");
      return;
    }

    if (formData.authType === "BASIC" && !formData.username) {
      toast.error("Username is required for basic authentication");
      return;
    }

    try {
      if (mode === "create") {
        if (!formData.password) {
          toast.error("Password is required for new connections");
          return;
        }

        await createConnection({
          variables: {
            input: {
              name: formData.name,
              username: formData.username,
              password: formData.password,
              baseUrl: formData.baseUrl,
              isActive: true,
              authType: formData.authType,
              token: formData.authType === "BEARER" ? formData.token : null,
            },
          },
        });

        toast.success("Core banking connection created");
      } else if (mode === "edit" && initialData?.id != null) {
        await updateConnection({
          variables: {
            id: String(initialData.id),
            input: {
              name: formData.name,
              username: formData.authType === "BASIC" ? formData.username : null,
              password: formData.authType === "BASIC" ? formData.password || "" : "",
              baseUrl: formData.baseUrl,
              isActive: initialData.isActive ?? true,
              authType: formData.authType,
              token: formData.authType === "BEARER" ? (formData.token.length > 0 ? formData.token : "") : null,
            },
          },
        });

        toast.success("Core banking connection updated");
      }

      if (onCompleted) {
        await onCompleted();
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save connection");
    }
  };

  const isSaving = creating || updating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "New core banking connection"
              : "Edit core banking connection"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  username: event.target.value,
                }))
              }
              required={formData.authType === "BASIC"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authType">Authentication type</Label>
            <Select
              value={formData.authType}
              onValueChange={(value: "BASIC" | "BEARER") =>
                setFormData((previous) => ({
                  ...previous,
                  authType: value,
                }))
              }
            >
              <SelectTrigger id="authType">
                <SelectValue placeholder="Select authentication type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASIC">Basic (username & password)</SelectItem>
                <SelectItem value="BEARER">Bearer token</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.authType === "BASIC" && (
            <div className="space-y-2">
              <Label htmlFor="password">
                Password
                {mode === "edit" && (
                  <span className="text-xs"> (leave blank to keep unchanged)</span>
                )}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                required={mode === "create"}
              />
            </div>
          )}

          {formData.authType === "BEARER" && (
            <div className="space-y-2">
              <Label htmlFor="token">
                Bearer token
                {mode === "edit" && (
                  <span className="text-xs">
                    {" "}
                    (leave blank to keep existing token, enter a value to
                    replace, or "-" to clear)
                  </span>
                )}
              </Label>
              <Input
                id="token"
                type="password"
                value={formData.token}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    token: event.target.value,
                  }))
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={formData.baseUrl}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  baseUrl: event.target.value,
                }))
              }
              placeholder="https://core-banking.internal or full API base URL"
              required
            />
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
