"use client";

import { UsersTable } from "@/components/users/users-table";

export default function MobileBankingUsersPage() {
  return (
    <UsersTable
      context="MOBILE_BANKING"
      title="Mobile banking users"
      searchPlaceholder="Search mobile banking users"
    />
  );
}
