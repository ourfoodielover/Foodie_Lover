# Production Upgrade — Verification Checklist

## ✅ Files Created

### Core Libraries
- [x] `lib/db.ts` — Prisma client singleton
- [x] `lib/socket-client.ts` — Socket.io client with React hook
- [x] `lib/api.ts` — API client service layer (async functions)

### Server & Config
- [x] `server.js` — Custom Next.js server with Socket.io
- [x] `prisma/schema.prisma` — Database schema (11 models)
- [x] `.env.local` — Environment variables
- [x] `next.config.ts` — Webpack config for Prisma

### API Routes (23 routes total)

#### Orders (5 routes)
- [x] `GET /api/orders` — Fetch all orders
- [x] `POST /api/orders` — Create order
- [x] `GET /api/orders/[id]` — Fetch single order
- [x] `PATCH /api/orders/[id]` — Update order status
- [x] `GET /api/orders/[id]/events` — Fetch order events

#### Menu (3 routes)
- [x] `GET /api/menu` — Fetch menu
- [x] `POST /api/menu` — Create/update menu
- [x] `PATCH/DELETE /api/menu/[id]` — Update/delete item

#### Tables (3 routes)
- [x] `GET /api/tables` — Fetch tables
- [x] `POST /api/tables` — Create table
- [x] `PATCH /api/tables/[id]` — Update table

#### Staff (3 routes)
- [x] `GET /api/staff` — Fetch staff
- [x] `POST /api/staff` — Create staff
- [x] `PATCH/DELETE /api/staff/[id]` — Update/delete staff

#### Shifts (3 routes)
- [x] `GET /api/shifts` — Fetch shifts
- [x] `POST /api/shifts` — Create shift
- [x] `PATCH /api/shifts/[id]` — Close shift

#### Tabs (2 routes)
- [x] `GET /api/tabs` — Fetch tabs
- [x] `POST/PATCH /api/tabs[/id]` — Create/update tabs

#### Other (4 routes)
- [x] `GET /api/analytics` — Analytics data
- [x] `POST /api/email/receipt` — Send receipt email
- [x] `GET /api/lookup` — Lookup order by contact
- [x] `GET /api/track` — Verify tracking token
- [x] `GET /api/init` — Initialize database

### Documentation
- [x] `IMPLEMENTATION_SUMMARY.md` — Full implementation guide
- [x] `VERIFICATION_CHECKLIST.md` — This file

## Database Models (11 models)

- [x] Restaurant — Multi-restaurant support
- [x] Staff — User accounts with roles
- [x] ShiftLog — Shift tracking
- [x] MenuItem — Menu items
- [x] Table — Dine-in tables
- [x] Order — Orders (all types)
- [x] OrderItem — Items in orders
- [x] OrderEvent — Order timeline
- [x] CustomerTab — Dine-in billing
- [x] Expense — Expense tracking
- [x] (Schema includes indexes and constraints)

## Key Features

### Database
- [x] SQLite for dev, PostgreSQL ready
- [x] UUID primary keys
- [x] Cascading deletes
- [x] Proper indexes
- [x] Unique constraints

### Real-Time
- [x] Socket.io server in server.js
- [x] Room-based messaging (`restaurant:${id}`)
- [x] Client singleton with React hook
- [x] Event emissions from API routes

### API Client
- [x] Async/Promise-based functions
- [x] Error handling with try-catch
- [x] Same function names as storage.ts
- [x] Default restaurantId from env var
- [x] Support for all data types

### Security & Production
- [x] Environment variables (.env.local)
- [x] No hardcoded secrets
- [x] RESEND_API_KEY optional (graceful fallback)
- [x] Proper HTTP status codes
- [x] Error logging

### Multi-Restaurant
- [x] All queries filter by restaurantId
- [x] Default restaurant CRUD in /api/init
- [x] Environment-based default restaurant

## Next Steps to Complete

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Create database:**
   ```bash
   npx prisma db push
   ```

4. **Initialize data (optional):**
   ```bash
   curl http://localhost:3000/api/init
   ```

5. **Start server:**
   ```bash
   npm run dev:server
   ```

6. **Update pages** (kitchen, waiter, manager, delivery, admin, online, track):
   - Import from `lib/api` instead of `lib/storage`
   - Make refresh() async
   - Add Socket.io hooks with `useSocket()`
   - Add kitchen alert sound
   - Add email fields to checkout forms
   - Add Recharts to admin analytics

## Testing Checklist

After setup, verify:

- [ ] Database initializes with default restaurant
- [ ] GET /api/orders returns orders
- [ ] POST /api/orders creates order
- [ ] WebSocket connects and emits events
- [ ] Kitchen page receives real-time updates
- [ ] Orders status updates emit socket events
- [ ] Analytics endpoint returns valid data
- [ ] Email receipt sends (or logs gracefully)
- [ ] Order lookup works by contact info
- [ ] Tracking token verification works
- [ ] Shift logs create on staff login
- [ ] Menu items update without errors

## Performance Notes

- All DB queries include restaurantId filter
- Indexes on: restaurantId, status, type, trackingToken
- Socket.io reconnects automatically
- API client handles errors gracefully
- Prisma handles connection pooling

## Backward Compatibility

- `lib/storage.ts` remains unchanged (fallback)
- `lib/auth.ts` unchanged (sessions still in localStorage)
- Existing page imports still work if not modified
- Can migrate pages one at a time

---

**Status:** Ready for testing and integration

**Created:** 2026-03-16
