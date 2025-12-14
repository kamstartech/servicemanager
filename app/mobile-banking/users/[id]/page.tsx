"use client";

import { UserDetails } from "@/components/users/user-details";

export default function MobileBankingUserDetailsPage() {
  return (
    <UserDetails
      context="MOBILE_BANKING"
      backHref="/mobile-banking/users"
      title="Mobile banking user details"
    />
  );
}
