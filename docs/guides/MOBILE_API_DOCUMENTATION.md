# Mobile GraphQL API - Complete Documentation

## Overview

The Mobile API provides JWT-authenticated endpoints for mobile banking apps. All queries/mutations automatically validate JWT tokens, check session activity, and enforce 5.5-minute inactivity timeouts.

---

## Authentication

### Authorization Header
```http
Authorization: Bearer <jwt_token>
```

### Automatic Validation
Every request:
1. ✅ Verifies JWT signature
2. ✅ Checks session exists and is active
3. ✅ Validates user is active
4. ✅ Checks inactivity timeout (5.5 minutes)
5. ✅ Updates `lastActivityAt`
6. ✅ Extracts userId, deviceId, sessionId from token

### Session Timeout
- **Inactivity Period**: 5.5 minutes
- **Behavior**: If no activity for 5.5 minutes → session auto-revoked
- **Response**: `Authentication required` error
- **Action**: Mobile app must re-login

---

## Mobile API Endpoints

### Device Management

#### Get My Devices
```graphql
query {
  myDevices {
    id
    deviceId
    name
    model
    os
    isActive
    isCurrent      # Is this the current device?
    lastUsedAt
    createdAt
    activeSessions {
      id
      lastActivityAt
      ipAddress
      isCurrent
    }
  }
}
```

**Features:**
- Lists all devices for current user
- Marks current device with `isCurrent: true`
- Shows active sessions per device
- No userId needed (from JWT)

#### Revoke Device
```graphql
mutation {
  revokeMyDevice(deviceId: "device_xyz")
}
```

**Behavior:**
- Cannot revoke current device (use logout)
- Revokes all sessions for that device
- User must re-login on that device

#### Rename Device
```graphql
mutation {
  renameMyDevice(deviceId: "device_xyz", name: "John's iPad") {
    id
    name
    isCurrent
  }
}
```

---

### Session Management

#### Get My Sessions
```graphql
query {
  mySessions {
    id
    deviceId
    lastActivityAt
    createdAt
    expiresAt
    ipAddress
    isActive
    isCurrent      # Is this the current session?
  }
}
```

**Use Case:** View all active sessions across devices

#### Revoke Specific Session
```graphql
mutation {
  revokeMySession(sessionId: "session_123")
}
```

**Behavior:**
- Cannot revoke current session (use logout)
- Immediately invalidates that session

#### Revoke All Other Sessions
```graphql
mutation {
  revokeAllMyOtherSessions {
    success
    message
  }
}
```

**Use Case:**
- "Logout all other devices" feature
- Security: suspected account compromise
- Keeps current session active

---

### Profile & Accounts

#### Get My Profile
```graphql
query {
  myProfile {
    id
    firstName
    lastName
    email
    phone
    address
    city
    country
    zip
    createdAt
    updatedAt
  }
}
```

#### Update My Profile
```graphql
mutation {
  updateMyProfile(input: {
    firstName: "John"
    lastName: "Doe"
    email: "john@example.com"
    phone: "+265999123456"
    address: "123 Main St"
    city: "Lilongwe"
    country: "Malawi"
    zip: "00100"
  }) {
    id
    firstName
    lastName
    email
  }
}
```

**Behavior:** Creates profile if doesn't exist, updates if exists

#### Get My Accounts
```graphql
query {
  myAccounts {
    id
    accountNumber
    accountName
    accountType
    currency
    balance
    isPrimary
    isActive
    createdAt
  }
}
```

**Returns:** All accounts sorted by primary first, then creation date

#### Get My Primary Account
```graphql
query {
  myPrimaryAccount {
    id
    accountNumber
    accountName
    balance
    currency
  }
}
```

**Returns:** Primary account or `null` if none set

---

### Beneficiaries

#### Get My Beneficiaries
```graphql
query {
  myBeneficiaries(type: WALLET) {
    id
    beneficiaryName
    beneficiaryType
    walletNumber
    accountNumber
    bankName
    createdAt
  }
}
```

**Parameters:**
- `type` (optional): Filter by `WALLET`, `BANK_INTERNAL`, `BANK_EXTERNAL`
- Omit to get all beneficiaries

---

## Context Structure

All resolvers receive this context automatically:

```typescript
interface GraphQLContext {
  userId?: number;        // From JWT (null if unauthenticated)
  deviceId?: string;      // From JWT
  sessionId?: string;     // From JWT
  token?: string;         // Original JWT token
}
```

**Usage in Resolvers:**
```typescript
async myProfile(_: unknown, __: unknown, context: GraphQLContext) {
  if (!context.userId) {
    throw new Error("Authentication required");
  }
  
  // Use context.userId - never accept from args!
  const profile = await prisma.mobileUserProfile.findUnique({
    where: { mobileUserId: context.userId }
  });
  
  return profile;
}
```

---

## Mobile App Integration

