"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Plus, MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import Link from "next/link";

const FORMS_QUERY = gql`
  query Forms($isActive: Boolean, $category: String, $page: Int, $limit: Int) {
    forms(isActive: $isActive, category: $category, page: $page, limit: $limit) {
      forms {
        id
        name
        description
        category
        isActive
        version
        createdAt
        updatedAt
      }
      total
    }
  }
`;

const TOGGLE_FORM_ACTIVE = gql`
  mutation ToggleFormActive($id: ID!) {
    toggleFormActive(id: $id) {
      id
      isActive
    }
  }
`;

const DELETE_FORM = gql`
  mutation DeleteForm($id: ID!) {
    deleteForm(id: $id)
  }
`;

export default function FormsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  const { data, loading, error, refetch } = useQuery(FORMS_QUERY, {
    variables: {
      isActive: activeFilter,
      page: 1,
      limit: 20,
    },
  });

  const [toggleFormActive] = useMutation(TOGGLE_FORM_ACTIVE, {
    onCompleted: () => refetch(),
  });

  const [deleteForm] = useMutation(DELETE_FORM, {
    onCompleted: () => refetch(),
  });

  const forms = data?.forms?.forms || [];
  const total = data?.forms?.total || 0;

  const filteredForms = forms.filter((form: any) =>
    form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleActive = async (id: string) => {
    if (confirm("Are you sure you want to change the status of this form?")) {
      await toggleFormActive({ variables: { id } });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      await deleteForm({ variables: { id } });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Forms Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage dynamic forms for mobile banking
            </p>
          </div>
          <Link href="/system/forms/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Form
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forms by name, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeFilter === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(undefined)}
              >
                All
              </Button>
              <Button
                variant={activeFilter === true ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(true)}
              >
                Active
              </Button>
              <Button
                variant={activeFilter === false ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(false)}
              >
                Inactive
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading forms...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading forms: {error.message}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredForms.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchTerm ? "No forms found matching your search" : "No forms created yet"}
              </div>
              {!searchTerm && (
                <Link href="/system/forms/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Form
                  </Button>
                </Link>
              )}
            </div>
          )}

          {/* Forms Table */}
          {!loading && !error && filteredForms.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form: any) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate">
                        {form.description || "—"}
                      </TableCell>
                      <TableCell>
                        {form.category ? (
                          <Badge variant="secondary">{form.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={form.isActive ? "default" : "secondary"}>
                          {form.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">v{form.version}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(form.createdAt).toLocaleDateString()}
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
                              <Link href={`/system/forms/${form.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/system/forms/${form.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(form.id)}
                            >
                              {form.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(form.id, form.name)}
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
          {!loading && !error && filteredForms.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredForms.length} of {total} forms
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
