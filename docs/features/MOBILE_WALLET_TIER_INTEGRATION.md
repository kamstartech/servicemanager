# 📱 Mobile Wallet Tier Registration Guide

## Overview

This guide explains how to register wallet users from a mobile application with automatic tier assignment and first-device verification.

## Automatic Tier Assignment & Device Verification

When a new wallet user registers:
1. ✅ User account is created
2. ✅ Default tier is automatically assigned
3. ✅ Wallet account is created (phoneNumber as accountNumber)
4. ✅ OTP is sent for first device verification
5. ✅ User verifies OTP to activate device
6. ✅ JWT token issued for authenticated access

---

## Registration & Verification Flow

### Step 1: Register New User

**Endpoint:** `POST /api/mobile/wallet/register`

**Request Body:**
```json
{
  "phoneNumber": "265991234567",
  "password": "SecurePassword123!",
  "username": "johndoe",
  "deviceId": "unique-device-id-123",
  "deviceName": "Samsung Galaxy A51",
  "deviceModel": "SM-A515F",
  "deviceOs": "Android 11",
  "ipAddress": "192.168.1.100",
  "location": "Blantyre, Malawi"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "requiresVerification": true,
  "verificationMethod": "SMS",
  "verificationToken": "abc-123-def-456",
  "maskedContact": "265***4567",
  "message": "Verification code sent to 265***4567",
  "user": {
    "id": 123,
    "phoneNumber": "265991234567",
    "username": "johndoe",
    "context": "WALLET",
    "tier": {
      "id": 1,
      "name": "Basic",
      "maximumBalance": "50000",
      "dailyTransactionLimit": "20000"
    },
    "account": {
      "id": 456,
      "accountNumber": "265991234567",
      "balance": "0",
      "currency": "MWK"
    }
  }
}
```

### Step 2: Verify OTP Code

**Endpoint:** `POST /api/mobile/wallet/verify`

**Request Body:**
```json
{
  "verificationToken": "abc-123-def-456",
  "otpCode": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Device verified successfully",
  "user": {
    "id": 123,
    "phoneNumber": "265991234567",
    "username": "johndoe",
    "context": "WALLET",
    "accounts": [
      {
        "id": 456,
        "accountNumber": "265991234567",
        "accountName": "Wallet Account",
        "balance": "0",
        "currency": "MWK",
        "isPrimary": true
      }
    ],
    "primaryAccount": {
      "id": 456,
      "accountNumber": "265991234567",
      "balance": "0"
    },
    "tier": {
      "id": 1,
      "name": "Basic",
      "position": 1,
      "maximumBalance": "50000",
      "maxTransactionAmount": "10000",
      "dailyTransactionLimit": "20000",
      "monthlyTransactionLimit": "100000",
      "dailyTransactionCount": 10,
      "monthlyTransactionCount": 50
    }
  },
  "device": {
    "id": "dev-abc-123",
    "name": "Samsung Galaxy A51",
    "model": "SM-A515F",
    "os": "Android 11",
    "isActive": true
  },
  "appStructure": [
    {
      "id": 1,
      "name": "Home",
      "icon": "home",
      "pages": [...]
    }
  ]
}
```

**Error Responses:**
```json
// 400 - Invalid OTP
{
  "error": "Invalid verification code"
}

// 400 - Expired OTP
{
  "error": "Verification code expired. Please request a new code."
}

// 400 - Too many attempts
{
  "error": "Too many failed attempts. Please request a new code."
}
```

---

## API Endpoints

### 1. Get Registration Requirements

Get information about the default tier before registration.

**Endpoint:** `GET /api/mobile/wallet/register`

**Response:**
```json
{
  "success": true,
  "defaultTier": {
    "name": "Basic",
    "description": "Entry-level wallet tier",
    "maximumBalance": "50000",
    "maxTransactionAmount": "10000",
    "dailyTransactionLimit": "20000",
    "monthlyTransactionLimit": "100000",
    "requiredKycFields": []
  }
}
```

### 2. Register New Wallet User

Register a new wallet user with automatic tier assignment.

**Endpoint:** `POST /api/mobile/wallet/register`

