#!/bin/bash

echo "🔍 Testing Authentication Workflow"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if login endpoint exists
echo "Test 1: Login endpoint accessibility"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/login)
if [ "$response" == "405" ] || [ "$response" == "400" ]; then
    echo -e "${GREEN}✓ Login endpoint is accessible${NC}"
else
    echo -e "${RED}✗ Login endpoint returned: $response${NC}"
fi
echo ""

# Test 2: Try login with incorrect credentials
echo "Test 2: Login with incorrect credentials"
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@email.com","password":"wrongpass"}')
if echo "$response" | grep -q "error"; then
    echo -e "${GREEN}✓ Correctly rejects invalid credentials${NC}"
    echo "   Response: $response"
else
    echo -e "${RED}✗ Unexpected response${NC}"
    echo "   Response: $response"
fi
echo ""

# Test 3: Check database for admin user
echo "Test 3: Checking for admin user in database"
echo "   Run: docker exec -it service_manager_db psql -U postgres -d service_manager -c \"SELECT id, email, name, is_active FROM admin_web_users;\""
echo ""

# Test 4: Check JWT_SECRET environment variable
echo "Test 4: Environment variables"
if [ -z "$JWT_SECRET" ]; then
    echo -e "${YELLOW}⚠ JWT_SECRET not set in environment${NC}"
    echo "   Check .env file for JWT_SECRET"
else
    echo -e "${GREEN}✓ JWT_SECRET is set${NC}"
fi
echo ""

# Test 5: Check if MailHog received seeder email
echo "Test 5: Password from seeder email"
echo "   Check MailHog at: http://localhost:8025"
echo "   Look for 'Your FDH Bank Admin Panel Access' email"
echo ""

# Test 6: Test protected route without auth
echo "Test 6: Protected route without authentication"
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me)
if [ "$response" == "401" ]; then
    echo -e "${GREEN}✓ Protected route correctly returns 401${NC}"
else
    echo -e "${RED}✗ Protected route returned: $response (expected 401)${NC}"
fi
echo ""

# Instructions
echo "📝 Manual Testing Steps:"
echo "========================"
echo "1. Run seeder: npm run seed:admin"
echo "2. Get password from: http://localhost:8025"
echo "3. Login at: http://localhost:3000/login"
echo "4. Email: jimmykamanga@gmail.com"
echo "5. Password: [from MailHog email]"
echo ""
echo "🔍 Check browser console (F12) for:"
echo "   - 'Login successful, redirecting to: /'"
echo "   - Any error messages"
echo "   - Network tab for /api/auth/login response"
echo ""
echo "🍪 Check cookies in browser DevTools:"
echo "   - Look for 'admin_token' cookie"
echo "   - Should be HttpOnly, SameSite=Lax"
