import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { RegistrationStatus } from '@prisma/client';
import type { 
  ThirdPartyRegistrationRequest, 
  RequestedRegistrationCreate 
} from '@/types/registration';

/**
 * POST /api/registrations
 * Create a new registration request (called by third-party systems or webhooks)
 */
export async function POST(request: NextRequest) {
  try {
    const body: ThirdPartyRegistrationRequest = await request.json();
    
    // Extract client IP
    const sourceIp = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Validate required fields
    if (!body.phone_number || !body.customer_number) {
      return NextResponse.json(
        { error: 'phone_number and customer_number are required' },
        { status: 400 }
      );
    }

    // Check for duplicate pending registration
    const existingPending = await prisma.requestedRegistration.findFirst({
      where: {
        customerNumber: body.customer_number,
        status: RegistrationStatus.PENDING,
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: 'Duplicate registration request',
          existingRequest: {
            id: existingPending.id,
            createdAt: existingPending.createdAt,
            status: existingPending.status,
          },
        },
        { status: 409 }
      );
    }

    // Create registration request
    const registration = await prisma.requestedRegistration.create({
      data: {
        sourceIp,
        requestBody: body as any,
        phoneNumber: body.phone_number,
        customerNumber: body.customer_number,
        emailAddress: body.email_address,
        firstName: body.first_name,
        lastName: body.last_name,
        profileType: body.profile_type,
        company: body.company,
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

    return NextResponse.json(
      {
        success: true,
        data: registration,
        message: 'Registration request created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating registration request:', error);
    return NextResponse.json(
      { error: 'Failed to create registration request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/registrations
 * List registration requests with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status') as RegistrationStatus | null;
    const customerNumber = searchParams.get('customerNumber');
    const phoneNumber = searchParams.get('phoneNumber');
    const sourceIp = searchParams.get('sourceIp');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = {};
    
    if (status) where.status = status;
    if (customerNumber) where.customerNumber = { contains: customerNumber };
    if (phoneNumber) where.phoneNumber = { contains: phoneNumber };
    if (sourceIp) where.sourceIp = { contains: sourceIp };

    const [registrations, total] = await Promise.all([
      prisma.requestedRegistration.findMany({
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
          processedByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.requestedRegistration.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: registrations,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