**Request Body:**
```json
{
  "phoneNumber": "265991234567",
  "password": "SecurePassword123!",
  "username": "johndoe" // optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "phoneNumber": "265991234567",
    "username": "johndoe",
    "context": "WALLET",
    "isActive": true,
    "tier": {
      "id": 1,
      "name": "Basic",
      "position": 1,
      "maximumBalance": "50000",
      "maxTransactionAmount": "10000",
      "dailyTransactionLimit": "20000",
      "monthlyTransactionLimit": "100000",
      "dailyTransactionCount": 10,
      "monthlyTransactionCount": 50
    },
    "account": {
      "id": 456,
      "accountNumber": "265991234567",
      "accountName": "Wallet Account",
      "balance": "0",
      "currency": "MWK"
    }
  }
}
```

**Error Responses:**
```json
// 400 - Missing fields
{
  "error": "Phone number and password are required"
}

// 409 - User already exists
{
  "error": "User with this phone number already exists"
}

// 500 - Server error
{
  "error": "Registration failed"
}
```

### 3. Get User's Tier Information

Get current tier, limits, and usage for a wallet user.

**Endpoint:** `GET /api/mobile/wallet/tier?userId=123`

**Response:**
```json
{
  "success": true,
  "currentTier": {
    "id": 1,
    "name": "Basic",
    "description": "Entry-level wallet tier",
    "position": 1,
    "minimumBalance": "0",
    "maximumBalance": "50000",
    "minTransactionAmount": "100",
    "maxTransactionAmount": "10000",
    "dailyTransactionLimit": "20000",
    "monthlyTransactionLimit": "100000",
    "dailyTransactionCount": 10,
    "monthlyTransactionCount": 50,
    "requiredKycFields": []
  },
  "kyc": {
    "kycComplete": false,
    "completedFields": [],
    "missingFields": []
  },
  "limits": {
    "dailyAmount": {
      "used": 5000,
      "limit": 20000,
      "remaining": 15000,
      "percentage": 25
    },
    "monthlyAmount": {
      "used": 30000,
      "limit": 100000,
      "remaining": 70000,
      "percentage": 30
    },
    "dailyCount": {
      "used": 3,
      "limit": 10,
      "remaining": 7,
      "percentage": 30
    },
    "monthlyCount": {
      "used": 15,
      "limit": 50,
      "remaining": 35,
      "percentage": 30
    }
  },
  "availableUpgrades": [
    {
      "id": 2,
      "name": "Silver",
      "position": 2,
      "maximumBalance": "200000",
      "dailyTransactionLimit": "50000"
    }
  ]
}
```

---

## GraphQL API (Alternative)

You can also use GraphQL for more flexible queries.

### Create User with Automatic Tier Assignment

```graphql
mutation RegisterWalletUser {
  createMobileUser(input: {
    context: WALLET
    phoneNumber: "265991234567"
    passwordHash: "hashed_password"
    username: "johndoe"
  }) {
    id
    phoneNumber
    context
    walletTier {
      id
      name
      position
      maximumBalance
      maxTransactionAmount
      dailyTransactionLimit
      monthlyTransactionLimit
      dailyTransactionCount
      monthlyTransactionCount
    }
  }
}
```

### Get User with Tier Information

```graphql
query GetWalletUser {
  mobileUsers(context: WALLET) {
    id
    phoneNumber
    username
    walletTier {
      name
      position
      maximumBalance
      dailyTransactionLimit
    }
    primaryAccount {
      accountNumber
      balance
    }
  }
}
```

### Get User's KYC and Tier

```graphql
query GetUserKYC($userId: Int!) {
  mobileUserKYC(mobileUserId: $userId) {
    kycComplete
    walletTier {
      id
      name
      requiredKycFields
    }
    dateOfBirth
    occupation
    idNumber
  }
}
```

---

## Mobile Application Flow

### Complete Registration Flow

