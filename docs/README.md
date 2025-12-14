# Admin Panel Documentation

## 📁 Documentation Structure

### `/t24` - T24 Core Banking Integration
Documentation for T24 ESB API integrations and core banking features.

### `/features` - Feature Implementation Guides
Documentation for implemented features including:
- Authentication & Security (Login, Registration, OTP, Password Reset)
- Workflows & Billers
- Alerts & Notifications
- Transactions & Checkbooks
- Forms & UI Components

### `/infrastructure` - Infrastructure & DevOps
Documentation for deployment, Docker, storage, email, backups, and infrastructure setup.

### `/api` - API Documentation
GraphQL schema, security, rate limiting, and API specifications.

### `/guides` - Development Guides
Quick start guides, coding standards, seeder scripts, and development workflows.

### `/quick-references` - Quick Reference Guides
Concise cheat sheets and quick lookup guides for common tasks.

### `/architecture` - System Architecture
High-level architecture diagrams, system design, and technical decisions.

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
- [T24 Error Handling](T24_ERROR_HANDLING.md) - Error handling patterns

### Authentication & Security
- [Authentication System](features/AUTHENTICATION_SYSTEM.md) - Complete auth system
- [Login Page](features/LOGIN_PAGE_README.md) - Login implementation
- [Forgot Password](features/FORGOT_PASSWORD_IMPLEMENTATION.md) - Password reset
- [Registration System](features/REGISTRATION_WORKFLOW_SUMMARY.md) - User registration

### Key Features
- [Workflow System](features/WORKFLOW_SYSTEM_GUIDE.md) - Workflow management
- [Billers Management](features/BILLERS_README.md) - Billers administration
- [Transaction View](features/TRANSACTION_VIEW_IMPLEMENTATION.md) - Transaction handling
- [Alerts System](features/ALERT_IMPLEMENTATION_SUMMARY.md) - Notification alerts
- [Checkbook Requests](features/CHECKBOOK_REQUESTS_DOCUMENTATION.md) - Checkbook management

### Infrastructure
- [Backup System](infrastructure/BACKUP_SYSTEM_SUMMARY.md) - Database backups
- [Redis Updates](infrastructure/REDIS_UPDATES_SUMMARY.md) - Redis configuration
- [MinIO Storage](infrastructure/MINIO_QUICK_START.md) - Object storage setup
- [Email Testing](infrastructure/EMAIL_TESTING_SETUP.md) - Email configuration

### API Documentation
- [GraphQL Security](api/GRAPHQL_SECURITY_SUMMARY.md) - Security best practices
- [GraphQL Rate Limiting](api/GRAPHQL_RATE_LIMITING.md) - Rate limiting implementation
- [GraphQL Quick Reference](api/GRAPHQL_SECURITY_QUICK_REFERENCE.md) - Security guide

### Development Guides
- [Admin Seeder](guides/ADMIN_SEEDER_README.md) - Database seeding
- [Icon Usage Standards](guides/ICON_USAGE_STANDARDS.md) - Icon guidelines
- [Theme Colors](guides/THEME_COLORS_ANALYSIS.md) - Color system

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
docs/api/

# Development Guides
docs/guides/

# Quick References
docs/quick-references/

# Architecture Docs
docs/architecture/
```

### By Feature Area

**Authentication & User Management**
- `docs/features/AUTHENTICATION_SYSTEM.md`
- `docs/features/LOGIN_PAGE_README.md`
- `docs/features/FORGOT_PASSWORD_IMPLEMENTATION.md`
- `docs/features/REGISTRATION_*.md`

**Workflows & Automation**
- `docs/features/WORKFLOW_SYSTEM_GUIDE.md`
- `docs/features/WORKFLOW_IMPLEMENTATION_SUMMARY.md`
- `docs/features/WORKFLOW_STEPS_*.md`

**Billers & Payments**
- `docs/features/BILLERS_README.md` - Complete billers system overview
- `docs/features/BILLER_TRANSACTION_PROCESSING.md` - Backend transaction processing (Layer 1)
- `docs/features/MOBILE_BILLER_INTEGRATION.md` - Mobile GraphQL API (Layer 2)
- `docs/features/BILLERS_WORKFLOW_INTEGRATION.md` - Workflow integration
- `docs/quick-references/BILLERS_QUICK_START.md` - Quick start guide

**Transactions & Accounts**
- `docs/features/TRANSACTION_*.md`
- `docs/features/CHECKBOOK_*.md`
- `docs/features/ACCOUNT_ALERTS_IMPLEMENTATION.md`

**Alerts & Notifications**
- `docs/features/ALERT_IMPLEMENTATION_SUMMARY.md`
- `docs/features/ALERT_VALIDATION_SUMMARY.md`

**Infrastructure & DevOps**
- `docs/infrastructure/BACKUP_SYSTEM_SUMMARY.md`
- `docs/infrastructure/REDIS_UPDATES_SUMMARY.md`
- `docs/infrastructure/MINIO_*.md`
- `docs/infrastructure/EMAIL_*.md`

**API & Security**
- `docs/api/GRAPHQL_SECURITY_SUMMARY.md`
- `docs/api/GRAPHQL_RATE_LIMITING.md`

---

*Last Updated: 2024-12-14*
