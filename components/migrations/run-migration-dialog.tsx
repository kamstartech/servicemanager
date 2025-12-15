"use client";

import { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import { toast } from "sonner";

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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const RUN_MIGRATION = gql`
  mutation RunMigration($id: ID!, $duplicateStrategy: DuplicateStrategy) {
    runMigration(id: $id, duplicateStrategy: $duplicateStrategy) {
      ok
      message
      rowsAffected
    }
  }
`;

export type DuplicateStrategy =
  | "FAIL_ON_DUPLICATE"
  | "SKIP_DUPLICATES"
  | "UPDATE_EXISTING";

type RunMigrationDialogProps = {
  id: string | number;
  name: string;
  status: string;
  onCompleted?: () => Promise<unknown> | void;
};

export function RunMigrationDialog({
  id,
  name,
  status,
  onCompleted,
}: RunMigrationDialogProps) {
  const [runMigration, { loading: running }] = useMutation(RUN_MIGRATION);
  const [duplicateStrategy, setDuplicateStrategy] =
    useState<DuplicateStrategy>("FAIL_ON_DUPLICATE");

  const disabled = running || status === "RUNNING";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
          disabled={disabled}
        >
          <Play className="h-4 w-4 mr-2" />
          {disabled ? "Running..." : "Run"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Run migration "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will execute the migration against the configured source and
            target databases. This action may insert or update data and can take
            some time to complete.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">On duplicates</p>
          <RadioGroup
            value={duplicateStrategy}
            onValueChange={(value: DuplicateStrategy) =>
              setDuplicateStrategy(value)
            }
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="FAIL_ON_DUPLICATE" id="dup-fail" />
              <label htmlFor="dup-fail" className="text-sm">
                Stop on first duplicate (fail the migration)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="SKIP_DUPLICATES" id="dup-skip" />
              <label htmlFor="dup-skip" className="text-sm">
                Skip rows that violate unique constraints
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="UPDATE_EXISTING"
                id="dup-update"
              />
              <label htmlFor="dup-update" className="text-sm">
                Update existing rows (use ON CONFLICT DO UPDATE in template)
              </label>
            </div>
          </RadioGroup>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try {
                const result = await runMigration({
                  variables: {
                    id: String(id),
                    duplicateStrategy,
                  },
                });
                const payload = result.data?.runMigration;
                if (payload) {
                  if (payload.ok) {
                    toast.success(
                      payload.message || "Migration completed.",
                    );
                  } else {
                    toast.error(payload.message || "Migration failed.");
                  }
                  if (onCompleted) {
                    await onCompleted();
                  }
                }
              } catch (mutationError: any) {
                toast.error(
                  `Migration failed: ${
                    mutationError?.message ?? String(mutationError)
                  }`,
                );
                if (onCompleted) {
                  await onCompleted();
                }
              }
            }}
          >
            Confirm run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