```
┌─────────────────────────────────────────┐
│ Step 1: User Registration               │
│ - Enter phone number & password         │
│ - Capture device info (ID, model, OS)  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ POST /api/mobile/wallet/register        │
│ - Create user account                   │
│ - Assign default tier                   │
│ - Create wallet account                 │
│ - Generate OTP code                     │
│ - Create device login attempt           │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ Response: OTP Required                  │
│ - verificationToken                     │
│ - maskedContact                         │
│ - User & tier info                      │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ Step 2: OTP Verification Screen         │
│ - Show masked phone number              │
│ - Input field for 6-digit code         │
│ - Countdown timer (10 minutes)          │
│ - Resend code button                    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ User enters OTP code                    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ POST /api/mobile/wallet/verify          │
│ - Verify OTP code                       │
│ - Create mobile device record           │
│ - Create device session                 │
│ - Generate JWT token                    │
│ - Return complete user data             │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ Step 3: Registration Complete           │
│ - Store JWT token                       │
│ - Show success message                  │
│ - Display tier info                     │
│ - Navigate to home screen               │
└─────────────────────────────────────────┘
```

### 2. Code Examples

#### Registration with Device Info

```typescript
// Mobile app registration function
const registerWalletUser = async (
  phoneNumber: string,
  password: string,
  deviceInfo: DeviceInfo
) => {
  try {
    const response = await fetch('/api/mobile/wallet/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber,
        password,
        username: phoneNumber, // Optional
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceModel: deviceInfo.deviceModel,
        deviceOs: deviceInfo.deviceOs,
        ipAddress: await getIpAddress(),
        location: await getLocation(),
      }),
    });

    const data = await response.json();

    if (data.success && data.requiresVerification) {
      // Navigate to OTP verification screen
      return {
        success: true,
        nextStep: 'OTP_VERIFICATION',
        verificationToken: data.verificationToken,
        maskedContact: data.maskedContact,
        userInfo: data.user,
      };
    }

    throw new Error(data.error || 'Registration failed');
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Get device information
const getDeviceInfo = (): DeviceInfo => {
  // Use react-native-device-info or similar
  return {
    deviceId: DeviceInfo.getUniqueId(),
    deviceName: DeviceInfo.getDeviceName(),
    deviceModel: DeviceInfo.getModel(),
    deviceOs: `${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}`,
  };
};
```

#### OTP Verification

```typescript
// Verify OTP code
const verifyOTP = async (verificationToken: string, otpCode: string) => {
  try {
    const response = await fetch('/api/mobile/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationToken,
        otpCode,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Store JWT token securely
      await SecureStore.setItemAsync('authToken', data.token);
      
      // Store user data
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      
      // Store tier info
      await AsyncStorage.setItem('tierInfo', JSON.stringify(data.user.tier));

      return {
        success: true,
        token: data.token,
        user: data.user,
        device: data.device,
        appStructure: data.appStructure,
      };
    }

    throw new Error(data.error || 'Verification failed');
  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};
```

#### Complete Registration Component (React Native)

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';

