"use client";

import { UsersTable } from "@/components/users/users-table";

export default function WalletUsersPage() {
  return (
    <UsersTable
      context="WALLET"
      title="Wallet Users"
      searchPlaceholder="Search wallet users..."
    />
  );
}
