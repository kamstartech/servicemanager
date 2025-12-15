/**
 * Quick SMS Test - Tests with different phone formats
 */

import { InternalSMSProvider } from '../lib/services/sms/internal-provider';
import { OrbitSMSProvider } from '../lib/services/sms/orbit-provider';

const TEST_PHONE_WITH_PLUS = '+260977396223';
const TEST_PHONE_WITHOUT_PLUS = '260977396223';

async function testInternalESB() {
  console.log('🧪 Testing Internal ESB Provider\n');
  
  const provider = new InternalSMSProvider({
    username: 'admin',
    password: 'admin',
    url: 'https://fdh-esb.ngrok.dev/esb/sent-messages/v1/sent-messages',
    clientId: 'd79b32b5-b9a8-41de-b215-b038a913f619',
  });

  // Test with +
  console.log(`1️⃣  Testing with format: ${TEST_PHONE_WITH_PLUS}`);
  const result1 = await provider.send(TEST_PHONE_WITH_PLUS, 'Test SMS with + prefix');
  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('');

  // Test without +
  console.log(`2️⃣  Testing with format: ${TEST_PHONE_WITHOUT_PLUS}`);
  const result2 = await provider.send(TEST_PHONE_WITHOUT_PLUS, 'Test SMS without + prefix');
  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('');

  return [result1, result2];
}

async function testOrbit() {
  console.log('�� Testing Orbit Mobile Provider\n');
  
  const provider = new OrbitSMSProvider({
    username: 'oxylane_ds',
    apiKey: '1DgvtfRcsjNErxNluIpC',
    url: 'https://bms.orbitmobile.co.zm/json.php',
  });

  // Test with +
  console.log(`1️⃣  Testing with format: ${TEST_PHONE_WITH_PLUS}`);
  const result1 = await provider.send(TEST_PHONE_WITH_PLUS, 'Test SMS with + prefix');
  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('');

  // Test without +
  console.log(`2️⃣  Testing with format: ${TEST_PHONE_WITHOUT_PLUS}`);
  const result2 = await provider.send(TEST_PHONE_WITHOUT_PLUS, 'Test SMS without + prefix');
  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('');

  return [result1, result2];
}

const provider = process.argv[2] || 'internal';

if (provider === 'internal') {
  testInternalESB().then((results) => {
    const success = results.some(r => r.success);
    process.exit(success ? 0 : 1);
  });
} else {
  testOrbit().then((results) => {
    const success = results.some(r => r.success);
    process.exit(success ? 0 : 1);
  });
}
