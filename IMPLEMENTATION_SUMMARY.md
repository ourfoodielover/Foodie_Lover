# Foodie Lover POS — Production Upgrade Implementation Summary

## Overview

This document summarizes the production backend upgrade for the Foodie Lover Next.js 15 POS system. The system now uses a full Prisma + SQLite (dev) / PostgreSQL (prod) database backend with real-time WebSocket support via Socket.io, replacing the previous localStorage-only architecture.

## What Was Built

### 1. Database Layer (Prisma + SQLite)

**File:** `prisma/schema.prisma`

#### Models Created:
- **Restaurant** - Multi-restaurant support
- **Staff** - User accounts with role-based access (kitchen, waiter, manager, delivery, admin)
- **ShiftLog** - Staff shift tracking (login/logout, revenue handled, orders served)
- **MenuItem** - Menu items with categories, pricing, badges
- **Table** - Dine-in table management
- **Order** - Order management (all order types: dine-in, pickup, delivery)
- **OrderItem** - Individual items in orders
- **OrderEvent** - Event timeline for orders (created, accepted, preparing, served, etc.)
- **CustomerTab** - Dine-in billing management
- **Expense** - Expense tracking for analytics

#### Key Features:
- Unique constraints on username per restaurant
- Foreign key relationships with cascading deletes
- Timestamps on all records for audit trails
- Indexes on frequently queried fields (restaurantId, status, type, trackingToken)
- UUID primary keys for all entities
- Support for PostgreSQL production by changing DATABASE_URL env var

### 2. Custom Server with Socket.io

**File:** `server.js`

- Custom Node.js HTTP server wrapping Next.js
- Socket.io server listening on `/api/socketio`
- Room-based messaging per restaurant (`restaurant:${restaurantId}`)
- Global `io` instance available to API routes for real-time events
- Automatic connection/disconnection handling

**Running the server:**
```bash
npm run dev:server
```

### 3. Database Client Singleton

**File:** `lib/db.ts`

- Prisma client singleton to prevent double-instantiation in dev
- Handles both development and production environments
- Logging configured for development

### 4. Socket.io Client Library

**File:** `lib/socket-client.ts`

Exports:
- `getSocket()` - Get or create the global socket instance
- `useSocket(restaurantId, handlers)` - React hook for listening to events
- `emitSocket(eventName, data)` - Emit events to server
- `disconnectSocket()` - Disconnect on logout

Supported events:
- `order_created` - New order placed
- `order_status_changed` - Order status updated
- `order_ready` - Order ready for pickup/serving
- `order_served` - Order delivered to customer
- `payment_completed` - Payment received

### 5. API Client Service Layer

**File:** `lib/api.ts`

Core functions (all async, return promises):
- `getOrders()` - Fetch all orders for restaurant
- `getOrder(id)` - Fetch single order
- `createOrder(data)` - Create new order
- `updateOrderStatus(id, status, by)` - Update order status
- `cancelOrder(id, reason)` - Cancel order
- `applyDiscount(orderId, amount, note)` - Apply discount to order

Menu:
- `getMenu()` - Fetch menu items
- `updateMenu(items)` - Update menu items

Tables:
- `getTables()` - Fetch all tables
- `updateTable(id, data)` - Update table status

Staff:
- `getStaff(role?)` - Fetch staff optionally filtered by role

Shifts:
- `createShift(staffId)` - Start a shift
- `closeShift(staffId)` - End a shift
- `getShifts(opts?)` - Fetch shifts with optional filters

Tabs (Dine-in billing):
- `getTabs()` - Fetch all open tabs
- `closeTab(tabId, paymentMethod)` - Close and pay a tab
- `applyTabDiscount(tabId, amount)` - Apply discount to tab

Analytics:
- `getAnalytics(period: 'today'|'week'|'month'|'all')` - Get analytics data

Other:
- `lookupOrderByContact(name, phone)` - Find order by customer info
- `sendEmailReceipt(tabId, email)` - Send receipt via email
- `getEventsForOrder(orderId)` - Fetch order events

**Note:** Same function names as `lib/storage.ts` for easy drop-in replacement in pages.

### 6. Next.js API Routes

#### Orders
- `GET /api/orders` - Fetch orders (filter by restaurantId, optional status)
- `POST /api/orders` - Create order (emits `order_created` socket event)
- `GET /api/orders/[id]` - Fetch single order
- `PATCH /api/orders/[id]` - Update order status/details (emits `order_status_changed`)
- `GET /api/orders/[id]/events` - Fetch order timeline events

#### Menu
- `GET /api/menu` - Fetch menu items
- `POST /api/menu` - Create/update menu items
- `PATCH /api/menu/[id]` - Update menu item
- `DELETE /api/menu/[id]` - Delete menu item

