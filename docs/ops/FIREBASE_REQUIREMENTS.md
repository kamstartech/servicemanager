# Firebase Push Notification Setup Requirements

## What I Need from You

To implement push notifications in the admin Node.js project, I need the following Firebase credentials:

---

## Option 1: Firebase Service Account (Recommended - Modern Approach)

### Required Information:

1. **Firebase Project ID**
   - Example: `my-mobile-banking-app`
   - Where to find: Firebase Console → Project Settings → General

2. **Service Account Private Key**
   - A JSON file downloaded from Firebase Console
   - Where to get it:
     - Go to Firebase Console
     - Project Settings → Service Accounts
     - Click "Generate New Private Key"
     - Download the JSON file

### The JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### What I'll do with it:
```env
# I'll extract these values for .env file:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

---

## Option 2: Firebase Legacy Server Key (Simpler but Deprecated)

### Required Information:

1. **FCM Server Key**
   - A long string token
   - Where to find:
     - Firebase Console
     - Project Settings → Cloud Messaging
     - Look for "Server key" under Cloud Messaging API (Legacy)

### Example:
```
FCM_SERVER_KEY=AAAAxxxxxxx:APA91bHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Note**: This is the legacy approach. Google recommends using Service Account (Option 1).

---

## Option 3: Use Existing Credentials from Elixir Settings

If you already configured Firebase in the Elixir admin panel:

### I can query the database:
```sql
SELECT config->'fcm_server_key' as fcm_server_key
FROM settings 
WHERE key = 'notifications' 
AND status = 'active'
ORDER BY inserted_at DESC 
LIMIT 1;
```

### What I need from you:
- Permission to query the Elixir database `settings` table
- Or export the FCM credentials from the Elixir admin

---

## Additional Information (Optional but Helpful)

### Apple Push Notifications (iOS)
If you also want iOS push notifications:

1. **APN Key ID**
2. **APN Team ID**
3. **APN Bundle ID**
4. **APN Key File** (.p8 file)

Where to get:
- Apple Developer Account → Certificates, Identifiers & Profiles → Keys

---

## Which Option Should You Choose?

### ✅ Choose Option 1 (Service Account) if:
- You want the modern, recommended approach
- You need fine-grained control
- You're setting up fresh
- You want better security

### ✅ Choose Option 2 (Legacy Server Key) if:
- You need something quick
- You already have the server key
- You don't need advanced features

### ✅ Choose Option 3 (Existing Elixir Config) if:
- Firebase is already configured in Elixir
- You want to reuse existing setup
- You want centralized configuration

---

## How to Get Firebase Credentials (Step by Step)

### If you don't have a Firebase project yet:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/

2. **Create a new project** (or select existing)
   - Click "Add project"
   - Enter project name
   - Follow the wizard

3. **Enable Cloud Messaging**
   - In Project Settings
   - Go to Cloud Messaging tab
   - Enable "Cloud Messaging API"

4. **Generate Service Account**
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely

5. **Send me the credentials** (securely)
   - The JSON file contents, OR
   - Just the three environment variables (project_id, private_key, client_email)

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit credentials to git
- Share credentials securely (encrypted)
- Store in environment variables only
- Rotate keys periodically

### How to share securely:
1. Use encrypted messaging (Signal, WhatsApp)
2. Use password-protected file
3. Share via secure vault (1Password, LastPass)
4. Or give me database access to query existing config

---

## What Happens After You Provide Credentials?

I will:

1. ✅ Install `firebase-admin` npm package
2. ✅ Set up Firebase Admin SDK initialization
3. ✅ Add environment variables to `.env` (you'll need to add to production)
4. ✅ Create database migrations for FCM tokens
5. ✅ Implement GraphQL mutations for device registration
6. ✅ Create push notification service
7. ✅ Add notification triggers (checkbook updates, transactions, etc.)
8. ✅ Create testing endpoints
9. ✅ Document for mobile app team

---

## Timeline

Once I have credentials:
- **Setup**: 30 minutes
- **Implementation**: 2-3 hours
- **Testing**: 1 hour
- **Total**: ~4 hours to have working push notifications

---

## Questions?

Let me know:
1. Which option you prefer (1, 2, or 3)?
2. Do you have existing Firebase project?
3. Do you need iOS support too?
4. Any specific notification requirements?

---

## Quick Start (If you choose Option 1)

Just send me these 3 values:

```env
FIREBASE_PROJECT_ID=your-project-id-here
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
your-private-key-here
-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

And I'll handle the rest! 🚀
