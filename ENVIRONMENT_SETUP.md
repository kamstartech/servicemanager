# Environment File Setup Guide

## 📁 Environment Files Available

### **`.env.example`** - Complete template with all configuration options
### **`.env.local`** - Local development configuration (basic setup)

## 🚀 Quick Start for Local Development

1. **Copy the local environment file**:
   ```bash
   cp .env.local .env
   ```

2. **Update any required values** in your `.env` file

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🌍 Port Configuration

- **Application**: `http://localhost:3000`
- **Database**: `localhost:5432`
- **Redis**: `localhost:6379`
- **MinIO**: `http://localhost:9000` (storage UI)

## 🔧 Configuration Categories

### **Database**
- PostgreSQL connection string
- Default: `fdh_service_manager` database

### **Authentication**
- JWT secret for token signing
- Expiration: 24 hours (default)

### **Object Storage**
- MinIO for file storage and backups
- Local S3-compatible storage

### **Background Services**
- Balance sync: 5 minutes
- Account discovery: 24 hours
- Batch processing: 50 accounts

### **External Integrations**
- T24 Banking System (ESB)
- Email/SMS services
- SMS gateway integration

## ⚠️ Security Notes

- Never commit `.env` files with real secrets
- Use different values for production
- Rotate secrets regularly
- Keep `.env.local` in `.gitignore`

## 📋 Development Services

All services are configured in `docker-compose.dev.yml`:
- Next.js Admin Panel
- PostgreSQL Database
- Redis Cache
- MinIO Storage
- SQL Server (if needed)
- Mailhog (email testing)

**Use `docker-compose -f docker-compose.dev.yml up` to start all services**