# Admin Panel Documentation

## 📁 Documentation Structure

### `/t24` - T24 Core Banking Integration
Documentation for T24 ESB API integrations and core banking features.

### `/features` - Feature Implementation Guides
Documentation for implemented features like forms, authentication, beneficiaries, etc.

### `/infrastructure` - Infrastructure & DevOps
Documentation for deployment, Docker, storage, email, and infrastructure setup.

### `/guides` - Development Guides
Quick start guides, API documentation, and development workflows.

### `/archive` - Historical Documentation
Legacy or superseded documentation kept for reference.

## 🚀 Quick Links

### Essential Documentation
- [Project Rules](../PROJECT_RULES.md) - Development guidelines and conventions
- [README](../README.md) - Project overview and setup

### T24 Integration
- [T24 Accounts API](t24/T24_ACCOUNTS_ENDPOINT.md) - Customer accounts endpoint
- [T24 Accounts Pagination](t24/T24_ACCOUNTS_PAGINATION.md) - Pagination implementation
- [T24 Docker IPv6 Fix](t24/T24_DOCKER_IPV6_FIX.md) - Container network fix
- [T24 Balance Integration](t24/T24_BALANCE_INTEGRATION.md) - Balance sync service

### Key Features
- [Mobile API Documentation](guides/MOBILE_API_DOCUMENTATION.md) - Mobile banking API
- [OTP API Documentation](guides/OTP_API_DOCUMENTATION.md) - OTP verification
- [Forms Implementation](features/FORMS_COMPLETE.md) - Dynamic forms system
- [Multi-Account Support](features/MULTI_ACCOUNT_SUPPORT.md) - Multiple accounts per user

### Infrastructure
- [Docker Setup](infrastructure/DEV_SERVER_RESTART.md) - Development environment
- [MinIO Storage](infrastructure/MINIO_QUICK_START.md) - Object storage setup
- [Email Testing](infrastructure/EMAIL_TESTING_SETUP.md) - Email configuration
- [Backup Storage](infrastructure/BACKUP_STORAGE_IMPLEMENTATION.md) - Backup system

## 📝 Documentation Standards

### File Naming
- Use `SCREAMING_SNAKE_CASE.md` for documentation files
- Prefix with domain: `T24_`, `WALLET_`, `LOGIN_`, etc.
- Use descriptive names: `FEATURE_IMPLEMENTATION.md` not `IMPL.md`

### Document Structure
```markdown
# Title

## Summary
Brief overview of what this document covers

## Problem/Context
What problem does this solve?

## Solution
How was it solved?

## Implementation Details
Technical details and code examples

## Testing
How to test/verify

## Files Changed
List of modified files

## Related Documentation
Links to related docs

## Date
YYYY-MM-DD
```

## 🔍 Finding Documentation

### By Topic
```bash
# T24 Integration
docs/t24/

# Feature Implementation
docs/features/

# Infrastructure Setup
docs/infrastructure/

# API Documentation
docs/guides/
```

---

*Last Updated: 2025-12-13*
