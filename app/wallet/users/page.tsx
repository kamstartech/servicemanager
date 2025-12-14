"use client";

import { UsersTable } from "@/components/users/users-table";
import { useI18n } from "@/components/providers/i18n-provider";

export default function WalletUsersPage() {
  const { translate } = useI18n();

  return (
    <UsersTable
      context="WALLET"
      title={translate("wallet.users.title")}
      searchPlaceholder={translate("wallet.users.searchPlaceholder")}
    />
  );
}
