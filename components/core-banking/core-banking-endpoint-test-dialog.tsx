"use client";

import { useEffect, useState } from "react";

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

export type CoreBankingEndpointForTest = {
  id: number;
  name: string;
  path: string;
  bodyTemplate?: string | null;
};

export type CoreBankingEndpointTestDialogProps = {
  open: boolean;
  endpoint: CoreBankingEndpointForTest | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onRunTest: (variablesJson?: string) => Promise<void> | void;
  testResult?: any | null;
};

type PlaceholderVariable = {
  key: string;
  value: string;
};

export function CoreBankingEndpointTestDialog({
  open,
  endpoint,
  loading,
  onOpenChange,
  onRunTest,
  testResult,
}: CoreBankingEndpointTestDialogProps) {
  const { translate } = useI18n();
  const [variables, setVariables] = useState<PlaceholderVariable[]>([]);

  useEffect(() => {
    if (!open || !endpoint) {
      setVariables([]);
      return;
    }

    const placeholderRegex = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;
    const keys = new Set<string>();

    const collect = (source?: string | null) => {
      if (!source) return;
      let match: RegExpExecArray | null;
      placeholderRegex.lastIndex = 0;
      while ((match = placeholderRegex.exec(source)) !== null) {
        if (match[1]) {
          keys.add(match[1]);
        }
      }
    };

    collect(endpoint.path);
    collect(endpoint.bodyTemplate ?? undefined);

    const initial: PlaceholderVariable[] = Array.from(keys).map((key) => ({
      key,
      value: "",
    }));

    setVariables(initial);
  }, [open, endpoint]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    let variablesJson: string | undefined;

    if (variables.length > 0) {
      const object: Record<string, string> = {};
      for (const { key, value } of variables) {
        object[key] = value;
      }
      variablesJson = JSON.stringify(object);
    }

    await onRunTest(variablesJson);
  };

  const hasPlaceholders = variables.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {endpoint
              ? `Test endpoint: ${endpoint.name}`
              : "Test endpoint"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Path:
              {" "}
              <span className="font-mono break-all">{endpoint?.path}</span>
            </p>
            {endpoint?.bodyTemplate && (
              <p>
                Body template:
                {" "}
                <span className="font-mono break-all">
                  {endpoint.bodyTemplate}
                </span>
              </p>
            )}
          </div>

          {hasPlaceholders ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Provide values for the detected placeholders:
              </p>
              <div className="space-y-3">
                {variables.map((variable, index) => (
                  <div key={variable.key} className="space-y-1">
                    <Label htmlFor={`placeholder-${variable.key}`}>
                      {variable.key}
                    </Label>
                    <Input
                      id={`placeholder-${variable.key}`}
                      value={variable.value}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariables((previous) => {
                          const copy = [...previous];
                          copy[index] = { ...copy[index], value };
                          return copy;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No template placeholders detected in path or body template. The
              endpoint will be tested without additional variables.
            </p>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground animate-pulse">
              Running test... waiting for response...
            </div>
          )}

          {!loading && testResult && (
            <div className="space-y-4 text-xs border rounded-lg p-3 bg-slate-50 dark:bg-slate-900 mt-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-semibold text-sm">Test Result</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${testResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {testResult.statusCode} {testResult.statusText}
                </span>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground">Request Details</p>
                <div className="grid grid-cols-[60px_1fr] gap-2">
                  <span className="text-right text-muted-foreground">URL:</span>
                  <span className="font-mono break-all">{testResult.url}</span>
                  <span className="text-right text-muted-foreground">Method:</span>
                  <span className="font-mono">{testResult.method}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground">Request Body</p>
                <pre className="bg-background border p-2 rounded max-h-40 overflow-auto font-mono">
                  {testResult.requestBody || <span className="text-muted-foreground italic">No body</span>}
                </pre>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground">Response Body</p>
                <pre className="bg-background border p-2 rounded max-h-60 overflow-auto font-mono">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(testResult.responseBody), null, 2);
                    } catch {
                      return testResult.responseBody;
                    }
                  })()}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {translate("common.actions.close")}
            </Button>
            {!testResult && (
              <Button type="submit" disabled={loading}>
                {loading
                  ? translate("common.state.testing")
                  : translate("common.actions.runTest")}
              </Button>
            )}
            {testResult && (
              <Button type="submit" disabled={loading}>
                {translate("common.actions.reRunTest")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
