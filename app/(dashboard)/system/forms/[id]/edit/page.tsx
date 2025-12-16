"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { gql } from "@apollo/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, GripVertical, Eye } from "lucide-react";
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

const GET_FORM = gql`
  query GetForm($id: ID!) {
    form(id: $id) {
      id
      name
      description
      category
      schema
      isActive
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_FORM = gql`
  mutation UpdateForm($id: ID!, $input: UpdateFormInput!) {
    updateForm(id: $id, input: $input) {
      id
      name
      description
      category
      schema
      isActive
    }
  }
`;

interface FormField {
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
}

// Sortable Field Component
function SortableField({
  field,
  index,
  updateField,
  removeField,
}: {
  field: FormField;
  index: number;
  updateField: (index: number, updates: Partial<FormField>) => void;
  removeField: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div
            className="cursor-grab active:cursor-grabbing pt-2"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Type</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, {
                      type: e.target.value as FormField["type"],
                    })
                  }
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="toggle">Toggle</option>
                  <option value="beneficiary">Beneficiary</option>
                  <option value="account">Account</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Field Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) =>
                    updateField(index, { label: e.target.value })
                  }
                  placeholder="e.g., Full Name"
                />
              </div>
            </div>

            {field.type !== "toggle" && field.type !== "beneficiary" && field.type !== "account" && (
              <div className="space-y-2">
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder || ""}
                  onChange={(e) =>
                    updateField(index, {
                      placeholder: e.target.value,
                    })
                  }
                  placeholder="Enter placeholder text"
                />
              </div>
            )}

            {field.type === "dropdown" && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input
                  value={field.options?.join(", ") || ""}
                  onChange={(e) =>
                    updateField(index, {
                      options: e.target.value
                        .split(",")
                        .map((opt) => opt.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Option 1, Option 2, Option 3"
                />
              </div>
            )}

            {field.type === "beneficiary" && (
              <div className="space-y-2">
                <Label>Beneficiary Type Filter</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={field.beneficiaryType || "ALL"}
                  onChange={(e) =>
                    updateField(index, {
                      beneficiaryType: e.target.value as FormField["beneficiaryType"],
                    })
                  }
                >
                  <option value="ALL">All Beneficiaries</option>
                  <option value="WALLET">Wallet Only</option>
                  <option value="BANK">Bank (Internal + External)</option>
                  <option value="BANK_INTERNAL">Bank Internal Only</option>
                  <option value="BANK_EXTERNAL">Bank External Only</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Filter beneficiaries by type shown to the user
                </p>
              </div>
            )}

            {/* Validation Rules */}
            {(field.type === "text" || field.type === "number") && (
              <div className="space-y-3 p-3 border rounded-md bg-background">
                <Label className="text-sm font-semibold">Validation Rules</Label>
                <div className="grid grid-cols-2 gap-3">
                  {field.type === "text" && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Min Length</Label>
                        <Input
                          type="number"
                          value={field.validation?.minLength || ""}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                minLength: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Length</Label>
                        <Input
                          type="number"
                          value={field.validation?.maxLength || ""}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                maxLength: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          placeholder="100"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Pattern (regex)</Label>
                        <Input
                          value={field.validation?.pattern || ""}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                pattern: e.target.value || undefined,
                              },
                            })
                          }
                          placeholder="e.g., ^[A-Z0-9]+$"
                        />
                      </div>
                    </>
                  )}
                  {field.type === "number" && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Min Value</Label>
                        <Input
                          type="number"
                          value={field.validation?.min || ""}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                min: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Value</Label>
                        <Input
                          type="number"
                          value={field.validation?.max || ""}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                max: e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          placeholder="1000"
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Error Message</Label>
                    <Input
                      value={field.validation?.errorMessage || ""}
                      onChange={(e) =>
                        updateField(index, {
                          validation: {
                            ...field.validation,
                            errorMessage: e.target.value || undefined,
                          },
                        })
                      }
                      placeholder="Custom error message"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField(index, { required: checked })
                }
              />
              <Label className="cursor-pointer">Required field</Label>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeField(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EditFormPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const { data, loading, error } = useQuery(GET_FORM, {
    variables: { id: formId },
  });

  const [updateForm, { loading: updating }] = useMutation(UPDATE_FORM);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize form data when loaded
  useEffect(() => {
    if (data?.form) {
      setName(data.form.name);
      setDescription(data.form.description || "");
      setCategory(data.form.category || "");
      setIsActive(data.form.isActive);
      
      // Parse schema if it exists
      if (data.form.schema && data.form.schema.fields) {
        setFields(data.form.schema.fields);
      }
    }
  }, [data]);

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "",
      required: false,
      placeholder: "",
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const schema = {
        fields: fields,
      };

      await updateForm({
        variables: {
          id: formId,
          input: {
            name,
            description,
            category,
            schema,
            isActive,
          },
        },
      });

      router.push("/system/forms");
    } catch (err) {
      console.error("Error updating form:", err);
      toast.error("Failed to update form");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.form) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Form not found or failed to load.</p>
            <Button asChild className="mt-4">
              <Link href="/system/forms">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Forms
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/system/forms">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forms
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Details */}
        <Card>
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Customer KYC Form"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this form"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., KYC, SURVEY, REGISTRATION"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Form is active
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Form Builder with Tabs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Form Builder</CardTitle>
            <Button type="button" onClick={addField} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="edit">Edit Fields</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              {/* Edit Tab */}
              <TabsContent value="edit" className="space-y-4">
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No fields yet. Click "Add Field" to get started.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <SortableField
                            key={field.id}
                            field={field}
                            index={index}
                            updateField={updateField}
                            removeField={removeField}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview">
                <div className="max-w-2xl mx-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle>{name || "Form Preview"}</CardTitle>
                      {description && (
                        <p className="text-sm text-muted-foreground">
                          {description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Add fields to see preview</p>
                        </div>
                      ) : (
                        fields.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <Label>
                              {field.label}
                              {field.required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </Label>
                            {field.type === "text" && (
                              <Input
                                placeholder={field.placeholder}
                                disabled
                              />
                            )}
                            {field.type === "number" && (
                              <Input
                                type="number"
                                placeholder={field.placeholder}
                                disabled
                              />
                            )}
                            {field.type === "date" && (
                              <Input type="date" disabled />
                            )}
                            {field.type === "dropdown" && (
                              <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                disabled
                              >
                                <option value="">Select an option</option>
                                {field.options?.map((opt, idx) => (
                                  <option key={idx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}
                            {field.type === "toggle" && (
                              <div className="flex items-center space-x-2">
                                <Switch disabled />
                                <span className="text-sm text-muted-foreground">
                                  Toggle value
                                </span>
                              </div>
                            )}
                            {field.type === "beneficiary" && (
                              <div>
                                <select
                                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                                  disabled
                                >
                                  <option value="">Select a beneficiary</option>
                                  <option value="sample1">John Doe - **** 1234</option>
                                  <option value="sample2">Jane Smith - +265 999 123 456</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Filter: {field.beneficiaryType || "All Beneficiaries"}
                                </p>
                              </div>
                            )}

                            {field.type === "account" && (
                              <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                disabled
                              >
                                <option value="">Select an account</option>
                                <option value="sample1">Savings - 1234567890</option>
                                <option value="sample2">Current - 0987654321</option>
                              </select>
                            )}
                            {field.validation && (
                              <p className="text-xs text-muted-foreground">
                                {field.type === "text" &&
                                  field.validation.minLength &&
                                  `Min length: ${field.validation.minLength} `}
                                {field.type === "text" &&
                                  field.validation.maxLength &&
                                  `Max length: ${field.validation.maxLength} `}
                                {field.type === "number" &&
                                  field.validation.min &&
                                  `Min: ${field.validation.min} `}
                                {field.type === "number" &&
                                  field.validation.max &&
                                  `Max: ${field.validation.max} `}
                                {field.validation.pattern &&
                                  `Pattern: ${field.validation.pattern}`}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/system/forms">Cancel</Link>
          </Button>
          <Button type="submit" disabled={updating || !name}>
            {updating ? "Saving..." : "Save Form"}
          </Button>
        </div>
      </form>
    </div>
  );
}
