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
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { useI18n } from "@/components/providers/i18n-provider";
import { translateStatusOneWord } from "@/lib/utils";
import { ACTION_BUTTON_STYLES } from "@/lib/constants/button-styles";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const { translate } = useI18n();
  const router = useRouter();
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; name: string } | null
  >(null);

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
      toast.error(error.message);
    },
  });

  const [updateWorkflow, { loading: updating }] = useMutation(UPDATE_WORKFLOW, {
    onCompleted: () => {
      refetch();
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const workflows = data?.workflows?.workflows || [];
  const total = data?.workflows?.total || 0;

  const rows = workflows as any[];

  const columns: DataTableColumn<any>[] = [
    {
      id: "name",
      header: COMMON_TABLE_HEADERS.name,
      accessor: (row) => <p className="font-medium">{row.name}</p>,
      sortKey: "name",
    },
    {
      id: "description",
      header: COMMON_TABLE_HEADERS.description,
      accessor: (row) => (
        <p className="text-sm text-muted-foreground truncate max-w-xs">
          {row.description || "—"}
        </p>
      ),
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            {translateStatusOneWord("ACTIVE", translate, "ACTIVE")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} />
            {translateStatusOneWord("INACTIVE", translate, "INACTIVE")}
          </span>
        ),
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "version",
      header: COMMON_TABLE_HEADERS.version,
      accessor: (row) => <Badge variant="outline">v{row.version}</Badge>,
      sortKey: "version",
    },
    {
      id: "attachedTo",
      header: COMMON_TABLE_HEADERS.attachedTo,
      accessor: (row) =>
        row.screenPages?.length > 0 ? (
          <div className="flex flex-col gap-1">
            {row.screenPages.slice(0, 2).map((sp: any) => (
              <Badge key={sp.id} variant="outline" className="text-xs">
                {sp.page.screen.name} / {sp.page.name}
              </Badge>
            ))}
            {row.screenPages.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{row.screenPages.length - 2} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Not attached</span>
        ),
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={ACTION_BUTTON_STYLES.view}
              >
                <MoreVertical className="h-4 w-4 mr-2" />
                {translate("common.actions.actions")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/system/workflows/${row.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  {translate("common.actions.viewDetails")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog(row)}>
                <Edit className="h-4 w-4 mr-2" />
                {translate("common.actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast("Clone functionality coming soon")}>
                <Copy className="h-4 w-4 mr-2" />
                {translate("common.actions.clone")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(row.id, row.name)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {translate("common.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      alignCenter: true,
    },
  ];

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
      toast.error("Please enter a workflow name");
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

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteWorkflow({ variables: { id: deleteTarget.id } });
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
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
            {`${translate("common.actions.new")} ${translate("common.entities.workflow")}`}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-6">
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
          {!loading && !error && rows.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔄</div>
              <div className="text-muted-foreground mb-4">
                No workflows created yet
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {`${translate("common.actions.createFirst")} ${translate("common.entities.workflow")}`}
              </Button>
            </div>
          )}

          {/* Workflows Table */}
          {!loading && !error && rows.length > 0 && (
            <DataTable<any>
              data={rows}
              columns={columns}
              searchableKeys={["name", "description"]}
              initialSortKey="name"
              pageSize={10}
              searchPlaceholder="Search workflows..."
              showRowNumbers
              rowNumberHeader={COMMON_TABLE_HEADERS.index}
            />
          )}

          {/* Results Summary */}
          {!loading && !error && rows.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {rows.length} of {total} workflows
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
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
              {translate("common.actions.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={creating || updating || !name.trim()}
            >
              {creating || updating
                ? editingWorkflow
                  ? translate("common.state.updating")
                  : translate("common.state.creating")
                : editingWorkflow
                ? `${translate("common.actions.update")} ${translate("common.entities.workflow")}`
                : `${translate("common.actions.create")} ${translate("common.entities.workflow")}`}
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
                ? `Are you sure you want to delete "${deleteTarget.name}"? This will detach it from all pages.`
                : "Are you sure you want to delete this workflow? This will detach it from all pages."}
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
    </div>
  );
}
