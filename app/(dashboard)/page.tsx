"use client";

import { DashboardStatsCards } from "@/components/dashboard/stats-cards";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Statistics Cards */}
      <DashboardStatsCards />
      
      {/* Future: Add charts and other visualizations here */}
      <div className="mt-6">
        <p className="text-sm text-gray-500">
          More analytics and charts coming soon...
        </p>
      </div>
    </main>
  );
}
