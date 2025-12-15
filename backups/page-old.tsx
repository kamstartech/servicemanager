"use client";

import { gql, useMutation } from "@apollo/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
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

const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($input: CreateWorkflowInput!) {
    createWorkflow(input: $input) {
      id
      name
    }
  }
`;

const STEP_TYPES = [
  { value: "FORM", label: "📝 Form", description: "Display a form to collect user input" },
  { value: "API_CALL", label: "🌐 API Call", description: "Make an API request" },
  { value: "VALIDATION", label: "✅ Validation", description: "Validate data before proceeding" },
  { value: "CONFIRMATION", label: "⚠️ Confirmation", description: "Ask user to confirm action" },
  { value: "DISPLAY", label: "📄 Display", description: "Show information to user" },
  { value: "REDIRECT", label: "🔄 Redirect", description: "Navigate to another screen" },
];

type WorkflowStep = {
  id: string;
  type: string;
  label: string;
  config: any;
};

function SortableStep({ step, onEdit, onDelete }: any) {
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

  const stepType = STEP_TYPES.find((t) => t.value === step.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 border rounded-lg bg-card"
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{stepType?.label.split(" ")[0]}</span>
          <p className="font-medium">{step.label}</p>
        </div>
        <p className="text-sm text-muted-foreground">{stepType?.description}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(step)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(step.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

  // Step form state
  const [stepType, setStepType] = useState("");
  const [stepLabel, setStepLabel] = useState("");
  const [stepConfig, setStepConfig] = useState("{}");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [createWorkflowWithSteps, { loading }] = useMutation(CREATE_WORKFLOW_WITH_STEPS, {
    onCompleted: (data) => {
      router.push(`/system/workflows/${data.createWorkflowWithSteps.id}`);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleAddStep = () => {
    if (!stepType || !stepLabel) {
      alert("Please select step type and enter label");
      return;
    }

    let config;
    try {
      config = JSON.parse(stepConfig);
    } catch (e) {
      alert("Invalid JSON in step config");
      return;
    }

    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type: stepType,
      label: stepLabel,
      config,
    };

    if (editingStep) {
      setSteps(steps.map((s) => (s.id === editingStep.id ? newStep : s)));
      setEditingStep(null);
    } else {
      setSteps([...steps, newStep]);
    }

    // Reset form
    setStepType("");
    setStepLabel("");
    setStepConfig("{}");
  };

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setStepType(step.type);
    setStepLabel(step.label);
    setStepConfig(JSON.stringify(step.config, null, 2));
  };

  const handleDeleteStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    setSteps(arrayMove(steps, oldIndex, newIndex));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (steps.length === 0) {
      alert("Please add at least one step");
      return;
    }

    await createWorkflowWithSteps({
      variables: {
        input: {
          name,
          description,
          isActive,
          steps: steps.map((step, index) => ({
            order: index,
            type: step.type,
            label: step.label,
            config: step.config,
            isActive: true,
          })),
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mb-6">
        <Link href="/system/workflows">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workflows
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Money Transfer Workflow"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this workflow does"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active (available for use)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Steps Card */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define the sequence of steps users will go through
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Step Form */}
              <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                <h3 className="font-medium">
                  {editingStep ? "Edit Step" : "Add Step"}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stepType">Step Type *</Label>
                    <Select value={stepType} onValueChange={setStepType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select step type" />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stepLabel">Label *</Label>
                    <Input
                      id="stepLabel"
                      value={stepLabel}
                      onChange={(e) => setStepLabel(e.target.value)}
                      placeholder="e.g., Enter Amount"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stepConfig">
                    Configuration (JSON)
                    <span className="text-xs text-muted-foreground ml-2">
                      Step-specific settings
                    </span>
                  </Label>
                  <Textarea
                    id="stepConfig"
                    value={stepConfig}
                    onChange={(e) => setStepConfig(e.target.value)}
                    placeholder='{"formId": "transfer-form", "apiEndpoint": "/api/transfer"}'
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAddStep}
                    disabled={!stepType || !stepLabel}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingStep ? "Update Step" : "Add Step"}
                  </Button>
                  {editingStep && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingStep(null);
                        setStepType("");
                        setStepLabel("");
                        setStepConfig("{}");
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </div>

              {/* Steps List */}
              {steps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No steps added yet. Add your first step above.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    Steps Order (drag to reorder)
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={steps.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {steps.map((step) => (
                        <SortableStep
                          key={step.id}
                          step={step}
                          onEdit={handleEditStep}
                          onDelete={handleDeleteStep}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link href="/system/workflows">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || steps.length === 0}>
              {loading ? "Creating..." : "Create Workflow"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
