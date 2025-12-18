"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VariableExplorer } from "@/components/workflows/variable-explorer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar, Edit, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const WORKFLOW_QUERY = gql`
  query Workflow($id: ID!) {
    workflow(id: $id) {
      id
      name
      description
      isActive
      version
      createdAt
      updatedAt
      steps {
        id
        type
        label
        order
        config
        validation
        isActive
        executionMode
        triggerTiming
        triggerEndpoint
        triggerConfig
        timeoutMs
        retryConfig
        createdAt
        updatedAt
      }
      screenPages {
        id
        page {
          id
          name
          icon
          screen {
            id
            name
            context
            icon
          }
        }
      }
    }
  }
`;

const FORMS_QUERY = gql`
  query Forms($isActive: Boolean) {
    forms(isActive: $isActive, limit: 1000) {
      forms {
        id
        name
        description
        category
        isActive
        schema
      }
      total
    }
  }
`;

const CORE_BANKING_ENDPOINTS_QUERY = gql`
  query CoreBankingEndpoints {
    coreBankingConnections {
      id
      name
      baseUrl
      isActive
      endpoints {
        id
        name
        method
        path
        bodyTemplate
        isActive
      }
    }
  }
`;

const CREATE_STEP = gql`
  mutation CreateWorkflowStep($input: CreateWorkflowStepInput!) {
    createWorkflowStep(input: $input) {
      id
      type
      label
      order
    }
  }
`;

const UPDATE_STEP = gql`
  mutation UpdateWorkflowStep($id: ID!, $input: UpdateWorkflowStepInput!) {
    updateWorkflowStep(id: $id, input: $input) {
      id
      type
      label
      order
    }
  }
`;

const DELETE_STEP = gql`
  mutation DeleteWorkflowStep($id: ID!) {
    deleteWorkflowStep(id: $id)
  }
`;

const REORDER_STEPS = gql`
  mutation ReorderWorkflowSteps($workflowId: ID!, $stepIds: [ID!]!) {
    reorderWorkflowSteps(workflowId: $workflowId, stepIds: $stepIds) {
      id
      order
    }
  }
`;

const UPDATE_WORKFLOW = gql`
  mutation UpdateWorkflow($id: ID!, $input: UpdateWorkflowInput!) {
    updateWorkflow(id: $id, input: $input) {
      id
      name
      description
      isActive
    }
  }
`;

const STEP_TYPES = [
  { value: "FORM", label: "📝 Form", description: "Display a form" },
  { value: "API_CALL", label: "🌐 API Call", description: "Make an API request" },
  { value: "VALIDATION", label: "✅ Validation", description: "Validate data" },
  { value: "CONFIRMATION", label: "⚠️ Confirmation", description: "Ask for confirmation" },
  { value: "DISPLAY", label: "📄 Display", description: "Show information" },
  { value: "REDIRECT", label: "🔄 Redirect", description: "Navigate to another screen" },
  { value: "OTP", label: "🔐 OTP", description: "Send and validate One-Time Password" },
  { value: "POST_TRANSACTION", label: "💸 Post Transaction", description: "Post transaction to core banking" },
];

const TRANSACTION_TYPES = [
  { value: "DEBIT", label: "Debit", description: "Debit an account" },
  { value: "CREDIT", label: "Credit", description: "Credit an account" },
  { value: "TRANSFER", label: "Transfer", description: "Transfer between accounts" },
  { value: "WALLET_TRANSFER", label: "Wallet Transfer", description: "Transfer between wallets" },
];

const SYSTEM_SERVICES = [
  {
    id: "t24",
    name: "T24 Core Banking",
    methods: [
      {
        id: "validate_account",
        name: "Validate Account",
        description: "Verify account existence and status",
        params: [
          { name: "accountNumber", label: "Account Number", type: "string", required: true },
          { name: "accountType", label: "Account Type", type: "string" }
        ],
        output: ["accountName", "currency", "status", "balance"]
      },
      {
        id: "get_balance",
        name: "Get Balance",
        description: "Retrieve account balance",
        params: [
          { name: "accountNumber", label: "Account Number", type: "string", required: true }
        ],
        output: ["workingBalance", "ledgerBalance", "currency"]
      }
    ]
  },
  {
    id: "account_enrichment",
    name: "Account Enrichment",
    methods: [
      {
        id: "enrich_profile",
        name: "Enrich Profile",
        description: "Get full customer profile from KYU",
        params: [
          { name: "customerId", label: "Customer ID", type: "string", required: true }
        ],
        output: ["fullName", "kycLevel", "riskRating", "segment"]
      }
    ]
  },
  {
    id: "airtime",
    name: "Airtime Service",
    methods: [
      {
        id: "validate_number",
        name: "Validate Phone Number",
        description: "Check if number is valid for topup",
        params: [
          { name: "msisdn", label: "Phone Number", type: "string", required: true },
          { name: "provider", label: "Provider (AIRTEL/TNM)", type: "string" }
        ],
        output: ["isValid", "provider", "isPrepaid"]
      }
    ]
  }
];

