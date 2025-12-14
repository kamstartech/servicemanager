import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { CheckbookRequestStatus } from '@prisma/client';
import type { CheckbookRequestUpdate } from '@/types/checkbook';

/**
 * GET /api/checkbook-requests/[id]
 * Get a specific checkbook request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
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
      data: checkbookRequest,
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
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
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

    if (body.status !== undefined) {
      updateData.status = body.status;
      
      // Set timestamp fields based on status
      if (body.status === CheckbookRequestStatus.APPROVED) {
        updateData.approvedAt = new Date();
      } else if (body.status === CheckbookRequestStatus.READY_FOR_COLLECTION) {
        updateData.readyAt = new Date();
      } else if (body.status === CheckbookRequestStatus.COLLECTED) {
        updateData.collectedAt = new Date();
      } else if (body.status === CheckbookRequestStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
      } else if (body.status === CheckbookRequestStatus.REJECTED) {
        updateData.rejectedAt = new Date();
      }
    }

    if (body.numberOfCheckbooks !== undefined) {
      updateData.numberOfCheckbooks = body.numberOfCheckbooks;
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
      data: updatedRequest,
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
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
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