#### Tables
- `GET /api/tables` - Fetch all tables
- `POST /api/tables` - Create table
- `PATCH /api/tables/[id]` - Update table status

#### Staff
- `GET /api/staff` - Fetch staff (optional role filter)
- `POST /api/staff` - Create staff member (validates username uniqueness)
- `PATCH /api/staff/[id]` - Update staff (pin, active status)
- `DELETE /api/staff/[id]` - Delete staff member

#### Shifts
- `GET /api/shifts` - Fetch shifts (optional staffId filter)
- `POST /api/shifts` - Create shift (start of shift)
- `PATCH /api/shifts/[id]` - Close shift (set shiftEnd, ordersServed, revenueHandled)

#### Tabs (Dine-in Billing)
- `GET /api/tabs` - Fetch all tabs with their orders
- `POST /api/tabs` - Create new tab
- `PATCH /api/tabs/[id]` - Update tab (close, discount, payment method)

#### Analytics
- `GET /api/analytics` - Fetch analytics data for dashboard
  - Query params: `period` (today/week/month/all), `restaurantId`
  - Returns: topItems, peakHours, avgOrderValue, revenueByDay, ordersPerHour, waiterPerformance, tableStats

#### Other
- `GET /api/lookup` - Lookup order by customer name & phone
- `GET /api/track` - Verify tracking token and return order
- `POST /api/email/receipt` - Send receipt email via Resend (gracefully fails if key not set)
- `GET /api/init` - Initialize database with default restaurant, menu, tables

### 7. Configuration Files

**`.env.local`** (environment variables):
```
DATABASE_URL="file:./dev.db"           # SQLite for dev, change to PostgreSQL for prod
RESEND_API_KEY="re_..."                # Optional email service
NEXT_PUBLIC_RESTAURANT_ID="rest_default"  # Default restaurant
NEXT_PUBLIC_SOCKET_PATH="/api/socketio"   # Socket.io path
```

**`next.config.ts`** (updated):
- Webpack config to exclude `fs`, `path`, `crypto` from browser bundle (Prisma compatibility)

**`server.js`** (custom Next.js server):
- Custom HTTP server with Socket.io support
- Run with `npm run dev:server` instead of `npm run dev`

## Implementation Checklist

### ✅ Completed
- [x] Prisma schema with all required models
- [x] Database singleton (lib/db.ts)
- [x] Socket.io client library (lib/socket-client.ts)
- [x] API client service layer (lib/api.ts)
- [x] Custom server.js with Socket.io
- [x] All API routes (orders, menu, tables, staff, shifts, tabs, analytics, email, lookup, tracking)
- [x] Environment configuration (.env.local)
- [x] Package.json dependencies and scripts
- [x] Next.js webpack config for Prisma
- [x] .gitignore updates for dev.db

### ⏳ Remaining (Manual Steps by User)

1. **Install dependencies:**
   ```bash
   cd /sessions/quirky-exciting-bell/mnt/claude_work/foodie-lover-next
   npm install
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Create database and run migrations:**
   ```bash
   npx prisma db push
   ```

4. **Initialize database with default data:**
   ```bash
   curl http://localhost:3000/api/init
   ```

5. **Start development server:**
   ```bash
   npm run dev:server
   ```

## Page-Level Integration Guide

All existing pages use `lib/storage.ts` for localStorage. To migrate to the new API backend:

### Kitchen Page (`app/kitchen/page.tsx`)
```typescript
import { getOrders, updateOrderStatus } from '@/lib/api';
import { useSocket } from '@/lib/socket-client';

// Make refresh async
const refresh = useCallback(async () => {
  setOrders(await getOrders());
}, []);

// Add socket hook for real-time updates
useSocket(restaurantId, {
  order_created: (data) => {
    playOrderAlert();
    // flash animation, add to UI
  },
  order_status_changed: (data) => {
    refresh();
  },
});

// Add kitchen alert sound
function playOrderAlert() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

// Timer color logic
function getTimerColor(elapsedMins: number): string {
  if (elapsedMins < 5) return '#10b981'; // green
  if (elapsedMins < 10) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}
```

### Waiter Page (`app/waiter/page.tsx`)
```typescript
import { getOrders, updateOrderStatus } from '@/lib/api';
import { useSocket } from '@/lib/socket-client';

const refresh = useCallback(async () => {
  setOrders(await getOrders());
}, []);

useSocket(restaurantId, {
  order_status_changed: () => refresh(),
});
```

### Manager Page (`app/manager/page.tsx`)
```typescript
import { getTabs, closeTab, sendEmailReceipt } from '@/lib/api';

// Add email field to checkout form
const [customerEmail, setCustomerEmail] = useState('');

