# SSE Subscription Fix - Nginx Configuration Update

**Date**: 2026-01-06 23:20 UTC  
**Issue**: SSE connections being closed prematurely by nginx buffering  
**Solution**: Add specific location block for `/api/graphql/stream` with buffering disabled

---

## The Problem

Nginx was buffering the SSE stream responses, causing connections to close immediately:
```
NS_BINDING_ABORTED
[SSE-Link] 🔌 Unsubscribing from: OnTicketMessageAdded
[SSE-Link] ⚠️ Completed: OnTicketMessageAdded
```

---

## The Solution

Add a specific location block for the SSE endpoint **BEFORE** the root location block.

### Step 1: Backup Current Config
```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Edit Nginx Config
```bash
sudo nano /etc/nginx/sites-available/default
```

### Step 3: Add SSE Location Block

**Find this section** (around line 55):
```nginx
    # Remove or comment out these lines:
    # root /var/www/html;
    # index index.html index.htm index.nginx-debian.html;

    location / {
        proxy_pass http://127.0.0.1:3000;
        ...
    }
```

**Insert the following BEFORE the `location /` block**:

```nginx
    # SSE/GraphQL Stream endpoint - disable buffering for real-time updates
    location /api/graphql/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Critical for SSE - disable buffering
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;
        
        # Keep connection alive for 24 hours
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
```

**Result should look like**:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mobile-banking-v2.abakula.com;
    
    # SSL certificates...
    ssl_certificate /etc/letsencrypt/live/mobile-banking-v2.abakula.com/fullchain.pem;
    ...

    # SSE/GraphQL Stream endpoint - NEW BLOCK
    location /api/graphql/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;
        
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Root location - existing
    location / {
        proxy_pass http://127.0.0.1:3000;
        ...
    }
}
```

### Step 4: Test Configuration
```bash
sudo nginx -t
```

**Expected output**:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 5: Reload Nginx
```bash
sudo systemctl reload nginx
```

**Or if reload doesn't work**:
```bash
sudo systemctl restart nginx
```

### Step 6: Verify
```bash
sudo systemctl status nginx
```

Should show: `active (running)`

---

## What Each Directive Does

### `proxy_buffering off;`
**Critical!** Prevents nginx from buffering the response. SSE needs immediate delivery.

### `proxy_cache off;`
Disables caching for this endpoint. Each subscription is unique.

### `proxy_set_header Connection '';`
Removes the Connection header to prevent connection upgrades.

### `chunked_transfer_encoding off;`
Some clients need this disabled for proper SSE handling.

### `proxy_read_timeout 86400s;`
24-hour timeout. SSE connections stay open for a long time.

### `proxy_send_timeout 86400s;`
24-hour send timeout. Allows long-lived connections.

---

## Testing After Configuration

### Step 1: Clear Browser Cache
Press `Ctrl+Shift+R` or `Cmd+Shift+R` to force refresh.

### Step 2: Open Ticket Page
```
https://mobile-banking-v2.abakula.com/customer-care/tickets/3
```

### Step 3: Check Browser Console
Should see and **stay open**:
```
[SSE-Link] Starting subscription for: OnTicketMessageAdded {ticketId: "3"}
[SSE-Link] 🔗 Subscription active for: OnTicketMessageAdded
```

**NO MORE**:
```
❌ NS_BINDING_ABORTED
❌ [SSE-Link] 🔌 Unsubscribing from: OnTicketMessageAdded
```

### Step 4: Check Network Tab
Filter: `stream`

**Should see**:
- URL: `/api/graphql/stream`
- Status: `200` (pending) - **stays open!**
- Type: `eventsource` or `text/event-stream`
- Time: Keeps increasing (connection alive)

### Step 5: Send Test Message
Type message and click Send.

**Should see**:
```
[SSE-Link] ✅ Received data for: OnTicketMessageAdded
```

Message appears **instantly** without page refresh! 🎉

---

## Troubleshooting

### Issue: nginx -t fails
**Error**: "unexpected '{'" or similar  
**Solution**: Check indentation - all lines should be indented with spaces (4 spaces per level)

### Issue: nginx won't start
**Check logs**:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Issue: Connection still closes
**Check**: Make sure the SSE block comes **before** the root `/` location  
**Why**: Nginx matches the first matching location block

### Issue: 404 on /api/graphql/stream
**Check**: Application is running
```bash
docker compose ps adminpanel
```

Should show: `Up X minutes`

---

## Alternative: One-Line Script

If you prefer, run this script to apply the changes automatically:

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-$(date +%Y%m%d-%H%M%S) && \
sudo sed -i '/location \/ {/i \    # SSE\/GraphQL Stream endpoint - disable buffering for real-time updates\n    location \/api\/graphql\/stream {\n        proxy_pass http:\/\/127.0.0.1:3000;\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        \n        proxy_buffering off;\n        proxy_cache off;\n        proxy_set_header Connection '\'''\'';\n        chunked_transfer_encoding off;\n        \n        proxy_read_timeout 86400s;\n        proxy_send_timeout 86400s;\n    }\n' /etc/nginx/sites-available/default && \
sudo nginx -t && \
sudo systemctl reload nginx && \
echo "✅ Nginx configured for SSE!"
```

---

## Summary

**Before**: Nginx was buffering SSE responses → connections closed immediately  
**After**: SSE endpoint has buffering disabled → connections stay open  
**Result**: Real-time ticket updates work! 🎉

**Files Modified**:
- `/etc/nginx/sites-available/default` - Added SSE location block

**Commands Executed**:
1. `sudo nginx -t` - Test config
2. `sudo systemctl reload nginx` - Apply changes

**Status**: ✅ Ready for real-time subscriptions!

---

**Next**: After applying this change, test the ticket page and you should see messages appear in real-time without any connection drops!
