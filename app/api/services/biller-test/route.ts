import { NextResponse } from "next/server";
import { billerEsbService } from "@/lib/services/billers/biller-esb-service";

export async function POST(request: Request) {
    console.log("[BillerTest] Received biller test request");
    try {
        const body = await request.json();

        const billerType = String(body.billerType || "").trim().toUpperCase();

        // Extract various possible parameters
        const accountNumber = String(body.accountNumber || "").trim();
        const phoneNumber = String(body.phoneNumber || "").trim();
        const invoiceNumber = String(body.invoiceNumber || "").trim();
        const bundleId = body.bundleId ? String(body.bundleId).trim() : undefined;
        const accountType = body.accountType ? String(body.accountType).trim().toUpperCase() : undefined;

        // Validate required fields
        if (!billerType) {
            return NextResponse.json(
                { success: false, error: "billerType is required" },
                { status: 400 }
            );
        }

        // Build lookup params based on biller type
        const params: any = {
            accountNumber: accountNumber || phoneNumber || invoiceNumber,
            phoneNumber,
            invoiceNumber,
            bundleId,
            accountType,
        };

        // Validate that at least one identifier is provided
        if (!params.accountNumber && !phoneNumber && !invoiceNumber) {
            return NextResponse.json(
                { success: false, error: "At least one of accountNumber, phoneNumber, or invoiceNumber is required" },
                { status: 400 }
            );
        }

        // Validate supported biller types
        const supportedBillers = billerEsbService.getSupportedBillers();

        if (!supportedBillers.includes(billerType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Biller type "${billerType}" is not yet implemented. Supported: ${supportedBillers.join(", ")}`
                },
                { status: 400 }
            );
        }

        // Perform lookup using the biller ESB service
        console.log(`[BillerTest] Testing ${billerType} with params:`, params);

        const lookupResult = await billerEsbService.lookupAccount(billerType, params);

        if (!lookupResult.ok) {
            return NextResponse.json({
                success: false,
                error: lookupResult.error || "Lookup failed",
                message: lookupResult.error || "Failed to lookup from ESB",
                billerType,
                params,
                status: lookupResult.status,
                raw: lookupResult.raw,
            });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully performed lookup for ${billerType}`,
            billerType,
            params,
            data: lookupResult.data,
            status: lookupResult.status,
            raw: lookupResult.raw,
        });
    } catch (error: any) {
        console.error("[BillerTest] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Unexpected error",
                stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
            },
            { status: 500 }
        );
    }
}
