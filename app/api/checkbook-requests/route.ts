import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { CheckbookRequestCreate, CheckbookRequestFilters } from '@/types/checkbook';

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
  const normalized = (status ?? CheckbookRequestStatus.PENDING).toString().toUpperCase();
  const values = Object.values(CheckbookRequestStatus);
  return values.includes(normalized as CheckbookRequestStatus)
    ? (normalized as CheckbookRequestStatus)
    : CheckbookRequestStatus.PENDING;
}

function mapUiStatusToDb(status: CheckbookRequestStatus): string {
  return status;
}

/**
 * GET /api/checkbook-requests
 * List all checkbook requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') as CheckbookRequestStatus | 'ALL' | null;
    const accountNumber = searchParams.get('accountNumber');
    const mobileUserId = searchParams.get('mobileUserId');

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = mapUiStatusToDb(status);
    }

    if (accountNumber) {
      where.accountNumber = accountNumber;
    }

    if (mobileUserId) {
      where.mobileUserId = Number(mobileUserId);
    }

    const [requests, total] = await Promise.all([
      prisma.checkbookRequest.findMany({
        where,
        include: {
          mobileUser: {
            select: {
              id: true,
              username: true,
              phoneNumber: true,
              customerNumber: true,
            },
          },
          approvedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          requestedAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.checkbookRequest.count({ where }),
    ]);

    type CheckbookRequestWithRelations = Prisma.CheckbookRequestGetPayload<{
      include: {
        mobileUser: {
          select: {
            id: true;
            username: true;
            phoneNumber: true;
            customerNumber: true;
          };
        };
        approvedByUser: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>;

    const mappedRequests = (requests as CheckbookRequestWithRelations[]).map((r) => {
      return {
        id: Number(r.id),
        mobileUserId: r.mobileUserId ?? null,
        mobileUser: r.mobileUser
          ? {
              id: Number(r.mobileUser.id),
              username: r.mobileUser.username ?? null,
              phoneNumber: r.mobileUser.phoneNumber ?? null,
              customerNumber: r.mobileUser.customerNumber ?? null,
            }
          : {
              id: 0,
              username: null,
              phoneNumber: null,
              customerNumber: null,
            },
        approvedByUser: r.approvedByUser
          ? {
              id: Number(r.approvedByUser.id),
              name: r.approvedByUser.name ?? null,
              email: r.approvedByUser.email,
            }
          : null,
        accountNumber: r.accountNumber,
        numberOfCheckbooks: r.numberOfCheckbooks,
        collectionPoint: r.collectionPoint,
        status: mapDbStatusToUi(r.status),
        requestedAt: r.requestedAt,
        approvedAt: r.approvedAt,
        readyAt: null,
        collectedAt: r.collectedAt,
        cancelledAt: null,
        rejectedAt: null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        notes: r.notes ?? null,
        rejectionReason: r.rejectionReason ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: mappedRequests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching checkbook requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch checkbook requests',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/checkbook-requests
 * Create a new checkbook request
 */
export async function POST(request: NextRequest) {
  try {
    const body: CheckbookRequestCreate = await request.json();

    // Validate required fields
    if (!body.mobileUserId || !body.accountNumber || !body.collectionPoint) {
      return NextResponse.json(
        { success: false, error: 'mobileUserId, accountNumber, and collectionPoint are required' },
        { status: 400 }
      );
    }

    const checkbookRequest = await prisma.checkbookRequest.create({
      data: {
        mobileUserId: body.mobileUserId,
        accountNumber: body.accountNumber,
        numberOfCheckbooks: Math.max(1, body.numberOfCheckbooks || 1),
        collectionPoint: body.collectionPoint,
        status: CheckbookRequestStatus.PENDING,
        notes: body.notes ?? null,
      },
      include: {
        mobileUser: {
          select: {
            id: true,
            username: true,
            phoneNumber: true,
            customerNumber: true,
          },
        },
      },
    });

    const mapped = {
      id: Number(checkbookRequest.id),
      mobileUserId: checkbookRequest.mobileUserId ?? null,
      mobileUser: checkbookRequest.mobileUser
        ? {
            id: Number(checkbookRequest.mobileUser.id),
            username: checkbookRequest.mobileUser.username ?? null,
            phoneNumber: checkbookRequest.mobileUser.phoneNumber ?? null,
            customerNumber: checkbookRequest.mobileUser.customerNumber ?? null,
          }
        : {
            id: 0,
            username: null,
            phoneNumber: null,
            customerNumber: null,
          },
      accountNumber: checkbookRequest.accountNumber,
      numberOfCheckbooks: checkbookRequest.numberOfCheckbooks,
      collectionPoint: checkbookRequest.collectionPoint,
      status: mapDbStatusToUi(checkbookRequest.status),
      requestedAt: checkbookRequest.requestedAt,
      approvedAt: checkbookRequest.approvedAt,
      readyAt: null,
      collectedAt: checkbookRequest.collectedAt,
      cancelledAt: null,
      rejectedAt: null,
      createdAt: checkbookRequest.createdAt,
      updatedAt: checkbookRequest.updatedAt,
      notes: checkbookRequest.notes ?? null,
      rejectionReason: checkbookRequest.rejectionReason ?? null,
    };

    return NextResponse.json({
      success: true,
      data: mapped,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating checkbook request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkbook request',
      },
      { status: 500 }
    );
  }
}
