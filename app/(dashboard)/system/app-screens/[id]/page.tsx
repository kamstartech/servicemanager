"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Calendar, Plus, Edit, Trash2, GripVertical, Workflow as WorkflowIcon,
  Home, Send, CreditCard, LayoutDashboard, User, Settings,
  Smartphone, Briefcase, TrendingUp, Bell, Target, Wallet,
  FileText, Lock, Phone, MapPin, Store, File, Lightbulb, Search
} from "lucide-react";
import Link from "next/link";
import { ACTION_BUTTON_STYLES } from "@/lib/constants/button-styles";
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
import { toast } from "sonner";

const APP_SCREEN_QUERY = gql`
  query AppScreen($id: ID!) {
    appScreen(id: $id) {
      id
      name
      context
      icon
      order
      isActive
      isTesting
      createdAt
      updatedAt
      pages {
        id
        name
        icon
        order
        isActive
        isTesting
        createdAt
      }
    }
  }
`;

const CREATE_PAGE = gql`
  mutation CreateAppScreenPage($input: CreateAppScreenPageInput!) {
    createAppScreenPage(input: $input) {
      id
      name
      icon
      order
      isActive
      isTesting
    }
  }
`;

const UPDATE_PAGE = gql`
  mutation UpdateAppScreenPage($id: ID!, $input: UpdateAppScreenPageInput!) {
    updateAppScreenPage(id: $id, input: $input) {
      id
      name
      icon
      order
      isActive
      isTesting
    }
  }
`;

const DELETE_PAGE = gql`
  mutation DeleteAppScreenPage($id: ID!) {
    deleteAppScreenPage(id: $id)
  }
`;

const REORDER_PAGES = gql`
  mutation ReorderAppScreenPages($screenId: ID!, $pageIds: [ID!]!) {
    reorderAppScreenPages(screenId: $screenId, pageIds: $pageIds) {
      id
      name
      order
    }
  }
`;

// Icon mapping
const iconMap: Record<string, any> = {
  Home, Send, CreditCard, LayoutDashboard, User, Settings,
  Smartphone, Briefcase, TrendingUp, Bell, Target, Wallet,
  FileText, Lock, Phone, MapPin, Store, File, Lightbulb, Search
};

// Icon renderer component
const IconRenderer = ({ iconName, className = "h-5 w-5" }: { iconName: string, className?: string }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return <span className={className}>{iconName}</span>;
  return <IconComponent className={className} />;
};

const ICONS = [
  { value: "Home", label: "Home" },
  { value: "Send", label: "Money Transfer" },
  { value: "CreditCard", label: "Card" },
  { value: "LayoutDashboard", label: "Dashboard" },
  { value: "User", label: "Profile" },
  { value: "Settings", label: "Settings" },
  { value: "Smartphone", label: "Mobile" },
  { value: "Briefcase", label: "Business" },
  { value: "TrendingUp", label: "Analytics" },
  { value: "Bell", label: "Notifications" },
  { value: "Target", label: "Goals" },
  { value: "Wallet", label: "Wallet" },
  { value: "FileText", label: "Forms" },
  { value: "Lock", label: "Security" },
  { value: "Phone", label: "Support" },
  { value: "MapPin", label: "Village" },
  { value: "Store", label: "Store" },
  { value: "File", label: "Document" },
  { value: "Lightbulb", label: "Idea" },
  { value: "Search", label: "Search" },
];

