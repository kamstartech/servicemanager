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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, MoreVertical, Edit, Trash2, GripVertical, Workflow as WorkflowIcon } from "lucide-react";
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

const ICONS = [
  { value: "🏠", label: "Home" },
  { value: "💸", label: "Money Transfer" },
  { value: "💳", label: "Card" },
  { value: "📊", label: "Dashboard" },
  { value: "👤", label: "Profile" },
  { value: "⚙️", label: "Settings" },
  { value: "📱", label: "Mobile" },
  { value: "💼", label: "Business" },
  { value: "📈", label: "Analytics" },
  { value: "🔔", label: "Notifications" },
  { value: "🎯", label: "Goals" },
  { value: "💰", label: "Wallet" },
  { value: "📝", label: "Forms" },
  { value: "🔐", label: "Security" },
  { value: "📞", label: "Support" },
  { value: "🏘️", label: "Village" },
  { value: "🏪", label: "Store" },
  { value: "📄", label: "Document" },
  { value: "💡", label: "Idea" },
  { value: "🔍", label: "Search" },
];

function SortablePageRow({ page, onEdit, onDelete, screenId }: any) {
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
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-move">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Badge variant="outline">{page.order}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-2xl">{page.icon}</span>
      </TableCell>
      <TableCell>
        <p className="font-medium">{page.name}</p>
      </TableCell>
      <TableCell>
        <Badge variant={page.isActive ? "default" : "secondary"}>
          {page.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={page.isTesting ? "default" : "outline"}>
          {page.isTesting ? "Testing" : "Live"}
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
            <DropdownMenuItem asChild>
              <Link href={`/system/app-screens/${screenId}/pages/${page.id}`}>
                <WorkflowIcon className="h-4 w-4 mr-2" />
                Manage Workflows
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(page)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(page.id, page.name)}
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

export default function AppScreenDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const screenId = params.id as string;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    icon: "",
    isActive: true,
    isTesting: false,
  });

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
      alert(error.message);
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
      alert(error.message);
    },
  });

  const [deletePage] = useMutation(DELETE_PAGE, {
    onCompleted: () => refetch(),
  });

  const [reorderPages] = useMutation(REORDER_PAGES, {
    onError: (error) => {
      alert("Failed to reorder: " + error.message);
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

  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      await deletePage({ variables: { id } });
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
              <span className="text-4xl">{screen.icon}</span>
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
              {new Date(screen.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {new Date(screen.updatedAt).toLocaleDateString()}
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
          <Button onClick={handleCreateOpen}>
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                No pages added yet
              </div>
              <Button onClick={handleCreateOpen}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Page
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
                      <TableHead>Icon</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Testing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={pages.map((p: any) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {pages.map((page: any) => (
                        <SortablePageRow
                          key={page.id}
                          page={page}
                          screenId={screenId}
                          onEdit={handleEditOpen}
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
                          <span className="text-xl">{icon.value}</span>
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
                          <span className="text-xl">{icon.value}</span>
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
    </div>
  );
}
