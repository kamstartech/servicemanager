"use client";

import React, { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Receipt, Bell, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const GET_ACCOUNT_DETAILS = gql`
  query GetAccountDetails($accountNumber: String!) {
    mobileUserAccount(accountNumber: $accountNumber) {
      id
      accountNumber
      accountName
      accountType
      currency
      categoryId
      categoryName
      accountStatus
      holderName
      balance
      workingBalance
      isPrimary
      isActive
      mobileUserId
      createdAt
      updatedAt
    }
    accountAlertSettings(accountNumber: $accountNumber) {
      id
      lowBalanceEnabled
      lowBalanceThreshold
      largeTransactionEnabled
      largeTransactionThreshold
      largeTransactionDebitOnly
      alertUnusualLocation
      alertMultipleFailedAttempts
      alertNewDeviceTransaction
      paymentDueEnabled
      paymentReminderInterval
      loginAlertMode
    }
  }
`;

const UPDATE_ALERT_SETTINGS = gql`
  mutation UpdateAlertSettings($settings: AccountAlertSettingsInput!) {
    updateAccountAlertSettings(settings: $settings) {
      id
      accountNumber
    }
  }
`;

interface Account {
  id: string;
  accountNumber: string;
  accountName?: string | null;
  accountType?: string | null;
  currency: string;
  categoryId?: string | null;
  categoryName?: string | null;
  accountStatus?: string | null;
  holderName?: string | null;
  balance?: number | null;
  workingBalance?: number | null;
  isPrimary: boolean;
  isActive: boolean;
  mobileUserId: string;
  createdAt: string;
  updatedAt: string;
}

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const accountNumber = params.accountNumber as string;

  const { data, loading, error, refetch } = useQuery(GET_ACCOUNT_DETAILS, {
    variables: { accountNumber },
    skip: !accountNumber,
  });

  const [updateSettings, { loading: updating }] = useMutation(UPDATE_ALERT_SETTINGS);

  const account: Account | undefined = data?.mobileUserAccount;
  const alertSettings = data?.accountAlertSettings;

  // Initialize with defaults, will be overridden when data loads
  const [formData, setFormData] = useState<any>({
    lowBalanceEnabled: true,
    lowBalanceThreshold: "",
    largeTransactionEnabled: true,
    largeTransactionThreshold: "",
    largeTransactionDebitOnly: true,
    alertUnusualLocation: true,
    alertMultipleFailedAttempts: true,
    alertNewDeviceTransaction: true,
    paymentDueEnabled: true,
    paymentReminderInterval: "ONE_DAY",
    loginAlertMode: "NEW_DEVICE",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when alert settings load from DB
  React.useEffect(() => {
    if (alertSettings) {
      setFormData({
        lowBalanceEnabled: alertSettings.lowBalanceEnabled ?? true,
        lowBalanceThreshold: alertSettings.lowBalanceThreshold || "",
        largeTransactionEnabled: alertSettings.largeTransactionEnabled ?? true,
        largeTransactionThreshold: alertSettings.largeTransactionThreshold || "",
        largeTransactionDebitOnly: alertSettings.largeTransactionDebitOnly ?? true,
        alertUnusualLocation: alertSettings.alertUnusualLocation ?? true,
        alertMultipleFailedAttempts: alertSettings.alertMultipleFailedAttempts ?? true,
        alertNewDeviceTransaction: alertSettings.alertNewDeviceTransaction ?? true,
        paymentDueEnabled: alertSettings.paymentDueEnabled ?? true,
        paymentReminderInterval: alertSettings.paymentReminderInterval || "ONE_DAY",
        loginAlertMode: alertSettings.loginAlertMode || "NEW_DEVICE",
      });
    }
  }, [alertSettings]);

  const handleSaveAlerts = async () => {
    // Clear previous errors
    setErrors({});
    
    // Validation
    const validationErrors: Record<string, string> = {};

    // Validate low balance threshold
    if (formData.lowBalanceEnabled) {
      if (!formData.lowBalanceThreshold || formData.lowBalanceThreshold === "") {
        validationErrors.lowBalanceThreshold = "Threshold is required when alert is enabled";
      } else if (parseFloat(formData.lowBalanceThreshold) <= 0) {
        validationErrors.lowBalanceThreshold = "Threshold must be greater than 0";
      }
    }

    // Validate large transaction threshold
    if (formData.largeTransactionEnabled) {
      if (!formData.largeTransactionThreshold || formData.largeTransactionThreshold === "") {
        validationErrors.largeTransactionThreshold = "Threshold is required when alert is enabled";
      } else if (parseFloat(formData.largeTransactionThreshold) <= 0) {
        validationErrors.largeTransactionThreshold = "Threshold must be greater than 0";
      }
    }

    // Validate payment reminder interval is selected
    if (formData.paymentDueEnabled && !formData.paymentReminderInterval) {
      validationErrors.paymentReminderInterval = "Reminder interval must be selected";
    }

    // Validate login alert mode is selected
    if (!formData.loginAlertMode) {
      validationErrors.loginAlertMode = "Login alert mode must be selected";
    }

    // Show validation errors
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      alert("Please fix the validation errors highlighted in the form");
      return;
    }

    try {
      await updateSettings({
        variables: {
          settings: {
            accountNumber,
            ...formData,
          },
        },
      });
      await refetch();
      alert("Alert settings updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update alert settings");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <p className="text-sm text-muted-foreground">Loading account details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Error: {error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => refetch()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Account not found</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Account Details</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{account.accountNumber}</span>
            </p>
          </div>
        </div>

        {/* Account Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Account Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="font-mono font-medium">{account.accountNumber}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Holder Name</p>
                <p className="font-medium">{account.holderName || account.accountName || "-"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Account Type</p>
                <Badge variant="outline">{account.accountType || "N/A"}</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <div>
                  <p className="font-medium">{account.categoryName || "N/A"}</p>
                  {account.categoryId && (
                    <p className="text-xs text-muted-foreground">ID: {account.categoryId}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                {account.balance != null ? (
                  <div>
                    <p className="font-semibold text-lg">
                      {account.currency} {parseFloat(String(account.balance)).toLocaleString()}
                    </p>
                    {account.workingBalance != null && account.workingBalance !== account.balance && (
                      <p className="text-xs text-muted-foreground">
                        Working: {account.currency} {parseFloat(String(account.workingBalance)).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex gap-2 flex-wrap">
                  {account.isPrimary && (
                    <Badge variant="default">Primary</Badge>
                  )}
                  {account.accountStatus && (
                    <Badge
                      variant={
                        account.accountStatus.toLowerCase() === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {account.accountStatus}
                    </Badge>
                  )}
                  {!account.isActive && (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p className="font-medium">{account.currency}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Mobile User ID</p>
                <p className="font-mono text-sm">{account.mobileUserId}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="text-sm">
                  {new Date(account.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm">
                  {new Date(account.updatedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => router.push(`/mobile-banking/accounts/${account.accountNumber}/transactions`)}
              >
                <Receipt className="h-4 w-4 mr-2" />
                View Transactions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Account Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Primary Account</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Set this account as the primary account for the user
                </p>
                <Button
                  variant={account.isPrimary ? "secondary" : "outline"}
                  size="sm"
                  disabled={account.isPrimary}
                >
                  {account.isPrimary ? "Currently Primary" : "Set as Primary"}
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Account Status</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Activate or deactivate this account for mobile banking access
                </p>
                <Button
                  variant={account.isActive ? "destructive" : "default"}
                  size="sm"
                >
                  {account.isActive ? "Deactivate Account" : "Activate Account"}
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Sync with T24</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Manually sync account details and balance with T24 Core Banking
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Sync Now
                </Button>
              </div>

              <div className="border rounded-lg p-4 border-destructive/50">
                <h3 className="font-semibold mb-2 text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Remove this account from mobile banking access
                </p>
                <Button variant="destructive" size="sm">
                  Remove Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Account Alerts</CardTitle>
              </div>
              <Button onClick={handleSaveAlerts} disabled={updating} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {updating ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Low Balance Alert */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Low Balance Alert</h3>
                    <p className="text-sm text-muted-foreground">
                      Notify when balance falls below threshold
                    </p>
                  </div>
                  <Switch
                    checked={formData.lowBalanceEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, lowBalanceEnabled: checked })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowBalanceThreshold">
                    Threshold ({account?.currency || "MWK"})
                  </Label>
                  <Input
                    id="lowBalanceThreshold"
                    type="number"
                    placeholder="5000"
                    value={formData.lowBalanceThreshold}
                    onChange={(e) => {
                      setFormData({ ...formData, lowBalanceThreshold: e.target.value });
                      if (errors.lowBalanceThreshold) {
                        setErrors({ ...errors, lowBalanceThreshold: "" });
                      }
                    }}
                    disabled={!formData.lowBalanceEnabled}
                    className={errors.lowBalanceThreshold ? "border-red-500" : ""}
                  />
                  {errors.lowBalanceThreshold && (
                    <p className="text-sm text-red-500">{errors.lowBalanceThreshold}</p>
                  )}
                </div>
              </div>

              {/* Large Transaction Alert */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Large Transaction Alert</h3>
                    <p className="text-sm text-muted-foreground">
                      Notify when transaction exceeds threshold
                    </p>
                  </div>
                  <Switch
                    checked={formData.largeTransactionEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, largeTransactionEnabled: checked })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="largeTransactionThreshold">
                      Threshold ({account?.currency || "MWK"})
                    </Label>
                    <Input
                      id="largeTransactionThreshold"
                      type="number"
                      placeholder="50000"
                      value={formData.largeTransactionThreshold}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          largeTransactionThreshold: e.target.value,
                        });
                        if (errors.largeTransactionThreshold) {
                          setErrors({ ...errors, largeTransactionThreshold: "" });
                        }
                      }}
                      disabled={!formData.largeTransactionEnabled}
                      className={errors.largeTransactionThreshold ? "border-red-500" : ""}
                    />
                    {errors.largeTransactionThreshold && (
                      <p className="text-sm text-red-500">{errors.largeTransactionThreshold}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="debitOnly"
                      checked={formData.largeTransactionDebitOnly}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, largeTransactionDebitOnly: checked })
                      }
                      disabled={!formData.largeTransactionEnabled}
                    />
                    <Label htmlFor="debitOnly">Alert only for debits</Label>
                  </div>
                </div>
              </div>

              {/* Suspicious Activity */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">Suspicious Activity</h3>
                  <Badge variant="destructive" className="text-xs">
                    Security
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Get notified about unusual account activity
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="unusualLocation"
                      checked={formData.alertUnusualLocation}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, alertUnusualLocation: checked })
                      }
                    />
                    <Label htmlFor="unusualLocation">Unusual location (&gt;100km)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="failedAttempts"
                      checked={formData.alertMultipleFailedAttempts}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, alertMultipleFailedAttempts: checked })
                      }
                    />
                    <Label htmlFor="failedAttempts">Multiple failed logins</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="newDeviceTransaction"
                      checked={formData.alertNewDeviceTransaction}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, alertNewDeviceTransaction: checked })
                      }
                    />
                    <Label htmlFor="newDeviceTransaction">Transaction from new device</Label>
                  </div>
                </div>
              </div>

              {/* Payment Due Reminders */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Payment Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                      Remind about upcoming payments
                    </p>
                  </div>
                  <Switch
                    checked={formData.paymentDueEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, paymentDueEnabled: checked })
                    }
                  />
                </div>
                <div>
                  <RadioGroup
                    value={formData.paymentReminderInterval}
                    onValueChange={(value) => {
                      setFormData({ ...formData, paymentReminderInterval: value });
                      if (errors.paymentReminderInterval) {
                        setErrors({ ...errors, paymentReminderInterval: "" });
                      }
                    }}
                    disabled={!formData.paymentDueEnabled}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONE_WEEK" id="oneWeek" />
                      <Label htmlFor="oneWeek">1 week before</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="THREE_DAYS" id="threeDays" />
                      <Label htmlFor="threeDays">3 days before</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ONE_DAY" id="oneDay" />
                      <Label htmlFor="oneDay">1 day before</Label>
                    </div>
                  </RadioGroup>
                  {errors.paymentReminderInterval && (
                    <p className="text-sm text-red-500 mt-2">{errors.paymentReminderInterval}</p>
                  )}
                </div>
              </div>

              {/* Login Notifications */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Login Notifications</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Get notified about login activity
                </p>
                <div>
                  <RadioGroup
                    value={formData.loginAlertMode}
                    onValueChange={(value) => {
                      setFormData({ ...formData, loginAlertMode: value });
                      if (errors.loginAlertMode) {
                        setErrors({ ...errors, loginAlertMode: "" });
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="EVERY_LOGIN" id="everyLogin" />
                      <Label htmlFor="everyLogin">Every login</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NEW_DEVICE" id="newDevice" />
                      <Label htmlFor="newDevice">New device only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NEW_LOCATION" id="newLocation" />
                      <Label htmlFor="newLocation">New location only</Label>
                    </div>
                  </RadioGroup>
                  {errors.loginAlertMode && (
                    <p className="text-sm text-red-500 mt-2">{errors.loginAlertMode}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
