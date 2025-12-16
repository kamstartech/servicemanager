import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
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

function mapUiStatusToDb(status: CheckbookRequestStatus): string {
  switch (status) {
    case CheckbookRequestStatus.PENDING:
      return "pending";
    case CheckbookRequestStatus.APPROVED:
      return "approved";
    case CheckbookRequestStatus.READY_FOR_COLLECTION:
      return "ready_for_collection";
    case CheckbookRequestStatus.COLLECTED:
      return "fulfilled";
    case CheckbookRequestStatus.CANCELLED:
      return "cancelled";
    case CheckbookRequestStatus.REJECTED:
      return "rejected";
  }
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
      where.request_status = mapUiStatusToDb(status);
    }

    if (accountNumber) {
      where.account_number = accountNumber;
    }

    if (mobileUserId) {
      where.user_id = BigInt(mobileUserId);
    }

    const [requests, total] = await Promise.all([
      prisma.cheque_book_requests.findMany({
        where,
        include: {
          accounts_users: {
            select: {
              id: true,
              username: true,
              phone_number: true,
              customer_number: true,
            },
          },
        },
        orderBy: {
          inserted_at: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cheque_book_requests.count({ where }),
    ]);

    const mappedRequests = requests.map((r) => {
      const leaves = r.number_of_leaves ?? r.cheque_leaves ?? 25;
      const numberOfCheckbooks = Math.max(1, Math.ceil(leaves / 25));

      return {
        id: Number(r.id),
        mobileUserId: r.user_id ? Number(r.user_id) : null,
        mobileUser: r.accounts_users
          ? {
              id: Number(r.accounts_users.id),
              username: r.accounts_users.username ?? null,
              phoneNumber: r.accounts_users.phone_number ?? null,
              customerNumber: r.accounts_users.customer_number ?? null,
            }
          : {
              id: 0,
              username: null,
              phoneNumber: null,
              customerNumber: null,
            },
        accountNumber: r.account_number,
        numberOfCheckbooks,
        collectionPoint: r.branch_code,
        status: mapDbStatusToUi(r.request_status),
        requestedAt: r.inserted_at,
        approvedAt: r.issued_at,
        readyAt: null,
        collectedAt: r.fulfilled_at,
        cancelledAt: null,
        rejectedAt: null,
        createdAt: r.inserted_at,
        updatedAt: r.updated_at,
        notes: r.request_reason ?? null,
        rejectionReason: r.rejection_reason ?? null,
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

    const now = new Date();
    const leaves = Math.max(25, (body.numberOfCheckbooks || 1) * 25);

    const checkbookRequest = await prisma.cheque_book_requests.create({
      data: {
        account_number: body.accountNumber,
        branch_code: body.collectionPoint,
        request_status: "pending",
        inserted_at: now,
        updated_at: now,
        user_id: BigInt(body.mobileUserId),
        number_of_leaves: leaves,
        cheque_leaves: leaves,
        request_reason: body.notes ?? null,
      },
      include: {
        accounts_users: {
          select: {
            id: true,
            username: true,
            phone_number: true,
            customer_number: true,
          },
        },
      },
    });

    const mapped = {
      id: Number(checkbookRequest.id),
      mobileUserId: checkbookRequest.user_id ? Number(checkbookRequest.user_id) : null,
      mobileUser: checkbookRequest.accounts_users
        ? {
            id: Number(checkbookRequest.accounts_users.id),
            username: checkbookRequest.accounts_users.username ?? null,
            phoneNumber: checkbookRequest.accounts_users.phone_number ?? null,
            customerNumber: checkbookRequest.accounts_users.customer_number ?? null,
          }
        : {
            id: 0,
            username: null,
            phoneNumber: null,
            customerNumber: null,
          },
      accountNumber: checkbookRequest.account_number,
      numberOfCheckbooks: Math.max(1, Math.ceil((checkbookRequest.number_of_leaves ?? checkbookRequest.cheque_leaves ?? 25) / 25)),
      collectionPoint: checkbookRequest.branch_code,
      status: mapDbStatusToUi(checkbookRequest.request_status),
      requestedAt: checkbookRequest.inserted_at,
      approvedAt: checkbookRequest.issued_at,
      readyAt: null,
      collectedAt: checkbookRequest.fulfilled_at,
      cancelledAt: null,
      rejectedAt: null,
      createdAt: checkbookRequest.inserted_at,
      updatedAt: checkbookRequest.updated_at,
      notes: checkbookRequest.request_reason ?? null,
      rejectionReason: checkbookRequest.rejection_reason ?? null,
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
