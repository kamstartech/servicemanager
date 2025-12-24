import { PrismaClient } from "@prisma/client"; // removed enums
import { walletTransactionService } from "../lib/services/wallet-transaction-service";
import { t24Service } from "../lib/services/t24-service";
import { Decimal } from "@prisma/client/runtime/library";

// MOCK T24 Service to allow verification without real backend
(t24Service as any).transfer = async (args: any) => {
    console.log(`[MOCK T24] Transfer successful: ${args.reference}`);
    return { success: true, t24Reference: "MOCK_REF_" + Date.now(), message: "Success" };
};

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Starting Wallet Transaction Verification...");

    // 1. Create Test User
    const uniqueId = Date.now().toString();
    const phoneNumber = "265" + uniqueId.slice(-9);
    console.log(`Creating test user with phone: ${phoneNumber}`);

    const user = await prisma.mobileUser.create({
        data: {
            phoneNumber,
            username: `TestUser_${uniqueId}`,
            isActive: true,
            passwordHash: "dummy_hash",
            context: "MOBILE_BANKING",
        }
    });

    // 2. Create Test Bank Account
    console.log(`Creating test bank account...`);
    const bankAccount = await prisma.mobileUserAccount.create({
        data: {
            mobileUserId: user.id,
            context: "MOBILE_BANKING", // MobileUserContext.MOBILE_BANKING
            accountNumber: `BANK-${uniqueId}`,
            accountName: "Test Bank Account",
            currency: "MWK",
            balance: new Decimal(10000),
            availableBalance: new Decimal(10000),
            isActive: true
        }
    });

    // 3. Perform Wallet Top-up (Account to Wallet)
    console.log(`Initiating Account-to-Wallet transfer of 500 MWK from Account ${bankAccount.accountNumber}`);

    // Note: The service calls t24Service. Since we likely don't have a real T24 connected or mocked in environment,
    // this test might FAIL at the T24 step unless T24Service handles dev/test mode.
    // If it fails on T24, we will at least verify the flow up to that point.

    try {
        const result = await walletTransactionService.processAccountToWalletTransfer(
            user.id,
            bankAccount.id,
            500,
            "MWK",
            "Test Verification Topup"
        );

        // 4. Verification
        if (result.success) {
            console.log(`✅ Transfer Successful! Transaction ID: ${result.transaction?.id}`);

            // Verify Wallet Balance
            const walletAccount = await prisma.mobileUserAccount.findFirst({
                where: {
                    mobileUserId: user.id,
                    context: "WALLET"
                }
            });

            if (walletAccount && walletAccount.balance?.toNumber() === 500) {
                console.log(`✅ Wallet Balance Verified: ${walletAccount.balance}`);
            } else {
                console.error(`❌ Wallet Balance Mismatch. Expected 500, got ${walletAccount?.balance}`);
            }

            // Verify Transaction Record
            const tx = await prisma.fdhTransaction.findUnique({
                where: { id: result.transaction?.id }
            });

            if (tx && tx.status === "COMPLETED") {
                console.log(`✅ Transaction Status Verified: ${tx.status}`);
            } else {
                console.error(`❌ Transaction Status Mismatch/Not Found: ${tx?.status}`);
            }

        } else {
            console.error(`❌ Transfer Failed: ${result.error}`);
        }
    } catch (err: any) {
        console.error(`❌ Unexpected Error: ${err.message}`);
        console.error(err);
    } finally {
        // Cleanup
        console.log("Cleaning up test data...");
        await prisma.fdhTransaction.deleteMany({ where: { initiatedByUserId: user.id } });
        await prisma.mobileUserAccount.deleteMany({ where: { mobileUserId: user.id } });
        await prisma.mobileUser.delete({ where: { id: user.id } });
        console.log("Cleanup complete.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
