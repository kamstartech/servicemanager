"use client";

import { LoginAttemptsTable } from "@/components/users/login-attempts-table";
import { useI18n } from "@/components/providers/i18n-provider";

export default function WalletLoginAttemptsPage() {
  const { translate } = useI18n();

  return (
    <LoginAttemptsTable
      context="WALLET"
      title={translate("wallet.loginAttempts.title")}
      searchPlaceholder={translate("wallet.loginAttempts.searchPlaceholder")}
    />
  );
}
