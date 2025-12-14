import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const [
      totalMobileUsers,
      totalAccounts,
      totalDevices,
      totalSessions,
      activeSessions,
      totalLoginAttempts,
      totalBeneficiaries,
      totalRegistrationRequests,
      pendingRegistrations,
      totalCheckbookRequests,
      pendingCheckbooks,
      totalBillerTransactions,
      completedBillerTransactions,
      failedBillerTransactions,
    ] = await Promise.all([
      prisma.mobileUser.count({ where: { isActive: true } }),
      prisma.mobileUserAccount.count({ where: { isActive: true } }),
      prisma.mobileDevice.count({ where: { isActive: true } }),
      prisma.deviceSession.count(),
      prisma.deviceSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.deviceLoginAttempt.count(),
      prisma.beneficiary.count({ where: { isActive: true } }),
      prisma.requestedRegistration.count(),
      prisma.requestedRegistration.count({
        where: { status: "PENDING" },
      }),
      prisma.checkbookRequest.count(),
      prisma.checkbookRequest.count({
        where: { status: "PENDING" },
      }),
      prisma.billerTransaction.count(),
      prisma.billerTransaction.count({
        where: { status: "COMPLETED" },
      }),
      prisma.billerTransaction.count({
        where: { status: "FAILED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalMobileUsers,
        totalAccounts,
        totalDevices,
        totalSessions,
        activeSessions,
        totalLoginAttempts,
        totalBeneficiaries,
        totalRegistrationRequests,
        pendingRegistrations,
        totalCheckbookRequests,
        pendingCheckbooks,
        totalBillerTransactions,
        completedBillerTransactions,
        failedBillerTransactions,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard statistics",
      },
      { status: 500 }
    );
  }
}
