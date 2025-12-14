"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CheckbookRequestsMenu({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);

  const isActive = pathname?.startsWith("/mobile-banking/checkbook-requests");

  React.useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/checkbook-requests/stats");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTotalCount(data.data.total);
        }
      }
    } catch (error) {
      console.error("Failed to fetch checkbook stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      asChild
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className={`w-full ${collapsed ? "justify-center" : "justify-start gap-2"}`}
    >
      <Link href="/mobile-banking/checkbook-requests">
        <BookOpen className="h-4 w-4" />
        {!collapsed && (
          <>
            <span className="flex-1">Checkbook Requests</span>
            {!loading && totalCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {totalCount}
              </Badge>
            )}
          </>
        )}
      </Link>
    </Button>
  );
}
