"use client";

import Link from "next/link";
import { gql, useQuery, useMutation } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { useI18n } from "@/components/providers/i18n-provider";
import { Calendar, CheckCircle, Eye, XCircle, Ban, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { translateStatusOneWord } from "@/lib/utils";

const USERS_QUERY = gql`
  query Users($context: MobileUserContext!) {
    mobileUsers(context: $context) {
      id
      context
      username
      phoneNumber
      customerNumber
      isActive
      createdAt
      isBlocked
      blockReason
    }
  }
`;

const BLOCK_USER_MUTATION = gql`
  mutation BlockMobileUser($input: BlockMobileUserInput!) {
    blockMobileUser(input: $input) {
      id
      isActive
      isBlocked
      blockedAt
      blockReason
    }
  }
`;

const UNBLOCK_USER_MUTATION = gql`
  mutation UnblockMobileUser($userId: ID!) {
    unblockMobileUser(userId: $userId) {
      id
      isActive
      isBlocked
    }
  }
`;

type MobileUserRow = {
  id: string;
  context: string;
  username?: string | null;
  phoneNumber?: string | null;
  customerNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  isBlocked: boolean;
  blockReason?: string | null;
};

function mapMobileUsers(data: any): MobileUserRow[] {
  return (data?.mobileUsers ?? []).map((user: any) => ({
    id: String(user.id),
    context: user.context,
    username: user.username,
    phoneNumber: user.phoneNumber,
    customerNumber: user.customerNumber,
    isActive: user.isActive,
    createdAt: user.createdAt,
    isBlocked: user.isBlocked,
    blockReason: user.blockReason,
  }));
}

type UsersTableProps = {
  context: "MOBILE_BANKING" | "WALLET";
  title: string;
  searchPlaceholder?: string;
};

export function UsersTable({ context, title, searchPlaceholder }: UsersTableProps) {
  const { translate } = useI18n();
  const { data, loading, error, refetch } = useQuery(USERS_QUERY, {
    variables: { context },
  });

  const { toast } = useToast();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MobileUserRow | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const [blockUser, { loading: blocking }] = useMutation(BLOCK_USER_MUTATION, {
    onCompleted: () => {
      toast({
        title: "User Blocked",
        description: `${selectedUser?.username || selectedUser?.phoneNumber} has been blocked.`,
      });
      setBlockDialogOpen(false);
      setBlockReason("");
      setSelectedUser(null);
      refetch();
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const [unblockUser, { loading: unblocking }] = useMutation(UNBLOCK_USER_MUTATION, {
    onCompleted: () => {
      toast({
        title: "User Unblocked",
        description: `${selectedUser?.username || selectedUser?.phoneNumber} has been unblocked.`,
      });
      setUnblockDialogOpen(false);
      setSelectedUser(null);
      refetch();
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleBlockClick = (user: MobileUserRow) => {
    setSelectedUser(user);
    setBlockDialogOpen(true);
  };

  const handleUnblockClick = (user: MobileUserRow) => {
    setSelectedUser(user);
    setUnblockDialogOpen(true);
  };

  const confirmBlock = () => {
    if (selectedUser) {
      blockUser({
        variables: {
          input: {
            userId: selectedUser.id,
            reason: blockReason || null,
          },
        },
      });
    }
  };

  const confirmUnblock = () => {
    if (selectedUser) {
      unblockUser({
        variables: {
          userId: selectedUser.id,
        },
      });
    }
  };

  const rows = mapMobileUsers(data);

  const baseColumns: DataTableColumn<MobileUserRow>[] = [
    // Context column intentionally hidden in UI to keep tables clean
    // {
    //   id: "context",
    //   header: "Context",
    //   accessor: (row) => row.context,
    //   sortKey: "context",
    // },
    {
      id: "username",
      header: translate("common.table.columns.username"),
      accessor: (row) => row.username ?? "-",
      sortKey: "username",
    },
    {
      id: "phoneNumber",
      header: translate("common.table.columns.phoneNumber"),
      accessor: (row) => row.phoneNumber ?? "-",
      sortKey: "phoneNumber",
    },
    {
      id: "customerNumber",
      header: translate("common.table.columns.customerNumber"),
      accessor: (row) => row.customerNumber ?? "-",
      sortKey: "customerNumber",
    },
    {
      id: "status",
      header: translate("common.table.columns.status"),
      accessor: (row) => {
        if (row.isBlocked) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <Ban size={14} />
              Blocked
            </span>
          );
        }
        return row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            {translateStatusOneWord("ACTIVE", translate, "ACTIVE")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <XCircle size={14} />
            {translateStatusOneWord("INACTIVE", translate, "INACTIVE")}
          </span>
        );
      },
      sortKey: "isActive",
      alignCenter: true,
    },
    {
      id: "createdAt",
      header: translate("common.table.columns.created"),
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
      header: translate("common.table.columns.actions"),
      accessor: (row) => {
        const detailsHref =
          context === "WALLET"
            ? `/wallet/users/${row.id}`
            : `/mobile-banking/users/${row.id}`;

        return (
          <div className="flex justify-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
            >
              <Link href={detailsHref}>
                <Eye className="h-4 w-4 mr-2" />
                {translate("common.actions.details")}
              </Link>
            </Button>
            {row.isBlocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnblockClick(row)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Unblock
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBlockClick(row)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Ban className="h-4 w-4 mr-2" />
                Block
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const columns = baseColumns.filter((column) => {
    if (context === "WALLET" && column.id === "username") {
      return false;
    }
    if (context === "WALLET" && column.id === "customerNumber") {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {translate("common.actions.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">{translate("common.state.loading")}</p>
          )}
          {error && (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          )}
          {!loading && !error && (
            <DataTable<MobileUserRow>
              data={rows}
              columns={columns}
              searchableKeys={
                context === "WALLET"
                  ? ["phoneNumber"]
                  : ["username", "phoneNumber", "customerNumber"]
              }
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder={searchPlaceholder ?? "Search users"}
              showRowNumbers
              rowNumberHeader={translate("common.table.columns.index")}
            />
          )}
        </CardContent>
      </Card>

      {/* Block User Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block{" "}
              <strong>{selectedUser?.username || selectedUser?.phoneNumber}</strong>?
              This will prevent them from logging in and receiving notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="blockReason">Reason (optional)</Label>
            <Input
              id="blockReason"
              placeholder="Enter reason for blocking..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBlock}
              disabled={blocking}
              className="bg-red-600 hover:bg-red-700"
            >
              {blocking && <Loader2 size={14} className="mr-2 animate-spin" />}
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock User Dialog */}
      <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock{" "}
              <strong>{selectedUser?.username || selectedUser?.phoneNumber}</strong>?
              They will be able to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unblocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnblock}
              disabled={unblocking}
              className="bg-green-600 hover:bg-green-700"
            >
              {unblocking && <Loader2 size={14} className="mr-2 animate-spin" />}
              Unblock User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
