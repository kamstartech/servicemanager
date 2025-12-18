"use client";

import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { ArrowLeft, CheckCircle2, ChevronLeft, Play, RotateCcw } from "lucide-react";

const APP_SCREENS_QUERY = gql`
  query AppScreens($context: MobileUserContext, $page: Int, $limit: Int) {
    appScreens(context: $context, page: $page, limit: $limit) {
      screens {
        id
        name
        context
        icon
        order
        isActive
        isTesting
      }
    }
  }
`;

const APP_SCREEN_QUERY = gql`
  query AppScreen($id: ID!) {
    appScreen(id: $id) {
      id
      name
      pages {
        id
        name
        icon
        order
        isActive
        isTesting
      }
    }
  }
`;

const PAGE_WORKFLOWS_QUERY = gql`
  query PageWorkflows($pageId: ID!) {
    pageWorkflows(pageId: $pageId) {
      id
      order
      isActive
      workflow {
        id
        name
      }
    }
  }
`;

const START_WORKFLOW_EXECUTION = gql`
  mutation StartWorkflowExecution($workflowId: ID!, $pageId: ID!, $initialContext: JSON) {
    startWorkflowExecution(workflowId: $workflowId, pageId: $pageId, initialContext: $initialContext) {
      id
      sessionId
      status
      currentStepId
      startedAt
      workflow {
        id
        name
        steps {
          id
          order
          type
          label
          config
          validation
          isActive
          triggerTiming
        }
      }
    }
  }
`;

const EXECUTE_WORKFLOW_STEP = gql`
  mutation ExecuteWorkflowStep($executionId: ID!, $stepId: ID!, $input: JSON, $timing: TriggerTiming!) {
    executeWorkflowStep(executionId: $executionId, stepId: $stepId, input: $input, timing: $timing) {
      success
      shouldProceed
      error
      result
    }
  }
`;

const COMPLETE_WORKFLOW_EXECUTION = gql`
  mutation CompleteWorkflowExecution($executionId: ID!) {
    completeWorkflowExecution(executionId: $executionId) {
      success
      executionId
      result
    }
  }
`;

const CANCEL_WORKFLOW_EXECUTION = gql`
  mutation CancelWorkflowExecution($executionId: ID!, $reason: String) {
    cancelWorkflowExecution(executionId: $executionId, reason: $reason) {
      id
      status
    }
  }
`;

const FORM_QUERY = gql`
  query Form($id: ID!) {
    form(id: $id) {
      id
      name
      description
      schema
      isActive
      version
    }
  }
`;

const CONTEXTS = [
  { value: "MOBILE_BANKING", label: "Mobile Banking" },
  { value: "WALLET", label: "Wallet" },
  { value: "VILLAGE_BANKING", label: "Village Banking" },
  { value: "AGENT", label: "Agent" },
  { value: "MERCHANT", label: "Merchant" },
] as const;

type StepResponse = {
  success: boolean;
  shouldProceed: boolean;
  error?: string | null;
  result?: any;
};

