"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Search, Plus, Edit, Trash2, Eye, GripVertical,
  Home, Send, CreditCard, LayoutDashboard, User, Settings,
  Smartphone, Briefcase, TrendingUp, Bell, Target, Wallet,
  FileText, Lock, Phone, MapPin, Store, File, Lightbulb
} from "lucide-react";
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

const APP_SCREENS_QUERY = gql`
  query AppScreens($context: MobileUserContext, $page: Int, $limit: Int) {
    appScreens(context: $context, page: $page, limit: $limit) {
      screens {
        id
        name
        context
        icon
        order
        isActive
        isTesting
        createdAt
        updatedAt
      }
      total
    }
  }
`;

const TOGGLE_ACTIVE = gql`
  mutation UpdateAppScreen($id: ID!, $input: UpdateAppScreenInput!) {
    updateAppScreen(id: $id, input: $input) {
      id
      isActive
    }
  }
`;

const TOGGLE_TESTING = gql`
  mutation UpdateAppScreen($id: ID!, $input: UpdateAppScreenInput!) {
    updateAppScreen(id: $id, input: $input) {
      id
      isTesting
    }
  }
`;

const DELETE_SCREEN = gql`
  mutation DeleteAppScreen($id: ID!) {
    deleteAppScreen(id: $id)
  }
`;

const CREATE_SCREEN = gql`
  mutation CreateAppScreen($input: CreateAppScreenInput!) {
    createAppScreen(input: $input) {
      id
      name
      context
      icon
      order
      isActive
      isTesting
    }
  }
`;

const UPDATE_SCREEN = gql`
  mutation UpdateAppScreen($id: ID!, $input: UpdateAppScreenInput!) {
    updateAppScreen(id: $id, input: $input) {
      id
      name
      icon
      order
      isActive
      isTesting
    }
  }
`;

