"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Edit, Calendar, User } from "lucide-react";
import Link from "next/link";

const GET_FORM = gql`
  query GetForm($id: ID!) {
    form(id: $id) {
      id
      name
      description
      category
      schema
      isActive
      version
      createdAt
      updatedAt
    }
  }
`;

interface FormField {
  id: string;
  type: "text" | "number" | "date" | "dropdown" | "toggle" | "beneficiary";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  beneficiaryType?: "WALLET" | "BANK_INTERNAL" | "BANK_EXTERNAL" | "ALL";
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    errorMessage?: string;
  };
}

export default function ViewFormPage() {
  const params = useParams();
  const formId = params.id as string;

  const { data, loading, error } = useQuery(GET_FORM, {
    variables: { id: formId },
  });

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

  const form = data.form;
  const fields: FormField[] = form.schema?.fields || [];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/system/forms">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Forms
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/system/forms/${formId}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Form
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Form Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl">{form.name}</CardTitle>
                {form.description && (
                  <p className="text-muted-foreground mt-2">
                    {form.description}
                  </p>
                )}
              </div>
              <Badge variant={form.isActive ? "default" : "secondary"}>
                {form.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {form.category && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{form.category}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">v{form.version}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Created
                </p>
                <p className="font-medium">
                  {new Date(form.createdAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Last Updated
                </p>
                <p className="font-medium">
                  {new Date(form.updatedAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Schema */}
        <Card>
          <CardHeader>
            <CardTitle>Form Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Total Fields</p>
                  <p className="text-sm text-muted-foreground">
                    {fields.length} field{fields.length !== 1 ? "s" : ""}{" "}
                    configured
                  </p>
                </div>
                <Badge variant="secondary">{fields.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Schema Type</p>
                  <p className="text-sm text-muted-foreground">
                    JSON Schema format
                  </p>
                </div>
                <Badge variant="outline">JSON</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Fields Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Form Fields ({fields.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No fields configured yet.</p>
                <Button asChild className="mt-4">
                  <Link href={`/system/forms/${formId}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Add Fields
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <Card key={field.id} className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-lg">
                                {field.label}
                                {field.required && (
                                  <span className="text-destructive ml-1">
                                    *
                                  </span>
                                )}
                              </h4>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{field.type}</Badge>
                                {field.required && (
                                  <Badge variant="destructive">Required</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Field Preview */}
                          <div className="space-y-2">
                            {field.type === "text" && (
                              <Input
                                placeholder={field.placeholder || "Text input"}
                                disabled
                              />
                            )}
                            {field.type === "number" && (
                              <Input
                                type="number"
                                placeholder={
                                  field.placeholder || "Number input"
                                }
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
                          </div>

                          {/* Validation Rules */}
                          {field.validation &&
                            Object.keys(field.validation).length > 0 && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                  Validation Rules:
                                </p>
                                <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                                  {field.validation.minLength && (
                                    <p>
                                      • Min length: {field.validation.minLength}
                                    </p>
                                  )}
                                  {field.validation.maxLength && (
                                    <p>
                                      • Max length: {field.validation.maxLength}
                                    </p>
                                  )}
                                  {field.validation.min !== undefined && (
                                    <p>• Min value: {field.validation.min}</p>
                                  )}
                                  {field.validation.max !== undefined && (
                                    <p>• Max value: {field.validation.max}</p>
                                  )}
                                  {field.validation.pattern && (
                                    <p>
                                      • Pattern: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{field.validation.pattern}</code>
                                    </p>
                                  )}
                                  {field.validation.errorMessage && (
                                    <p>
                                      • Error message:{" "}
                                      {field.validation.errorMessage}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
