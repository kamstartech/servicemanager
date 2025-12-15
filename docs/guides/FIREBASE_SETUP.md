# Firebase Push Notifications Setup

This document explains how to configure Firebase for push notifications in the Service Manager admin panel.

## Overview

The application uses Firebase Cloud Messaging (FCM) to send push notifications to mobile devices. There are two ways to configure Firebase:

1. **Environment Variables** (Recommended for production)
2. **Service Account File** (For development)

---

## Option 1: Environment Variables (Production)

### Step 1: Get Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file

### Step 2: Extract Values

Open the downloaded JSON file and extract these values:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
}
```

### Step 3: Set Environment Variables

Add to your `.env` file:

```bash
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
```

**Important:** 
- Keep the `\n` characters in the private key
- Wrap the private key in double quotes
- Never commit these values to version control

---

## Option 2: Service Account File (Development)

### Step 1: Download Service Account

1. Follow Step 1 from Option 1 above
2. Download the JSON file

### Step 2: Place File in Config Directory

```bash
# From the admin directory
mkdir -p config
cp /path/to/your/firebase-service-account.json config/firebase-service-account.json
```

### Step 3: Gitignore

Make sure `config/firebase-service-account.json` is in `.gitignore`:

```bash
# Add to .gitignore
config/firebase-service-account.json
```

---

## Verification

### Test Firebase Initialization

The application will automatically initialize Firebase on startup. Check the logs:

**Success:**
```
Firebase Admin SDK initialized from environment variables
```

or

```
Firebase Admin SDK initialized from service account file
```

**No Configuration:**
```
Firebase credentials not found. Push notifications will not work.
Configure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.
```

### Test Push Notification

Use the GraphQL API to test:

```graphql
mutation {
  sendTestNotification(userId: 123) {
    success
    successCount
    failureCount
    notificationId
  }
}
```

---

## How It Works

The Firebase Admin SDK initialization follows this priority:

1. **First**, try environment variables (`FIREBASE_PROJECT_ID`, etc.)
2. **If not found**, try reading from `config/firebase-service-account.json`
3. **If neither**, log a warning and continue (push notifications disabled)

This approach ensures:
- ✅ No build errors if Firebase isn't configured
- ✅ Graceful degradation (app works without push notifications)
- ✅ Flexible configuration for different environments

---

## Security Best Practices

### Production

✅ **DO:**
- Use environment variables
- Store credentials in secure secret management (AWS Secrets Manager, Azure Key Vault, etc.)
- Rotate credentials regularly
- Use IAM roles when possible

❌ **DON'T:**
- Commit service account files to Git
- Share private keys in Slack/Email
- Use development credentials in production
- Hard-code credentials in source code

### Development

✅ **DO:**
- Use service account file in `config/` directory
- Add to `.gitignore`
- Use separate Firebase project for development

❌ **DON'T:**
- Use production credentials locally
- Commit service account files

---

## Troubleshooting

### "Firebase Admin SDK not initialized" Error

**Cause:** Firebase wasn't initialized, but push notification code tried to use it.

**Solution:** 
1. Check that environment variables are set correctly
2. Or place service account file in `config/` directory
3. Restart the application

### "messaging/invalid-registration-token" Error

**Cause:** FCM token is invalid or expired.

**Solution:** The application automatically removes invalid tokens. No action needed.

### "Permission denied" Error

**Cause:** Service account doesn't have correct permissions.

**Solution:** 
1. Go to Firebase Console → IAM & Admin
2. Ensure service account has "Firebase Cloud Messaging Admin" role
3. Regenerate service account key if needed

### Build Error: "Can't resolve './ROOT/config/firebase-service-account.json'"

**Cause:** Next.js tried to bundle the service account file at build time.

**Solution:** This is fixed by using `fs.readFileSync()` instead of `require()`. Update to latest version.

---

## Mobile App Integration

Mobile apps need to:

1. Initialize Firebase SDK
2. Request notification permissions
3. Get FCM token
4. Send token to backend API
5. Handle incoming notifications

See mobile app documentation for details.

---

## GraphQL Mutations

### Send Test Notification

```graphql
mutation SendTestNotification($userId: Int!, $deviceId: String) {
  sendTestNotification(userId: $userId, deviceId: $deviceId) {
    success
    successCount
    failureCount
    notificationId
  }
}
```

### Send Checkbook Status Update

```graphql
mutation NotifyCheckbookStatus($userId: Int!, $status: String!, $requestId: String!) {
  notifyCheckbookStatus(
    userId: $userId
    status: $status
    requestId: $requestId
  ) {
    success
    successCount
    notificationId
  }
}
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Yes* | Firebase project ID | `my-banking-app` |
| `FIREBASE_PRIVATE_KEY` | Yes* | Private key from service account | `-----BEGIN PRIVATE KEY-----\n...` |
| `FIREBASE_CLIENT_EMAIL` | Yes* | Service account email | `firebase-adminsdk@my-app.iam...` |

*Required only if not using service account file

---

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [Service Account Permissions](https://firebase.google.com/docs/admin/setup#initialize-sdk)

---

**Last Updated:** December 15, 2024  
**Maintainer:** Development Team
