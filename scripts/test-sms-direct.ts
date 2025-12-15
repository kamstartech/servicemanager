/**
 * SMS Direct Test Script (No Database)
 * 
 * Tests SMS providers directly without database logging
 * Run with: npx tsx scripts/test-sms-direct.ts
 */

import { OrbitSMSProvider } from '../lib/services/sms/orbit-provider';
import { BulkSMSProvider } from '../lib/services/sms/bulksms-provider';
import { InternalSMSProvider } from '../lib/services/sms/internal-provider';

const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '+260977396223';

async function testOrbitSMS() {
  console.log('\n📱 Testing Orbit Mobile Provider');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const provider = new OrbitSMSProvider({
    username: 'oxylane_ds',
    apiKey: '1DgvtfRcsjNErxNluIpC',
    url: 'https://bms.orbitmobile.co.zm/json.php',
  });

  console.log(`Sending test SMS to ${TEST_PHONE}...`);
  const result = await provider.send(
    TEST_PHONE,
    'Test message from Orbit Mobile provider via Next.js'
  );
  
  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
}

async function testBulkSMS() {
  console.log('\n📱 Testing BulkSMS Provider');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const provider = new BulkSMSProvider({
    tokenId: '64AAAD4D306743E692C4A17CBF32E643-01-5',
    tokenSecret: 'KupKsvrDq4iielNh4f!8iXlXnRd4N',
    url: 'https://api.bulksms.com/v1/messages',
  });

  console.log(`Sending test SMS to ${TEST_PHONE}...`);
  const result = await provider.send(
    TEST_PHONE,
    'Test message from BulkSMS provider via Next.js'
  );
  
  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
}

async function testInternalSMS() {
  console.log('\n📱 Testing Internal ESB Provider');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const provider = new InternalSMSProvider({
    username: 'admin',
    password: 'admin',
    url: 'https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages',
    clientId: 'd79b32b5-b9a8-41de-b215-b038a913f619',
  });

  console.log(`Sending test SMS to ${TEST_PHONE}...`);
  const result = await provider.send(
    TEST_PHONE,
    'Test message from Internal ESB provider via Next.js'
  );
  
  console.log('Result:', JSON.stringify(result, null, 2));
  return result;
}

async function runTests() {
  console.log('🧪 SMS Direct Provider Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Test Phone: ${TEST_PHONE}`);
  console.log(`Provider: ${process.env.SMS_PROVIDER || 'all'}\n`);

  const providerToTest = process.env.SMS_PROVIDER || 'orbit';
  const results = [];

  try {
    switch (providerToTest.toLowerCase()) {
      case 'orbit':
        results.push(await testOrbitSMS());
        break;
      case 'bulksms':
        results.push(await testBulkSMS());
        break;
      case 'internal':
        results.push(await testInternalSMS());
        break;
      case 'all':
        results.push(await testOrbitSMS());
        results.push(await testBulkSMS());
        results.push(await testInternalSMS());
        break;
      default:
        console.error(`Unknown provider: ${providerToTest}`);
        process.exit(1);
    }

    // Summary
    console.log('\n📊 Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Check the results above for details.');
      process.exit(1);
    } else {
      console.log('\n✨ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

runTests();