type FormField = {
  id: string;
  type: "text" | "number" | "date" | "dropdown" | "toggle" | "beneficiary" | "account";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  beneficiaryType?: "WALLET" | "BANK" | "BANK_INTERNAL" | "BANK_EXTERNAL" | "ALL";
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    errorMessage?: string;
  };
};

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="relative rounded-[2.5rem] bg-zinc-900 p-[10px] shadow-2xl">
        <div className="relative rounded-[2.1rem] bg-black">
          <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-6 w-40 -translate-x-1/2 rounded-full bg-black opacity-90" />
          <div className="relative h-[min(820px,calc(100vh-120px))] overflow-hidden rounded-[2.1rem] bg-background">
            <div className="h-full overflow-y-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppScreensPreviewPage() {
  const { translate } = useI18n();

  const [activeContext, setActiveContext] = useState<string>("MOBILE_BANKING");
  const [screenId, setScreenId] = useState<string>("");
  const [pageId, setPageId] = useState<string>("");
  const [workflowId, setWorkflowId] = useState<string>("");

  const [execution, setExecution] = useState<any>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [lastStepResponse, setLastStepResponse] = useState<StepResponse | null>(null);
  const [completion, setCompletion] = useState<{ success: boolean; message?: string } | null>(null);

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmationAccepted, setConfirmationAccepted] = useState<boolean>(false);

  const { data: screensData, loading: screensLoading, error: screensError } = useQuery(APP_SCREENS_QUERY, {
    variables: { context: activeContext, page: 1, limit: 100 },
  });

  const screens = useMemo(() => {
    const items = screensData?.appScreens?.screens || [];
    return items.filter((s: any) => s.isActive);
  }, [screensData]);

  const { data: screenData } = useQuery(APP_SCREEN_QUERY, {
    variables: { id: screenId },
    skip: !screenId,
  });

  const pages = useMemo(() => {
    const items = screenData?.appScreen?.pages || [];
    return items.filter((p: any) => p.isActive);
  }, [screenData]);

  const { data: pageWorkflowsData, loading: pageWorkflowsLoading } = useQuery(PAGE_WORKFLOWS_QUERY, {
    variables: { pageId },
    skip: !pageId,
  });

  const pageWorkflows = useMemo(() => {
    const items = pageWorkflowsData?.pageWorkflows || [];
    return [...items].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }, [pageWorkflowsData]);

  const [startWorkflowExecution, { loading: starting }] = useMutation(START_WORKFLOW_EXECUTION, {
    onError: (err: any) => toast.error(err.message),
  });

  const [executeWorkflowStep, { loading: executingStep }] = useMutation(EXECUTE_WORKFLOW_STEP, {
    onError: (err: any) => toast.error(err.message),
  });

  const [completeWorkflowExecution, { loading: completing }] = useMutation(COMPLETE_WORKFLOW_EXECUTION, {
    onError: (err: any) => toast.error(err.message),
  });

  const [cancelWorkflowExecution, { loading: cancelling }] = useMutation(CANCEL_WORKFLOW_EXECUTION, {
    onError: (err: any) => toast.error(err.message),
    onCompleted: () => {
      resetExecution();
      toast.success("Workflow cancelled");
    },
  });

  const steps = useMemo(() => {
    const s = execution?.workflow?.steps || [];
    return [...s].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }, [execution]);

  const activeStep = steps[activeStepIndex];

  const activeFormId = (activeStep?.type === "FORM" ? activeStep?.config?.formId : null) as string | null;
  const { data: formData, loading: formLoading } = useQuery(FORM_QUERY, {
    variables: { id: activeFormId },
    skip: !activeFormId,
  });

  const formSchemaFields = useMemo<FormField[]>(() => {
    const fields = formData?.form?.schema?.fields || [];
    return Array.isArray(fields) ? fields : [];
  }, [formData]);

  useEffect(() => {
    setScreenId("");
    setPageId("");
    setWorkflowId("");
    resetExecution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContext]);

  useEffect(() => {
    setPageId("");
    setWorkflowId("");
    resetExecution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId]);

  useEffect(() => {
    setWorkflowId("");
    resetExecution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  useEffect(() => {
    resetExecution();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  useEffect(() => {
    setFormValues({});
    setFormErrors({});
    setConfirmationAccepted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep?.id]);

  const resetExecution = () => {
    setExecution(null);
    setActiveStepIndex(0);
    setLastStepResponse(null);
    setCompletion(null);
  };

  const validateFormFields = (fields: FormField[], values: Record<string, any>) => {
    const errors: Record<string, string> = {};

    fields.forEach((f) => {
      const value = values[f.id];
      const isEmpty = value === undefined || value === null || String(value).trim() === "";

      if (f.required && isEmpty) {
        errors[f.id] = f.validation?.errorMessage || "This field is required";
        return;
      }

      if (isEmpty) return;

      if (f.type === "text") {
        const text = String(value);
        if (f.validation?.minLength !== undefined && text.length < f.validation.minLength) {
          errors[f.id] = f.validation?.errorMessage || `Must be at least ${f.validation.minLength} characters`;
        }
        if (f.validation?.maxLength !== undefined && text.length > f.validation.maxLength) {
          errors[f.id] = f.validation?.errorMessage || `Must be at most ${f.validation.maxLength} characters`;
        }
        if (f.validation?.pattern) {
          try {
            const re = new RegExp(f.validation.pattern);
            if (!re.test(text)) {
              errors[f.id] = f.validation?.errorMessage || "Invalid format";
            }
          } catch {
            // ignore invalid regex patterns
          }
        }
      }

      if (f.type === "number") {
        const num = Number(value);
        if (Number.isNaN(num)) {
          errors[f.id] = f.validation?.errorMessage || "Must be a number";
        }
        if (f.validation?.min !== undefined && num < f.validation.min) {
          errors[f.id] = f.validation?.errorMessage || `Must be >= ${f.validation.min}`;
        }
        if (f.validation?.max !== undefined && num > f.validation.max) {
          errors[f.id] = f.validation?.errorMessage || `Must be <= ${f.validation.max}`;
        }
      }
    });

    return errors;
  };

  const phoneView = useMemo(() => {
    if (execution) return "execution";
    if (!screenId) return "screens";
    if (!pageId) return "pages";
    return "workflows";
  }, [execution, pageId, screenId]);

  const handleStart = async (workflowIdOverride?: string) => {
    const effectiveWorkflowId = workflowIdOverride || workflowId;

    if (!effectiveWorkflowId || !pageId) {
      toast.error("Please select a page and workflow");
      return;
    }

    const initialContext: any = {};

    const res = await startWorkflowExecution({
      variables: {
        workflowId: effectiveWorkflowId,
        pageId,
        initialContext,
      },
    });

    const exec = res.data?.startWorkflowExecution;
    if (!exec) {
      toast.error("Failed to start workflow");
      return;
    }

    setExecution(exec);
    setActiveStepIndex(0);
    setLastStepResponse(null);
    setCompletion(null);
  };

  const handleRunActiveStep = async (inputOverride?: any) => {
    if (!execution?.id || !activeStep?.id) {
      toast.error("No active execution/step");
      return;
    }

    const stepTiming: string | null = activeStep.triggerTiming || null;

    const run = async (timing: "BEFORE_STEP" | "AFTER_STEP") => {
      let input: any = undefined;
      if (timing === "AFTER_STEP") {
        input = inputOverride ?? {};
      }

      const res = await executeWorkflowStep({
        variables: {
          executionId: execution.id,
          stepId: activeStep.id,
          input,
          timing,
        },
      });

      const payload = res.data?.executeWorkflowStep as StepResponse | undefined;
      if (!payload) {
        toast.error("No response from step execution");
        return null;
      }

      setLastStepResponse(payload);

      return payload;
    };

    if (stepTiming === "BEFORE_STEP" || stepTiming === "BOTH") {
      const before = await run("BEFORE_STEP");
      if (before && !before.shouldProceed) {
        return;
      }
    }

    const after = await run("AFTER_STEP");
    if (!after) return;

    if (!after.shouldProceed) {
      return;
    }

    const nextIndex = activeStepIndex + 1;
    if (nextIndex < steps.length) {
      setActiveStepIndex(nextIndex);
      setLastStepResponse(null);
    }
  };

  const handleComplete = async () => {
    if (!execution?.id) {
      toast.error("No active execution");
      return;
    }

    const res = await completeWorkflowExecution({
      variables: { executionId: execution.id },
    });

    const payload = res.data?.completeWorkflowExecution;
    if (!payload) {
      toast.error("No completion response");
      return;
    }

    setCompletion({
      success: Boolean(payload.success),
      message: payload.success ? "Workflow completed" : "Workflow failed",
    });
  };

  return (
    <div className="relative min-h-screen bg-muted/20 px-4 py-6">
      <div className="absolute left-4 top-6 z-30">
        <Button asChild variant="outline" size="sm">
          <Link href="/system/app-screens">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {`${translate("common.actions.backTo")} ${translate("common.entities.screens")}`}
          </Link>
        </Button>
      </div>

      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center">
        <PhoneFrame>
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-2 px-4 py-3">
              {(phoneView === "pages" || phoneView === "workflows" || phoneView === "execution") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (phoneView === "execution") {
                      resetExecution();
                      return;
                    }
                    if (phoneView === "workflows") {
                      setPageId("");
                      setWorkflowId("");
                      return;
                    }
                    if (phoneView === "pages") {
                      setScreenId("");
                      return;
                    }
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">Preview</div>
                <div className="text-xs text-muted-foreground">
                  {phoneView === "screens" && "Select Screen"}
                  {phoneView === "pages" && "Select Page"}
                  {phoneView === "workflows" && "Select Workflow"}
                  {phoneView === "execution" && "Workflow"}
                </div>
              </div>
              <div className="w-[160px]">
                <Select value={activeContext} onValueChange={setActiveContext}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Context" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTEXTS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {phoneView === "screens" && (
            <div className="p-4">
              <div className="mb-3 text-sm text-muted-foreground">Screens</div>

              {screensLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
              {screensError && <div className="text-sm text-destructive">{screensError.message}</div>}

              <div className="space-y-2">
                {screens
                  .filter((s: any) => s.isActive)
                  .map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setScreenId(s.id)}
                      className="w-full rounded-xl border p-3 text-left hover:bg-muted/50"
                    >
                      <div className="font-medium">{s.name}</div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {phoneView === "pages" && (
            <div className="p-4">
              <div className="mb-3">
                <div className="text-sm text-muted-foreground">Screen</div>
                <div className="text-base font-medium">{screenData?.appScreen?.name}</div>
              </div>

              <div className="space-y-2">
                {pages
                  .filter((p: any) => p.isActive)
                  .map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPageId(p.id)}
                      className="w-full rounded-xl border p-3 text-left hover:bg-muted/50"
                    >
                      <div className="font-medium">{p.name}</div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {phoneView === "workflows" && (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Page</div>
                <div className="text-base font-medium">{pages.find((p: any) => p.id === pageId)?.name}</div>
              </div>

              <div>
                <div className="mb-2 text-sm text-muted-foreground">Workflows</div>
                {pageWorkflowsLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
                {!pageWorkflowsLoading && pageWorkflows.length === 0 && (
                  <div className="text-sm text-muted-foreground">No workflows attached</div>
                )}

                <div className="space-y-2">
                  {pageWorkflows
                    .filter((pw: any) => pw.isActive)
                    .map((pw: any) => (
                      <button
                        key={pw.id}
                        type="button"
                        onClick={async () => {
                          setWorkflowId(pw.workflow.id);
                          await handleStart(pw.workflow.id);
                        }}
                        className="w-full rounded-xl border p-3 text-left hover:bg-muted/50"
                        disabled={starting}
                      >
                        <div className="font-medium">{pw.workflow.name}</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {phoneView === "execution" && (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Workflow</div>
                <div className="text-base font-medium">{execution?.workflow?.name}</div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{activeStep?.label || "-"}</div>
                  <div className="text-xs text-muted-foreground">{`Step ${activeStepIndex + 1} of ${steps.length}`}</div>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-sm font-medium">{activeStep?.label || "Step"}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {activeStep?.type === "FORM" && "Fill the form to continue"}
                  {activeStep?.type === "CONFIRMATION" && "Confirm to proceed"}
                  {activeStep?.type === "DISPLAY" && "Review the information"}
                </div>

                {executingStep && (
                  <div className="mt-3 text-sm text-muted-foreground">Processing…</div>
                )}

                {lastStepResponse?.error && (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {lastStepResponse.error}
                  </div>
                )}

                {activeStep?.type === "FORM" && (
                  <div className="mt-4 space-y-4">
                    {formLoading && <div className="text-sm text-muted-foreground">Loading form…</div>}
                    {!formLoading && !activeFormId && (
                      <div className="text-sm text-destructive">FORM step missing formId in config</div>
                    )}
                    {!formLoading && activeFormId && (
                      <>
                        <div>
                          <div className="text-sm font-medium">{formData?.form?.name || "Form"}</div>
                          {formData?.form?.description && (
                            <div className="text-xs text-muted-foreground mt-1">{formData.form.description}</div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {formSchemaFields.map((field: FormField) => (
                            <div key={field.id} className="space-y-2">
                              <Label className="text-sm">
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </Label>

                              {field.type === "text" && (
                                <Input
                                  value={formValues[field.id] ?? ""}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setFormValues((prev: Record<string, any>) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={field.placeholder}
                                />
                              )}

                              {field.type === "number" && (
                                <Input
                                  type="number"
                                  value={formValues[field.id] ?? ""}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setFormValues((prev: Record<string, any>) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={field.placeholder}
                                />
                              )}

                              {field.type === "date" && (
                                <Input
                                  type="date"
                                  value={formValues[field.id] ?? ""}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setFormValues((prev: Record<string, any>) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                />
                              )}

                              {field.type === "dropdown" && (
                                <select
                                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                                  value={formValues[field.id] ?? ""}
                                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                    setFormValues((prev: Record<string, any>) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select an option</option>
                                  {(field.options || []).map((opt: string) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {field.type === "toggle" && (
                                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                  <div className="text-sm text-muted-foreground">Toggle</div>
                                  <Switch
                                    checked={Boolean(formValues[field.id])}
                                    onCheckedChange={(checked: boolean) =>
                                      setFormValues((prev: Record<string, any>) => ({
                                        ...prev,
                                        [field.id]: checked,
                                      }))
                                    }
                                  />
                                </div>
                              )}

                              {field.type === "beneficiary" && (
                                <select
                                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                                  value={formValues[field.id] ?? ""}
                                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                    setFormValues((prev: Record<string, any>) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select a beneficiary</option>
                                  <option value="sample_wallet">John Doe - **** 1234</option>
                                  <option value="sample_bank">Jane Smith - +265 999 123 456</option>
                                </select>
                              )}

                              {field.type === "account" && (
                                <select
                                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                                  value={formValues[field.id] ?? ""}
                                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                    setFormValues((prev: Record<string, any>) => ({
                                      ...prev,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select an account</option>
                                  <option value="savings">Savings - 1234567890</option>
                                  <option value="current">Current - 0987654321</option>
                                </select>
                              )}

                              {formErrors[field.id] && (
                                <div className="text-xs text-destructive">{formErrors[field.id]}</div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            className="flex-1"
                            disabled={executingStep || completing}
                            onClick={async () => {
                              const errors = validateFormFields(formSchemaFields, formValues);
                              setFormErrors(errors);
                              if (Object.keys(errors).length > 0) {
                                toast.error("Please fix the highlighted fields");
                                return;
                              }
                              await handleRunActiveStep({ formId: activeFormId, values: formValues });
                            }}
                          >
                            {activeStep?.config?.submitButtonText || "Continue"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setFormValues({});
                              setFormErrors({});
                            }}
                            disabled={executingStep || completing}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeStep?.type === "CONFIRMATION" && (
                  <div className="mt-4 space-y-3">
                    <div className="text-sm">
                      {activeStep?.config?.message || "Are you sure you want to continue?"}
                    </div>
                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="text-sm text-muted-foreground">I confirm</div>
                      <Switch checked={confirmationAccepted} onCheckedChange={setConfirmationAccepted} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={!confirmationAccepted || executingStep || completing || cancelling}
                        onClick={() => handleRunActiveStep({ confirmed: true })}
                      >
                        {activeStep?.config?.confirmLabel || "Confirm"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={executingStep || completing || cancelling}
                        onClick={async () => {
                          const action = activeStep?.config?.declineAction || "CANCEL";
                          if (action === "PREVIOUS_STEP") {
                            if (activeStepIndex > 0) {
                              setActiveStepIndex((prev) => prev - 1);
                              setLastStepResponse(null);
                            } else {
                              toast.info("No previous step to go back to.");
                            }
                          } else {
                            // Default to CANCEL
                            await cancelWorkflowExecution({
                              variables: {
                                executionId: execution.id,
                                reason: "User declined confirmation",
                              },
                            });
                          }
                        }}
                      >
                        {activeStep?.config?.declineLabel || "Cancel"}
                      </Button>
                    </div>
                  </div>
                )}

                {activeStep?.type === "DISPLAY" && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      {activeStep?.config?.content || activeStep?.config?.text || ""}
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={executingStep || completing}
                      onClick={() => handleRunActiveStep({ acknowledged: true })}
                    >
                      Continue
                    </Button>
                  </div>
                )}

                {activeStep && !["FORM", "CONFIRMATION", "DISPLAY"].includes(activeStep.type) && (
                  <div className="mt-4 space-y-3">
                    <Button
                      onClick={() => handleRunActiveStep({})}
                      disabled={executingStep || completing}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Continue
                    </Button>
                  </div>
                )}
              </div>

              {activeStepIndex >= steps.length - 1 && (
                <Button onClick={handleComplete} disabled={completing} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              )}

              {completion && (
                <div
                  className={
                    completion.success
                      ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"
                      : "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive"
                  }
                >
                  <div className="text-sm font-medium">{completion.message}</div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    resetExecution();
                  }}
                  disabled={executingStep || completing}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Exit Workflow
                </Button>
              </div>
            </div>
          )}
        </PhoneFrame>
      </div>
    </div>
  );
}
