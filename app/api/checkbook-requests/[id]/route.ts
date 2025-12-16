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
 * GET /api/checkbook-requests/[id]
 * Get a specific checkbook request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);

    if (idStr.trim() === "" || Number.isNaN(Number(idStr))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const checkbookRequest = await prisma.checkbookRequest.findUnique({
      where: { id },
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
    });

    if (!checkbookRequest) {
      return NextResponse.json(
        { success: false, error: 'Checkbook request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
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
        approvedByUser: checkbookRequest.approvedByUser
          ? {
              id: Number(checkbookRequest.approvedByUser.id),
              name: checkbookRequest.approvedByUser.name ?? null,
              email: checkbookRequest.approvedByUser.email,
            }
          : null,
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
    const id = Number(idStr);

    if (idStr.trim() === "" || Number.isNaN(Number(idStr))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const body: CheckbookRequestUpdate = await request.json();

    // Check if request exists
    const existingRequest = await prisma.checkbookRequest.findUnique({
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

    updateData.updatedAt = new Date();

    if (body.status !== undefined) {
      updateData.status = mapUiStatusToDb(body.status as CheckbookRequestStatus);

      if (body.status === CheckbookRequestStatus.APPROVED) {
        updateData.approvedAt = new Date();
      }

      if (body.status === CheckbookRequestStatus.COLLECTED) {
        updateData.collectedAt = new Date();
      }
    }

    if (body.numberOfCheckbooks !== undefined) {
      updateData.numberOfCheckbooks = Math.max(1, body.numberOfCheckbooks);
    }

    if (body.collectionPoint !== undefined) {
      updateData.collectionPoint = body.collectionPoint;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.rejectionReason !== undefined) {
      updateData.rejectionReason = body.rejectionReason;
    }

    const updatedRequest = await prisma.checkbookRequest.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json({
      success: true,
      data: {
        id: Number(updatedRequest.id),
        mobileUserId: updatedRequest.mobileUserId ?? null,
        mobileUser: updatedRequest.mobileUser
          ? {
              id: Number(updatedRequest.mobileUser.id),
              username: updatedRequest.mobileUser.username ?? null,
              phoneNumber: updatedRequest.mobileUser.phoneNumber ?? null,
              customerNumber: updatedRequest.mobileUser.customerNumber ?? null,
            }
          : {
              id: 0,
              username: null,
              phoneNumber: null,
              customerNumber: null,
            },
        approvedByUser: updatedRequest.approvedByUser
          ? {
              id: Number(updatedRequest.approvedByUser.id),
              name: updatedRequest.approvedByUser.name ?? null,
              email: updatedRequest.approvedByUser.email,
            }
          : null,
        accountNumber: updatedRequest.accountNumber,
        numberOfCheckbooks: updatedRequest.numberOfCheckbooks,
        collectionPoint: updatedRequest.collectionPoint,
        status: mapDbStatusToUi(updatedRequest.status),
        requestedAt: updatedRequest.requestedAt,
        approvedAt: updatedRequest.approvedAt,
        readyAt: null,
        collectedAt: updatedRequest.collectedAt,
        cancelledAt: null,
        rejectedAt: null,
        createdAt: updatedRequest.createdAt,
        updatedAt: updatedRequest.updatedAt,
        notes: updatedRequest.notes ?? null,
        rejectionReason: updatedRequest.rejectionReason ?? null,
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
    const id = Number(idStr);

    if (idStr.trim() === "" || Number.isNaN(Number(idStr))) {
      return NextResponse.json(
        { success: false, error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    await prisma.checkbookRequest.delete({
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
