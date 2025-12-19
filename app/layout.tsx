import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GraphQLProvider } from "@/components/providers/graphql-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AppToaster } from "@/components/ui/app-toaster";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/navigation-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <GraphQLProvider>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            <div id="fdh-app-shell">
              {children}
              <AppToaster />
            </div>
          </GraphQLProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
