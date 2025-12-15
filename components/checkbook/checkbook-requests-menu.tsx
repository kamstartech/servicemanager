"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CheckbookRequestsMenu({
  collapsed,
  label,
}: {
  collapsed: boolean;
  label: string;
}) {
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
      variant="ghost"
      size="sm"
      className={`w-full text-white transition-all duration-300 ${
        collapsed ? "justify-center px-2" : "justify-start gap-2"
      } ${
        isActive 
          ? "bg-fdh-light-blue" 
          : "hover:bg-white/20 hover:translate-x-1"
      }`}
    >
      <Link href="/mobile-banking/checkbook-requests">
        <BookOpen className="h-4 w-4 shrink-0 text-fdh-orange" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {!loading && totalCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs bg-fdh-orange text-white">
                {totalCount}
              </Badge>
            )}
          </>
        )}
      </Link>
    </Button>
  );
}
