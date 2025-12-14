# API & Development Guides

## Overview

This directory contains API documentation, authentication guides, and development workflow documentation.

## 📚 Documentation Index

### API Documentation
- **[MOBILE_API_DOCUMENTATION.md](MOBILE_API_DOCUMENTATION.md)** - Mobile banking API reference
- **[JWT_AUTH.md](JWT_AUTH.md)** - JWT authentication implementation

### Monitoring & Services
- **[SERVICES_MONITOR.md](SERVICES_MONITOR.md)** - Service monitoring and status

## 🔐 Authentication

The system uses JWT (JSON Web Tokens) for authentication:

### Token Flow
1. **Login:** POST /api/auth/login → Returns access token & refresh token
2. **Access API:** Include `Authorization: Bearer {token}` header
3. **Refresh:** POST /api/auth/refresh → Get new access token
4. **Logout:** POST /api/auth/logout → Invalidate tokens

### Token Types
- **Access Token:** Short-lived (15min-1h), used for API requests
- **Refresh Token:** Long-lived (7-30 days), used to get new access tokens

## 📱 Mobile API

### Base URL
```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
```

### Key Endpoints
```
POST   /api/mobile/auth/login          # Login with phone/OTP
POST   /api/mobile/auth/verify-otp     # Verify OTP code
GET    /api/mobile/accounts             # Get user accounts
GET    /api/mobile/accounts/:id/balance # Get account balance
POST   /api/mobile/transactions         # Create transaction
GET    /api/mobile/beneficiaries        # Get beneficiaries
```

### Authentication Header
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🛠 Development Workflow

### 1. Start Development Server
```bash
npm run dev
# or
docker compose up -d adminpanel
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Migrations
```bash
npx prisma migrate dev
```

### 4. Test API Endpoints
```bash
# Using curl
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/mobile/accounts

# Using Postman/Insomnia
# Import API collection from MOBILE_API_DOCUMENTATION.md
```

## 🔍 Service Monitoring

### Health Check Endpoints
```
GET /api/health              # Overall health
GET /api/services/status     # Background services status
```

### Background Services
- **Balance Sync:** Every 5 minutes
- **Account Discovery:** Every 24 hours
- **Migration Scheduler:** Continuous

### Service Status Response
```json
{
  "balanceSync": {
    "running": true,
    "syncing": false,
    "lastSync": "2025-12-13T13:00:00Z"
  },
  "accountDiscovery": {
    "running": true,
    "discovering": false,
    "paginationQueueSize": 0,
    "interval": 86400000
  }
}
```

## 📝 API Response Format

### Success Response
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "status": 1,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

## 🧪 Testing

### Test Credentials
```
Username: testuser
Password: password123
Phone: +265999123456
Customer Number: 35042058
Account Number: 1520000114607
```

### Test Environment
- Use MailHog for email testing (localhost:8025)
- Use MinIO for file upload testing (localhost:9001)
- Use test T24 credentials from .env

## 📚 Related Documentation

- **T24 Integration:** `/docs/t24/`
- **Features:** `/docs/features/`
- **Infrastructure:** `/docs/infrastructure/`

---

*Last Updated: 2025-12-13*
