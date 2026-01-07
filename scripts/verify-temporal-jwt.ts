
import { getRedis } from "@/lib/db/redis";
import { generateToken, verifyToken } from "@/lib/auth/jwt";

async function verifyTemporalJwt() {
    console.log("🚀 Starting Temporal JWT Verification...");

    const testUserId = 999999;
    const redisKey = `RESET_PASSWORD:${testUserId} `;

    try {
        // 0. Ensure Redis is ready
        const redis = await getRedis();

        // 1. Setup: Clear any existing flag
        await redis.del(redisKey);
        console.log("✅ Cleared existing Redis flag");

        // 2. Test Normal Token (No Result)
        // Note: We can't easily test the full resolver logic without mocking the context/db, 
        // but we can simulate the logic flow by manually checking Redis and calling generateToken,
        // reflecting exactly what we implemented in the resolver.

        // Simulate Login Logic Flow WITHOUT flag
        let isTemporal = await redis.get(redisKey);
        let token = generateToken({
            userId: testUserId,
            username: "testuser",
            context: "MOBILE_BANKING",
            temporal: isTemporal === "true",
        });

        let decoded = verifyToken(token);
        if (decoded?.temporal === false) {
            console.log("✅ Normal token generated correctly (temporal: false)");
        } else {
            console.error("❌ Normal token verification failed:", decoded);
        }

        // 3. Test Temporal Token
        // Simulate Reset Password (setting flag)
        await redis.set(redisKey, "true");
        console.log("✅ Set Redis flag for temporal password");

        // Simulate Login Logic Flow WITH flag
        isTemporal = await redis.get(redisKey);
        token = generateToken({
            userId: testUserId,
            username: "testuser",
            context: "MOBILE_BANKING",
            temporal: isTemporal === "true",
        });

        decoded = verifyToken(token);
        if (decoded?.temporal === true) {
            console.log("✅ Temporal token generated correctly (temporal: true)");
        } else {
            console.error("❌ Temporal token verification failed:", decoded);
        }

        // 4. Test Clearing Flag (Simulating Password Change)
        await redis.del(redisKey);
        console.log("✅ Cleared Redis flag (simulating password change)");

        // Simulate Login Logic Flow AGAIN
        isTemporal = await redis.get(redisKey);
        token = generateToken({
            userId: testUserId,
            username: "testuser",
            context: "MOBILE_BANKING",
            temporal: isTemporal === "true",
        });

        decoded = verifyToken(token);
        if (decoded?.temporal === false) {
            console.log("✅ Token generated correctly after clearing flag (temporal: false)");
        } else {
            console.error("❌ Token verification failed after clearing flag:", decoded);
        }

        // 5. Cleanup
        await redis.del(redisKey);
        console.log("✅ Cleanup complete");

    } catch (error) {
        console.error("❌ Verification failed with error:", error);
    } finally {
        process.exit(0);
    }
}

// Run the verification
verifyTemporalJwt();
