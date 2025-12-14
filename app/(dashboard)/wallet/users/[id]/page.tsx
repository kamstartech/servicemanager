"use client";

import { UserDetails } from "@/components/users/user-details";

export default function WalletUserDetailsPage() {
  return (
    <UserDetails
      context="WALLET"
      backHref="/wallet/users"
      title="Wallet user details"
    />
  );
}
