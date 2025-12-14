import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { RegistrationStatus } from '@prisma/client';

/**
 * GET /api/registrations/[id]
 * Get a specific registration request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registrationId = parseInt(id);

    if (isNaN(registrationId)) {
      return NextResponse.json(
        { error: 'Invalid registration ID' },
        { status: 400 }
      );
    }

    const registration = await prisma.requestedRegistration.findUnique({
      where: { id: registrationId },
      include: {
        mobileUser: {
          select: {
            id: true,
            username: true,
            phoneNumber: true,
            customerNumber: true,
            isActive: true,
          },
        },
        processedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: registration,
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/registrations/[id]
 * Update registration status, notes, or link to created user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registrationId = parseInt(id);
    const body = await request.json();

    if (isNaN(registrationId)) {
      return NextResponse.json(
        { error: 'Invalid registration ID' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.status) updateData.status = body.status;
    if (body.mobileUserId) updateData.mobileUserId = body.mobileUserId;
    if (body.elixirUserId) updateData.elixirUserId = body.elixirUserId;
    if (body.errorMessage) updateData.errorMessage = body.errorMessage;
    if (body.notes) updateData.notes = body.notes;
    if (body.processedBy) updateData.processedBy = body.processedBy;

    // Auto-set processedAt when status changes to COMPLETED or FAILED
    if (body.status && [RegistrationStatus.COMPLETED, RegistrationStatus.FAILED].includes(body.status)) {
      updateData.processedAt = new Date();
    }

    const registration = await prisma.requestedRegistration.update({
      where: { id: registrationId },
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
        processedByUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: registration,
      message: 'Registration updated successfully',
    });
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json(
      { error: 'Failed to update registration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/registrations/[id]
 * Delete a registration request (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registrationId = parseInt(id);

    if (isNaN(registrationId)) {
      return NextResponse.json(
        { error: 'Invalid registration ID' },
        { status: 400 }
      );
    }

    await prisma.requestedRegistration.delete({
      where: { id: registrationId },
    });

    return NextResponse.json({
      success: true,
      message: 'Registration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json(
      { error: 'Failed to delete registration' },
      { status: 500 }
    );
  }
}
