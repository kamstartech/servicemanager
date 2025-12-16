/**
 * Quick SMS Test - Tests with different phone formats
 */

import { ESBSMSService } from '../lib/services/sms/sms-service';

const TEST_PHONE_WITH_PLUS = '+260977396223';
const TEST_PHONE_WITHOUT_PLUS = '260977396223';

async function testESBSMS() {
  console.log('🧪 Testing ESB SMS Service\n');

  // Test with +
  console.log(`1️⃣  Testing with format: ${TEST_PHONE_WITH_PLUS}`);
  const result1 = await ESBSMSService.sendSMS(
    TEST_PHONE_WITH_PLUS,
    'Test SMS with + prefix',
    1,
    'test'
  );
  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('');

  // Test without +
  console.log(`2️⃣  Testing with format: ${TEST_PHONE_WITHOUT_PLUS}`);
  const result2 = await ESBSMSService.sendSMS(
    TEST_PHONE_WITHOUT_PLUS,
    'Test SMS without + prefix',
    1,
    'test'
  );
  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('');

  return [result1, result2];
}

testESBSMS().then((results) => {
  const success = results.every(r => r.success || r.status === 'failed'); // Just checking if it runs without throwing
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
