"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table";
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
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
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

  const rows = forms as any[];

  const columns: DataTableColumn<any>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortKey: "name",
    },
    {
      id: "description",
      header: "Description",
      accessor: (row) => (
        <span className="text-muted-foreground max-w-md truncate block">
          {row.description || "—"}
        </span>
      ),
    },
    {
      id: "category",
      header: "Category",
      accessor: (row) =>
        row.category ? (
          <Badge variant="secondary">{row.category}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortKey: "category",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} />
            Inactive
          </span>
        ),
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "version",
      header: "Version",
      accessor: (row) => (
        <span className="text-sm text-muted-foreground">v{row.version}</span>
      ),
      sortKey: "version",
    },
    {
      id: "createdAt",
      header: "Created",
      accessor: (row) => (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          {new Date(row.createdAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      ),
      sortKey: "createdAt",
      alignCenter: true,
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
              >
                <MoreVertical className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/system/forms/${row.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/system/forms/${row.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(row.id)}>
                {row.isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(row.id, row.name)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      alignCenter: true,
    },
  ];

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
          {/* Filters */}
          <div className="flex gap-2 mb-6">
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
          {!loading && !error && rows.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                No forms created yet
              </div>
              <Link href="/system/forms/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Form
                </Button>
              </Link>
            </div>
          )}

          {/* Forms Table */}
          {!loading && !error && rows.length > 0 && (
            <DataTable<any>
              data={rows}
              columns={columns}
              searchableKeys={["name", "description", "category"]}
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder="Search forms..."
              showRowNumbers
              rowNumberHeader="#"
            />
          )}

          {/* Results Summary */}
          {!loading && !error && rows.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {rows.length} of {total} forms
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
