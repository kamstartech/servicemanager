"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ExternalLink, GripVertical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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

const PAGE_WORKFLOWS_QUERY = gql`
  query PageWorkflows($pageId: ID!) {
    pageWorkflows(pageId: $pageId) {
      id
      order
      isActive
      configOverride
      workflow {
        id
        name
        description
        version
        isActive
      }
    }
  }
`;

const ALL_WORKFLOWS_QUERY = gql`
  query AllWorkflows {
    workflows(limit: 100, isActive: true) {
      workflows {
        id
        name
        description
      }
    }
  }
`;

const ATTACH_WORKFLOW = gql`
  mutation AttachWorkflow($input: AttachWorkflowToPageInput!) {
    attachWorkflowToPage(input: $input) {
      id
    }
  }
`;

const DETACH_WORKFLOW = gql`
  mutation DetachWorkflow($id: ID!) {
    detachWorkflowFromPage(id: $id)
  }
`;

const REORDER_WORKFLOWS = gql`
  mutation ReorderPageWorkflows($pageId: ID!, $workflowIds: [ID!]!) {
    reorderPageWorkflows(pageId: $pageId, workflowIds: $workflowIds) {
      id
      order
    }
  }
`;

function SortableWorkflowRow({ pageWorkflow, onDetach, rowIndex }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pageWorkflow.id });

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
          <Badge variant="outline">{pageWorkflow.order}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <p className="font-medium">{pageWorkflow.workflow.name}</p>
          <Link href={`/system/workflows/${pageWorkflow.workflow.id}`} target="_blank">
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
        </div>
        {pageWorkflow.workflow.description && (
          <p className="text-sm text-muted-foreground">
            {pageWorkflow.workflow.description}
          </p>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={pageWorkflow.isActive ? "default" : "secondary"}>
          {pageWorkflow.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">v{pageWorkflow.workflow.version}</Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
            onClick={() => onDetach(pageWorkflow.id, pageWorkflow.workflow.name)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Detach
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PageWorkflowsManager({ pageId }: { pageId: string }) {
  const { translate } = useI18n();
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");

  const [detachDialogOpen, setDetachDialogOpen] = useState(false);
  const [detachTarget, setDetachTarget] = useState<
    { id: string; name: string } | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data, loading, error, refetch } = useQuery(PAGE_WORKFLOWS_QUERY, {
    variables: { pageId },
  });

  const { data: allWorkflowsData } = useQuery(ALL_WORKFLOWS_QUERY);

  const [attachWorkflow, { loading: attaching }] = useMutation(ATTACH_WORKFLOW, {
    onCompleted: () => {
      refetch();
      setAttachDialogOpen(false);
      setSelectedWorkflowId("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [detachWorkflow] = useMutation(DETACH_WORKFLOW, {
    onCompleted: () => refetch(),
  });

  const [reorderWorkflows] = useMutation(REORDER_WORKFLOWS, {
    onError: (error) => {
      toast.error("Failed to reorder: " + error.message);
      refetch();
    },
  });

  const pageWorkflows = data?.pageWorkflows || [];
  const allWorkflows = allWorkflowsData?.workflows?.workflows || [];

  // Filter out workflows that are already attached
  const attachedWorkflowIds = pageWorkflows.map((pw: any) => pw.workflow.id);
  const availableWorkflows = allWorkflows.filter(
    (w: any) => !attachedWorkflowIds.includes(w.id)
  );

  const handleAttach = async () => {
    if (!selectedWorkflowId) {
      toast.error("Please select a workflow");
      return;
    }

    await attachWorkflow({
      variables: {
        input: {
          pageId,
          workflowId: selectedWorkflowId,
          order: pageWorkflows.length,
        },
      },
    });
  };

  const handleDetach = (id: string, name: string) => {
    setDetachTarget({ id, name });
    setDetachDialogOpen(true);
  };

  const confirmDetach = async () => {
    if (!detachTarget) return;
    await detachWorkflow({ variables: { id: detachTarget.id } });
    setDetachDialogOpen(false);
    setDetachTarget(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = pageWorkflows.findIndex((pw: any) => pw.id === active.id);
    const newIndex = pageWorkflows.findIndex((pw: any) => pw.id === over.id);

    const reordered = arrayMove(pageWorkflows, oldIndex, newIndex);

    await reorderWorkflows({
      variables: {
        pageId,
        workflowIds: reordered.map((pw: any) => pw.id),
      },
    });

    refetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Attached Workflows</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Workflows define what happens when users interact with this page
          </p>
        </div>
        <Button onClick={() => setAttachDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Attach Workflow
        </Button>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading workflows...
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
            Error loading workflows: {error.message}
          </div>
        )}

        {!loading && !error && pageWorkflows.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔄</div>
            <div className="text-muted-foreground mb-4">
              No workflows attached yet
            </div>
            <Button onClick={() => setAttachDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Attach First Workflow
            </Button>
          </div>
        )}

        {!loading && !error && pageWorkflows.length > 0 && (
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
                    <TableHead>{translate("common.table.columns.workflow")}</TableHead>
                    <TableHead>{translate("common.table.columns.status")}</TableHead>
                    <TableHead>{translate("common.table.columns.version")}</TableHead>
                    <TableHead className="text-center">{translate("common.table.columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white divide-y divide-gray-200">
                  <SortableContext
                    items={pageWorkflows.map((pw: any) => pw.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {pageWorkflows.map((pageWorkflow: any, index: number) => (
                      <SortableWorkflowRow
                        key={pageWorkflow.id}
                        pageWorkflow={pageWorkflow}
                        rowIndex={index}
                        onDetach={handleDetach}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        )}
      </CardContent>

      {/* Attach Workflow Dialog */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Workflow</DialogTitle>
            <DialogDescription>
              Select a workflow to attach to this page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {availableWorkflows.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  No workflows available. All active workflows are already attached.
                </p>
                <Link href="/system/workflows/new" target="_blank">
                  <Button variant="outline">
                    Create New Workflow
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="workflow">Select Workflow</Label>
                <Select
                  value={selectedWorkflowId}
                  onValueChange={setSelectedWorkflowId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkflows.map((workflow: any) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        <div>
                          <p className="font-medium">{workflow.name}</p>
                          {workflow.description && (
                            <p className="text-xs text-muted-foreground">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAttachDialogOpen(false)}
              disabled={attaching}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAttach}
              disabled={attaching || !selectedWorkflowId}
            >
              {attaching ? "Attaching..." : "Attach Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={detachDialogOpen} onOpenChange={setDetachDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach workflow</AlertDialogTitle>
            <AlertDialogDescription>
              {detachTarget
                ? `Are you sure you want to detach "${detachTarget.name}" from this page?`
                : "Are you sure you want to detach this workflow from this page?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDetachTarget(null)}>
              {translate("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDetach}
            >
              Detach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
