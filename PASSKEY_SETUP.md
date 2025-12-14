# Passkey Setup Guide

## ✅ Prerequisites Installed

1. **Dependencies:**
   - ✅ `@simplewebauthn/server` - Server-side WebAuthn
   - ✅ `@simplewebauthn/browser` - Client-side WebAuthn
   - ✅ `ioredis` - Redis client

2. **Database:**
   - ✅ `admin_web_passkeys` table exists in schema
   - ✅ Relation to `admin_web_users` configured

3. **Redis:**
   - ⚠️  Needs to be running (or will use in-memory fallback)

---

## 🚀 Quick Start

### Option 1: With Redis (Recommended for Production)

1. **Start Redis:**
   ```bash
   docker-compose up -d redis
   ```

2. **Verify Redis is running:**
   ```bash
   docker ps | grep redis
   ```

3. **Check connection:**
   ```bash
   redis-cli -h localhost -p 6379 -a redis_dev_password ping
   # Should return: PONG
   ```

4. **Start the app:**
   ```bash
   npm run dev
   ```

### Option 2: Without Redis (Development Only)

The app will automatically use an in-memory fallback if Redis isn't available.

```bash
# Just start the app
npm run dev
```

⚠️ **Note:** In-memory storage means challenges won't persist across server restarts.

---

## 📋 Environment Variables

Already configured in `.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password

# WebAuthn/Passkey Configuration
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### For Production:

Update these values:

```env
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-secure-password

NEXT_PUBLIC_RP_ID=admin.yourbank.com
NEXT_PUBLIC_APP_URL=https://admin.yourbank.com
```

---

## 🧪 Testing Passkey Registration

1. **Login with password:**
   ```
   http://localhost:3000/login
   ```

2. **Navigate to profile:**
   ```
   http://localhost:3000/profile
   ```

3. **Scroll to "Passkey Authentication" section**

4. **Click "Add Passkey"**

5. **Enter device name:**
   - Example: "MacBook Pro"

6. **Complete biometric setup:**
   - Browser will prompt for Touch ID/Face ID/Windows Hello

7. **Success!** ✅
   - Passkey appears in the list
   - Shows device name, created date

---

## 🔐 Testing Passkey Login

1. **Logout:**
   - Click logout button

2. **Go to login page:**
   ```
   http://localhost:3000/login
   ```

3. **Click "Passkey" tab**

4. **Enter your email**

5. **Click "Sign in with Passkey"**

6. **Use biometric authentication**

7. **Success!** ✅
   - You're logged in
   - No password needed

---

## 🔍 Troubleshooting

### "Failed to start registration"

**Possible causes:**

1. **Redis not running:**
   ```bash
   # Check if Redis is running
   docker ps | grep redis
   
   # If not, start it
   docker-compose up -d redis
   ```

2. **Redis password mismatch:**
   - Check `.env` has: `REDIS_PASSWORD=redis_dev_password`
   - Restart the app after changing

3. **Check server logs:**
   - Look for Redis connection messages
   - Should see: "✅ Redis Client Connected"
   - Or: "⚠️  Redis not available, using in-memory store"

### "WebAuthn not supported"

- Use a modern browser:
  - Chrome 109+
  - Safari 16+
  - Edge 109+
  - Firefox 119+

### "Challenge expired"

- Challenge is valid for 5 minutes
- Try again from the start
- Ensure Redis is running (or in-memory store is active)

### "Registration verification failed"

- Check `NEXT_PUBLIC_RP_ID` matches your domain
- For localhost: `NEXT_PUBLIC_RP_ID=localhost`
- Check `NEXT_PUBLIC_APP_URL` is correct

---

## 📊 Redis Status

### Check if Redis is being used:

Look for console output when starting the app:

```
✅ Redis Client Connected
```

Or if Redis is unavailable:

```
⚠️  Redis not available, using in-memory store
```

### Manual Redis check:

```bash
# Connect to Redis
redis-cli -h localhost -p 6379 -a redis_dev_password

# List all passkey challenges
KEYS passkey:*

# Check a specific challenge (replace USER_ID)
GET passkey:reg:challenge:1

# Check TTL (time to live)
TTL passkey:reg:challenge:1
# Should return ~300 (5 minutes in seconds)
```

---

## 🎯 What's Stored in Redis

### Registration Challenges:

```
Key: passkey:reg:challenge:{userId}
Value: challenge string
TTL: 300 seconds (5 minutes)
```

### Login Challenges:

```
Key: passkey:challenge:{userId}
Value: challenge string
TTL: 300 seconds (5 minutes)

Key: passkey:user:{challenge}
Value: userId
TTL: 300 seconds (5 minutes)
```

### Automatic Cleanup:

- Challenges expire after 5 minutes
- Redis automatically deletes expired keys
- Manual cleanup happens after successful auth

---

## ✅ Success Checklist

- [ ] Redis is running (or in-memory fallback active)
- [ ] Environment variables configured
- [ ] Can access `/profile` page
- [ ] Can click "Add Passkey"
- [ ] Browser shows biometric prompt
- [ ] Passkey appears in list after registration
- [ ] Can logout
- [ ] Can see "Passkey" tab on login page
- [ ] Can login with passkey
- [ ] Login succeeds without password

---

## 🔧 Development Notes

### In-Memory Fallback:

When Redis isn't available, the app uses an in-memory store:

- ✅ Works for development
- ✅ Automatic cleanup of expired challenges
- ⚠️  Data lost on server restart
- ⚠️  Not suitable for production with multiple servers

### Production Requirements:

- ✅ Redis must be running
- ✅ Redis should be persistent (not in-memory mode)
- ✅ Use Redis password authentication
- ✅ Consider Redis Cluster for high availability
- ✅ Monitor Redis memory usage

---

## 📝 Summary

**Registration:** Profile → Add Passkey → Biometric Setup → ✅  
**Login:** Login Page → Passkey Tab → Email → Biometric → ✅  
**Storage:** Redis (or in-memory fallback)  
**Security:** Full WebAuthn verification with challenge-response  

**Everything is ready to use!** 🚀

---

**Updated:** December 14, 2024  
**Status:** Ready for testing
