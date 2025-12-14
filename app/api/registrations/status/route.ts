import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  verifyThirdPartyRequest,
  logThirdPartyAccess,
} from "@/lib/middleware/verify-third-party-token";

/**
 * GET /api/registrations/status?customer_number=XXX
 * OR
 * GET /api/registrations/status?phone_number=XXX
 * 
 * Third-party endpoint to check registration request status
 * Requires valid JWT Bearer token with registrations:read permission
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify third-party token
  const auth = await verifyThirdPartyRequest(request, ["registrations:read"]);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerNumber = searchParams.get("customer_number");
    const phoneNumber = searchParams.get("phone_number");

    // Validate that at least one search parameter is provided
    if (!customerNumber && !phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Either customer_number or phone_number is required",
        },
        { status: 400 }
      );
    }

    // Build query conditions
    const where: any = {};
    if (customerNumber) {
      where.customerNumber = customerNumber;
    } else if (phoneNumber) {
      where.phoneNumber = phoneNumber;
    }

    // Find the most recent registration request
    const registration = await prisma.requestedRegistration.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        customerNumber: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        emailAddress: true,
        createdAt: true,
        processedAt: true,
        errorMessage: true,
        notes: true,
        processLog: true,
        mobileUser: {
          select: {
            id: true,
            username: true,
            isActive: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        {
          success: false,
          error: "No registration request found",
          message: "No registration request found for the provided criteria",
        },
        { status: 404 }
      );
    }

    // Build response based on status
    const response: any = {
      success: true,
      data: {
        registration_id: registration.id,
        status: registration.status,
        customer_number: registration.customerNumber,
        phone_number: registration.phoneNumber,
        created_at: registration.createdAt,
        processed_at: registration.processedAt,
      },
    };

    // Add status-specific information
    switch (registration.status) {
      case "PENDING":
        response.message = "Registration request is pending processing";
        response.data.estimated_completion = "Processing typically takes 1-2 minutes";
        break;

      case "APPROVED":
        response.message = "Registration validated successfully. User creation in progress.";
        response.data.user_id = registration.mobileUser?.id;
        response.data.username = registration.mobileUser?.username;
        if (registration.notes) {
          response.data.notes = registration.notes;
        }
        break;

      case "COMPLETED":
        response.message = "Registration completed successfully";
        response.data.user_id = registration.mobileUser?.id;
        response.data.username = registration.mobileUser?.username;
        response.data.is_active = registration.mobileUser?.isActive;
        if (registration.notes) {
          response.data.notes = registration.notes;
        }
        break;

      case "FAILED":
        response.success = false;
        response.message = "Registration validation failed";
        response.data.error = registration.errorMessage || "Validation failed";
        response.data.can_retry = true;
        break;

      case "DUPLICATE":
        response.message = "User already exists with this information";
        response.data.user_id = registration.mobileUser?.id;
        response.data.username = registration.mobileUser?.username;
        response.data.error = registration.errorMessage;
        break;

      default:
        response.message = `Registration status: ${registration.status}`;
    }

    // Add process log if available (for debugging/transparency)
    if (registration.processLog && Array.isArray(registration.processLog)) {
      response.data.process_stages = registration.processLog.map((stage: any) => ({
        stage: stage.stage,
        status: stage.status,
        timestamp: stage.timestamp,
        details: stage.details,
      }));
    }

    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Error checking registration status:", error);

    // Log error access
    const responseTime = Date.now() - startTime;
    logThirdPartyAccess(
      auth.clientId!,
      null,
      request,
      500,
      responseTime,
      error instanceof Error ? error.message : "Unknown error"
    ).catch(console.error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check registration status",
        message: "An internal error occurred while checking the registration status",
      },
      { status: 500 }
    );
  } finally {
    // Log successful access
    if (auth.clientId) {
      const responseTime = Date.now() - startTime;
      logThirdPartyAccess(
        auth.clientId,
        null,
        request,
        200,
        responseTime
      ).catch(console.error);
    }
  }
}