const REORDER_SCREENS = gql`
  mutation ReorderAppScreens($context: MobileUserContext!, $screenIds: [ID!]!) {
    reorderAppScreens(context: $context, screenIds: $screenIds) {
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

const CONTEXTS = [
  { value: "MOBILE_BANKING", label: "Mobile Banking", icon: "Smartphone" },
  { value: "WALLET", label: "Wallet", icon: "Wallet" },
  { value: "VILLAGE_BANKING", label: "Village Banking", icon: "MapPin" },
  { value: "AGENT", label: "Agent", icon: "User" },
  { value: "MERCHANT", label: "Merchant", icon: "Store" },
];

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

function SortableScreenRow({ screen, onEdit, onDelete, rowIndex }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: screen.id });

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
          <Badge variant="outline">{screen.order}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <IconRenderer iconName={screen.icon} className="h-6 w-6" />
      </TableCell>
      <TableCell>
        <p className="font-medium">{screen.name}</p>
      </TableCell>
      <TableCell>
        <Badge variant={screen.isActive ? "default" : "secondary"}>
          {screen.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={screen.isTesting ? "default" : "outline"}>
          {screen.isTesting ? "Testing" : "Live"}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
            >
              <Link href={`/system/app-screens/${screen.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
              onClick={() => onEdit(screen)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
              onClick={() => onDelete(screen.id, screen.name)}
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

export default function AppScreensPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeContext, setActiveContext] = useState<string>("MOBILE_BANKING");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<any>(null);

  // Form states
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

  const { data, loading, error, refetch } = useQuery(APP_SCREENS_QUERY, {
    variables: {
      context: activeContext,
      page: 1,
      limit: 100,
    },
  });

  const [deleteScreen] = useMutation(DELETE_SCREEN, {
    onCompleted: () => refetch(),
  });

  const [toggleActive] = useMutation(TOGGLE_ACTIVE, {
    onCompleted: () => refetch(),
  });

  const [toggleTesting] = useMutation(TOGGLE_TESTING, {
    onCompleted: () => refetch(),
  });

  const [createScreen, { loading: creating }] = useMutation(CREATE_SCREEN, {
    onCompleted: () => {
      refetch();
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const [updateScreen, { loading: updating }] = useMutation(UPDATE_SCREEN, {
    onCompleted: () => {
      refetch();
      setEditDialogOpen(false);
      setEditingScreen(null);
      resetForm();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const [reorderScreens] = useMutation(REORDER_SCREENS, {
    onError: (error) => {
      alert("Failed to reorder: " + error.message);
      refetch(); // Revert on error
    },
  });

  const screens = data?.appScreens?.screens || [];
  const total = data?.appScreens?.total || 0;

  const filteredScreens = screens.filter(
    (screen: any) =>
      screen.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      await deleteScreen({ variables: { id } });
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    await toggleActive({
      variables: {
        id,
        input: { isActive: !currentValue },
      },
    });
  };

  const handleToggleTesting = async (id: string, currentValue: boolean) => {
    await toggleTesting({
      variables: {
        id,
        input: { isTesting: !currentValue },
      },
    });
  };

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

  const handleEditOpen = (screen: any) => {
    setEditingScreen(screen);
    setFormData({
      name: screen.name,
      icon: screen.icon,
      isActive: screen.isActive,
      isTesting: screen.isTesting,
    });
    setEditDialogOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createScreen({
      variables: {
        input: {
          ...formData,
          context: activeContext,
        },
      },
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateScreen({
      variables: {
        id: editingScreen.id,
        input: formData,
      },
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredScreens.findIndex((s: any) => s.id === active.id);
    const newIndex = filteredScreens.findIndex((s: any) => s.id === over.id);

    const reorderedScreens = arrayMove(filteredScreens, oldIndex, newIndex);

    // Optimistically update UI
    // The refetch will happen after mutation, or revert on error

    await reorderScreens({
      variables: {
        context: activeContext,
        screenIds: reorderedScreens.map((s: any) => s.id),
      },
    });

    refetch();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">App Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define screens for each app context
            </p>
          </div>
          <Button onClick={handleCreateOpen}>
            <Plus className="h-4 w-4 mr-2" />
            New Screen
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeContext}
            onValueChange={setActiveContext}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-5 mb-4">
              {CONTEXTS.map((context) => (
                <TabsTrigger key={context.value} value={context.value}>
                  <IconRenderer iconName={context.icon} className="h-4 w-4 mr-2" />
                  {context.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CONTEXTS.map((context) => (
              <TabsContent key={context.value} value={context.value}>
                {/* Search */}
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search screens by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading screens...
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="text-center py-8 text-destructive">
                    Error loading screens: {error.message}
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && filteredScreens.length === 0 && (
                  <div className="text-center py-12">
                    <IconRenderer iconName={context.icon} className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <div className="text-muted-foreground mb-4">
                      {searchTerm
                        ? "No screens found matching your search"
                        : `No screens defined for ${context.label} yet`}
                    </div>
                    {!searchTerm && (
                      <Link href="/system/app-screens/new">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Screen
                        </Button>
                      </Link>
                    )}
                  </div>
                )}

                {/* Screens Table */}
                {!loading && !error && filteredScreens.length > 0 && (
                  <div className="border rounded-lg">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <Table className="bg-white">
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead className="w-16">Order</TableHead>
                            <TableHead>Icon</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Testing</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white divide-y divide-gray-200">
                          <SortableContext
                            items={filteredScreens.map((s: any) => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {filteredScreens.map((screen: any, index: number) => (
                              <SortableScreenRow
                                key={screen.id}
                                screen={screen}
                                rowIndex={index}
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

                {/* Results Summary */}
                {!loading && !error && filteredScreens.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Showing {filteredScreens.length} of {total} screens for{" "}
                    {context.label}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Screen</DialogTitle>
              <DialogDescription>
                Add a new screen for {CONTEXTS.find(c => c.value === activeContext)?.label}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Screen Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Home, Transfer, Profile"
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
              <Button type="submit" disabled={creating || !formData.name || !formData.icon}>
                {creating ? "Creating..." : "Create Screen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Screen</DialogTitle>
              <DialogDescription>
                Update screen details for {editingScreen?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Screen Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Home, Transfer, Profile"
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

              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Context:</strong> {editingScreen?.context}
                  <br />
                  <span className="text-xs">Context cannot be changed</span>
                </p>
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
              <Button type="submit" disabled={updating || !formData.name || !formData.icon}>
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
