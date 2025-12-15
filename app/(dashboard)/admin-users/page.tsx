"use client";

import { useState } from "react";
import { Plus, Mail, Calendar, CheckCircle, XCircle, Key } from "lucide-react";
import { toast } from "sonner";
import { gql, useMutation, useQuery } from "@apollo/client";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const ADMIN_WEB_USERS_QUERY = gql`
  query AdminWebUsers {
    adminWebUsers {
      id
      email
      name
      isActive
      createdAt
      updatedAt
    }
  }
`;

const ADMIN_WEB_CREATE_USER_MUTATION = gql`
  mutation AdminWebCreateUser($input: AdminWebCreateUserInput!) {
    adminWebCreateUser(input: $input) {
      success
      message
      emailSent
      user {
        id
        email
        name
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

const ADMIN_WEB_SEND_PASSWORD_RESET_LINK_MUTATION = gql`
  mutation AdminWebSendPasswordResetLink($userId: ID!) {
    adminWebSendPasswordResetLink(userId: $userId) {
      success
      message
      emailSent
    }
  }
`;

interface AdminUser {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<{ id: number; name: string } | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const {
    data,
    loading,
    error,
    refetch: refetchUsers,
  } = useQuery(ADMIN_WEB_USERS_QUERY);

  const users: AdminUser[] = (data?.adminWebUsers ?? []) as AdminUser[];

  const [createUser, { loading: addLoading }] = useMutation(
    ADMIN_WEB_CREATE_USER_MUTATION,
    {
      onCompleted: async (result) => {
        const payload = result?.adminWebCreateUser;
        if (payload?.success) {
          toast.success(payload.message || "Admin user created successfully!", {
            description: payload.emailSent
              ? "Setup link has been sent to the user's email"
              : "Please check the console for details",
          });
          setEmail("");
          setName("");
          setShowAddModal(false);
          await refetchUsers();
        } else {
          toast.error(payload?.message || "Failed to create user");
        }
      },
      onError: (err) => {
        console.error("Create user error:", err);
        toast.error(err.message || "An error occurred. Please try again.");
      },
    }
  );

  const [sendResetLink] = useMutation(
    ADMIN_WEB_SEND_PASSWORD_RESET_LINK_MUTATION,
    {
      onCompleted: (result) => {
        const payload = result?.adminWebSendPasswordResetLink;
        if (payload?.success) {
          toast.success(payload.message || "Password reset link sent successfully!", {
            description: payload.emailSent
              ? "The user will receive an email with reset instructions"
              : "Please check the console for details",
          });
        } else {
          toast.error(payload?.message || "Failed to send reset link");
        }
      },
      onError: (err) => {
        console.error("Reset password error:", err);
        toast.error(err.message || "An error occurred. Please try again.");
      },
    }
  );

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser({
      variables: {
        input: {
          email,
          name,
        },
      },
    });
  };

  const handleResetPassword = async (userId: number, userName: string) => {
    setUserToReset({ id: userId, name: userName });
    setResetDialogOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!userToReset) return;

    setResettingUserId(userToReset.id);
    setResetDialogOpen(false);

    try {
      await sendResetLink({
        variables: {
          userId: String(userToReset.id),
        },
      });
    } finally {
      setResettingUserId(null);
      setUserToReset(null);
    }
  };

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (user) => (
        <div className="text-sm font-medium text-gray-900">{user.name}</div>
      ),
      sortKey: "name",
    },
    {
      id: "email",
      header: "Email",
      accessor: (user) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail size={16} />
          {user.email}
        </div>
      ),
      sortKey: "email",
    },
    {
      id: "status",
      header: "Status",
      accessor: (user) =>
        user.isActive ? (
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
    },
    {
      id: "createdAt",
      header: "Created",
      accessor: (user) => (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} />
          {new Date(user.createdAt).toLocaleDateString()}
        </div>
      ),
      sortKey: "createdAt",
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (user) => (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleResetPassword(user.id, user.name)}
            disabled={resettingUserId === user.id}
            title="Reset Password"
            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Key className="mr-2 h-4 w-4" />
            {resettingUserId === user.id ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      ),
      alignCenter: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Admin Users</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage administrator accounts for the FDH Bank Admin Panel
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[#f59e0b] text-white hover:bg-[#d97706]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Admin User
          </Button>
        </CardHeader>
        <CardContent>
          {/* Users Table */}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : error ? (
            <p className="text-sm text-red-600">Failed to load admin users: {error.message}</p>
          ) : (
            <DataTable<AdminUser>
              data={users}
              columns={columns}
              searchableKeys={["name", "email"]}
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder="Search admin users..."
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-[#154E9E] mb-4">
                Add Admin User
              </h2>
              <p className="text-gray-600 mb-6">
                A secure setup link will be sent to the user's email. They will set their own password.
              </p>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#154E9E]"
                    placeholder="John Doe"
                    disabled={addLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#154E9E]"
                    placeholder="john@example.com"
                    disabled={addLoading}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The user will receive a setup link via email to create their own password. The link expires in 48 hours.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEmail("");
                      setName("");
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    disabled={addLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 bg-[#f59e0b] text-white px-4 py-2 rounded-lg hover:bg-[#d97706] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addLoading ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for <strong>{userToReset?.name}</strong>?
              <br /><br />
              A secure reset link will be sent to their email address. The link will expire in 24 hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetPassword}
              className="bg-[#f59e0b] hover:bg-[#d97706]"
            >
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
