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
import { useI18n } from "@/components/providers/i18n-provider";

const CREATE_CORE_BANKING_ENDPOINT = gql`
  mutation CreateCoreBankingEndpoint($input: CoreBankingEndpointInput!) {
    createCoreBankingEndpoint(input: $input) {
      id
      name
    }
  }
`;

const UPDATE_CORE_BANKING_ENDPOINT = gql`
  mutation UpdateCoreBankingEndpoint($id: ID!, $input: CoreBankingEndpointInput!) {
    updateCoreBankingEndpoint(id: $id, input: $input) {
      id
      name
    }
  }
`;

export type CoreBankingEndpoint = {
  id?: number;
  connectionId: number;
  name: string;
  method: string;
  path: string;
  isActive?: boolean | null;
  bodyTemplate?: string | null;
};

export type CoreBankingEndpointDialogMode = "create" | "edit";

type Props = {
  open: boolean;
  mode: CoreBankingEndpointDialogMode;
  connectionId: number;
  initialData?: CoreBankingEndpoint | null;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => Promise<unknown> | void;
};

export function CoreBankingEndpointDialog({
  open,
  mode,
  connectionId,
  initialData,
  onOpenChange,
  onCompleted,
}: Props) {
  const { translate } = useI18n();
  const [form, setForm] = useState<CoreBankingEndpoint>({
    connectionId,
    name: "",
    method: "POST",
    path: "",
    isActive: true,
    bodyTemplate: "",
  });

  const [createEndpoint, { loading: creating }] = useMutation(
    CREATE_CORE_BANKING_ENDPOINT,
  );
  const [updateEndpoint, { loading: updating }] = useMutation(
    UPDATE_CORE_BANKING_ENDPOINT,
  );

  useEffect(() => {
    if (initialData && mode === "edit") {
      setForm({
        connectionId,
        id: initialData.id,
        name: initialData.name,
        method: initialData.method || "POST",
        path: initialData.path,
        isActive: initialData.isActive ?? true,
        bodyTemplate: initialData.bodyTemplate ?? "",
      });
    } else if (mode === "create") {
      setForm({
        connectionId,
        name: "",
        method: "POST",
        path: "",
        isActive: true,
        bodyTemplate: "",
      });
    }
  }, [initialData, mode, connectionId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name || !form.path) {
      toast.error("Name and path are required");
      return;
    }

    try {
      if (mode === "create") {
        await createEndpoint({
          variables: {
            input: {
              connectionId: Number(connectionId),
              name: form.name,
              method: form.method,
              path: form.path,
              bodyTemplate: form.bodyTemplate || null,
              isActive: form.isActive ?? true,
            },
          },
        });

        toast.success("Endpoint created");
      } else if (mode === "edit" && initialData?.id != null) {
        await updateEndpoint({
          variables: {
            id: String(initialData.id),
            input: {
              connectionId: Number(connectionId),
              name: form.name,
              method: form.method,
              path: form.path,
              isActive: form.isActive ?? true,
            },
          },
        });

        toast.success("Endpoint updated");
      }

      if (onCompleted) {
        await onCompleted();
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save endpoint");
    }
  };

  const isSaving = creating || updating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New endpoint" : "Edit endpoint"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Method</Label>
            <select
              id="method"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.method}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  method: event.target.value,
                }))
              }
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="path">Path</Label>
            <Input
              id="path"
              value={form.path}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  path: event.target.value,
                }))
              }
              placeholder="/api/third-party/mobile-banking/cbs_account_details"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyTemplate">Body template (JSON)</Label>
            <textarea
              id="bodyTemplate"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              value={form.bodyTemplate ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  bodyTemplate: event.target.value,
                }))
              }
              placeholder='{
  "account_number": "{{accountNumber}}",
  "customer_number": "{{customerNumber}}"
}'
            />
            <p className="text-xs text-muted-foreground">
              Use placeholders like
              {" "}
              <span className="font-mono">{"{{accountNumber}}"}</span>
              {" "}and JSON format. This template will be rendered before sending the request.
            </p>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {translate("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? mode === "create"
                  ? translate("common.state.creating")
                  : translate("common.state.saving")
                : mode === "create"
                  ? translate("common.actions.create")
                  : translate("common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
