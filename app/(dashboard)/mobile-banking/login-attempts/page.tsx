"use client";

import { LoginAttemptsTable } from "@/components/users/login-attempts-table";

export default function MobileBankingLoginAttemptsPage() {
  return (
    <LoginAttemptsTable
      context="MOBILE_BANKING"
      title="Mobile Banking Login Attempts"
      searchPlaceholder="Search by username or phone..."
    />
  );
}
