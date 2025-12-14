import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/admin/third-party/clients/[id]
 * Get client details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await prisma.thirdPartyClient.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            apiKeys: true,
            accessLogs: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/third-party/clients/[id]
 * Update client details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const client = await prisma.thirdPartyClient.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        allowedIps: body.allowedIps,
        rateLimitPerMinute: body.rateLimitPerMinute,
        rateLimitPerHour: body.rateLimitPerHour,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: client,
      message: "Client updated successfully",
    });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/third-party/clients/[id]
 * Delete client (soft delete - set inactive)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.thirdPartyClient.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Client deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
