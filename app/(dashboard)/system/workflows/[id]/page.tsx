"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/components/providers/i18n-provider";
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
  
  // Core banking endpoint integration
  const [selectedEndpointId, setSelectedEndpointId] = useState("");
  const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({});

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
      alert(error.message);
    },
  });

  const [updateStep, { loading: updating }] = useMutation(UPDATE_STEP, {
    onCompleted: () => {
      refetch();
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const [deleteStep] = useMutation(DELETE_STEP, {
    onCompleted: () => refetch(),
  });

  const [reorderSteps] = useMutation(REORDER_STEPS, {
    onError: (error) => {
      alert("Failed to reorder: " + error.message);
      refetch();
    },
  });

  const [updateWorkflow, { loading: updatingWorkflow }] = useMutation(UPDATE_WORKFLOW, {
    onCompleted: () => {
      refetch();
      setWorkflowDialogOpen(false);
    },
    onError: (error) => {
      alert(error.message);
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
      alert("Please enter a workflow name");
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
      alert("Please fill in all required fields");
      return;
    }

    // Validate form selection for FORM type
    if (stepType === "FORM" && !selectedFormId) {
      alert("Please select a form");
      return;
    }

    // Validate endpoint selection for API_CALL type
    if (stepType === "API_CALL" && executionMode !== "CLIENT_ONLY") {
      if (!selectedEndpointId) {
        alert("Please select a core banking endpoint for API_CALL");
        return;
      }
    }

    // Validate execution configuration
    if (executionMode !== "CLIENT_ONLY") {
      if (!triggerTiming) {
        alert("Please select trigger timing for server execution");
        return;
      }
      if (!triggerEndpoint && stepType !== "API_CALL") {
        alert("Please enter a trigger endpoint for server execution");
        return;
      }
    }

    let parsedConfig;
    let parsedValidation = null;

    try {
      parsedConfig = JSON.parse(stepConfig);
    } catch (e) {
      alert("Invalid JSON in config field");
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

    if (stepValidation.trim()) {
      try {
        parsedValidation = JSON.parse(stepValidation);
      } catch (e) {
        alert("Invalid JSON in validation field");
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

  const handleDelete = async (id: string, label: string) => {
    if (confirm(`Are you sure you want to delete "${label}"?`)) {
      await deleteStep({ variables: { id } });
    }
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? "Edit Step" : "Add New Step"}
            </DialogTitle>
            <DialogDescription>
              {editingStep
                ? "Update the step details below"
                : "Configure a new step for this workflow"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                      const template = JSON.parse(selectedEndpoint.bodyTemplate);
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

            {/* Step Config */}
            <div className="space-y-2">
              <Label htmlFor="config">Configuration (JSON) {stepType === "FORM" ? "(Optional)" : "*"}</Label>
              <Textarea
                id="config"
                placeholder={stepType === "FORM" ? '{"submitButtonText": "Continue"}' : '{"endpoint": "/api/example"}'}
                value={stepConfig}
                onChange={(e) => setStepConfig(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {stepType === "FORM" 
                  ? "Additional configuration (formId will be added automatically)"
                  : "Step-specific configuration in JSON format"}
              </p>
            </div>

            {/* Step Validation */}
            <div className="space-y-2">
              <Label htmlFor="validation">Validation Rules (JSON, Optional)</Label>
              <Textarea
                id="validation"
                placeholder='{"required": ["field1"]}'
                value={stepValidation}
                onChange={(e) => setStepValidation(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Optional validation rules for this step
              </p>
            </div>

            {/* Execution Configuration Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                Execution Configuration
              </h3>
              <div className="bg-muted/50 p-3 rounded-md mb-4">
                <p className="text-xs text-muted-foreground">
                  Configure how and when this step interacts with the backend. 
                  Choose <strong>Client Only</strong> for UI-only steps (forms, confirmations), 
                  or select a server mode to trigger backend actions.
                </p>
              </div>

              {/* Execution Mode */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="executionMode">Execution Mode *</Label>
                <Select value={executionMode} onValueChange={setExecutionMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT_ONLY">
                      <div>
                        <p className="font-medium">Client Only</p>
                        <p className="text-xs text-muted-foreground">No backend trigger</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="SERVER_SYNC">
                      <div>
                        <p className="font-medium">Server Sync</p>
                        <p className="text-xs text-muted-foreground">Wait for backend response</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="SERVER_ASYNC">
                      <div>
                        <p className="font-medium">Server Async</p>
                        <p className="text-xs text-muted-foreground">Fire and forget</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="SERVER_VALIDATION">
                      <div>
                        <p className="font-medium">Server Validation</p>
                        <p className="text-xs text-muted-foreground">Validate before proceeding</p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show trigger fields only if not CLIENT_ONLY */}
              {executionMode !== "CLIENT_ONLY" && (
                <>
                  {/* Trigger Timing */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="triggerTiming">Trigger Timing *</Label>
                    <Select value={triggerTiming} onValueChange={setTriggerTiming}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select when to trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEFORE_STEP">
                          <div>
                            <p className="font-medium">Before Step</p>
                            <p className="text-xs text-muted-foreground">Execute before showing step</p>
                          </div>
                        </SelectItem>
                        <SelectItem value="AFTER_STEP">
                          <div>
                            <p className="font-medium">After Step</p>
                            <p className="text-xs text-muted-foreground">Execute after user completes step</p>
                          </div>
                        </SelectItem>
                        <SelectItem value="BOTH">
                          <div>
                            <p className="font-medium">Before & After</p>
                            <p className="text-xs text-muted-foreground">Execute before AND after</p>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trigger Endpoint */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="triggerEndpoint">Trigger Endpoint *</Label>
                    <Input
                      id="triggerEndpoint"
                      placeholder="/api/accounts/validate"
                      value={triggerEndpoint}
                      onChange={(e) => setTriggerEndpoint(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      API endpoint to call for this step
                    </p>
                  </div>

                  {/* HTTP Method */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="triggerMethod">HTTP Method</Label>
                    <Select value={triggerMethod} onValueChange={setTriggerMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timeout */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="timeoutMs">Timeout (milliseconds)</Label>
                    <Input
                      id="timeoutMs"
                      type="number"
                      placeholder="30000"
                      value={timeoutMs}
                      onChange={(e) => setTimeoutMs(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum time to wait for response (default: 30000ms)
                    </p>
                  </div>

                  {/* Max Retries */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="maxRetries">Max Retries</Label>
                    <Input
                      id="maxRetries"
                      type="number"
                      min="0"
                      max="10"
                      placeholder="0"
                      value={maxRetries}
                      onChange={(e) => setMaxRetries(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of retry attempts on failure (0 = no retries)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
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
    </div>
  );
}
