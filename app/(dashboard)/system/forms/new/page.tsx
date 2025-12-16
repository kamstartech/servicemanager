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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

const CREATE_FORM = gql`
  mutation CreateForm($input: CreateFormInput!) {
    createForm(input: $input) {
      id
      name
    }
  }
`;

export default function NewFormPage() {
  const { translate } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [createForm, { loading }] = useMutation(CREATE_FORM, {
    onCompleted: (data) => {
      router.push(`/system/forms/${data.createForm.id}/edit`);
    },
    onError: (error) => {
      toast.error(`Error creating form: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Form name is required");
      return;
    }

    await createForm({
      variables: {
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          isActive,
          schema: { fields: [] }, // Start with empty fields
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/system/forms">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {`${translate("common.actions.backTo")} ${translate("common.entities.forms")}`}
                </Button>
              </Link>
            </div>
            <CardTitle className="text-2xl">Create New Form</CardTitle>
            <p className="text-sm text-muted-foreground">
              Set up basic form information. You'll add fields in the next step.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Form Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., KYC Application Form"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this form's purpose"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., KYC, SURVEY, REGISTRATION"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used for organizing and filtering forms
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Active forms are visible to users
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading
                    ? translate("common.state.creating")
                    : translate("forms.new.actions.createFormAndAddFields")}
                </Button>
                <Link href="/system/forms">
                  <Button type="button" variant="outline">
                    {translate("common.actions.cancel")}
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
