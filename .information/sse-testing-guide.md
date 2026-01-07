# Real-Time Subscription Testing Guide

## How to Test SSE Subscriptions

### Step 1: Open Ticket Page
```
http://localhost:3000/customer-care/tickets/3
```

### Step 2: Open Browser Console (F12)

**Expected Frontend Logs**:
```
[SSE-Link] Starting subscription for: OnTicketMessageAdded {ticketId: "3"}
[SSE-Link] 🔗 Subscription active for: OnTicketMessageAdded
```

**Check Backend Logs**:
```bash
docker compose logs adminpanel --tail=50 --follow | grep -E "Subscription|PubSub|SSE"
```

**Expected Backend Logs**:
```
[Subscription] 🎧 ticketMessageAdded: Client connected, starting asyncIterator
```

### Step 3: Send a Test Message

**Option A: From Another Browser**
1. Open same ticket in incognito/another browser
2. Login as different admin
3. Type a message and send
4. Check first browser - message should appear instantly

**Option B: From Same Page**
1. Type message in the textarea
2. Click Send
3. Should appear in chat instantly

### Step 4: Verify Logs

**Frontend Console Should Show**:
```
[SSE-Link] ✅ Received data for: OnTicketMessageAdded
{
  data: {
    ticketMessageAdded: {
      id: "...",
      message: "Test message",
      senderType: "ADMIN",
      createdAt: "...",
      readAt: null
    }
  }
}
```

**Backend Logs Should Show**:
```
[PubSub] 📢 Publishing TICKET_MESSAGE_ADDED for ticket 3
[PubSub] ✅ Published TICKET_MESSAGE_ADDED event
[Subscription] 🔍 Filter check: {
  payloadTicketId: 3,
  requestedTicketId: "3",
  matches: "✅ MATCH"
}
```

---

## Troubleshooting

### Issue: No subscription logs in frontend
**Check**: Network tab for `/api/graphql/stream` request
**Should be**: Status 200, Type: `eventsource` or pending

### Issue: Backend shows "❌ NO MATCH"
**Problem**: Ticket ID mismatch
**Check**: Ensure ticket IDs match (string vs number)

### Issue: Message appears only after refresh
**Problem**: SSE connection not established
**Check**: Browser console for connection errors

### Issue: 401 Unauthorized
**Problem**: Not logged in
**Solution**: Login as admin first

---

## Quick Test Commands

**Watch all logs**:
```bash
docker compose logs adminpanel --tail=100 --follow
```

**Filter for subscription events**:
```bash
docker compose logs adminpanel --tail=100 --follow | grep -E "🎧|📢|🔍|✅|❌"
```

**Check Redis pub/sub**:
```bash
docker compose exec redis redis-cli
PSUBSCRIBE *
# Wait and send message from UI
# Should see: message pattern: * channel: TICKET_MESSAGE_ADDED
```

---

## Success Indicators

✅ Frontend shows: `[SSE-Link] 🔗 Subscription active`  
✅ Backend shows: `[Subscription] 🎧 Client connected`  
✅ Message published: `[PubSub] 📢 Publishing TICKET_MESSAGE_ADDED`  
✅ Filter matches: `[Subscription] 🔍 Filter check: ... ✅ MATCH`  
✅ Frontend receives: `[SSE-Link] ✅ Received data`  
✅ Message appears in UI without refresh

---

**Test Date**: 2026-01-06  
**Status**: Ready for testing
