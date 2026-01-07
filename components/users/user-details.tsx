"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { gql, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COMMON_TABLE_HEADERS, DataTable, type DataTableColumn } from "@/components/data-table";
import { Calendar, Plus, ExternalLink, Link2Off, Star, CheckCircle, Clock, XCircle, Bell, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const USER_DETAILS_QUERY = gql`
  query UserDetails($context: MobileUserContext!) {
    mobileUsers(context: $context) {
      id
      context
      username
      phoneNumber
      customerNumber
      isActive
      createdAt
      updatedAt
      profile {
        id
        firstName
        lastName
        email
        phone
        address
        city
        country
        zip
        createdAt
        updatedAt
      }
    }
  }
`;

const ADMIN_TEST_PUSH_NOTIFICATION_MUTATION = gql`
  mutation AdminTestPushNotification($userId: ID!, $deviceId: String) {
    adminTestPushNotification(userId: $userId, deviceId: $deviceId)
  }
`;

const DEVICES_QUERY = gql`
  query GetUserDevices($userId: ID!) {
    mobileUserDevices(userId: $userId) {
      id
      name
      model
      os
      deviceId
      fcmToken
      isActive
      lastUsedAt
      createdAt
    }
  }
`;

const APPROVE_DEVICE_MUTATION = gql`
  mutation ApproveDevice($deviceId: ID!) {
    approveDevice(deviceId: $deviceId)
  }
`;

const RESET_MOBILE_USER_PASSWORD_MUTATION = gql`
  mutation ResetMobileUserPassword($userId: ID!) {
    resetMobileUserPassword(input: { userId: $userId }) {
      success
      tempPassword
      message
    }
  }
`;

const BENEFICIARIES_QUERY = gql`
  query GetBeneficiaries($userId: ID!) {
    beneficiaries(userId: $userId) {
      id
      name
      beneficiaryType
      accountNumber
      externalBank {
        id
        name
        code
        type
      }
      externalBankType
      isActive
    }
  }
`;

const ACCOUNTS_QUERY = gql`
  query GetUserAccounts($userId: ID!) {
    mobileUserAccounts(userId: $userId) {
      id
      accountNumber
      accountName
      accountType
      currency
      categoryName
      balance
      nickName
      isPrimary
      isActive
      createdAt
    }
  }
`;

const TRIGGER_DISCOVERY_MUTATION = gql`
  mutation TriggerAccountDiscovery($userId: ID!) {
    triggerAccountDiscovery(userId: $userId) {
      success
      message
      accountsAdded
      accountsDeactivated
    }
  }
`;

const LINK_ACCOUNT_MUTATION = gql`
  mutation LinkAccount(
    $userId: ID!
    $accountNumber: String!
    $accountName: String
    $accountType: String
    $isPrimary: Boolean
  ) {
    linkAccountToUser(
      userId: $userId
      accountNumber: $accountNumber
      accountName: $accountName
      accountType: $accountType
      isPrimary: $isPrimary
    ) {
      id
      accountNumber
      accountName
      isPrimary
    }
  }
`;

const UNLINK_ACCOUNT_MUTATION = gql`
  mutation UnlinkAccount($userId: ID!, $accountId: ID!) {
    unlinkAccountFromUser(userId: $userId, accountId: $accountId)
  }
`;

const SET_PRIMARY_ACCOUNT_MUTATION = gql`
  mutation SetPrimaryAccount($userId: ID!, $accountId: ID!) {
    setPrimaryAccount(userId: $userId, accountId: $accountId)
  }
`;

type UserDetailsProps = {
  context: "MOBILE_BANKING" | "WALLET";
  backHref: string;
  title: string;
};

export function UserDetails({ context, backHref, title }: UserDetailsProps) {
  const params = useParams();
  const id = params.id as string;

  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);
  const [testingPushForDeviceId, setTestingPushForDeviceId] = useState<string | null>(null);
  const [showLinkAccount, setShowLinkAccount] = useState(false);
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("");

  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);
  const [transactionsAccountNumber, setTransactionsAccountNumber] = useState<string | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const { data, loading, error, refetch } = useQuery(USER_DETAILS_QUERY, {
    variables: { context },
  });

  const { data: beneficiariesData, loading: beneficiariesLoading } = useQuery(
    BENEFICIARIES_QUERY,
    {
      variables: { userId: id },
      skip: !id,
    }
  );

  const {
    data: accountsData,
    loading: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery(ACCOUNTS_QUERY, {
    variables: { userId: id },
    skip: !id || context !== "MOBILE_BANKING",
    pollInterval: 10000, // Poll every 10 seconds for updates
  });

  const [triggerDiscovery] = useMutation(TRIGGER_DISCOVERY_MUTATION);

  // Trigger account discovery when admin navigates to user details
  useEffect(() => {
    if (id && context === "MOBILE_BANKING") {
      triggerDiscovery({ variables: { userId: id } })
        .then((result) => {
          if (result.data?.triggerAccountDiscovery?.accountsAdded > 0) {
            console.log(`🔍 Discovery: ${result.data.triggerAccountDiscovery.message}`);
            // Refetch accounts to show new ones immediately
            refetchAccounts();
          }
        })
        .catch((error) => {
          console.error("Failed to trigger account discovery:", error);
        });
    }
  }, [id, context, triggerDiscovery, refetchAccounts]);

  const {
    data: devicesData,
    loading: devicesLoading,
    refetch: refetchDevices,
  } = useQuery(DEVICES_QUERY, {
    variables: { userId: id },
    skip: !id,
  });

  const [approveDevice, { loading: approvingDevice }] = useMutation(
    APPROVE_DEVICE_MUTATION,
    {
      onCompleted: () => {
        void refetchDevices();
      },
    }
  );

  const [adminTestPushNotification, { loading: testingPush }] = useMutation(
    ADMIN_TEST_PUSH_NOTIFICATION_MUTATION,
    {
      onError: (err) => {
        toast.error(err.message || "Failed to send test push");
      },
    }
  );

  const [resetMobileUserPassword, { loading: resettingPassword }] = useMutation(
    RESET_MOBILE_USER_PASSWORD_MUTATION,
    {
      onCompleted: (result) => {
        const temp = result?.resetMobileUserPassword?.tempPassword;
        if (temp) {
          setLastTempPassword(temp);
        }
      },
    }
  );

  const [linkAccount, { loading: linkingAccount }] = useMutation(
    LINK_ACCOUNT_MUTATION,
    {
      onCompleted: () => {
        void refetchAccounts();
        setShowLinkAccount(false);
        setNewAccountNumber("");
        setNewAccountName("");
        setNewAccountType("");
      },
    }
  );

  const [unlinkAccount] = useMutation(UNLINK_ACCOUNT_MUTATION, {
    onCompleted: () => {
      void refetchAccounts();
    },
  });

  const [setPrimaryAccount] = useMutation(SET_PRIMARY_ACCOUNT_MUTATION, {
    onCompleted: () => {
      void refetchAccounts();
    },
  });

  const handleLinkAccount = async () => {
    if (!newAccountNumber.trim()) return;

    await linkAccount({
      variables: {
        userId: id,
        accountNumber: newAccountNumber.trim(),
        accountName: newAccountName.trim() || null,
        accountType: newAccountType.trim() || null,
        isPrimary: accounts.length === 0,
      },
    });
  };

  const handleUnlinkAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to unlink this account?")) return;

    await unlinkAccount({
      variables: { userId: id, accountId },
    });
  };

  const handleSetPrimary = async (accountId: string) => {
    await setPrimaryAccount({
      variables: { userId: id, accountId },
    });
  };

  const openTransactions = async (accountNumber: string) => {
    setTransactionsDialogOpen(true);
    setTransactionsAccountNumber(accountNumber);
    setTransactionsError(null);
    setTransactions([]);
    setTransactionsLoading(true);

    try {
      const res = await fetch("/api/services/t24-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountNumber }),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to load transactions (${res.status})`);
      }

      setTransactions(Array.isArray(payload?.data) ? payload.data : []);
    } catch (e) {
      setTransactionsError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleTestPush = async (device: any) => {
    if (!device?.deviceId) {
      toast.error("Device ID missing");
      return;
    }

    try {
      setTestingPushForDeviceId(device.deviceId);
      const result = await adminTestPushNotification({
        variables: {
          userId: id,
          deviceId: device.deviceId,
        },
      });

      if (result?.data?.adminTestPushNotification) {
        toast.success("Test push sent");
      } else {
        // The mutation returns boolean, but if it throws, onError handles it.
        // However, if it returns false without throwing (unlikely with my recent changes),
        // we keep a fallback.
        toast.error("Test push failed. Please check if the device has a valid token.");
      }
    } catch (e: any) {
      // Logic handled by mutation onError, but we can catch local errors too
      console.error("Test push error:", e);
    } finally {
      setTestingPushForDeviceId(null);
    }
  };

  const user = (data?.mobileUsers ?? []).find(
    (u: any) => String(u.id) === String(id),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-destructive">User not found</p>
      </div>
    );
  }

  const createdAt = new Date(user.createdAt).toLocaleString();
  const updatedAt = user.updatedAt
    ? new Date(user.updatedAt).toLocaleString()
    : createdAt;

  const beneficiaries = beneficiariesData?.beneficiaries ?? [];
  const activeBeneficiaries = beneficiaries.filter((b: any) => b.isActive);

  const accounts = accountsData?.mobileUserAccounts ?? [];
  const primaryAccount = accounts.find((a: any) => a.isPrimary);

  const devices = devicesData?.mobileUserDevices ?? [];
  const activeDevices = devices.filter((d: any) => d.isActive);
  const pendingDevices = devices.filter((d: any) => !d.isActive);

  const getBeneficiaryTypeLabel = (type: string) => {
    switch (type) {
      case "FDH_WALLET":
        return "FDH Wallet";
      case "EXTERNAL_WALLET":
        return "Other Wallet";
      case "FDH_BANK":
        return "FDH Bank";
      case "EXTERNAL_BANK":
        return "Other Bank";
      case "WALLET":
        return "Wallet";
      case "BANK_INTERNAL":
        return "Bank (Internal)";
      case "BANK_EXTERNAL":
        return "Bank (External)";
      default:
        return type;
    }
  };

  const getIdentifier = (beneficiary: any) => {
    // Phone numbers and account numbers are now both stored in accountNumber field
    return beneficiary.accountNumber || "-";
  };

  const basePath = context === "MOBILE_BANKING"
    ? "/mobile-banking/users"
    : "/wallet/users";

  // Define columns for Accounts table
  const accountsColumns: DataTableColumn<any>[] = [
    {
      id: "accountNumber",
      header: COMMON_TABLE_HEADERS.accountNumber,
      accessor: (row) => <span className="font-medium">{row.accountNumber}</span>,
      sortKey: "accountNumber",
    },
    {
      id: "name",
      header: "Name / Type",
      accessor: (row) => (
        <div>
          {row.accountName || "-"}
          {row.accountType && (
            <span className="text-muted-foreground text-xs"> • {row.accountType}</span>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: COMMON_TABLE_HEADERS.category,
      accessor: (row) =>
        row.categoryName ? (
          <span className="text-sm text-muted-foreground">{row.categoryName}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">N/A</span>
        ),
    },
    {
      id: "nickname",
      header: "Nickname",
      accessor: (row) =>
        row.nickName ? (
          <span className="text-sm text-muted-foreground">{row.nickName}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">N/A</span>
        ),
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => (
        <div className="flex gap-1">
          {row.isPrimary && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Star size={14} />
              Primary
            </span>
          )}
          {!row.isActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle size={14} />
              Inactive
            </span>
          )}
          {row.isActive && !row.isPrimary && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle size={14} />
              Active
            </span>
          )}
        </div>
      ),
      alignCenter: true,
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200"
            onClick={() => openTransactions(row.accountNumber)}
          >
            <List className="h-4 w-4 mr-2" />
            Transactions
          </Button>
          {!row.isPrimary && row.isActive && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
              onClick={() => handleSetPrimary(row.id)}
            >
              <Star className="h-4 w-4 mr-2" />
              Set Primary
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
            onClick={() => handleUnlinkAccount(row.id)}
          >
            <Link2Off className="h-4 w-4 mr-2" />
            Unlink
          </Button>
        </div>
      ),
    },
  ];

  // Define columns for Devices table
  const devicesColumns: DataTableColumn<any>[] = [
    {
      id: "name",
      header: COMMON_TABLE_HEADERS.deviceName,
      accessor: (row) => <span className="font-medium">{row.name || "Device"}</span>,
      sortKey: "name",
    },
    {
      id: "model",
      header: COMMON_TABLE_HEADERS.modelOs,
      accessor: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.model || "Unknown"} • {row.os || "Unknown"}
        </span>
      ),
    },
    {
      id: "lastUsed",
      header: COMMON_TABLE_HEADERS.lastUsed,
      accessor: (row) => (
        row.lastUsedAt ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Calendar size={16} />
            {new Date(row.lastUsedAt).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        )
      ),
      sortKey: "lastUsedAt",
      alignCenter: true,
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={14} />
            Pending
          </span>
        ),
      alignCenter: true,
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <div className="flex flex-wrap justify-center gap-2">
          {row.isActive && row.fcmToken && (
            <Button
              size="sm"
              variant="outline"
              className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200"
              onClick={() => handleTestPush(row)}
              disabled={
                testingPush ||
                !row.deviceId ||
                testingPushForDeviceId === row.deviceId
              }
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Push
            </Button>
          )}
          {!row.isActive && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
              onClick={() => approveDevice({ variables: { deviceId: row.id } })}
              disabled={approvingDevice}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Define columns for Bank Beneficiaries table
  const bankBeneficiaryColumns: DataTableColumn<any>[] = [
    {
      id: "name",
      header: COMMON_TABLE_HEADERS.name,
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortKey: "name",
    },
    {
      id: "type",
      header: COMMON_TABLE_HEADERS.type,
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {getBeneficiaryTypeLabel(row.beneficiaryType)}
        </Badge>
      ),
    },
    {
      id: "bank",
      header: COMMON_TABLE_HEADERS.bank,
      accessor: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.externalBank?.name || (row.beneficiaryType.includes("FDH") ? "FDH" : "-")}
        </span>
      ),
    },
    {
      id: "accountNumber",
      header: COMMON_TABLE_HEADERS.accountNumber,
      accessor: (row) => (
        <span className="text-sm font-mono">{row.accountNumber || "-"}</span>
      ),
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => (
        <>
          {!row.isActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle size={14} />
              Inactive
            </span>
          )}
        </>
      ),
      alignCenter: true,
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <Button size="sm" variant="ghost" asChild>
          <Link href={`${basePath}/${id}/beneficiaries/${row.id}/edit`}>View</Link>
        </Button>
      ),
      alignRight: true,
    },
  ];

  // Define columns for Wallet Beneficiaries table
  const walletBeneficiaryColumns: DataTableColumn<any>[] = [
    {
      id: "name",
      header: COMMON_TABLE_HEADERS.name,
      accessor: (row) => <span className="font-medium">{row.name}</span>,
      sortKey: "name",
    },
    {
      id: "type",
      header: COMMON_TABLE_HEADERS.type,
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {getBeneficiaryTypeLabel(row.beneficiaryType)}
        </Badge>
      ),
    },
    {
      id: "accountNumber",
      header: "Account/Phone",
      accessor: (row) => (
        <span className="text-sm font-mono">{row.accountNumber || "-"}</span>
      ),
    },
    {
      id: "status",
      header: COMMON_TABLE_HEADERS.status,
      accessor: (row) => (
        <>
          {!row.isActive && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle size={14} />
              Inactive
            </span>
          )}
        </>
      ),
      alignCenter: true,
    },
    {
      id: "actions",
      header: COMMON_TABLE_HEADERS.actions,
      accessor: (row) => (
        <Button size="sm" variant="ghost" asChild>
          <Link href={`${basePath}/${id}/beneficiaries/${row.id}/edit`}>View</Link>
        </Button>
      ),
      alignRight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-full mx-auto space-y-6">
        <Dialog
          open={transactionsDialogOpen}
          onOpenChange={(open) => {
            setTransactionsDialogOpen(open);
            if (!open) {
              setTransactionsAccountNumber(null);
              setTransactionsError(null);
              setTransactions([]);
              setTransactionsLoading(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Account Transactions</DialogTitle>
              <DialogDescription>
                {transactionsAccountNumber
                  ? `Account: ${transactionsAccountNumber}`
                  : "Select an account to view transactions"}
              </DialogDescription>
            </DialogHeader>

            {transactionsLoading && (
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            )}
            {!transactionsLoading && transactionsError && (
              <p className="text-sm text-destructive">Error: {transactionsError}</p>
            )}
            {!transactionsLoading && !transactionsError && transactions.length === 0 && (
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            )}

            {!transactionsLoading && !transactionsError && transactions.length > 0 && (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Value Date</th>
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-left p-2 font-medium">Reference</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                      <th className="text-right p-2 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t: any, idx: number) => {
                      const date = t?.transactionDate || t?.date || "-";
                      const valueDate = t?.valueDate || "-";
                      const desc = t?.description || t?.narrative || "-";
                      const ref = t?.reference || t?.transRef || "-";
                      const ccy = t?.currency || "";
                      const amountRaw = t?.debitAmount ?? t?.creditAmount ?? t?.amount;
                      const amount = amountRaw != null ? String(amountRaw) : "-";
                      const bal = t?.balance != null ? String(t.balance) : "-";

                      return (
                        <tr key={t?.transactionId || t?.id || `${ref}-${idx}`} className="border-b">
                          <td className="p-2 whitespace-nowrap font-mono">{date}</td>
                          <td className="p-2 whitespace-nowrap font-mono">{valueDate}</td>
                          <td className="p-2 min-w-[280px]">{desc}</td>
                          <td className="p-2 whitespace-nowrap font-mono">{ref}</td>
                          <td className="p-2 whitespace-nowrap text-right font-mono">
                            {ccy} {amount}
                          </td>
                          <td className="p-2 whitespace-nowrap text-right font-mono">
                            {ccy} {bal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={user.isActive ? "default" : "outline"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                resetMobileUserPassword({ variables: { userId: id } })
              }
              disabled={resettingPassword}
            >
              Reset Password
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={backHref}>Back</a>
            </Button>
          </div>
        </div>

        {/* Combined Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Profile</CardTitle>
              <div className="flex gap-2">
                {user.profile && (
                  <Button size="sm" variant="outline">
                    Edit Profile
                  </Button>
                )}
                {!user.profile && (
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Basic Information</h3>
                {user.username && context !== "WALLET" && (
                  <div>
                    <span className="text-xs text-muted-foreground">Username</span>
                    <p className="text-sm font-medium">{user.username}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Phone Number</span>
                  <p className="text-sm font-medium">{user.phoneNumber ?? "-"}</p>
                </div>
                {context === "MOBILE_BANKING" && user.customerNumber && (
                  <div>
                    <span className="text-xs text-muted-foreground">Customer Number</span>
                    <p className="text-sm font-medium">{user.customerNumber}</p>
                  </div>
                )}
                {context === "MOBILE_BANKING" && primaryAccount && (
                  <div>
                    <span className="text-xs text-muted-foreground">Primary Account</span>
                    <p className="text-sm font-medium">
                      {primaryAccount.accountNumber}
                      {primaryAccount.accountName && (
                        <span className="text-muted-foreground"> ({primaryAccount.accountName})</span>
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <div className="mt-1">
                    <Badge variant={user.isActive ? "default" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                {lastTempPassword && (
                  <div>
                    <span className="text-xs text-muted-foreground">Temporary Password</span>
                    <p className="text-sm font-mono text-destructive">
                      {lastTempPassword}
                    </p>
                  </div>
                )}
              </div>

              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Personal Details</h3>
                <div>
                  <span className="text-xs text-muted-foreground">First Name</span>
                  <p className="text-sm font-medium">{user.profile?.firstName || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Last Name</span>
                  <p className="text-sm font-medium">{user.profile?.lastName || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Email</span>
                  <p className="text-sm font-medium">{user.profile?.email || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Contact Phone</span>
                  <p className="text-sm font-medium">{user.profile?.phone || "-"}</p>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Address Information</h3>
                <div>
                  <span className="text-xs text-muted-foreground">Address</span>
                  <p className="text-sm font-medium">{user.profile?.address || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">City</span>
                  <p className="text-sm font-medium">{user.profile?.city || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Country</span>
                  <p className="text-sm font-medium">{user.profile?.country || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ZIP Code</span>
                  <p className="text-sm font-medium">{user.profile?.zip || "-"}</p>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Member Since</span>
                  <p className="text-sm font-medium">{createdAt}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Section - Only for Mobile Banking */}
        {context === "MOBILE_BANKING" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Accounts</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {accounts.length} linked account{accounts.length === 1 ? "" : "s"}
                    {primaryAccount && ` • Primary: ${primaryAccount.accountNumber}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowLinkAccount(!showLinkAccount)}
                  disabled={linkingAccount}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Link Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkAccount && (
                <div className="mb-4 p-4 border rounded-lg space-y-3">
                  <h3 className="font-medium text-sm">Link New Account</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Account Number *"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Account Name (optional)"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Account Type (e.g. SAVINGS, CURRENT)"
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleLinkAccount}
                      disabled={linkingAccount || !newAccountNumber.trim()}
                    >
                      {linkingAccount ? "Linking..." : "Link Account"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowLinkAccount(false);
                        setNewAccountNumber("");
                        setNewAccountName("");
                        setNewAccountType("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {accountsLoading ? (
                <p className="text-sm text-muted-foreground">Loading accounts...</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accounts linked</p>
              ) : (
                <DataTable
                  data={accounts}
                  columns={accountsColumns}
                  searchableKeys={["accountNumber", "accountName", "accountType", "categoryName"]}
                  initialSortKey="accountNumber"
                  pageSize={10}
                  searchPlaceholder="Search accounts..."
                  showRowNumbers
                  rowNumberHeader="#"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Devices Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Devices</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeDevices.length} active device{activeDevices.length === 1 ? "" : "s"}
                  {pendingDevices.length > 0 &&
                    ` • ${pendingDevices.length} pending device${pendingDevices.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDevices()}
                disabled={devicesLoading}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <p className="text-sm text-muted-foreground">Loading devices...</p>
            ) : devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No devices have been registered for this user yet.
              </p>
            ) : (
              <DataTable
                data={devices}
                columns={devicesColumns}
                searchableKeys={["name", "model", "os", "deviceId"]}
                initialSortKey="lastUsedAt"
                pageSize={10}
                searchPlaceholder="Search devices..."
                showRowNumbers
                rowNumberHeader="#"
              />
            )}
          </CardContent>
        </Card>

        {/* Beneficiaries Sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bank Beneficiaries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bank Beneficiaries</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {beneficiaries.filter((b: any) => b.beneficiaryType.includes("BANK")).length} records
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`${basePath}/${id}/beneficiaries?type=BANK`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`${basePath}/${id}/beneficiaries/new?type=BANK`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {beneficiariesLoading ? (
                <p className="text-sm text-muted-foreground">Loading bank beneficiaries...</p>
              ) : beneficiaries.filter((b: any) => b.beneficiaryType.includes("BANK")).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No bank beneficiaries found.</p>
              ) : (
                <DataTable
                  data={beneficiaries.filter((b: any) => b.beneficiaryType.includes("BANK"))}
                  columns={bankBeneficiaryColumns}
                  searchableKeys={["name", "accountNumber"]}
                  initialSortKey="name"
                  pageSize={5}
                  searchPlaceholder="Search bank..."
                  showRowNumbers
                />
              )}
            </CardContent>
          </Card>

          {/* Wallet Beneficiaries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Wallet Beneficiaries</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {beneficiaries.filter((b: any) => b.beneficiaryType.includes("WALLET")).length} records
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`${basePath}/${id}/beneficiaries?type=WALLET`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`${basePath}/${id}/beneficiaries/new?type=WALLET`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {beneficiariesLoading ? (
                <p className="text-sm text-muted-foreground">Loading wallet beneficiaries...</p>
              ) : beneficiaries.filter((b: any) => b.beneficiaryType.includes("WALLET")).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No wallet beneficiaries found.</p>
              ) : (
                <DataTable
                  data={beneficiaries.filter((b: any) => b.beneficiaryType.includes("WALLET"))}
                  columns={walletBeneficiaryColumns}
                  searchableKeys={["name", "phoneNumber"]}
                  initialSortKey="name"
                  pageSize={5}
                  searchPlaceholder="Search wallet..."
                  showRowNumbers
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
