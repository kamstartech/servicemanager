"use client";

import { Suspense, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyQueryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrapper component that enables lazy loading of data with Suspense.
 * Each table/component wrapped with this will load independently.
 */
export function LazyQueryWrapper({ children, fallback }: LazyQueryWrapperProps) {
  const defaultFallback = (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}
