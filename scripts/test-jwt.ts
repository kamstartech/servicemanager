import { generateToken, verifyToken, isTokenExpired, decodeToken } from "../lib/auth/jwt";

async function testJWT() {
  console.log("=== Testing JWT Implementation ===\n");

  // Test 1: Generate token
  console.log("Test 1: Token Generation");
  const payload = {
    userId: 123,
    username: "john_doe",
    context: "MOBILE_BANKING",
    phoneNumber: "1234567890",
  };

  const token = generateToken(payload);
  console.log("Generated token:", token.substring(0, 50) + "...");
  console.log("Token length:", token.length);
  console.log();

  // Test 2: Decode token
  console.log("Test 2: Token Decoding");
  const decoded = decodeToken(token);
  console.log("Decoded payload:", decoded);
  console.log();

  // Test 3: Verify token
  console.log("Test 3: Token Verification");
  const verified = verifyToken(token);
  if (verified) {
    console.log("✓ Token verified successfully");
    console.log("User ID:", verified.userId);
    console.log("Username:", verified.username);
    console.log("Context:", verified.context);
    console.log("Issuer:", verified.iss);
    console.log("Expires:", new Date(verified.exp! * 1000).toISOString());
  } else {
    console.log("✗ Token verification failed");
  }
  console.log();

  // Test 4: Check expiration
  console.log("Test 4: Expiration Check");
  const expired = isTokenExpired(token);
  console.log("Is token expired?", expired ? "✗ YES" : "✓ NO");
  console.log();

  // Test 5: Verify invalid token
  console.log("Test 5: Invalid Token Verification");
  const invalidToken = "invalid.token.here";
  const invalidVerified = verifyToken(invalidToken);
  console.log("Invalid token verified?", invalidVerified ? "✗ FAIL" : "✓ PASS (rejected)");
  console.log();

  // Test 6: Generate expired token (for testing)
  console.log("Test 6: Token with Custom Expiry");
  const jwt = require("jsonwebtoken");
  const shortLivedToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || "your-secret-key-change-in-production",
    { expiresIn: "1ms" } // Expires immediately
  );
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 10));
  
  const isExpired = isTokenExpired(shortLivedToken);
  console.log("Short-lived token expired?", isExpired ? "✓ YES (as expected)" : "✗ NO (unexpected)");
  console.log();

  console.log("=== All JWT Tests Complete ===");
}

testJWT().catch(console.error);
