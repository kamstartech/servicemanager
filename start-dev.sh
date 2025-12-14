#!/bin/bash

# Service Manager - Development Server Startup Script
# This script ensures clean startup of the Next.js development server

set -e

echo "🚀 Starting Service Manager Development Server..."
echo ""

# Check if we're in the admin directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the admin directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Clear Next.js cache for clean start
if [ -d ".next" ]; then
    echo "🧹 Clearing Next.js cache..."
    rm -rf .next
    echo "✅ Cache cleared"
    echo ""
fi

# Check if Prisma client is up to date
echo "🔄 Checking Prisma client..."
npx prisma generate > /dev/null 2>&1
echo "✅ Prisma client ready"
echo ""

# Check database connection
echo "🗄️  Checking database connection..."
if PGPASSWORD=postgres psql -h localhost -U postgres -d service_manager -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database connected"
else
    echo "⚠️  Warning: Cannot connect to database at localhost:5432"
    echo "   Make sure PostgreSQL container is running:"
    echo "   docker compose up -d db"
fi
echo ""

# Check MinIO
echo "🗄️  Checking MinIO..."
if curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "✅ MinIO running"
else
    echo "⚠️  Warning: MinIO not responding at localhost:9000"
    echo "   Start with: docker compose up -d minio"
fi
echo ""

# Check MailHog
echo "📧 Checking MailHog..."
if curl -s http://localhost:8025 > /dev/null 2>&1; then
    echo "✅ MailHog running"
else
    echo "⚠️  Warning: MailHog not responding at localhost:8025"
    echo "   Start with: docker compose up -d mailhog"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Starting Next.js development server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Admin Panel:      http://localhost:3000"
echo "🗄️  MinIO Console:    http://localhost:9001"
echo "📧 MailHog UI:       http://localhost:8025"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
