/**
 * ESB SMS Gateway Test
 * 
 * Tests SMS sending via FDH ESB Gateway
 * Run with: npx tsx scripts/test-esb-sms.ts [phoneNumber]
 */

import { ESBSMSService } from '../lib/services/sms';

const phoneNumber = process.argv[2] || '260977396223';

async function testESBSMS() {
  console.log('🧪 Testing ESB SMS Gateway\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Phone Number: ${phoneNumber}`);
  console.log(`ESB URL: ${process.env.ESB_SMS_URL || 'https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages'}`);
  console.log(`Client ID: ${process.env.ESB_CLIENT_ID || 'd79b32b5-b9a8-41de-b215-b038a913f619'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tests = [];

  // Test 1: Simple SMS
  console.log('1️⃣  Testing Simple SMS...');
  const result1 = await ESBSMSService.sendSMS(
    phoneNumber,
    'Test message from Next.js ESB SMS service'
  );
  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('');
  tests.push(result1);

  // Test 2: OTP
  console.log('2️⃣  Testing OTP SMS...');
  const result2 = await ESBSMSService.sendOTP(phoneNumber, '123456');
  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('');
  tests.push(result2);

  // Test 3: Account Alert
  console.log('3️⃣  Testing Account Alert SMS...');
  const result3 = await ESBSMSService.sendAccountAlert(
    phoneNumber,
    'LOW_BALANCE',
    {
      balance: '100',
      currency: 'ZMW',
      threshold: '500',
    }
  );
  console.log('Result:', JSON.stringify(result3, null, 2));
  console.log('');
  tests.push(result3);

  // Test 4: Transaction Notification
  console.log('4️⃣  Testing Transaction Notification SMS...');
  const result4 = await ESBSMSService.sendTransactionNotification(
    phoneNumber,
    '1000',
    'ZMW',
    'CREDIT',
    '5000'
  );
  console.log('Result:', JSON.stringify(result4, null, 2));
  console.log('');
  tests.push(result4);

  // Test 5: Password Reset
  console.log('5️⃣  Testing Password Reset SMS...');
  const result5 = await ESBSMSService.sendPasswordReset(phoneNumber, 'RESET123');
  console.log('Result:', JSON.stringify(result5, null, 2));
  console.log('');
  tests.push(result5);

  // Test 6: Welcome Message
  console.log('6️⃣  Testing Welcome SMS...');
  const result6 = await ESBSMSService.sendWelcome(phoneNumber, 'John Doe');
  console.log('Result:', JSON.stringify(result6, null, 2));
  console.log('');
  tests.push(result6);

  // Summary
  const passed = tests.filter((t) => t.success).length;
  const failed = tests.filter((t) => !t.success).length;

  console.log('\n📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n⚠️  Note: Failures may be due to:');
    console.log('   - No routing rule configured in ESB for this number');
    console.log('   - Network connectivity issues');
    console.log('   - ESB gateway configuration');
  }

  process.exit(failed === 0 ? 0 : 1);
}

testESBSMS();
