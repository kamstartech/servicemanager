import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - FDH Bank Admin Panel",
  description: "Sign in to FDH Bank Admin Panel",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