export const WalletRegistration = () => {
  const [step, setStep] = useState<'REGISTER' | 'VERIFY'>('REGISTER');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();
      const result = await registerWalletUser(phoneNumber, password, deviceInfo);
      
      if (result.nextStep === 'OTP_VERIFICATION') {
        setVerificationToken(result.verificationToken);
        setMaskedContact(result.maskedContact);
        setStep('VERIFY');
        Alert.alert('Success', `OTP sent to ${result.maskedContact}`);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      const result = await verifyOTP(verificationToken, otpCode);
      
      if (result.success) {
        Alert.alert('Success', 'Registration complete!');
        // Navigate to home screen
        navigation.navigate('Home', { user: result.user });
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'REGISTER') {
    return (
      <View>
        <Text>Register Wallet Account</Text>
        <TextInput
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          title={loading ? 'Registering...' : 'Register'}
          onPress={handleRegister}
          disabled={loading || !phoneNumber || !password}
        />
      </View>
    );
  }

  return (
    <View>
      <Text>Verify Your Device</Text>
      <Text>Enter the code sent to {maskedContact}</Text>
      <TextInput
        placeholder="Enter 6-digit code"
        value={otpCode}
        onChangeText={setOtpCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <Button
        title={loading ? 'Verifying...' : 'Verify'}
        onPress={handleVerifyOTP}
        disabled={loading || otpCode.length !== 6}
      />
    </View>
  );
};
```

### 3. Check Transaction Limits

Before processing a transaction:

```typescript
// Mobile app code example
const canProcessTransaction = (amount: number, tierInfo: any) => {
  const limits = tierInfo.limits;
  
  // Check single transaction limit
  if (amount > parseFloat(tierInfo.currentTier.maxTransactionAmount)) {
    return {
      allowed: false,
      reason: `Amount exceeds maximum transaction limit of ${tierInfo.currentTier.maxTransactionAmount}`,
    };
  }
  
  // Check daily limit
  if (amount > limits.dailyAmount.remaining) {
    return {
      allowed: false,
      reason: `Would exceed daily limit. Remaining: ${limits.dailyAmount.remaining}`,
    };
  }
  
  // Check monthly limit
  if (amount > limits.monthlyAmount.remaining) {
    return {
      allowed: false,
      reason: `Would exceed monthly limit. Remaining: ${limits.monthlyAmount.remaining}`,
    };
  }
  
  // Check daily transaction count
  if (limits.dailyCount.remaining <= 0) {
    return {
      allowed: false,
      reason: 'Daily transaction count limit reached',
    };
  }
  
  return { allowed: true };
};
```

---

## UI Display Examples

### Tier Badge
```
╔══════════════════════╗
║   Basic Tier  ⭐    ║
║                      ║
║ Balance: 5,000 MWK   ║
║ Limit: 50,000 MWK    ║
╚══════════════════════╝
```

### Limits Dashboard
```
Daily Limit
███████░░░ 70% used
14,000 / 20,000 MWK remaining

Monthly Limit
████░░░░░░ 40% used
60,000 / 100,000 MWK remaining

Transactions Today: 5 / 10
```

### Upgrade Prompt
```
╔═══════════════════════════════════╗
║ 🎉 Upgrade to Silver Tier         ║
║                                   ║
║ Unlock higher limits:             ║
║ • 200,000 MWK balance            ║
║ • 50,000 MWK daily limit         ║
║                                   ║
║ [Complete KYC to Upgrade]         ║
╚═══════════════════════════════════╝
```

---

## Error Handling

### Registration Errors

```typescript
try {
  const response = await fetch('/api/mobile/wallet/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 409) {
      // User already exists
      showMessage('This phone number is already registered');
    } else if (response.status === 400) {
      // Validation error
      showMessage(error.error);
    } else {
      // Server error
      showMessage('Registration failed. Please try again.');
    }
    
    return;
  }
  
  const data = await response.json();
  // Success - show tier info and proceed
} catch (error) {
  showMessage('Network error. Please check your connection.');
}
```

---

## Security Considerations

### 1. Password Security
- Always hash passwords on the server
- Use bcrypt with salt rounds >= 10
- Never store plain text passwords

### 2. Phone Number Validation
- Validate phone number format
- Consider SMS verification
- Check for duplicates

### 3. Rate Limiting
- Implement rate limiting on registration endpoint
- Limit attempts per IP/device
- Add CAPTCHA for suspicious activity

### 4. Authentication
- Use JWT tokens for authenticated requests
- Include tier info in token payload
- Refresh tokens regularly

---

## Testing

### Test Registration
```bash
# Get default tier info
curl http://localhost:3000/api/mobile/wallet/register

# Register new user
curl -X POST http://localhost:3000/api/mobile/wallet/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "265991234567",
    "password": "TestPassword123!",
    "username": "testuser"
  }'

# Get tier info
curl "http://localhost:3000/api/mobile/wallet/tier?userId=1"
```

---

## Troubleshooting

### Issue: No default tier configured
**Solution:** Create a default tier in admin panel:
```
POST /wallet/tiers/new
- Set "Default Tier" toggle to ON
- Configure basic limits
```

### Issue: User created but no tier assigned
**Solution:** Manually assign tier via GraphQL:
```graphql
mutation {
  upgradeWalletUserTier(mobileUserId: 123, newTierId: 1) {
    id
    walletTier {
      name
    }
  }
}
```

### Issue: Wallet account not created
**Solution:** Manually create account:
```
Use WalletTierService.getOrCreateWalletAccount(userId)
```

---

## Next Steps

1. ✅ **Register user** via mobile app
2. ✅ **Display tier info** on dashboard
3. ✅ **Show limits** before transactions
4. ⏳ **Implement KYC flow** for upgrades
5. ⏳ **Add tier upgrade UI** in mobile app
6. ⏳ **Track usage** and show analytics

---

**Status:** ✅ Ready for mobile integration!
**Date:** 2025-12-14
