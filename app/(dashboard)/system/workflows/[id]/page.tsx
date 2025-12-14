"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Edit, Plus, MoreVertical, Trash2, GripVertical } from "lucide-react";
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

function SortableStepRow({ step, onEdit, onDelete }: any) {
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
    <TableRow ref={setNodeRef} style={style}>
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
        <p className="font-medium">{step.label}</p>
      </TableCell>
      <TableCell>
        <Badge variant={step.isActive ? "default" : "secondary"}>
          {step.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(step)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(step.id, step.label)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function WorkflowDetailPage() {
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
    } else {
      setEditingStep(null);
      setStepType("");
      setStepLabel("");
      setStepConfig("{}");
      setStepValidation("");
      setSelectedFormId("");
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

    if (stepValidation.trim()) {
      try {
        parsedValidation = JSON.parse(stepValidation);
      } catch (e) {
        alert("Invalid JSON in validation field");
        return;
      }
    }

    if (editingStep) {
      await updateStep({
        variables: {
          id: editingStep.id,
          input: {
            type: stepType,
            label: stepLabel,
            config: parsedConfig,
            validation: parsedValidation,
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
            Back to Workflows
          </Button>
        </Link>
        <Button onClick={handleOpenWorkflowDialog}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Workflow
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
              {new Date(workflow.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {new Date(workflow.updatedAt).toLocaleDateString()}
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
            Add Step
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
                Add First Step
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Order</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={steps.map((s: any) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {steps.map((step: any) => (
                        <SortableStepRow
                          key={step.id}
                          step={step}
                          onEdit={handleOpenDialog}
                          onDelete={handleDelete}
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
              Cancel
            </Button>
            <Button
              onClick={handleUpdateWorkflow}
              disabled={updatingWorkflow || !workflowName.trim()}
            >
              {updatingWorkflow ? "Updating..." : "Update Workflow"}
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
              disabled={creating || updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={creating || updating || !stepType || !stepLabel}
            >
              {creating || updating
                ? editingStep
                  ? "Updating..."
                  : "Creating..."
                : editingStep
                ? "Update Step"
                : "Create Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
