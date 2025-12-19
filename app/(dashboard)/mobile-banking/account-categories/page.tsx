"use client";
export const dynamic = "force-dynamic";

import { useQuery, gql, useMutation } from "@apollo/client";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

const GET_ACCOUNT_CATEGORIES = gql`
  query GetAccountCategories {
    accountCategories {
      id
      category
      categoryName
      displayToMobile
      createdAt
      updatedAt
    }
  }
`;

const CREATE_ACCOUNT_CATEGORY = gql`
  mutation CreateAccountCategory($input: CreateAccountCategoryInput!) {
    createAccountCategory(input: $input) {
      id
      category
      displayToMobile
    }
  }
`;

const UPDATE_ACCOUNT_CATEGORY = gql`
  mutation UpdateAccountCategory($input: UpdateAccountCategoryInput!) {
    updateAccountCategory(input: $input) {
      id
      category
      displayToMobile
    }
  }
`;

const DELETE_ACCOUNT_CATEGORY = gql`
  mutation DeleteAccountCategory($id: ID!) {
    deleteAccountCategory(id: $id)
  }
`;

interface AccountCategory {
  id: string;
  category: string;
  categoryName?: string | null;
  displayToMobile: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AccountCategoriesPage() {
  const { translate } = useI18n();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<AccountCategory | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [displayToMobile, setDisplayToMobile] = useState(true);

  const { data, loading, error, refetch } = useQuery(GET_ACCOUNT_CATEGORIES);
  const [createCategory, { loading: creating }] = useMutation(
    CREATE_ACCOUNT_CATEGORY,
    {
      onCompleted: () => {
        toast.success("Category created successfully");
        setIsAddDialogOpen(false);
        setCategoryInput("");
        setDisplayToMobile(true);
        refetch();
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    }
  );

  const [updateCategory, { loading: updating }] = useMutation(
    UPDATE_ACCOUNT_CATEGORY,
    {
      onCompleted: () => {
        toast.success("Category updated successfully");
        setIsEditDialogOpen(false);
        setSelectedCategory(null);
        refetch();
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    }
  );

  const [deleteCategory, { loading: deleting }] = useMutation(
    DELETE_ACCOUNT_CATEGORY,
    {
      onCompleted: () => {
        toast.success("Category deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedCategory(null);
        refetch();
      },
      onError: (error) => {
        toast.error(`Error: ${error.message}`);
      },
    }
  );

  const handleCreate = () => {
    if (!categoryInput.trim()) {
      toast.error("Category cannot be empty");
      return;
    }
    createCategory({
      variables: {
        input: {
          category: categoryInput.trim(),
          displayToMobile,
        },
      },
    });
  };

  const handleEdit = () => {
    if (!selectedCategory) return;
    updateCategory({
      variables: {
        input: {
          id: selectedCategory.id,
          category: categoryInput.trim(),
          displayToMobile,
        },
      },
    });
  };

  const handleDelete = () => {
    if (!selectedCategory) return;
    deleteCategory({
      variables: { id: selectedCategory.id },
    });
  };

  const handleToggleDisplay = (category: AccountCategory) => {
    updateCategory({
      variables: {
        input: {
          id: category.id,
          displayToMobile: !category.displayToMobile,
        },
      },
    });
  };

  const openAddDialog = () => {
    setCategoryInput("");
    setDisplayToMobile(true);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (category: AccountCategory) => {
    setSelectedCategory(category);
    setCategoryInput(category.category);
    setDisplayToMobile(category.displayToMobile);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: AccountCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const rows = data?.accountCategories ?? [];

  const columns: DataTableColumn<AccountCategory>[] = [
    {
      id: "category",
      header: translate("accountCategories.columns.category"),
      accessor: (row) => row.category,
      sortKey: "category",
    },
    {
      id: "categoryName",
      header: translate("accountCategories.columns.categoryName"),
      accessor: (row) => row.categoryName || <span className="text-gray-400 italic">N/A</span>,
    },
    {
      id: "displayToMobile",
      header: translate("accountCategories.columns.displayToMobile"),
      accessor: (row) => (
        <Switch
          checked={row.displayToMobile}
          onCheckedChange={() => handleToggleDisplay(row)}
        />
      ),
    },
    {
      id: "actions",
      header: translate("accountCategories.columns.actions"),
      accessor: (row) => (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
            onClick={() => openEditDialog(row)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
            onClick={() => openDeleteDialog(row)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{translate("accountCategories.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {translate("accountCategories.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {translate("accountCategories.addCategory")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          )}
          {!loading && !error && (
            <DataTable<AccountCategory>
              data={rows}
              columns={columns}
              searchableKeys={["category"]}
              initialSortKey="category"
              pageSize={10}
              searchPlaceholder="Search categories"
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate("accountCategories.addCategory")}
            </DialogTitle>
            <DialogDescription>
              Enter the account category number (e.g., 1000, 2000, 3000)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                {translate("accountCategories.columns.category")}
              </Label>
              <Input
                id="category"
                placeholder={translate("accountCategories.categoryPlaceholder")}
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="display"
                checked={displayToMobile}
                onCheckedChange={setDisplayToMobile}
              />
              <Label htmlFor="display">
                {translate("accountCategories.displayLabel")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate("accountCategories.editCategory")}
            </DialogTitle>
            <DialogDescription>
              Update the account category information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">
                {translate("accountCategories.columns.category")}
              </Label>
              <Input
                id="edit-category"
                placeholder={translate("accountCategories.categoryPlaceholder")}
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-display"
                checked={displayToMobile}
                onCheckedChange={setDisplayToMobile}
              />
              <Label htmlFor="edit-display">
                {translate("accountCategories.displayLabel")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updating}>
              {updating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate("accountCategories.deleteCategory")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate("accountCategories.confirmDelete")}
              <br />
              <span className="font-semibold">
                {selectedCategory?.category}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
