# Registration Status Check API

## Endpoint

```
GET /api/registrations/status
```

## Description

Third-party endpoint to check the status of a registration request. Can be used by external systems to track registration progress and get real-time updates.

## Authentication

⚠️ **Note**: This is currently a public endpoint. Consider adding API key authentication in production.

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_number` | string | Yes* | Customer number from T24 |
| `phone_number` | string | Yes* | Phone number of the user |

**At least one parameter is required*

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Status message based on current state",
  "data": {
    "registration_id": 123,
    "status": "APPROVED|PENDING|COMPLETED|FAILED|DUPLICATE",
    "customer_number": "1234567",
    "phone_number": "+265991234567",
    "created_at": "2024-12-14T16:00:00.000Z",
    "processed_at": "2024-12-14T16:00:30.000Z",
    "user_id": 456,
    "username": "username",
    "is_active": true,
    "process_stages": [
      {
        "stage": "duplicate_check",
        "status": "completed",
        "timestamp": "2024-12-14T16:00:05.000Z",
        "details": "No duplicate found"
      }
    ]
  }
}
```

### Error Response (400/404/500)

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Status Values

| Status | Description | Response Fields |
|--------|-------------|-----------------|
| **PENDING** | Request received, processing in progress | `estimated_completion` |
| **APPROVED** | Validated successfully, user creation pending | `user_id`, `username`, `notes` |
| **COMPLETED** | User created successfully | `user_id`, `username`, `is_active` |
| **FAILED** | Validation failed | `error`, `can_retry` |
| **DUPLICATE** | User already exists | `user_id`, `username`, `error` |

## Usage Examples

### Check by Customer Number

```bash
curl -X GET "https://your-domain.com/api/registrations/status?customer_number=1234567"
```

### Check by Phone Number

```bash
curl -X GET "https://your-domain.com/api/registrations/status?phone_number=%2B265991234567"
```

### JavaScript/TypeScript Example

```typescript
async function checkRegistrationStatus(customerNumber: string) {
  const response = await fetch(
    `/api/registrations/status?customer_number=${customerNumber}`
  );
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Status: ${result.data.status}`);
    console.log(`Message: ${result.message}`);
    
    if (result.data.user_id) {
      console.log(`User ID: ${result.data.user_id}`);
    }
  } else {
    console.error(`Error: ${result.error}`);
  }
  
  return result;
}

// Usage
checkRegistrationStatus("1234567");
```

### Python Example

```python
import requests

def check_registration_status(customer_number):
    url = "https://your-domain.com/api/registrations/status"
    params = {"customer_number": customer_number}
    
    response = requests.get(url, params=params)
    result = response.json()
    
    if result.get("success"):
        print(f"Status: {result['data']['status']}")
        print(f"Message: {result['message']}")
        
        if result['data'].get('user_id'):
            print(f"User ID: {result['data']['user_id']}")
    else:
        print(f"Error: {result['error']}")
    
    return result

# Usage
check_registration_status("1234567")
```

## Response Examples

### Pending Registration

```json
{
  "success": true,
  "message": "Registration request is pending processing",
  "data": {
    "registration_id": 123,
    "status": "PENDING",
    "customer_number": "1234567",
    "phone_number": "+265991234567",
    "created_at": "2024-12-14T16:00:00.000Z",
    "processed_at": null,
    "estimated_completion": "Processing typically takes 1-2 minutes"
  }
}
```

### Completed Registration

```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "registration_id": 123,
    "status": "COMPLETED",
    "customer_number": "1234567",
    "phone_number": "+265991234567",
    "created_at": "2024-12-14T16:00:00.000Z",
    "processed_at": "2024-12-14T16:01:30.000Z",
    "user_id": 456,
    "username": "user1234567",
    "is_active": true,
    "notes": "User created successfully with 3 accounts linked",
    "process_stages": [
      {
        "stage": "duplicate_check",
        "status": "completed",
        "timestamp": "2024-12-14T16:00:05.000Z",
        "details": "No duplicate found"
      },
      {
        "stage": "t24_lookup",
        "status": "completed",
        "timestamp": "2024-12-14T16:00:10.000Z",
        "details": "Found 3 accounts"
      },
      {
        "stage": "account_validation",
        "status": "completed",
        "timestamp": "2024-12-14T16:00:15.000Z",
        "details": "Validated 3 accounts"
      }
    ]
  }
}
```

### Failed Registration

```json
{
  "success": false,
  "message": "Registration validation failed",
  "data": {
    "registration_id": 123,
    "status": "FAILED",
    "customer_number": "1234567",
    "phone_number": "+265991234567",
    "created_at": "2024-12-14T16:00:00.000Z",
    "processed_at": "2024-12-14T16:00:20.000Z",
    "error": "No accounts found for customer",
    "can_retry": true,
    "process_stages": [
      {
        "stage": "duplicate_check",
        "status": "completed",
        "timestamp": "2024-12-14T16:00:05.000Z",
        "details": "No duplicate found"
      },
      {
        "stage": "t24_lookup",
        "status": "failed",
        "timestamp": "2024-12-14T16:00:20.000Z",
        "details": "No accounts found"
      }
    ]
  }
}
```

### Duplicate User

```json
{
  "success": true,
  "message": "User already exists with this information",
  "data": {
    "registration_id": 123,
    "status": "DUPLICATE",
    "customer_number": "1234567",
    "phone_number": "+265991234567",
    "created_at": "2024-12-14T16:00:00.000Z",
    "processed_at": "2024-12-14T16:00:10.000Z",
    "user_id": 456,
    "username": "user1234567",
    "error": "User already exists with identical information"
  }
}
```

## Error Codes

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 400 | Bad Request | Missing required parameters |
| 404 | Not Found | No registration found for criteria |
| 500 | Internal Server Error | Server error occurred |

## Integration Workflow

1. **Create Registration**: POST to `/api/registrations`
2. **Poll Status** (every 5-10 seconds): GET `/api/registrations/status?customer_number=XXX`
3. **Check Status**:
   - `PENDING` → Continue polling
   - `APPROVED` → User creation in progress, continue polling
   - `COMPLETED` → Success! User created
   - `FAILED` → Handle error, possibly retry
   - `DUPLICATE` → User already exists

## Polling Best Practices

```typescript
async function pollRegistrationStatus(
  customerNumber: string,
  maxAttempts: number = 20,
  intervalMs: number = 5000
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await checkRegistrationStatus(customerNumber);
    
    // Terminal states - stop polling
    if (['COMPLETED', 'FAILED', 'DUPLICATE'].includes(result.data.status)) {
      return result;
    }
    
    // Still processing - wait and retry
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  throw new Error('Registration status check timeout');
}
```

## Security Recommendations

For production deployment, consider:

1. **API Key Authentication**: Add `X-API-Key` header requirement
2. **Rate Limiting**: Limit requests per IP/API key
3. **HTTPS Only**: Enforce SSL/TLS
4. **Request Signing**: HMAC-based request signatures
5. **IP Whitelisting**: Restrict to known third-party IPs

## Support

For integration assistance, contact the API support team.
