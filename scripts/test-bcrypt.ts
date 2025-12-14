import bcrypt from "bcryptjs";

async function testBcrypt() {
  console.log("=== Testing Bcrypt Implementation ===\n");

  // Test 1: Generate and verify hash
  console.log("Test 1: Hash Generation and Verification");
  const password = "TestPassword123";
  const hash = await bcrypt.hash(password, 12);
  console.log("Generated hash:", hash);
  console.log("Hash prefix:", hash.substring(0, 4));
  console.log("Hash length:", hash.length);

  const isValid = await bcrypt.compare(password, hash);
  console.log("Self verification:", isValid ? "✓ PASS" : "✗ FAIL");
  console.log();

  // Test 2: Verify wrong password
  console.log("Test 2: Wrong Password Rejection");
  const wrongPassword = "WrongPassword";
  const isWrong = await bcrypt.compare(wrongPassword, hash);
  console.log("Wrong password verification:", isWrong ? "✗ FAIL (should reject)" : "✓ PASS (rejected)");
  console.log();

  // Test 3: Phoenix compatibility test
  console.log("Test 3: Phoenix Hash Compatibility");
  // This is a bcrypt hash for password "test123" with cost 12
  const phoenixHash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBL0dKzGK";
  const testPassword = "test123";
  
  try {
    const canVerifyPhoenix = await bcrypt.compare(testPassword, phoenixHash);
    console.log("Can verify Phoenix-style hash:", canVerifyPhoenix ? "✓ YES" : "✗ NO");
  } catch (error) {
    console.log("Error verifying Phoenix hash:", error);
  }
  console.log();

  // Test 4: Timing test
  console.log("Test 4: Performance Test");
  const start = Date.now();
  await bcrypt.compare("anypassword", hash);
  const duration = Date.now() - start;
  console.log("Verification time:", duration, "ms");
  console.log("(Should be ~100-300ms for cost 12)");
  console.log();

  console.log("=== All Tests Complete ===");
}

testBcrypt().catch(console.error);
