import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { CheckbookRequestStatus } from '@prisma/client';

/**
 * GET /api/checkbook-requests/stats
 * Get count of requests by status
 */
export async function GET() {
  try {
    const [total, ...statusCounts] = await Promise.all([
      prisma.checkbookRequest.count(),
      ...Object.values(CheckbookRequestStatus).map(status =>
        prisma.checkbookRequest.count({
          where: { status },
        })
      ),
    ]);

    const stats = {
      total,
      [CheckbookRequestStatus.PENDING]: statusCounts[0],
      [CheckbookRequestStatus.APPROVED]: statusCounts[1],
      [CheckbookRequestStatus.READY_FOR_COLLECTION]: statusCounts[2],
      [CheckbookRequestStatus.COLLECTED]: statusCounts[3],
      [CheckbookRequestStatus.CANCELLED]: statusCounts[4],
      [CheckbookRequestStatus.REJECTED]: statusCounts[5],
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
