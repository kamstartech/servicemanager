import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password - FDH Bank Admin Panel",
  description: "Set a new password for your admin account",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
