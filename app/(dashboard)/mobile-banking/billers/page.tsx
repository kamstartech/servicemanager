import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BillerType } from "@prisma/client";
import { billerTransactionService } from "@/lib/services/billers/transactions";
import { Receipt, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

type BillerConfigRow = {
  id: string;
  billerType: string;
  billerName: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  timeoutMs: number;
  retryAttempts: number;
};

type BillerStatsRow = {
  billerType: string;
  status: string;
  _count: {
    _all: number;
  };
};

function encodeQueryParam(value: string) {
  return encodeURIComponent(value);
}

async function testAirtelAirtimeTopup(formData: FormData) {
  "use server";

  const accountNumberRaw = (formData.get("accountNumber") || "").toString().trim();
  const amountRaw = (formData.get("amount") || "").toString().trim();
  const confirm = (formData.get("confirm") || "").toString().trim();

  const accountNumber = accountNumberRaw.replace(/^\+/, "");

  if (!accountNumber) {
    redirect(`/mobile-banking/billers?test=error&message=${encodeQueryParam("Phone number is required")}`);
  }

  if (!amountRaw) {
    redirect(`/mobile-banking/billers?test=error&message=${encodeQueryParam("Amount is required")}`);
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/mobile-banking/billers?test=error&message=${encodeQueryParam("Amount must be a positive number")}`);
  }

  if (confirm !== "TOPUP") {
    redirect(
      `/mobile-banking/billers?test=error&message=${encodeQueryParam("Type TOPUP to confirm airtime test")}`
    );
  }

  let test: "success" | "error" = "success";
  let message = "Airtel airtime topup initiated";

  try {
    const config = await prisma.billerConfig.findUnique({
      where: { billerType: BillerType.AIRTEL_VALIDATION, isActive: true },
    });

    if (!config) {
      throw new Error("Airtel config not found or inactive");
    }

    const result = await billerTransactionService.processPayment(BillerType.AIRTEL_VALIDATION, {
      accountNumber,
      amount,
      currency: config.defaultCurrency || "MWK",
      metadata: {
        source: "admin_test",
      },
    });

    if (!result.success) {
      throw new Error(result.error || "Airtel topup failed");
    }
  } catch (e: any) {
    test = "error";
    message = e?.message || "Airtel topup failed";
  }

  redirect(`/mobile-banking/billers?test=${test}&message=${encodeQueryParam(message)}`);
}

export default async function BillersPage({
  searchParams,
}: {
  searchParams?: Promise<{ test?: string; message?: string }>;
}) {
  const sp = (await searchParams) || {};
  const configs = (await prisma.billerConfig.findMany({
    orderBy: { billerName: "asc" },
  })) as BillerConfigRow[];

  const stats = await prisma.billerTransaction.groupBy({
    by: ["billerType", "status"] as const,
    _count: {
      _all: true,
    },
  }) as unknown as BillerStatsRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billers</h1>
          <p className="text-muted-foreground">
            Manage biller configurations and transactions
          </p>
        </div>
      </div>

      {sp.test && sp.message && (
        <Card className={sp.test === "success" ? "border-emerald-200 bg-emerald-50/50" : "border-destructive/30 bg-destructive/10"}>
          <CardContent className="py-4 text-sm">
            <div className={sp.test === "success" ? "text-emerald-900" : "text-destructive"}>{sp.message}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Setup</CardTitle>
          <CardDescription>
            Create the default Airtel/TNM configurations directly from this page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Airtime topups are tested and managed under <a className="underline" href="/services">Services Overview</a>.
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billers</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.length}</div>
            <p className="text-xs text-muted-foreground">
              {configs.filter((c) => c.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((acc, s) => acc + s._count._all, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {
                stats
                  .filter((s) => s.status === "COMPLETED")
                  .reduce((acc, s) => acc + s._count._all, 0)
              }{" "}
              completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.length > 0
                ? Math.round(
                  (stats
                    .filter((s) => s.status === "COMPLETED")
                    .reduce((acc, s) => acc + s._count._all, 0) /
                    stats.reduce((acc, s) => acc + s._count._all, 0)) *
                  100
                )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Billers List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Biller Configurations</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => {
            const configStats = stats.filter(
              (s) => s.billerType === config.billerType
            );
            const totalTx = configStats.reduce((acc, s) => acc + s._count._all, 0);
            const completedTx = configStats
              .filter((s) => s.status === "COMPLETED")
              .reduce((acc, s) => acc + s._count._all, 0);

            return (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {config.displayName}
                      </CardTitle>
                      <CardDescription>{config.billerName}</CardDescription>
                    </div>
                    <Badge variant={config.isActive ? "default" : "secondary"}>
                      {config.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{config.billerType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Transactions:
                      </span>
                      <span className="font-medium">{totalTx}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Success Rate:
                      </span>
                      <span className="font-medium">
                        {totalTx > 0
                          ? Math.round((completedTx / totalTx) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timeout:</span>
                      <span className="font-medium">
                        {config.timeoutMs / 1000}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Retries:</span>
                      <span className="font-medium">
                        {config.retryAttempts}
                      </span>
                    </div>
                  </div>

                  {config.description && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  )}

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg">📋 Using Workflow Forms</CardTitle>
          <CardDescription>
            Biller configurations are managed through the workflow system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>To add or edit biller configurations:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>
              Go to{" "}
              <a
                href="/system/workflows"
                className="text-blue-600 hover:underline font-medium"
              >
                System → Workflows
              </a>
            </li>
            <li>Create a workflow with a FORM step</li>
            <li>Select "Biller Configuration Form"</li>
            <li>Fill out the form and submit</li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Or use the API:{" "}
            <code className="bg-white px-1 py-0.5 rounded">
              POST /api/billers/configs
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
