/**
 * SMS Integration Test Script
 * 
 * This script tests the SMS service with all three providers
 * Run with: npx tsx scripts/test-sms.ts
 */

import { SMSService } from '../lib/services/sms';

const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '+260977396223';

async function testSMS() {
  console.log('🧪 Testing SMS Integration\n');
  console.log(`Provider: ${process.env.SMS_PROVIDER || 'orbit'}`);
  console.log(`Test Phone: ${TEST_PHONE}\n`);

  // Test 1: Simple SMS
  console.log('1️⃣  Testing Simple SMS...');
  const result1 = await SMSService.sendSMS(
    TEST_PHONE,
    'Test message from Next.js SMS service',
    1
  );
  console.log('Result:', result1);
  console.log('');

  // Test 2: OTP
  console.log('2️⃣  Testing OTP SMS...');
  const result2 = await SMSService.sendOTP(TEST_PHONE, '123456', 1);
  console.log('Result:', result2);
  console.log('');

  // Test 3: Account Alert
  console.log('3️⃣  Testing Account Alert SMS...');
  const result3 = await SMSService.sendAccountAlert(
    TEST_PHONE,
    'LOW_BALANCE',
    {
      balance: '100',
      currency: 'ZMW',
      threshold: '500',
    },
    1
  );
  console.log('Result:', result3);
  console.log('');

  // Test 4: Transaction Notification
  console.log('4️⃣  Testing Transaction Notification SMS...');
  const result4 = await SMSService.sendTransactionNotification(
    TEST_PHONE,
    '1000',
    'ZMW',
    'CREDIT',
    '5000',
    1
  );
  console.log('Result:', result4);
  console.log('');

  // Test 5: Password Reset
  console.log('5️⃣  Testing Password Reset SMS...');
  const result5 = await SMSService.sendPasswordReset(TEST_PHONE, 'RESET123', 1);
  console.log('Result:', result5);
  console.log('');

  // Test 6: Welcome Message
  console.log('6️⃣  Testing Welcome SMS...');
  const result6 = await SMSService.sendWelcome(TEST_PHONE, 'John Doe', 1);
  console.log('Result:', result6);
  console.log('');

  // Summary
  const tests = [result1, result2, result3, result4, result5, result6];
  const passed = tests.filter((t) => t.success).length;
  const failed = tests.filter((t) => !t.success).length;

  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
}

// Run tests
testSMS()
  .then(() => {
    console.log('\n✨ Tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
