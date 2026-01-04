
import { airtimeService } from "../lib/services/airtime/airtime-service";

async function main() {
    const params = {
        msisdn: "0999123456",
        amount: 50.00,
        externalTxnId: `TEST-${Date.now()}`
    };

    console.log("Testing Airtime Service (Mobile Endpoint) with params:", params);

    try {
        const result = await airtimeService.airtelRecharge(params);
        console.log("\n--- RESULT ---");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("\n--- ERROR ---");
        console.error(error);
    }
}

main();