### Setup Apollo Client

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const httpLink = createHttpLink({
  uri: 'https://api.example.com/api/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('jwt_token');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

### Handle Session Expiry

```typescript
import { onError } from '@apollo/client/link/error';

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      if (err.message === 'Authentication required' || 
          err.message.includes('Session expired')) {
        // Auto-logout
        AsyncStorage.removeItem('jwt_token');
        navigation.navigate('Login');
      }
    }
  }
});

const client = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
});
```

### Implement Inactivity Timer

```typescript
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

function useInactivityLogout() {
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIMEOUT = 5.5 * 60 * 1000; // 5.5 minutes
  
  const resetTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    
    inactivityTimer.current = setTimeout(() => {
      // Logout user
      AsyncStorage.removeItem('jwt_token');
      navigation.navigate('Login');
      Alert.alert('Session Expired', 'You have been logged out due to inactivity.');
    }, INACTIVITY_TIMEOUT);
  };
  
  useEffect(() => {
    // Reset timer on app state change
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        resetTimer();
      }
    });
    
    // Initial timer
    resetTimer();
    
    return () => {
      subscription.remove();
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, []);
  
  return resetTimer;
}

// In your root component
function App() {
  const resetInactivityTimer = useInactivityLogout();
  
  // Call resetInactivityTimer on every user interaction
  return (
    <GestureHandlerRootView onTouchStart={resetInactivityTimer}>
      <NavigationContainer>
        {/* Your app navigation */}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
```

---

## Example Use Cases

### Settings Page: Device Management

```typescript
const GET_MY_DEVICES = gql`
  query MyDevices {
    myDevices {
      id
      deviceId
      name
      model
      os
      isActive
      isCurrent
      lastUsedAt
      activeSessions {
        lastActivityAt
      }
    }
  }
`;

function DeviceSettingsScreen() {
  const { data, loading } = useQuery(GET_MY_DEVICES);
  
  return (
    <ScrollView>
      <Text style={styles.title}>My Devices</Text>
      {data?.myDevices.map(device => (
        <DeviceCard key={device.id}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceName}>
              {device.name || device.model}
            </Text>
            {device.isCurrent && (
              <Badge>This Device</Badge>
            )}
          </View>
          <Text style={styles.lastUsed}>
            Last used: {formatDate(device.lastUsedAt)}
          </Text>
          <Text style={styles.sessions}>
            {device.activeSessions.length} active session(s)
          </Text>
          {!device.isCurrent && (
            <Button 
              title="Remove Device"
              onPress={() => revokeDevice(device.deviceId)}
            />
          )}
        </DeviceCard>
      ))}
    </ScrollView>
  );
}
```

### Profile Screen

```typescript
const GET_MY_PROFILE = gql`
  query MyProfile {
    myProfile {
      firstName
      lastName
      email
      phone
      address
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      id
      firstName
      lastName
    }
  }
`;

function ProfileScreen() {
  const { data } = useQuery(GET_MY_PROFILE);
  const [updateProfile] = useMutation(UPDATE_PROFILE);
  
  const handleSave = async (values) => {
    await updateProfile({ variables: { input: values } });
    Alert.alert('Success', 'Profile updated');
  };
  
  return (
    <Formik
      initialValues={data?.myProfile || {}}
      onSubmit={handleSave}
    >
      {/* Form fields */}
    </Formik>
  );
}
```

---

## Security Features

### Built-in Protection
- ✅ **No userId exposure** - Never sent from mobile
- ✅ **JWT validation** - Every request
- ✅ **Session tracking** - All sessions logged
- ✅ **Inactivity timeout** - Auto-logout at 5.5 min
- ✅ **Device isolation** - Actions affect only relevant device
- ✅ **Cannot self-revoke** - Prevents accidental logout

### Best Practices
1. **Store tokens securely** - Use `@react-native-async-storage/async-storage` or `expo-secure-store`
2. **Handle expiry gracefully** - Auto-redirect to login
3. **Implement inactivity timer** - Client-side enforcement
4. **Clear tokens on logout** - Remove from storage
5. **Show session info** - Let users see active devices

---

## Error Handling

### Common Errors

**Authentication Required**
```json
{
  "errors": [{
    "message": "Authentication required"
  }]
}
```
**Action:** Redirect to login

**Session Expired**
```json
{
  "errors": [{
    "message": "Session expired due to inactivity"
  }]
}
```
**Action:** Show message, redirect to login

**Cannot Revoke Current Device**
```json
{
  "errors": [{
    "message": "Cannot revoke current device. Use logout instead."
  }]
}
```
**Action:** Use logout mutation/endpoint

---

## Testing

### Get Devices
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt>" \
  -d '{"query":"query { myDevices { id deviceId name isCurrent } }"}'
```

### Update Profile
```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt>" \
  -d '{
    "query":"mutation($input: UpdateMyProfileInput!) { updateMyProfile(input: $input) { id firstName } }",
    "variables": {
      "input": {
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  }'
```

---

## Summary

✅ **All mobile endpoints** use JWT context (no userId args)
✅ **Automatic session validation** on every request
✅ **5.5-minute inactivity timeout** enforced
✅ **Multi-device support** with per-device sessions
✅ **Secure API** - no internal IDs exposed
✅ **Clean separation** from admin API

**Status:** Production Ready 🚀
