/**
 * SMS Service Test Script
 * 
 * Tests ESB SMS Service
 * Run with: npx tsx scripts/test-sms-direct.ts
 */

import { ESBSMSService } from '../lib/services/sms/sms-service';

const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '+260977396223';

async function testESBSMS() {
  console.log('\n📱 Testing ESB SMS Service');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`Sending test SMS to ${TEST_PHONE}...`);
  const result = await ESBSMSService.sendSMS(
    TEST_PHONE,
    'Test message from ESB SMS Service via Next.js',
    1,
    'test'
  );

  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
}

async function runTests() {
  console.log('🧪 SMS Service Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Test Phone: ${TEST_PHONE}`);

  try {
    await testESBSMS();
    console.log('\n✨ Test execution complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

runTests();