function SortablePageRow({
  page,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleTesting,
  screenId,
  rowIndex,
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

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
          <Badge variant="outline">{page.order}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <IconRenderer iconName={page.icon} className="h-6 w-6" />
      </TableCell>
      <TableCell>
        <p className="font-medium">{page.name}</p>
      </TableCell>
      <TableCell>
        <div className="flex justify-center">
          <Switch
            checked={page.isActive}
            onCheckedChange={() => onToggleActive(page.id, page.isActive)}
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex justify-center">
          <Switch
            checked={page.isTesting}
            onCheckedChange={() => onToggleTesting(page.id, page.isTesting)}
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className={ACTION_BUTTON_STYLES.view}
            >
              <Link href={`/system/app-screens/${screenId}/pages/${page.id}`}>
                <WorkflowIcon className="h-4 w-4 mr-2" />
                Workflows
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={ACTION_BUTTON_STYLES.warning}
              onClick={() => onEdit(page)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={ACTION_BUTTON_STYLES.delete}
              onClick={() => onDelete(page.id, page.name)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AppScreenDetailsPage() {
  const { translate } = useI18n();
  const params = useParams();
  const router = useRouter();
  const screenId = params.id as string;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; name: string } | null
  >(null);

  const [formData, setFormData] = useState({
    name: "",
    icon: "",
    isActive: true,
    isTesting: false,
  });

  const handleTogglePageActive = async (id: string, currentValue: boolean) => {
    await updatePage({
      variables: {
        id,
        input: { isActive: !currentValue },
      },
    });
    refetch();
  };

  const handleTogglePageTesting = async (id: string, currentValue: boolean) => {
    await updatePage({
      variables: {
        id,
        input: { isTesting: !currentValue },
      },
    });
    refetch();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data, loading, error, refetch } = useQuery(APP_SCREEN_QUERY, {
    variables: { id: screenId },
  });

  const [createPage, { loading: creating }] = useMutation(CREATE_PAGE, {
    onCompleted: () => {
      refetch();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [updatePage, { loading: updating }] = useMutation(UPDATE_PAGE, {
    onCompleted: () => {
      refetch();
      setEditDialogOpen(false);
      setEditingPage(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [deletePage] = useMutation(DELETE_PAGE, {
    onCompleted: () => refetch(),
  });

  const [reorderPages] = useMutation(REORDER_PAGES, {
    onError: (error) => {
      toast.error("Failed to reorder: " + error.message);
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "",
      isActive: true,
      isTesting: false,
    });
  };

  const handleCreateOpen = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleEditOpen = (page: any) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      icon: page.icon,
      isActive: page.isActive,
      isTesting: page.isTesting,
    });
    setEditDialogOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPage({
      variables: {
        input: {
          ...formData,
          screenId,
        },
      },
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePage({
      variables: {
        id: editingPage.id,
        input: formData,
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePage({ variables: { id: deleteTarget.id } });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete page");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = pages.findIndex((p: any) => p.id === active.id);
    const newIndex = pages.findIndex((p: any) => p.id === over.id);

    const reorderedPages = arrayMove(pages, oldIndex, newIndex);

    await reorderPages({
      variables: {
        screenId,
        pageIds: reorderedPages.map((p: any) => p.id),
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

  if (error || !data?.appScreen) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="text-center py-8 text-destructive">
          Screen not found or error loading data
        </div>
      </div>
    );
  }

  const screen = data.appScreen;
  const pages = screen.pages || [];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mb-6">
        <Link href="/system/app-screens">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Screens
          </Button>
        </Link>
      </div>

      {/* Screen Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <IconRenderer iconName={screen.icon} className="h-10 w-10" />
              <div>
                <CardTitle className="text-2xl">{screen.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{screen.context}</Badge>
                  <Badge variant={screen.isActive ? "default" : "secondary"}>
                    {screen.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant={screen.isTesting ? "default" : "outline"}>
                    {screen.isTesting ? "Testing" : "Live"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Order:</span> {screen.order}
            </div>
            <div>
              <span className="text-muted-foreground">Pages:</span> {pages.length}
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                {new Date(screen.createdAt).toLocaleString(undefined, {
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
                {new Date(screen.updatedAt).toLocaleString(undefined, {
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

      {/* Pages Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Screen Pages</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage pages within this screen
            </p>
          </div>
          <Button
            onClick={handleCreateOpen}
            size="sm"
            className="bg-[#f59e0b] text-white hover:bg-[#d97706] w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {`${translate("common.actions.add")} ${translate("common.entities.page")}`}
          </Button>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                No pages added yet
              </div>
              <Button
                onClick={handleCreateOpen}
                size="sm"
                className="bg-[#f59e0b] text-white hover:bg-[#d97706] w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {`${translate("common.actions.addFirst")} ${translate("common.entities.page")}`}
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
                      <TableHead className="w-16 text-center">{translate("common.table.columns.order")}</TableHead>
                      <TableHead className="text-center">{translate("common.table.columns.icon")}</TableHead>
                      <TableHead className="text-center">{translate("common.table.columns.name")}</TableHead>
                      <TableHead className="text-center">{translate("common.table.columns.active")}</TableHead>
                      <TableHead className="text-center">{translate("common.table.columns.testing")}</TableHead>
                      <TableHead className="text-center">{translate("common.table.columns.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    <SortableContext
                      items={pages.map((p: any) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {pages.map((page: any, index: number) => (
                        <SortablePageRow
                          key={page.id}
                          page={page}
                          rowIndex={index}
                          onEdit={handleEditOpen}
                          onDelete={handleDelete}
                          onToggleActive={handleTogglePageActive}
                          onToggleTesting={handleTogglePageTesting}
                          screenId={screenId}
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

      {/* Create Page Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Page</DialogTitle>
              <DialogDescription>
                Add a new page to {screen.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Page Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Overview, Details, History"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon *</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <span className="flex items-center gap-2">
                          <IconRenderer iconName={icon.value} className="h-4 w-4" />
                          {icon.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active (visible to users)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isTesting"
                  checked={formData.isTesting}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isTesting: checked })
                  }
                />
                <Label htmlFor="isTesting" className="cursor-pointer">
                  Testing Mode
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !formData.name || !formData.icon}
              >
                {creating ? "Adding..." : "Add Page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Page Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Page</DialogTitle>
              <DialogDescription>
                Update page details for {editingPage?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Page Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Overview, Details, History"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-icon">Icon *</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) =>
                    setFormData({ ...formData, icon: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <span className="flex items-center gap-2">
                          <IconRenderer iconName={icon.value} className="h-4 w-4" />
                          {icon.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="edit-isActive" className="cursor-pointer">
                  Active (visible to users)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isTesting"
                  checked={formData.isTesting}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isTesting: checked })
                  }
                />
                <Label htmlFor="edit-isTesting" className="cursor-pointer">
                  Testing Mode
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updating || !formData.name || !formData.icon}
              >
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("common.actions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
                : "Are you sure you want to delete this page? This action cannot be undone."}
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
