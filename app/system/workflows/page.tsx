"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Search, Plus, MoreVertical, Edit, Trash2, Eye, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const WORKFLOWS_QUERY = gql`
  query Workflows($page: Int, $limit: Int, $isActive: Boolean) {
    workflows(page: $page, limit: $limit, isActive: $isActive) {
      workflows {
        id
        name
        description
        isActive
        version
        createdAt
        updatedAt
        screenPages {
          id
          page {
            id
            name
            screen {
              name
              context
            }
          }
        }
      }
      total
    }
  }
`;

const DELETE_WORKFLOW = gql`
  mutation DeleteWorkflow($id: ID!) {
    deleteWorkflow(id: $id)
  }
`;

const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($input: CreateWorkflowInput!) {
    createWorkflow(input: $input) {
      id
      name
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

export default function WorkflowsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data, loading, error, refetch } = useQuery(WORKFLOWS_QUERY, {
    variables: {
      page: 1,
      limit: 100,
      isActive: filterActive,
    },
  });

  const [deleteWorkflow] = useMutation(DELETE_WORKFLOW, {
    onCompleted: () => refetch(),
  });

  const [createWorkflow, { loading: creating }] = useMutation(CREATE_WORKFLOW, {
    onCompleted: (data) => {
      refetch();
      handleCloseDialog();
      router.push(`/system/workflows/${data.createWorkflow.id}`);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const [updateWorkflow, { loading: updating }] = useMutation(UPDATE_WORKFLOW, {
    onCompleted: () => {
      refetch();
      handleCloseDialog();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const workflows = data?.workflows?.workflows || [];
  const total = data?.workflows?.total || 0;

  const filteredWorkflows = workflows.filter((workflow: any) =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (workflow?: any) => {
    if (workflow) {
      setEditingWorkflow(workflow);
      setName(workflow.name);
      setDescription(workflow.description || "");
      setIsActive(workflow.isActive);
    } else {
      setEditingWorkflow(null);
      setName("");
      setDescription("");
      setIsActive(true);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWorkflow(null);
    setName("");
    setDescription("");
    setIsActive(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Please enter a workflow name");
      return;
    }

    if (editingWorkflow) {
      await updateWorkflow({
        variables: {
          id: editingWorkflow.id,
          input: {
            name,
            description,
            isActive,
          },
        },
      });
    } else {
      await createWorkflow({
        variables: {
          input: {
            name,
            description,
            isActive,
          },
        },
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This will detach it from all pages.`
      )
    ) {
      await deleteWorkflow({ variables: { id } });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Workflows</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage reusable workflows for screen pages
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(undefined)}
              >
                All
              </Button>
              <Button
                variant={filterActive === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(true)}
              >
                Active
              </Button>
              <Button
                variant={filterActive === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(false)}
              >
                Inactive
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading workflows...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading workflows: {error.message}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredWorkflows.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔄</div>
              <div className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No workflows found matching your search"
                  : "No workflows created yet"}
              </div>
              {!searchTerm && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Workflow
                </Button>
              )}
            </div>
          )}

          {/* Workflows Table */}
          {!loading && !error && filteredWorkflows.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Attached To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkflows.map((workflow: any) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <p className="font-medium">{workflow.name}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {workflow.description || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={workflow.isActive ? "default" : "secondary"}
                        >
                          {workflow.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{workflow.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {workflow.screenPages.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {workflow.screenPages.slice(0, 2).map((sp: any) => (
                              <Badge key={sp.id} variant="outline" className="text-xs">
                                {sp.page.screen.name} / {sp.page.name}
                              </Badge>
                            ))}
                            {workflow.screenPages.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{workflow.screenPages.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not attached
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/system/workflows/${workflow.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDialog(workflow)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                alert("Clone functionality coming soon")
                              }
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Clone
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleDelete(workflow.id, workflow.name)
                              }
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results Summary */}
          {!loading && !error && filteredWorkflows.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredWorkflows.length} of {total} workflows
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Workflow Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? "Edit Workflow" : "Create New Workflow"}
            </DialogTitle>
            <DialogDescription>
              {editingWorkflow
                ? "Update workflow details below"
                : "Create a new workflow, then add steps to define the flow"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Workflow Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Money Transfer Workflow"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this workflow does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            {!editingWorkflow && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 After creating the workflow, you'll be redirected to add steps.
                </p>
              </div>
            )}
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
              disabled={creating || updating || !name.trim()}
            >
              {creating || updating
                ? editingWorkflow
                  ? "Updating..."
                  : "Creating..."
                : editingWorkflow
                ? "Update Workflow"
                : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
