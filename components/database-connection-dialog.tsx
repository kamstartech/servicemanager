"use client";

import { useEffect, useState } from "react";
import { gql, useMutation } from "@apollo/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/providers/i18n-provider";

const CREATE_DB_CONNECTION = gql`
  mutation CreateDbConnection($input: DatabaseConnectionInput!) {
    createDbConnection(input: $input) {
      id
    }
  }
`;

const UPDATE_DB_CONNECTION = gql`
  mutation UpdateDbConnection($id: ID!, $input: DatabaseConnectionInput!) {
    updateDbConnection(id: $id, input: $input) {
      id
    }
  }
`;

export type DatabaseConnectionFormValues = {
  name: string;
  engine: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  isReadOnly: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<DatabaseConnectionFormValues>;
  mode?: "create" | "edit";
  onCompleted?: () => void;
};

export function DatabaseConnectionDialog({
  open,
  onOpenChange,
  initialValues,
  mode = "create",
  onCompleted,
}: Props) {
  const [createConnection, { loading: creating }] = useMutation(
    CREATE_DB_CONNECTION,
  );
  const [updateConnection, { loading: updating }] = useMutation(
    UPDATE_DB_CONNECTION,
  );
  const { translate } = useI18n();

  const [form, setForm] = useState<DatabaseConnectionFormValues>({
    name: initialValues?.name ?? "",
    engine: initialValues?.engine ?? "postgres",
    host: initialValues?.host ?? "localhost",
    port: initialValues?.port ?? 5432,
    database: initialValues?.database ?? "",
    username: initialValues?.username ?? "",
    password: "",
    isReadOnly: initialValues?.isReadOnly ?? true,
  });

  useEffect(() => {
    // When dialog opens in edit mode or initial values change, sync the form
    setForm({
      name: initialValues?.name ?? "",
      engine: initialValues?.engine ?? "postgres",
      host: initialValues?.host ?? "localhost",
      port: initialValues?.port ?? 5432,
      database: initialValues?.database ?? "",
      username: initialValues?.username ?? "",
      password: "",
      isReadOnly: initialValues?.isReadOnly ?? true,
    });
  }, [initialValues, mode, open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (mode === "create") {
      await createConnection({ variables: { input: form } });
    } else {
      // In edit mode, the caller must provide the identifier via initialValues
      // We expect an "id" property to be present when editing
      const anyInitials = initialValues as any;
      if (!anyInitials || anyInitials.id == null) {
        throw new Error("Missing identifier for edit mode");
      }

      await updateConnection({
        variables: {
          id: String(anyInitials.id),
          input: form,
        },
      });
    }

    if (onCompleted) {
      onCompleted();
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? translate("databaseConnectionDialog.newTitle")
              : translate("databaseConnectionDialog.editTitle")}
          </DialogTitle>
          <DialogDescription>
            {translate("databaseConnectionDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {translate("databaseConnectionDialog.nameLabel")}
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {translate("databaseConnectionDialog.engineLabel")}
              </label>
              <Input value={form.engine} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {translate("databaseConnectionDialog.hostLabel")}
              </label>
              <Input
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {translate("databaseConnectionDialog.portLabel")}
              </label>
              <Input
                type="number"
                value={form.port}
                onChange={(e) =>
                  setForm({ ...form, port: Number(e.target.value) || 0 })
                }
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {translate("databaseConnectionDialog.databaseLabel")}
              </label>
              <Input
                value={form.database}
                onChange={(e) => setForm({ ...form, database: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {translate("databaseConnectionDialog.usernameLabel")}
              </label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {translate("databaseConnectionDialog.passwordLabel")}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {translate("databaseConnectionDialog.cancel")}
            </Button>
            <Button type="submit" disabled={creating || updating}>
              {creating || updating
                ? translate("databaseConnectionDialog.saving")
                : mode === "create"
                ? translate("databaseConnectionDialog.save")
                : translate("databaseConnectionDialog.update")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
