import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { CheckbookRequestStatus } from '@prisma/client';
import type { CheckbookRequestCreate, CheckbookRequestFilters } from '@/types/checkbook';

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
      where.status = status;
    }

    if (accountNumber) {
      where.accountNumber = accountNumber;
    }

    if (mobileUserId) {
      where.mobileUserId = parseInt(mobileUserId);
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
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.checkbookRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
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

    // Verify mobile user exists
    const mobileUser = await prisma.mobileUser.findUnique({
      where: { id: body.mobileUserId },
    });

    if (!mobileUser) {
      return NextResponse.json(
        { success: false, error: 'Mobile user not found' },
        { status: 404 }
      );
    }

    // Create the checkbook request
    const checkbookRequest = await prisma.checkbookRequest.create({
      data: {
        mobileUserId: body.mobileUserId,
        accountNumber: body.accountNumber,
        numberOfCheckbooks: body.numberOfCheckbooks || 1,
        collectionPoint: body.collectionPoint,
        notes: body.notes,
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

    return NextResponse.json({
      success: true,
      data: checkbookRequest,
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