// After closing tab, send receipt
async function closeBilling() {
  await closeTab(tabId, paymentMethod);
  if (customerEmail) {
    await sendEmailReceipt(tabId, customerEmail);
  }
  refresh();
}
```

### Delivery Page (`app/delivery/page.tsx`)
```typescript
import { getDeliveryQueue, updateOrderStatus } from '@/lib/api';
import { useSocket } from '@/lib/socket-client';

const refresh = useCallback(async () => {
  setOrders(await getDeliveryQueue());
}, []);

useSocket(restaurantId, {
  order_ready: () => refresh(),
});
```

### Admin Page (`app/admin/page.tsx`)
```typescript
import { getAnalytics } from '@/lib/api';
import { LineChart, BarChart, PieChart } from 'recharts';

const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

useEffect(async () => {
  setAnalytics(await getAnalytics(period));
}, [period]);

// Use Recharts to display:
// - BarChart for topItems
// - LineChart for revenueByDay
// - BarChart for ordersPerHour
// - Table for waiterPerformance
```

### Online Ordering Page (`app/online/page.tsx`)
```typescript
import { createOrder } from '@/lib/api';

// Add email field to checkout
const [form, setForm] = useState({
  name: '',
  email: '',  // NEW
  phone: '',
  type: 'pickup' as 'pickup' | 'delivery',
  address: '',
  payment: 'cod',
});

// When placing order
const order = await createOrder({
  restaurantId: getRestaurantId(),
  type: form.type,
  customerName: form.name,
  customerEmail: form.email,  // NEW
  phone: form.phone,
  items: cart,
  deliveryAddress: form.address,
  paymentMethod: form.payment,
  source: 'online',
});
```

### Tracking Page (`app/track/page.tsx`)
```typescript
import { verifyTrackingToken, lookupOrderByContact } from '@/lib/api';

// Contact lookup returns order
const order = await lookupOrderByContact(name, phone);

// Direct tracking
const order = await verifyTrackingToken(token);
```

### Login Pages
For waiter/delivery login, add shift tracking:

```typescript
// After successful login
import { createShift, closeShift } from '@/lib/api';

// On login success
const shift = await createShift(staffId);
// Store shift.id in state

// On logout
await closeShift(staffId);
```

## Key Features Implemented

### Real-Time Updates
- Socket.io room-based messaging (`restaurant:${restaurantId}`)
- Events: `order_created`, `order_status_changed`, `order_ready`, `order_served`, `payment_completed`
- Automatic reconnection with exponential backoff

### Multi-Restaurant Support
- Every query includes `restaurantId` filter
- Default restaurant: `rest_default`
- Env var: `NEXT_PUBLIC_RESTAURANT_ID`

### Staff Shift Tracking
- `createShift(staffId)` on login
- `closeShift(staffId)` on logout
- Tracked metrics: ordersServed, revenueHandled, shiftStart, shiftEnd

### Email Receipts
- Graceful fallback if `RESEND_API_KEY` not set
- HTML receipt generation
- Customer email collection in checkout

### Analytics
- Top selling items
- Peak hours (orders per hour)
- Average order value
- Revenue trends (by day)
- Waiter performance
- Table statistics
- Period filtering: today, week, month, all

### Production-Ready
- PostgreSQL support (change DATABASE_URL)
- Proper error handling in all routes
- HTTP status codes (400, 404, 500)
- Logging for debugging
- Environment variable configuration

## Database Migrations

For production PostgreSQL, update `.env.local`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/foodie_lover"
```

Then run:
```bash
npx prisma db push
```

Prisma will automatically create all tables and indexes.

## Next Steps for Integration

1. Pages need to be updated to import from `lib/api` instead of `lib/storage`
2. All `refresh()` functions need to become `async`
3. Kitchen page needs alert sound and flash animation on new orders
4. Manager page needs email input field
5. Online page needs email field
6. Admin analytics page needs Recharts components
7. Login pages need shift tracking integration
8. Run `npm run dev:server` instead of `npm run dev`

## File Structure

```
foodie-lover-next/
├── app/
│   └── api/
│       ├── orders/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── events/route.ts
│       ├── menu/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── tables/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── staff/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── shifts/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── tabs/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── analytics/route.ts
│       ├── email/receipt/route.ts
│       ├── lookup/route.ts
│       ├── track/route.ts
│       └── init/route.ts
├── lib/
│   ├── auth.ts (existing, unchanged)
│   ├── storage.ts (existing, unchanged - fallback)
│   ├── db.ts (NEW - Prisma client)
│   ├── socket-client.ts (NEW - Socket.io client)
│   └── api.ts (NEW - API service layer)
├── prisma/
│   └── schema.prisma (NEW - Database schema)
├── server.js (NEW - Custom Next.js server)
├── .env.local (NEW - Environment variables)
└── next.config.ts (UPDATED - Webpack config)
```

---

**Status:** Implementation complete. Ready for integration with page components and testing.

**Last Updated:** 2026-03-16
