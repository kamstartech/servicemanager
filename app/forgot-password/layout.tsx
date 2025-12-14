import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password - FDH Bank Admin Panel",
  description: "Reset your admin account password",
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
