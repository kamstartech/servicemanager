import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const context = searchParams.get("context"); // MOBILE_BANKING, WALLET, etc.

        // Build where clause
        const where: any = {
            isActive: true,
        };

        // Filter by user context if specified
        if (context) {
            where.context = context;
        }

        // Fetch active mobile users with their basic info
        const users = await prisma.mobileUser.findMany({
            where,
            select: {
                id: true,
                username: true,
                phoneNumber: true,
                customerNumber: true,
                context: true,
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                id: "asc",
            },
            take: 100, // Limit to first 100 users for performance
        });

        // Format for dropdown
        const formattedUsers = users.map((user) => {
            // For mobile banking users, show customer number; for others show phone number
            const identifier = user.context === "MOBILE_BANKING"
                ? user.customerNumber
                : user.phoneNumber;

            return {
                value: user.id.toString(),
                label: `${user.username}${user.profile?.firstName
                        ? ` (${user.profile.firstName} ${user.profile.lastName || ""})`
                        : identifier
                            ? ` (${identifier})`
                            : ""
                    }`,
            };
        });

        return NextResponse.json({
            success: true,
            users: formattedUsers,
            count: formattedUsers.length,
        });
    } catch (error: any) {
        console.error("[API] Error fetching users:", error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Failed to fetch users",
            },
            { status: 500 }
        );
    }
}
