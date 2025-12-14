# Quick Start Guide - Third-Party JWT API

## 🚀 Get Started in 5 Minutes

### Step 1: Run Database Migration
```bash
cd /home/jimmykamanga/Documents/Play/service_manager/admin
npx prisma migrate dev --name add_third_party_api_management
npx prisma generate
```

### Step 2: Create a Test Client
```bash
curl -X POST http://localhost:3000/api/admin/third-party/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "description": "Testing third-party API",
    "contactEmail": "test@example.com",
    "rateLimitPerMinute": 60,
    "rateLimitPerHour": 1000
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "name": "Test Client",
    ...
  }
}
```

**Save the client ID:** `clx1234567890`

### Step 3: Generate API Token
```bash
curl -X POST http://localhost:3000/api/admin/third-party/clients/clx1234567890/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "expiresIn": "30d",
    "permissions": ["registrations:read", "registrations:create"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenId": "key_abc123",
    "expiresAt": "2025-01-13T16:19:49.600Z",
    "expiresInDays": 30
  },
  "message": "⚠️ Save this token securely. It will not be shown again."
}
```

**⚠️ IMPORTANT:** Copy and save the token immediately!

### Step 4: Test the API

**Check Registration Status:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:3000/api/registrations/status?customer_number=12345" \
  -H "Authorization: Bearer $TOKEN"
```

**Create Registration:**
```bash
curl -X POST http://localhost:3000/api/registrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+265991234567",
    "customer_number": "12345",
    "first_name": "John",
    "last_name": "Doe",
    "email_address": "john@example.com"
  }'
```

---

## 📖 Common Operations

### List All Tokens for Client
```bash
curl http://localhost:3000/api/admin/third-party/clients/clx1234567890/tokens
```

### Revoke a Token
```bash
curl -X PATCH http://localhost:3000/api/admin/third-party/tokens/key_abc123 \
  -H "Content-Type: application/json" \
  -d '{"action": "revoke"}'
```

### Suspend a Token
```bash
curl -X PATCH http://localhost:3000/api/admin/third-party/tokens/key_abc123 \
  -H "Content-Type: application/json" \
  -d '{"action": "suspend"}'
```

### Reactivate a Token
```bash
curl -X PATCH http://localhost:3000/api/admin/third-party/tokens/key_abc123 \
  -H "Content-Type: application/json" \
  -d '{"action": "reactivate"}'
```

---

## 🔐 Token Expiration Options

```bash
"30d"   # 30 days
"90d"   # 90 days (3 months)
"180d"  # 180 days (6 months)
"365d"  # 365 days (1 year)
"1y"    # 1 year (shorthand)
"2y"    # 2 years
```

---

## ⚠️ Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid or expired token",
  "message": "Your API token is invalid, expired, or has been revoked"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "This token does not have the required permissions: registrations:create"
}
```

---

## 🎯 IP Whitelisting (Optional)

When creating client with IP restrictions:
```bash
curl -X POST http://localhost:3000/api/admin/third-party/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Restricted Client",
    "allowedIps": ["192.168.1.100", "10.0.0.0/24"],
    ...
  }'
```

Tokens will only work from specified IPs.

---

## 📊 Monitor Usage

Get token details including usage stats:
```bash
curl http://localhost:3000/api/admin/third-party/tokens/key_abc123
```

Response includes:
- `usageCount` - Total API calls
- `lastUsedAt` - Last usage timestamp
- `daysUntilExpiry` - Days remaining

---

## 🔄 Token Rotation

1. Generate new token before old one expires
2. Provide new token to third-party
3. Grace period: Both tokens work
4. Revoke old token after migration

```bash
# Generate new token
curl -X POST .../tokens -d '{"name": "Production Token v2", "expiresIn": "1y"}'

# After third-party migrates (7 days grace):
curl -X DELETE .../tokens/old_token_id
```

---

## 🆘 Troubleshooting

**Token not working?**
1. Check token status: `GET /api/admin/third-party/tokens/{tokenId}`
2. Verify not expired
3. Verify not revoked/suspended
4. Check IP if whitelist configured
5. Verify permissions match endpoint

**Need help?**
- Check access logs for failed attempts
- Review token permissions
- Verify client is active
- Check server logs for errors

---

**Ready to integrate!** 🎉