function SortableStepRow({ step, onEdit, onDelete, rowIndex, translate }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <TableCell className="text-center whitespace-nowrap">
        {rowIndex + 1}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Badge variant="outline">{step.order}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{step.type}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <p className="font-medium">{step.label}</p>
          {step.executionMode !== "CLIENT_ONLY" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center">
                {step.executionMode === "SERVER_SYNC" && "🔄"}
                {step.executionMode === "SERVER_ASYNC" && "🚀"}
                {step.executionMode === "SERVER_VALIDATION" && "✅"}
                <span className="ml-1">
                  {step.executionMode === "SERVER_SYNC" && "Sync"}
                  {step.executionMode === "SERVER_ASYNC" && "Async"}
                  {step.executionMode === "SERVER_VALIDATION" && "Validation"}
                </span>
              </span>
              {step.triggerTiming && (
                <span className="text-muted-foreground">
                  • {step.triggerTiming === "BEFORE_STEP" && "Before"}
                  {step.triggerTiming === "AFTER_STEP" && "After"}
                  {step.triggerTiming === "BOTH" && "Before & After"}
                </span>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={step.isActive ? "default" : "secondary"}>
          {step.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
              onClick={() => onEdit(step)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {translate("common.actions.edit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
              onClick={() => onDelete(step.id, step.label)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {translate("common.actions.delete")}
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function WorkflowDetailPage() {
  const { translate } = useI18n();
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  // Step dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [stepType, setStepType] = useState("");
  const [stepLabel, setStepLabel] = useState("");
  const [stepConfig, setStepConfig] = useState("{}");
  const [stepValidation, setStepValidation] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");

  // Execution configuration state
  const [executionMode, setExecutionMode] = useState("CLIENT_ONLY");
  const [triggerTiming, setTriggerTiming] = useState("");
  const [triggerEndpoint, setTriggerEndpoint] = useState("");
  const [triggerMethod, setTriggerMethod] = useState("POST");
  const [timeoutMs, setTimeoutMs] = useState("30000");

  const [maxRetries, setMaxRetries] = useState("0");

  // OTP specific state
  const [otpValidationEndpoint, setOtpValidationEndpoint] = useState("");

  // Confirmation step configuration
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmButtonLabel, setConfirmButtonLabel] = useState("Confirm");
  const [declineButtonLabel, setDeclineButtonLabel] = useState("Cancel");
  const [declineAction, setDeclineAction] = useState("CANCEL");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; label: string } | null
  >(null);

  // Core banking endpoint integration
  const [selectedEndpointId, setSelectedEndpointId] = useState("");
  const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({});

  // Validation step state
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [failureMessage, setFailureMessage] = useState<string>("");
  const [popEnabled, setPopEnabled] = useState<boolean>(false);
  const [popButtonName, setPopButtonName] = useState<string>("");
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>("");

  // Workflow edit dialog state
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowIsActive, setWorkflowIsActive] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data, loading, error, refetch } = useQuery(WORKFLOW_QUERY, {
    variables: { id: workflowId },
  });

  const { data: formsData, loading: formsLoading } = useQuery(FORMS_QUERY, {
    variables: { isActive: true },
  });

  const { data: endpointsData, loading: endpointsLoading } = useQuery(CORE_BANKING_ENDPOINTS_QUERY, {
    skip: stepType !== "API_CALL",
  });

  const [createStep, { loading: creating }] = useMutation(CREATE_STEP, {
    onCompleted: () => {
      refetch();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updateStep, { loading: updating }] = useMutation(UPDATE_STEP, {
    onCompleted: () => {
      refetch();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [deleteStep] = useMutation(DELETE_STEP, {
    onCompleted: () => refetch(),
  });

  const [reorderSteps] = useMutation(REORDER_STEPS, {
    onError: (error) => {
      toast.error("Failed to reorder: " + error.message);
      refetch();
    },
  });

  const [updateWorkflow, { loading: updatingWorkflow }] = useMutation(UPDATE_WORKFLOW, {
    onCompleted: () => {
      refetch();
      setWorkflowDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Smart defaults based on step type
  useEffect(() => {
    if (!editingStep && stepType) {
      // Set smart defaults based on step type
      switch (stepType) {
        case "API_CALL":
          setExecutionMode("SERVER_SYNC");
          setTriggerTiming("AFTER_STEP");
          break;
        case "VALIDATION":
        case "POST_TRANSACTION":
          setExecutionMode("SERVER_VALIDATION");
          setTriggerTiming("BEFORE_STEP");
          break;
        case "FORM":
        case "CONFIRMATION":
        case "DISPLAY":
        case "REDIRECT":
          setExecutionMode("CLIENT_ONLY");
          setTriggerTiming("");
          break;

        case "OTP":
          setExecutionMode("SERVER_SYNC");
          setTriggerTiming("BOTH"); // OTP needs trigger (send) and validation (after)
          break;
        default:
          break;
      }
    }
  }, [stepType, editingStep]);

  const handleOpenWorkflowDialog = () => {
    const workflow = data?.workflow;
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || "");
      setWorkflowIsActive(workflow.isActive);
      setWorkflowDialogOpen(true);
    }
  };



  const handleUpdateWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }

    await updateWorkflow({
      variables: {
        id: workflowId,
        input: {
          name: workflowName,
          description: workflowDescription,
          isActive: workflowIsActive,
        },
      },
    });
  };

  const handleOpenDialog = (step?: any) => {
    if (step) {
      setEditingStep(step);
      setStepType(step.type);
      setStepLabel(step.label);
      setStepConfig(JSON.stringify(step.config, null, 2));
      setStepValidation(step.validation ? JSON.stringify(step.validation, null, 2) : "");

      // Extract formId if step type is FORM
      if (step.type === "FORM" && step.config?.formId) {
        setSelectedFormId(step.config.formId);
      }

      // Set execution configuration
      setExecutionMode(step.executionMode || "CLIENT_ONLY");
      setTriggerTiming(step.triggerTiming || "");
      setTriggerEndpoint(step.triggerEndpoint || "");
      setTriggerMethod(step.triggerConfig?.method || "POST");
      setTimeoutMs(step.timeoutMs?.toString() || "30000");
      setMaxRetries(step.retryConfig?.maxRetries?.toString() || "0");

      // Extract core banking endpoint and parameter mapping
      if (step.config?.endpointId) {
        setSelectedEndpointId(step.config.endpointId);
      }
      if (step.config?.parameterMapping) {
        setParameterMapping(step.config.parameterMapping);
      }

      // Set confirmation configuration
      if (step.type === "CONFIRMATION") {
        setConfirmationMessage(step.config?.message || "");
        setConfirmButtonLabel(step.config?.confirmLabel || "Confirm");
        setDeclineButtonLabel(step.config?.declineLabel || "Cancel");
        setDeclineAction(step.config?.declineAction || "CANCEL");
      }

      // Load OTP specific config
      if (step.type === "OTP") {
        setOtpValidationEndpoint(step.config?.validationEndpoint || "");
      }

      // Load Validation config
      if (step.type === "VALIDATION") {
        setSelectedServiceId(step.config?.serviceId || "");
        setSelectedMethodId(step.config?.methodId || "");
        setSuccessMessage(step.config?.successMessage || "");
        setFailureMessage(step.config?.failureMessage || "");
        setPopEnabled(step.config?.popEnabled || false);
        setPopButtonName(step.config?.popButtonName || "");
        if (step.config?.parameterMapping) {
          setParameterMapping(step.config.parameterMapping);
        }
      }

      // Load Post Transaction config
      if (step.type === "POST_TRANSACTION") {
        setSelectedTransactionType(step.config?.transactionType || "");
        if (step.config?.parameterMapping) {
          setParameterMapping(step.config.parameterMapping);
        }
        // Load messages if they exist for POST_TRANSACTION too
        setSuccessMessage(step.config?.successMessage || "");
        setFailureMessage(step.config?.failureMessage || "");
        setPopEnabled(step.config?.popEnabled || false);
        setPopButtonName(step.config?.popButtonName || "");
      }
    } else {
      setEditingStep(null);
      setStepType("");
      setStepLabel("");
      setStepConfig("{}");
      setStepValidation("");
      setSelectedFormId("");

      // Reset execution configuration
      setExecutionMode("CLIENT_ONLY");
      setTriggerTiming("");
      setTriggerEndpoint("");
      setTriggerMethod("POST");
      setTimeoutMs("30000");
      setMaxRetries("0");

      // Reset core banking endpoint
      setSelectedEndpointId("");
      setParameterMapping({});

      // Reset Validation config
      setSelectedServiceId("");
      setSelectedMethodId("");
      setSuccessMessage("");
      setFailureMessage("");
      setPopEnabled(false);
      setPopEnabled(false);
      setPopButtonName("");
      setSelectedTransactionType("");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStep(null);
    setStepType("");
    setStepLabel("");
    setStepConfig("{}");
    setStepValidation("");
    setSelectedFormId("");

    // Reset Validation config
    setSelectedServiceId("");
    setSelectedMethodId("");
    setSuccessMessage("");
    setFailureMessage("");
    setPopEnabled(false);
    setPopButtonName("");
    setSelectedTransactionType("");

    // Reset confirmation configuration
    setConfirmationMessage("");
    setConfirmButtonLabel("Confirm");
    setDeclineButtonLabel("Cancel");
    setConfirmButtonLabel("Confirm");
    setDeclineButtonLabel("Cancel");
    setDeclineAction("CANCEL");

    // Reset OTP specific state
    setOtpValidationEndpoint("");

    // Reset execution configuration
    setExecutionMode("CLIENT_ONLY");
    setTriggerTiming("");
    setTriggerEndpoint("");
    setTriggerMethod("POST");
    setTimeoutMs("30000");
    setMaxRetries("0");

    // Reset core banking endpoint
    setSelectedEndpointId("");
    setParameterMapping({});
  };

  const handleSubmit = async () => {
    if (!stepType || !stepLabel) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate form selection for FORM type
    if (stepType === "FORM" && !selectedFormId) {
      toast.error("Please select a form");
      return;
    }

    // Validate endpoint selection for API_CALL type
    if (stepType === "API_CALL" && executionMode !== "CLIENT_ONLY") {
      if (!selectedEndpointId) {
        toast.error("Please select a core banking endpoint for API_CALL");
        return;
      }
    }

    // Validate execution configuration
    if (executionMode !== "CLIENT_ONLY" && stepType !== "OTP") {
      if (!triggerTiming) {
        toast.error("Please select trigger timing for server execution");
        return;
      }
      // VALIDATION and POST_TRANSACTION types don't need an explicit trigger endpoint
      if (!triggerEndpoint && stepType !== "API_CALL" && stepType !== "VALIDATION" && stepType !== "POST_TRANSACTION") {
        toast.error("Please enter a trigger endpoint for server execution");
        return;
      }
    }

    // Validate OTP configuration
    if (stepType === "OTP") {
      // Configuration is simplified, no specific validation needed
    }

    // Validate Validation and Post Transaction configuration
    if (stepType === "VALIDATION") {
      if (!selectedServiceId) {
        toast.error("Please select a service");
        return;
      }
      if (!selectedMethodId) {
        toast.error("Please select a validation method");
        return;
      }
    }

    if (stepType === "POST_TRANSACTION") {
      if (!selectedTransactionType) {
        toast.error("Please select a transaction type");
        return;
      }
    }

    let parsedConfig;
    let parsedValidation = null;

    try {
      parsedConfig = JSON.parse(stepConfig);
    } catch (e) {
      toast.error("Invalid JSON in config field");
      return;
    }

    // Merge formId into config for FORM type
    if (stepType === "FORM") {
      parsedConfig = { ...parsedConfig, formId: selectedFormId };
    }

    // Merge endpoint and parameter mapping into config for API_CALL type
    if (stepType === "API_CALL" && selectedEndpointId) {
      const selectedEndpoint = endpointsData?.coreBankingConnections
        ?.flatMap((conn: any) => conn.endpoints)
        ?.find((endpoint: any) => endpoint.id === selectedEndpointId);

      if (selectedEndpoint) {
        parsedConfig = {
          ...parsedConfig,
          endpointId: selectedEndpointId,
          endpointName: selectedEndpoint.name,
          parameterMapping,
        };

        // Auto-set trigger endpoint from the selected core banking endpoint
        if (!triggerEndpoint) {
          setTriggerEndpoint(selectedEndpoint.path);
        }
      }
    }

    // Merge confirmation config
    if (stepType === "CONFIRMATION") {
      parsedConfig = {
        ...parsedConfig,
        message: confirmationMessage,
        confirmLabel: confirmButtonLabel,
        declineLabel: declineButtonLabel,
        declineAction: declineAction,
      };
    }

    // Merge OTP config
    if (stepType === "OTP") {
      parsedConfig = {
        ...parsedConfig,
        validationEndpoint: otpValidationEndpoint,
      };
    }

    // Merge config for POST_TRANSACTION
    if (stepType === "POST_TRANSACTION") {
      parsedConfig = {
        ...parsedConfig,
        transactionType: selectedTransactionType,
        parameterMapping,
        successMessage,
        failureMessage,
        popEnabled,
        popButtonName,
      };
    }

    // Merge Validation config
    if (stepType === "VALIDATION") {
      parsedConfig = {
        ...parsedConfig,
        serviceId: selectedServiceId,
        methodId: selectedMethodId,
        parameterMapping,
        successMessage,
        failureMessage,
        popEnabled,
        popButtonName: popEnabled ? popButtonName : undefined,
      };
    }

    if (stepValidation.trim()) {
      try {
        parsedValidation = JSON.parse(stepValidation);
      } catch (e) {
        toast.error("Invalid JSON in validation field");
        return;
      }
    }

    // Prepare trigger config
    const triggerConfig = triggerEndpoint ? {
      method: triggerMethod,
    } : null;

    // Prepare retry config
    const retryConfig = maxRetries !== "0" ? {
      maxRetries: parseInt(maxRetries),
      initialDelayMs: 1000,
    } : null;

    if (editingStep) {
      await updateStep({
        variables: {
          id: editingStep.id,
          input: {
            type: stepType,
            label: stepLabel,
            config: parsedConfig,
            validation: parsedValidation,
            executionMode,
            triggerTiming: triggerTiming || null,
            triggerEndpoint: triggerEndpoint || null,
            triggerConfig,
            timeoutMs: parseInt(timeoutMs),
            retryConfig,
          },
        },
      });
    } else {
      const steps = data?.workflow?.steps || [];
      await createStep({
        variables: {
          input: {
            workflowId,
            type: stepType,
            label: stepLabel,
            order: steps.length,
            config: parsedConfig,
            validation: parsedValidation,
            isActive: true,
            executionMode,
            triggerTiming: triggerTiming || null,
            triggerEndpoint: triggerEndpoint || null,
            triggerConfig,
            timeoutMs: parseInt(timeoutMs),
            retryConfig,
          },
        },
      });
    }
  };

  const handleDelete = (id: string, label: string) => {
    setDeleteTarget({ id, label });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteStep({ variables: { id: deleteTarget.id } });
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const steps = data?.workflow?.steps || [];
    const oldIndex = steps.findIndex((s: any) => s.id === active.id);
    const newIndex = steps.findIndex((s: any) => s.id === over.id);

    const reordered = arrayMove(steps, oldIndex, newIndex);

    await reorderSteps({
      variables: {
        workflowId,
        stepIds: reordered.map((s: any) => s.id),
      },
    });

    refetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !data?.workflow) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="text-center py-8 text-destructive">
          Workflow not found or error loading data
        </div>
      </div>
    );
  }

  const workflow = data.workflow;
  const steps = workflow.steps || [];

  // Calculate previous steps for VariableExplorer
  const availableSteps = editingStep
    ? steps.filter((s: any) => s.order < editingStep.order)
    : steps; // If adding new step, all existing steps are previous

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/system/workflows">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {`${translate("common.actions.backTo")} ${translate("common.entities.workflows")}`}
          </Button>
        </Link>
        <Button onClick={handleOpenWorkflowDialog}>
          <Edit className="h-4 w-4 mr-2" />
          {`${translate("common.actions.edit")} ${translate("common.entities.workflow")}`}
        </Button>
      </div>

      {/* Workflow Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{workflow.name}</CardTitle>
              <p className="text-muted-foreground mt-2">
                {workflow.description || "No description"}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant={workflow.isActive ? "default" : "secondary"}>
                  {workflow.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">Version {workflow.version}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Steps:</span>{" "}
              {steps.length}
            </div>
            <div>
              <span className="text-muted-foreground">Attached to:</span>{" "}
              {workflow.screenPages.length} pages
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                {new Date(workflow.createdAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                {new Date(workflow.updatedAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workflow Steps</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define the sequence of actions for this workflow
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {`${translate("common.actions.add")} ${translate("common.entities.step")}`}
          </Button>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <div className="text-muted-foreground mb-4">
                No steps defined yet
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {`${translate("common.actions.addFirst")} ${translate("common.entities.step")}`}
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table className="bg-white">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-12 text-center">{translate("common.table.columns.index")}</TableHead>
                      <TableHead className="w-16">{translate("common.table.columns.order")}</TableHead>
                      <TableHead>{translate("common.table.columns.type")}</TableHead>
                      <TableHead>{translate("common.table.columns.label")}</TableHead>
                      <TableHead>{translate("common.table.columns.status")}</TableHead>
                      <TableHead className="text-center">{translate("common.table.columns.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    <SortableContext
                      items={steps.map((s: any) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {steps.map((step: any, index: number) => (
                        <SortableStepRow
                          key={step.id}
                          step={step}
                          rowIndex={index}
                          onEdit={handleOpenDialog}
                          onDelete={handleDelete}
                          translate={translate}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attached Pages Card */}
      <Card>
        <CardHeader>
          <CardTitle>Attached to Pages</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Pages currently using this workflow
          </p>
        </CardHeader>
        <CardContent>
          {workflow.screenPages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Not attached to any pages yet
            </div>
          ) : (
            <div className="space-y-2">
              {workflow.screenPages.map((sp: any) => (
                <Link
                  key={sp.id}
                  href={`/system/app-screens/${sp.page.screen.id}/pages/${sp.page.id}`}
                >
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-2xl">{sp.page.screen.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">
                        {sp.page.screen.name} / {sp.page.icon} {sp.page.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sp.page.screen.context}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Workflow Dialog */}
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update workflow details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Workflow Name */}
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow Name *</Label>
              <Input
                id="workflow-name"
                placeholder="e.g., Money Transfer Workflow"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="workflow-description">Description</Label>
              <Textarea
                id="workflow-description"
                placeholder="Describe what this workflow does..."
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="workflow-active"
                checked={workflowIsActive}
                onCheckedChange={setWorkflowIsActive}
              />
              <Label htmlFor="workflow-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWorkflowDialogOpen(false)}
              disabled={updatingWorkflow}
            >
              {translate("common.actions.cancel")}
            </Button>
            <Button
              onClick={handleUpdateWorkflow}
              disabled={updatingWorkflow || !workflowName.trim()}
            >
              {updatingWorkflow
                ? translate("common.state.updating")
                : `${translate("common.actions.update")} ${translate("common.entities.workflow")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Step Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] w-[90vw] sm:max-w-[90vw] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>
              {editingStep ? "Edit Step" : "Add New Step"}
            </DialogTitle>
            <DialogDescription>
              {editingStep
                ? "Update the step details below"
                : "Configure a new step for this workflow"}
            </DialogDescription>
          </DialogHeader>


          <div className="flex-1 overflow-hidden flex gap-4 p-6 pt-2">

            {/* Left Column: Variable Explorer (if available) */}
            {availableSteps.length > 0 && (
              <div className="w-1/3 min-w-[300px] border-r pr-4 overflow-y-auto">
                <VariableExplorer
                  previousSteps={availableSteps}
                  forms={formsData?.forms?.forms || []}
                />
              </div>
            )}

            {/* Right Column: Step Configuration Form */}
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                {/* Step Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Step Type *</Label>
                  <Select value={stepType} onValueChange={setStepType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select step type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {type.description}
                            </p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Form Selector - Only show when step type is FORM */}
                {stepType === "FORM" && (
                  <div className="space-y-2">
                    <Label htmlFor="form">Select Form *</Label>
                    <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a form" />
                      </SelectTrigger>
                      <SelectContent>
                        {formsLoading ? (
                          <div className="p-2 text-sm text-muted-foreground">Loading forms...</div>
                        ) : formsData?.forms?.forms?.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No forms available</div>
                        ) : (
                          formsData?.forms?.forms?.map((form: any) => (
                            <SelectItem key={form.id} value={form.id}>
                              <div>
                                <p className="font-medium">{form.name}</p>
                                {form.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {form.description}
                                  </p>
                                )}
                                {form.category && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {form.category}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The form that will be displayed to the user
                    </p>
                  </div>
                )}

                {/* Confirmation Configuration - Only show when step type is CONFIRMATION */}
                {stepType === "CONFIRMATION" && (
                  <div className="space-y-4 border rounded-md p-4 bg-amber-50/50 border-amber-100">
                    <div className="space-y-2">
                      <Label htmlFor="confirmationMessage">Confirmation Message Template *</Label>
                      <Textarea
                        id="confirmationMessage"
                        placeholder="e.g. Do you want to pay {{ step_0_result.amount }} to {{ step_0_result.recipient }}?"
                        value={confirmationMessage}
                        onChange={(e) => setConfirmationMessage(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use <code className="bg-amber-100 px-1 rounded">{"{{ variable_name }}"}</code> as placeholders.
                        Available variables: <code className="bg-amber-100 px-1 rounded">step_N_result.field</code>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="confirmLabel">Confirm Button Label</Label>
                        <Input
                          id="confirmLabel"
                          placeholder="e.g. Proceed"
                          value={confirmButtonLabel}
                          onChange={(e) => setConfirmButtonLabel(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="declineLabel">Decline Button Label</Label>
                        <Input
                          id="declineLabel"
                          placeholder="e.g. Cancel"
                          value={declineButtonLabel}
                          onChange={(e) => setDeclineButtonLabel(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="declineAction">Decline Action</Label>
                      <Select value={declineAction} onValueChange={setDeclineAction}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CANCEL">Cancel Workflow</SelectItem>
                          <SelectItem value="PREVIOUS_STEP">Go to Previous Step</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Action to take when the user declines the confirmation
                      </p>
                    </div>
                  </div>
                )}

                {/* Core Banking Endpoint Selector - Only show when step type is API_CALL */}
                {stepType === "API_CALL" && executionMode !== "CLIENT_ONLY" && (
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">Select Core Banking Endpoint *</Label>
                    <Select value={selectedEndpointId} onValueChange={(value) => {
                      setSelectedEndpointId(value);
                      // Auto-populate trigger endpoint and method
                      const selectedEndpoint = endpointsData?.coreBankingConnections
                        ?.flatMap((conn: any) => conn.endpoints)
                        ?.find((endpoint: any) => endpoint.id === value);
                      if (selectedEndpoint) {
                        setTriggerEndpoint(selectedEndpoint.path);
                        setTriggerMethod(selectedEndpoint.method);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an endpoint" />
                      </SelectTrigger>
                      <SelectContent>
                        {endpointsLoading ? (
                          <div className="p-2 text-sm text-muted-foreground">Loading endpoints...</div>
                        ) : !endpointsData?.coreBankingConnections?.length ? (
                          <div className="p-2 text-sm text-muted-foreground">No endpoints available</div>
                        ) : (
                          endpointsData.coreBankingConnections.map((connection: any) => (
                            connection.endpoints?.length > 0 && (
                              <div key={connection.id}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  {connection.name}
                                </div>
                                {connection.endpoints.map((endpoint: any) => (
                                  <SelectItem key={endpoint.id} value={endpoint.id}>
                                    <div>
                                      <p className="font-medium">{endpoint.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {endpoint.method} {endpoint.path}
                                      </p>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            )
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the core banking API endpoint to call
                    </p>
                  </div>
                )}

                {/* Parameter Mapping - Show when endpoint is selected */}
                {stepType === "API_CALL" && selectedEndpointId && (
                  <div className="space-y-2">
                    <Label>Parameter Mapping</Label>
                    <div className="border rounded-md p-3 space-y-2 bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">
                        Map endpoint parameters to data collected in previous steps.
                        Use dot notation for nested fields (e.g., "step_0.amount").
                      </p>
                      {(() => {
                        const selectedEndpoint = endpointsData?.coreBankingConnections
                          ?.flatMap((conn: any) => conn.endpoints)
                          ?.find((endpoint: any) => endpoint.id === selectedEndpointId);

                        if (!selectedEndpoint?.bodyTemplate) {
                          return (
                            <p className="text-xs text-muted-foreground">
                              No parameters defined for this endpoint
                            </p>
                          );
                        }

                        let parameters: string[] = [];
                        try {
                          // Check if bodyTemplate is a string before parsing
                          const templateStr = typeof selectedEndpoint.bodyTemplate === 'string'
                            ? selectedEndpoint.bodyTemplate
                            : JSON.stringify(selectedEndpoint.bodyTemplate);

                          const template = JSON.parse(templateStr);
                          // Extract parameter names from template (simple heuristic)
                          const extractParams = (obj: any, prefix = ''): void => {
                            Object.keys(obj).forEach(key => {
                              const fullKey = prefix ? `${prefix}.${key}` : key;
                              if (typeof obj[key] === 'string' && obj[key].startsWith('{{') && obj[key].endsWith('}}')) {
                                parameters.push(fullKey);
                              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                                extractParams(obj[key], fullKey);
                              }
                            });
                          };
                          extractParams(template);
                        } catch (e) {
                          console.error('Failed to parse bodyTemplate:', e);
                        }

                        if (parameters.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground">
                              No parameters found in endpoint template
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {parameters.map((param) => (
                              <div key={param} className="flex items-center gap-2">
                                <Label className="text-xs min-w-[120px]">{param}</Label>
                                <Input
                                  placeholder="e.g., step_0.amount"
                                  value={parameterMapping[param] || ""}
                                  onChange={(e) => {
                                    setParameterMapping({
                                      ...parameterMapping,
                                      [param]: e.target.value
                                    });
                                  }}
                                  className="text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available data keys: step_0, step_1, step_2, etc. (based on step order)
                    </p>
                  </div>
                )}


                {/* OTP Configuration */}
                {stepType === "OTP" && (
                  <div className="space-y-4 border rounded-md p-4 bg-blue-50/50 border-blue-100">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      🔐 OTP Configuration
                    </h3>

                    <div className="bg-blue-100/50 p-3 rounded-md mb-2">
                      <p className="text-xs text-blue-800">
                        OTP sending and validation services are handled automatically by the system.
                        Please configure the retry policy below.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="otpTimeout">Timeout (ms)</Label>
                        <Input
                          id="otpTimeout"
                          type="number"
                          placeholder="30000"
                          value={timeoutMs}
                          onChange={(e) => setTimeoutMs(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="otpMaxRetries">Max Retries</Label>
                        <Input
                          id="otpMaxRetries"
                          type="number"
                          min="0"
                          max="5"
                          placeholder="3"
                          value={maxRetries}
                          onChange={(e) => setMaxRetries(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}


                {/* Validation/Post Transaction Configuration */}
                {(stepType === "VALIDATION" || stepType === "POST_TRANSACTION") && (
                  <div className="space-y-4 border rounded-md p-4 bg-purple-50/50 border-purple-100">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      {stepType === "VALIDATION" ? "✅ Validation Service" : "💸 Transaction Service"}
                    </h3>

                    {stepType === "VALIDATION" ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="service">Service</Label>
                          <Select
                            value={selectedServiceId}
                            onValueChange={(value) => {
                              setSelectedServiceId(value);
                              setSelectedMethodId(""); // Reset method when service changes
                              setParameterMapping({});
                            }}
                          >
                            <SelectTrigger id="service">
                              <SelectValue placeholder="Select Service" />
                            </SelectTrigger>
                            <SelectContent>
                              {SYSTEM_SERVICES.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="method">Method</Label>
                          <Select
                            value={selectedMethodId}
                            onValueChange={(value) => {
                              setSelectedMethodId(value);
                              // Auto-populate parameter mapping keys
                              const service = SYSTEM_SERVICES.find(s => s.id === selectedServiceId);
                              const method = service?.methods.find(m => m.id === value);
                              if (method) {
                                const newMapping: Record<string, string> = {};
                                method.params.forEach(param => {
                                  newMapping[param.name] = "";
                                });
                                setParameterMapping(newMapping);
                              }
                            }}
                            disabled={!selectedServiceId}
                          >
                            <SelectTrigger id="method">
                              <SelectValue placeholder="Select Method" />
                            </SelectTrigger>
                            <SelectContent>
                              {SYSTEM_SERVICES.find(s => s.id === selectedServiceId)?.methods.map((method) => (
                                <SelectItem key={method.id} value={method.id}>
                                  {method.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="transactionType">Transaction Type</Label>
                        <Select
                          value={selectedTransactionType}
                          onValueChange={(value) => {
                            setSelectedTransactionType(value);
                            // Auto-populate mapping based on type
                            const newMapping: Record<string, string> = {
                              amount: "",
                              description: "",
                              currency: "MWK"
                            };

                            if (["TRANSFER", "WALLET_TRANSFER"].includes(value)) {
                              newMapping["fromAccountNumber"] = "";
                              newMapping["toAccountNumber"] = "";
                            } else if (value === "DEBIT") {
                              newMapping["fromAccountNumber"] = "";
                            } else if (value === "CREDIT") {
                              newMapping["toAccountNumber"] = "";
                            }

                            setParameterMapping(newMapping);
                          }}
                        >
                          <SelectTrigger id="transactionType">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSACTION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Parameter Mapping Section - Shared or conditional */}
                    {(stepType === "VALIDATION" ? selectedMethodId : selectedTransactionType) && (
                      <div className="space-y-4 pt-2">
                        <Label>Parameter Mapping</Label>
                        <div className="bg-white p-3 rounded border space-y-3">
                          <p className="text-xs text-muted-foreground mb-2">
                            Map existing variables to {stepType === "VALIDATION" ? "service parameters" : "transaction fields"}.
                          </p>
                          {Object.keys(parameterMapping).map((paramName) => (
                            <div key={paramName} className="grid grid-cols-3 gap-2 items-center">
                              <Label htmlFor={`param-${paramName}`} className="text-xs font-mono">{paramName}</Label>
                              <Input
                                id={`param-${paramName}`}
                                placeholder="Value or {{variable}}"
                                className="col-span-2 h-8 text-sm"
                                value={parameterMapping[paramName]}
                                onChange={(e) => setParameterMapping({
                                  ...parameterMapping,
                                  [paramName]: e.target.value
                                })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-purple-200 mt-4 pt-4 space-y-4">
                      <h4 className="text-sm font-semibold">Messages & Actions</h4>

                      <div className="space-y-2">
                        <Label htmlFor="successMessage">Success Message</Label>
                        <Input
                          id="successMessage"
                          placeholder="e.g. Validation successful!"
                          value={successMessage}
                          onChange={(e) => setSuccessMessage(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="failureMessage">Failure Message</Label>
                        <Input
                          id="failureMessage"
                          placeholder="e.g. Validation failed, please check inputs."
                          value={failureMessage}
                          onChange={(e) => setFailureMessage(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="popEnabled"
                          checked={popEnabled}
                          onCheckedChange={setPopEnabled}
                        />
                        <Label htmlFor="popEnabled">Enable Proof of Payment (POP)</Label>
                      </div>

                      {popEnabled && (
                        <div className="space-y-2 pl-6 border-l-2 border-purple-200 ml-1">
                          <Label htmlFor="popButtonName">POP Button Name</Label>
                          <Input
                            id="popButtonName"
                            placeholder="e.g. Download Receipt"
                            value={popButtonName}
                            onChange={(e) => setPopButtonName(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step Label */}
                <div className="space-y-2">
                  <Label htmlFor="label">Step Label *</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Enter Amount"
                    value={stepLabel}
                    onChange={(e) => setStepLabel(e.target.value)}
                  />
                </div>








              </div>

            </div>
          </div>


          <DialogFooter className="p-6 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
              disabled={creating || updating}
            >
              {translate("common.actions.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={creating || updating || !stepType || !stepLabel}
            >
              {creating || updating
                ? editingStep
                  ? translate("common.state.updating")
                  : translate("common.state.creating")
                : editingStep
                  ? `${translate("common.actions.update")} ${translate("common.entities.step")}`
                  : `${translate("common.actions.create")} ${translate("common.entities.step")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("common.actions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.label}"?`
                : "Are you sure you want to delete this step?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              {translate("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              {translate("common.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
