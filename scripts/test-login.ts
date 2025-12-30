
const GRAPHQL_ENDPOINT = "http://localhost:3000/api/mobile/graphql";

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      success
      message
      requiresApproval
      devicePending
      token
    }
  }
`;

async function main() {
    const username = "edwin.z.2493";
    const password = "b5e5smoa";

    // Use a random device ID to simulate a NEW SECONDARY device
    const deviceId = "TEST_DEVICE_" + Math.random().toString(36).substring(7).toUpperCase();

    console.log(`Attempting login for ${username} with new device ${deviceId}...`);

    const variables = {
        input: {
            username,
            password,
            context: "MOBILE_BANKING",
            deviceId,
            deviceName: "Test Script Device RE-VERIFY",
            deviceModel: "ScriptRunner",
            deviceOs: "NodeJS",
            location: "Debug Script",
            ipAddress: "127.0.0.1"
        }
    };

    try {
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: LOGIN_MUTATION,
                variables
            })
        });

        const result = await response.json();

        console.log("Response Status:", response.status);
        console.log("Result:", JSON.stringify(result, null, 2));

        if (result.errors) {
            console.error("GraphQL Errors:", result.errors);
        }

        if (result.data?.login?.success) {
            console.log("✅ Login Successful / Handled");
            if (result.data.login.requiresApproval) {
                console.log("ℹ️  Device pending approval (Expected for secondary device). Notification should have been sent.");
            } else {
                console.log("ℹ️  Login fully successful (Maybe verified or primary?).");
            }
        } else {
            console.log("❌ Login Failed");
        }

    } catch (error) {
        console.error("Request Failed:", error);
    }
}

main();
