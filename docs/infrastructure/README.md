# Infrastructure Documentation

## Overview

This directory contains documentation for infrastructure, deployment, storage, email, database migrations, and DevOps configurations.

## 📚 Documentation Index

### Storage & Backup
- **[MINIO_QUICK_START.md](MINIO_QUICK_START.md)** - MinIO object storage setup
- **[MINIO_STORAGE_IMPLEMENTATION.md](MINIO_STORAGE_IMPLEMENTATION.md)** - MinIO integration details
- **[BACKUP_STORAGE_IMPLEMENTATION.md](BACKUP_STORAGE_IMPLEMENTATION.md)** - Backup system
- **[BACKUP_FIX.md](BACKUP_FIX.md)** - Backup fixes and improvements

### Email Configuration
- **[EMAIL_QUICK_START.md](EMAIL_QUICK_START.md)** - Email setup guide
- **[EMAIL_TESTING_SETUP.md](EMAIL_TESTING_SETUP.md)** - Testing with MailHog

### Database & Migrations
- **[MIGRATIONS.md](MIGRATIONS.md)** - Migration system overview
- **[MIGRATIONS_IMPLEMENTATION.md](MIGRATIONS_IMPLEMENTATION.md)** - Migration implementation
- **[MIGRATION_DUPLICATE_FIX.md](MIGRATION_DUPLICATE_FIX.md)** - Duplicate migration fixes

### Development Environment
- **[DEV_SERVER_RESTART.md](DEV_SERVER_RESTART.md)** - Development server setup and restart procedures

### Performance
- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)** - Performance optimization techniques

## 🐳 Docker Services

The admin panel runs in a Docker environment with the following services:

```yaml
services:
  adminpanel:      # Next.js admin panel (port 3000)
  db:              # PostgreSQL database (port 5432)
  minio:           # Object storage (ports 9000-9001)
  mailhog:         # Email testing (ports 1025, 8025)
  mssql:           # SQL Server (port 1433)
  cloudflared:     # Cloudflare tunnel
  nginx:           # Reverse proxy
```

## 📦 Storage Solutions

### MinIO
- **Purpose:** Object storage for uploads, backups
- **Buckets:** `service-manager`, `backups`
- **Access:** S3-compatible API
- **Web UI:** http://localhost:9001

### PostgreSQL
- **Purpose:** Primary database
- **ORM:** Prisma
- **Migrations:** Prisma migrate
- **Connection:** Via DATABASE_URL

## 📧 Email System

### Development (MailHog)
- **SMTP:** localhost:1025
- **Web UI:** http://localhost:8025
- **Purpose:** Testing without sending real emails

### Production
- Configure real SMTP provider in environment variables

## 🔧 Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@db:5432/service_manager"

# MinIO
MINIO_ENDPOINT="minio"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET_NAME="service-manager"

# Email
SMTP_HOST="mailhog"
SMTP_PORT="1025"
SMTP_SECURE="false"
SMTP_FROM="noreply@servicemanager.local"

# JWT
JWT_SECRET="your-secure-secret"
JWT_EXPIRES_IN="24h"
```

## 🚀 Deployment

### Development
```bash
docker compose up -d
```

### Production Checklist
- [ ] Set secure JWT_SECRET
- [ ] Configure real SMTP server
- [ ] Set up MinIO with SSL
- [ ] Configure PostgreSQL backups
- [ ] Set up monitoring
- [ ] Configure reverse proxy
- [ ] Enable SSL/TLS

## 📝 Contributing

When updating infrastructure:
1. Document configuration changes
2. Update docker-compose.yml if needed
3. Update environment variable examples
4. Test in clean environment
5. Document rollback procedures

---

*Last Updated: 2025-12-13*
