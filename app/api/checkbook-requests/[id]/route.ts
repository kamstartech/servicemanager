import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { CheckbookRequestUpdate } from '@/types/checkbook';

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
 * GET /api/checkbook-requests/[id]
 * Get a specific checkbook request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = BigInt(idStr);

    if (idStr.trim() === "" || Number.isNaN(Number(idStr))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const checkbookRequest = await prisma.cheque_book_requests.findUnique({
      where: { id },
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

    if (!checkbookRequest) {
      return NextResponse.json(
        { success: false, error: 'Checkbook request not found' },
        { status: 404 }
      );
    }

    const leaves = checkbookRequest.number_of_leaves ?? checkbookRequest.cheque_leaves ?? 25;
    const numberOfCheckbooks = Math.max(1, Math.ceil(leaves / 25));

    return NextResponse.json({
      success: true,
      data: {
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
        numberOfCheckbooks,
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
      },
    });
  } catch (error) {
    console.error('Error fetching checkbook request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch checkbook request',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/checkbook-requests/[id]
 * Update a checkbook request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const idStr = (await params).id;
    const id = BigInt(idStr);

    if (idStr.trim() === "" || Number.isNaN(Number(idStr))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const body: CheckbookRequestUpdate = await request.json();

    // Check if request exists
    const existingRequest = await prisma.cheque_book_requests.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Checkbook request not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    updateData.updated_at = new Date();

    if (body.status !== undefined) {
      updateData.request_status = mapUiStatusToDb(body.status as CheckbookRequestStatus);

      if (body.status === CheckbookRequestStatus.APPROVED) {
        updateData.issued_at = new Date();
      }

      if (body.status === CheckbookRequestStatus.COLLECTED) {
        updateData.fulfilled_at = new Date();
      }
    }

    if (body.numberOfCheckbooks !== undefined) {
      const leaves = Math.max(25, body.numberOfCheckbooks * 25);
      updateData.number_of_leaves = leaves;
      updateData.cheque_leaves = leaves;
    }

    if (body.collectionPoint !== undefined) {
      updateData.branch_code = body.collectionPoint;
    }

    if (body.notes !== undefined) {
      updateData.request_reason = body.notes;
    }

    if (body.rejectionReason !== undefined) {
      updateData.rejection_reason = body.rejectionReason;
    }

    const updatedRequest = await prisma.cheque_book_requests.update({
      where: { id },
      data: updateData,
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

    const leaves = updatedRequest.number_of_leaves ?? updatedRequest.cheque_leaves ?? 25;
    const numberOfCheckbooks = Math.max(1, Math.ceil(leaves / 25));

    return NextResponse.json({
      success: true,
      data: {
        id: Number(updatedRequest.id),
        mobileUserId: updatedRequest.user_id ? Number(updatedRequest.user_id) : null,
        mobileUser: updatedRequest.accounts_users
          ? {
              id: Number(updatedRequest.accounts_users.id),
              username: updatedRequest.accounts_users.username ?? null,
              phoneNumber: updatedRequest.accounts_users.phone_number ?? null,
              customerNumber: updatedRequest.accounts_users.customer_number ?? null,
            }
          : {
              id: 0,
              username: null,
              phoneNumber: null,
              customerNumber: null,
            },
        accountNumber: updatedRequest.account_number,
        numberOfCheckbooks,
        collectionPoint: updatedRequest.branch_code,
        status: mapDbStatusToUi(updatedRequest.request_status),
        requestedAt: updatedRequest.inserted_at,
        approvedAt: updatedRequest.issued_at,
        readyAt: null,
        collectedAt: updatedRequest.fulfilled_at,
        cancelledAt: null,
        rejectedAt: null,
        createdAt: updatedRequest.inserted_at,
        updatedAt: updatedRequest.updated_at,
        notes: updatedRequest.request_reason ?? null,
        rejectionReason: updatedRequest.rejection_reason ?? null,
      },
    });
  } catch (error) {
    console.error('Error updating checkbook request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update checkbook request',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/checkbook-requests/[id]
 * Delete a checkbook request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const idStr = (await params).id;
    const id = BigInt(idStr);

    if (idStr.trim() === "" || Number.isNaN(Number(idStr))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    await prisma.cheque_book_requests.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Checkbook request deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting checkbook request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete checkbook request',
      },
      { status: 500 }
    );
  }
}
