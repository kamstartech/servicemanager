"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

export default function DashboardPage() {
  const { translate } = useI18n();

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {translate("dashboard.title")}
        </h1>
        <p className="text-muted-foreground">
          {translate("dashboard.subtitle")}
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{translate("dashboard.mobileBanking.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {translate("dashboard.mobileBanking.description")}
              </p>
              <div>
                <Button asChild>
                  <Link href="/mobile-banking/users">
                    {translate("dashboard.mobileBanking.cta")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{translate("dashboard.wallet.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {translate("dashboard.wallet.description")}
              </p>
              <div>
                <Button asChild variant="outline">
                  <Link href="/wallet/users">
                    {translate("dashboard.wallet.cta")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
