"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Users,
  CreditCard,
  Smartphone,
  Activity,
  UserPlus,
  CheckSquare,
  Receipt,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalMobileUsers: number;
  totalAccounts: number;
  totalDevices: number;
  totalSessions: number;
  activeSessions: number;
  totalLoginAttempts: number;
  totalBeneficiaries: number;
  totalRegistrationRequests: number;
  pendingRegistrations: number;
  totalCheckbookRequests: number;
  pendingCheckbooks: number;
  totalBillerTransactions: number;
  completedBillerTransactions: number;
  failedBillerTransactions: number;
  updatedAt: string;
}

const statCards = [
  {
    title: "Active Sessions",
    key: "activeSessions" as keyof DashboardStats,
    icon: Activity,
    color: "bg-blue-500",
    link: null,
  },
  {
    title: "Total Mobile Users",
    key: "totalMobileUsers" as keyof DashboardStats,
    icon: Users,
    color: "bg-fdh-orange",
    link: "/mobile-banking/users",
  },
  {
    title: "Total Accounts",
    key: "totalAccounts" as keyof DashboardStats,
    icon: CreditCard,
    color: "bg-fdh-orange",
    link: "/mobile-banking/accounts",
  },
  {
    title: "Total Devices",
    key: "totalDevices" as keyof DashboardStats,
    icon: Smartphone,
    color: "bg-fdh-orange",
    link: null,
  },
  {
    title: "Registration Requests",
    key: "totalRegistrationRequests" as keyof DashboardStats,
    secondaryKey: "pendingRegistrations" as keyof DashboardStats,
    icon: UserPlus,
    color: "bg-fdh-orange",
    link: "/mobile-banking/registration-requests",
    showBadge: true,
  },
  {
    title: "Checkbook Requests",
    key: "totalCheckbookRequests" as keyof DashboardStats,
    secondaryKey: "pendingCheckbooks" as keyof DashboardStats,
    icon: CheckSquare,
    color: "bg-fdh-orange",
    link: "/mobile-banking/checkbook-requests",
    showBadge: true,
  },
  {
    title: "Biller Transactions",
    key: "totalBillerTransactions" as keyof DashboardStats,
    secondaryKey: "completedBillerTransactions" as keyof DashboardStats,
    icon: Receipt,
    color: "bg-fdh-orange",
    link: "/mobile-banking/billers",
    showSuccess: true,
  },
  {
    title: "Login Attempts",
    key: "totalLoginAttempts" as keyof DashboardStats,
    icon: AlertCircle,
    color: "bg-fdh-orange",
    link: "/mobile-banking/login-attempts",
  },
];

export function DashboardStatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // Refresh every 15 seconds
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div>Failed to load statistics</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];
        const secondaryValue = card.secondaryKey
          ? stats[card.secondaryKey]
          : null;

        const CardWrapper = card.link ? Link : "div";
        const cardProps = card.link
          ? { href: card.link, className: "block" }
          : { className: "block" };

        return (
          <CardWrapper key={card.key as string} {...cardProps}>
            <Card className="transition duration-300 hover:shadow-lg hover:scale-105 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    {card.title}
                  </h3>
                  <div
                    className={`${card.color} text-white p-2 rounded-full transition duration-300 hover:rotate-12`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof value === "number" ? value.toLocaleString() : value}
                  {card.showBadge && secondaryValue !== null && (
                    <span className="ml-2 text-sm font-normal text-yellow-600">
                      ({secondaryValue} pending)
                    </span>
                  )}
                  {card.showSuccess && secondaryValue !== null && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      ({secondaryValue} completed)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </CardWrapper>
        );
      })}
    </div>
  );
}
