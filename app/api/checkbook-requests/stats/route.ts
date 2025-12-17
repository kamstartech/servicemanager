import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const CheckbookRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  READY_FOR_COLLECTION: "READY_FOR_COLLECTION",
  COLLECTED: "COLLECTED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

type CheckbookRequestStatus =
  (typeof CheckbookRequestStatus)[keyof typeof CheckbookRequestStatus];

function mapDbStatusToUi(status: string | null | undefined): CheckbookRequestStatus {
  const normalized = (status ?? "pending").toLowerCase();

  if (normalized === "pending") return CheckbookRequestStatus.PENDING;
  if (normalized === "approved") return CheckbookRequestStatus.APPROVED;
  if (normalized === "ready_for_collection" || normalized === "ready") {
    return CheckbookRequestStatus.READY_FOR_COLLECTION;
  }
  if (normalized === "fulfilled" || normalized === "collected") {
    return CheckbookRequestStatus.COLLECTED;
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return CheckbookRequestStatus.CANCELLED;
  }
  if (normalized === "rejected") return CheckbookRequestStatus.REJECTED;

  return CheckbookRequestStatus.PENDING;
}

/**
 * GET /api/checkbook-requests/stats
 * Get count of requests by status
 */
export async function GET() {
  try {
    const total = await prisma.checkbookRequest.count();

    const grouped = await prisma.checkbookRequest.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });

    const base: Record<CheckbookRequestStatus, number> = {
      [CheckbookRequestStatus.PENDING]: 0,
      [CheckbookRequestStatus.APPROVED]: 0,
      [CheckbookRequestStatus.READY_FOR_COLLECTION]: 0,
      [CheckbookRequestStatus.COLLECTED]: 0,
      [CheckbookRequestStatus.CANCELLED]: 0,
      [CheckbookRequestStatus.REJECTED]: 0,
    };

    for (const row of grouped) {
      const key = mapDbStatusToUi(row.status);
      base[key] += row._count._all;
    }

    const stats = {
      total,
      ...base,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching checkbook stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    );
  }
}
