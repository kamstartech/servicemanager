
import { billerEsbService } from "../lib/services/billers/biller-esb-service";

async function main() {
    const debitAccount = "1630000056933";
    const params = {
        accountNumber: "0999123456", // Dummy phone number acting as account number
        amount: 50.00,
        currency: "MWK",
        debitAccount: debitAccount,
        debitAccountType: "SAVINGS",
        phoneNumber: "0999123456",
        externalTxnId: `TEST-${Date.now()}`
    };

    console.log("Testing Airtel Airtime Purchase with params:", params);

    try {
        // Using AIRTEL_AIRTIME as the prompt implies "airtime" and Airtel is a common default.
        const result = await billerEsbService.processPayment("AIRTEL_AIRTIME", params);
        console.log("\n--- RESULT ---");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("\n--- ERROR ---");
        console.error(error);
    }
}

main();
