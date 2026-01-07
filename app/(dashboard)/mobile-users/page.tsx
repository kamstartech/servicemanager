"use client";

import { gql, useQuery, useMutation } from "@apollo/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { Calendar, Ban, CheckCircle, Loader2 } from "lucide-react";
import { translateStatusOneWord } from "@/lib/utils";
import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";

const MOBILE_USERS_QUERY = gql`
  query MobileUsers($context: MobileUserContext) {
    mobileUsers(context: $context) {
      id
      context
      username
      phoneNumber
      isActive
      isBlocked
      blockedAt
      blockReason
      createdAt
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

export default function MobileUsersPage() {
  const { data, loading, error, refetch } = useQuery(MOBILE_USERS_QUERY);
  const { translate } = useI18n();
  const { toast } = useToast();

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [blockReason, setBlockReason] = useState("");

  const [blockUser, { loading: blocking }] = useMutation(BLOCK_USER_MUTATION, {
    onCompleted: () => {
      toast({
        title: "User Blocked",
        description: `${selectedUser?.username || selectedUser?.phoneNumber} has been blocked.`,
      });
      setBlockDialogOpen(false);
      setBlockReason("");
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

  const handleBlockClick = (user: any) => {
    setSelectedUser(user);
    setBlockDialogOpen(true);
  };

  const handleUnblockClick = (user: any) => {
    setSelectedUser(user);
    setUnblockDialogOpen(true);
  };

  const confirmBlock = () => {
    if (selectedUser) {
      blockUser({
        variables: {
          input: {
            userId: selectedUser.id.toString(),
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
          userId: selectedUser.id.toString(),
        },
      });
    }
  };

  const rows = (data?.mobileUsers ?? []) as any[];

  const columns: DataTableColumn<any>[] = [
    {
      id: "context",
      header: COMMON_TABLE_HEADERS.context,
      accessor: (row) => row.context,
      sortKey: "context",
    },
    {
      id: "username",
      header: COMMON_TABLE_HEADERS.username,
      accessor: (row) => row.username ?? "-",
      sortKey: "username",
    },
    {
      id: "phoneNumber",
      header: COMMON_TABLE_HEADERS.phoneNumber,
      accessor: (row) => row.phoneNumber ?? "-",
      sortKey: "phoneNumber",
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => {
        if (row.isBlocked) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <Ban size={12} />
              Blocked
            </span>
          );
        }
        return row.isActive
          ? translateStatusOneWord("ACTIVE", translate, "ACTIVE")
          : translateStatusOneWord("INACTIVE", translate, "INACTIVE");
      },
      sortKey: "isBlocked",
      alignCenter: true,
    },
    {
      id: "blockReason",
      header: "Block Reason",
      accessor: (row) => row.blockReason ?? "-",
      sortKey: "blockReason",
    },
    {
      id: "createdAt",
      header: COMMON_TABLE_HEADERS.created,
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
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <div className="flex items-center justify-center gap-2">
          {row.isBlocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnblockClick(row)}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle size={14} className="mr-1" />
              Unblock
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBlockClick(row)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Ban size={14} className="mr-1" />
              Block
            </Button>
          )}
        </div>
      ),
      alignCenter: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{translate("mobileUsers.title")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {translate("common.actions.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">
              {translate("common.state.loading")}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {translate("common.state.error")}: {error.message}
            </p>
          )}
          {!loading && !error && (
            <DataTable<any>
              data={rows}
              columns={columns}
              searchableKeys={["context", "username", "phoneNumber"]}
              initialSortKey="createdAt"
              pageSize={10}
              searchPlaceholder={translate("common.actions.search") || "Search mobile users..."}
              showRowNumbers
              rowNumberHeader="#"
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

