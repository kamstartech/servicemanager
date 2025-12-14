import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { GraphQLProvider } from "@/components/providers/graphql-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AppToaster } from "@/components/ui/app-toaster";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "FDH Bank Admin Panel",
  description: "Service Manager Admin Panel for FDH Bank",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} font-sans antialiased`}
      >
        <I18nProvider>
          <GraphQLProvider>
            {children}
            <AppToaster />
          </GraphQLProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
