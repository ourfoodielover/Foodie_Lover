# Foodie Lover POS — Production System Overview

> **Last validated:** March 2026
> **Stack:** Next.js 16 (App Router, webpack) · Supabase (PostgreSQL + Realtime) · TypeScript 5 · Recharts · Resend SDK
> **Dev:** `npm run dev` (no Turbopack)
> **TypeScript:** Zero errors — `npx tsc --noEmit --skipLibCheck` passes clean

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React 'use client')              │
│  /online  /table  /kitchen  /waiter  /delivery              │
│  /manager /admin  /track    /qr                             │
│                                                             │
│   lib/api.ts  ──── REST calls ──►  Next.js API Routes       │
│   lib/realtime-client.ts  ──► Supabase Realtime WS          │
└─────────────────────────────────────────────────────────────┘
                          │
                 Next.js API Routes
          /api/orders  /api/orders/[id]
          /api/tabs    /api/tabs/[id]
          /api/analytics   /api/email/*
          /api/menu    /api/staff
          /api/shifts  /api/tables
                          │
                    Supabase (PostgreSQL)
          orders · order_items · tabs · order_events
          shift_logs · email_queue · menu_items
          staff · tables · restaurants
```

**Key principles:**
- All order data comes from Supabase — localStorage is NEVER used for orders
- Service role key lives only in API routes (never exposed to browser)
- Realtime broadcast via Supabase channel `restaurant:{restaurantId}`
- Email receipts go through a retry queue (`email_queue` table), not inline

---

## Database Tables

| Table | Purpose |
|---|---|
| `orders` | Core order (status, type, total, customer info, delivery details) |
| `order_items` | Line items per order (name, qty, price, subtotal, item_status) |
| `customer_tabs` | Dine-in tabs grouping multiple orders per table session |
| `order_events` | Immutable audit log for every status change + email tracking |
| `email_queue` | Outgoing receipt email queue with retry logic |
| `shift_logs` | Waiter shift records (start/end, orders_served, revenue_handled) |
| `restaurants` | Restaurant config |
| `menu_items` | Menu (category, name, desc, price, badge, available) |
| `staff` | Waiter/kitchen/manager accounts with PIN auth |
| `tables` | Table definitions (name, capacity, status) |
| `expenses` | Manager expense tracking |

---

## Order Types & Status Flows

### Dine-In
```
awaiting_waiter → pending → preparing → prepared → served → completed
```
- Starts at `awaiting_waiter` (waiter must accept/confirm before kitchen sees it)
- `awaiting_waiter → pending`: waiter taps Accept
- `prepared → served`: waiter marks served at table
- Tab closed by manager → all orders move to `completed`, receipt emailed

### Pickup (customer collects at counter — no delivery person)
```
pending → preparing → prepared → served → completed
```
- Starts directly at `pending` (no awaiting_waiter — no table assignment)
- Kitchen shows **🏪 PICKUP** badge
- Waiter sees "🏪 Ready for Pickup" button on `prepared` orders → marks `served`
- Pickup orders **never appear in the delivery portal**
- Customer collects at counter, manager completes payment → `completed`

### Delivery (delivery person delivers to customer)
```
pending → preparing → prepared → out_for_delivery → delivered → completed
```
- Starts at `pending`
- Kitchen shows **🛵 DELIVERY** badge
- Waiter taps "📦 Hand to Delivery" on `prepared` → sets `out_for_delivery`
- Delivery portal shows order; delivery person picks up and marks `delivered`
- Customer confirms on tracking page → `completed`; receipt emailed

**`cancelled`** is reachable from any state except `completed`.

---

## Portal Pages

### `/` — Landing / Home
Static page. Entry point for staff to navigate to their portal.

---

### `/online` — Customer Self-Order (Pickup & Delivery)
- Displays live menu from `/api/menu` (Supabase-backed)
- Customer selects **Pickup** (default) or **Delivery**
- Address field only shown/required when `type === 'delivery'`
- Order submit → `POST /api/orders` with `source: 'online'`, correct `type`
- After success: shows order ID + tracking link
- "Track Your Order" modal: lookup by name + phone → redirects to `/track`
- Duplicate prevention: `submittingRef` + idempotency key via `safeApiCall`

---

### `/table` — Table QR Self-Order (Dine-In only)
- Accessed via QR code: `/table?tableId=T1`
- Customer opens menu, adds items, places order → creates `dine-in` order with `awaiting_waiter` status
- Live order status updates via Supabase Realtime
- Tab system: multiple orders on same session are grouped by tab
- `tabStatus` lifecycle: `'open' → 'awaiting_payment' → 'closed'`
  - `'closed'` → renders Thank You screen, clears device record
- Displays `CustomerConfirmed` confirmation step (customer presses "confirm delivery" on their order card)

---

### `/kitchen` — Kitchen Display System (KDS)
- Shows all `pending`, `preparing`, `prepared` orders
- Type-aware order badges:
  - `🛵 DELIVERY` — blue banner
  - `🏪 PICKUP` — green banner
  - (no banner for dine-in)
- Per-item progress: `queued → preparing → prepared`
- Whole-order advance: `pending → preparing → prepared`
- When `prepared`:
  - Delivery → `🛵 Ready — Waiter: tap Hand to Delivery`
  - Pickup → `🏪 Ready — Notify customer to collect at counter`
  - Dine-in → `✅ Ready — Waiting for waiter to serve`
- Audio alert (Web Audio API) + visual flash on new orders
- Realtime: `order_created`, `order_status_changed`

---

### `/waiter` — Waiter Station
- Shows `active` orders (awaiting_waiter / pending / preparing / prepared)
- **Three-branch `markServed()` function:**
  - `delivery` → sets `out_for_delivery` + `deliveryPerson` (handoff to delivery portal)
  - `pickup` → sets `served` (customer to counter)
  - `dine-in` → sets `served` (food brought to table)
- Button labels per type: `📦 Hand to Delivery` / `🏪 Ready for Pickup` / `🍽️ Mark Served`
- Smart banners: Delivery Ready, Pickup Ready, Bill Awaiting
- Bill awaiting banner splits into two sections:
  - Orders still being prepared → "serve first"
  - All orders served → "direct to counter"
- Realtime: `order_created`, `order_ready`, `order_served`, `order_status_changed`, `payment_completed`

---

### `/delivery` — Delivery Dashboard (PIN login)
- **Only shows `type === 'delivery'` orders** — pickup never appears here
- Queue filtered by `getDeliveryQueue()`: type=delivery AND status in (prepared, served, out_for_delivery, delivered)
- Three columns: Ready → En Route → Delivered
- Delivery person taps "📦 Pick Up Order" → `out_for_delivery` with `delivery_person` + `assigned_at`
- Delivery person taps "🏠 Mark as Delivered" → `delivered` + `delivered_at`
- Realtime: `order_ready`, `order_served`, `order_out_for_delivery`, `order_delivered`, `order_status_changed`

---

### `/manager` — Manager Live Dashboard (PIN login)
- Full live order board — all statuses visible
- Can advance/revert order status, apply discounts, close tabs
- Tab management: close tab → marks all orders `completed`, broadcasts `payment_completed`
- Split bill feature: divide tab total equally among party
- Analytics tab: embeds `AnalyticsCharts` component
- Expense tracking via `/manager/expenses`
- Table floor plan via `/manager/tables`
- Realtime: all 7 events

---

### `/admin` — Admin Dashboard (admin PIN login)

#### Sections:
1. **Overview** — KPI cards: today's orders, revenue, discounts, cancellations, active tables, pending orders. Separate panel for online order stats (pickup/delivery/revenue).
2. **Orders** — Filterable table of all live Supabase orders. Advance/cancel with type-aware status flows. Discount modal with PIN verification. Order detail modal with timeline.
3. **Sales Report** — Period picker: today / week / month / all. `filterByPeriod(orders, salesTab)` filters live Supabase orders (not localStorage). Shows revenue, gross, discount, avg, payment breakdown, top items, time breakdown table.
4. **Analytics** — Lazy-loaded `AnalyticsCharts` component, fetches from `/api/analytics` with timezone offset.
5. **Transparency / Fraud** — High-discount orders, cancellation rate alerts, per-day discount totals.
6. **Menu Management** — Add/edit/delete menu items (Supabase-backed via `/api/menu`).
7. **Staff** — Create/toggle waiter accounts, change kitchen/manager PINs, security question setup.
8. **Delivery Agents** — Manage delivery account PINs.
9. **Settings** — Admin PIN change, security questions, WhatsApp config.

**Admin `advance()` — type-aware status flows:**
- `delivery` → `pending → preparing → prepared → out_for_delivery → delivered → completed`
- `pickup` → `pending → preparing → prepared → served → completed`
- `dine-in` → `awaiting_waiter → pending → preparing → prepared → served → completed`

---

### `/track` — Customer Order Tracking
- Lookup by order ID + tracking token (from email/confirmation), or by name + phone via `/api/lookup`
- Step timeline filtered by `order.type` — only relevant steps shown:
  - Dine-in: `Served to Table 🍽️`
  - Pickup: `Ready at Counter 🏪`
  - Delivery: `Out for Delivery 🛵` → `Delivered 🏠`
- "Confirm delivery" button for delivery orders → calls `customerConfirmDelivery()` → `completed`
- Accent: green for pickup/dine-in, blue for delivery

---

## Key Library Files

### `lib/api.ts` (frontend)
Central API client. All functions call Next.js API routes — never localStorage for orders.
- `Order`, `OrderType`, `OrderStatus`, `AnalyticsData`, `CustomerTab`, `OnlineOrderStats` — all interfaces
- `getOrders()`, `createOrder()`, `updateOrderStatus()`, `applyDiscount()`
- `getDeliveryQueue()` — delivery-type orders only; statuses: prepared/served/out_for_delivery/delivered
- `computeOnlineOrderStats(orders)` — pure function; computes pickup/delivery counts from live orders
- `getAnalytics(period)` — passes `tz` (browser UTC offset) for timezone-safe "today" boundary
- `markOrderPickedUp()`, `markOrderDelivered()`

### `lib/supabase-server.ts` (server only)
- `getServerClient()` — validates env vars, returns Supabase client with service role key (never exposed to browser)
- `rowToOrder()` — maps snake_case DB row → camelCase `Order` DTO (includes `assignedAt`, `deliveredAt`, `deliveryAddress`)
- `broadcast(restaurantId, event, payload)` — sends to Supabase Realtime via REST API; topic format: `realtime:restaurant:{id}`
- `newId(prefix)`, `nextOrderNum()`

### `lib/realtime-client.ts`
- `useRealtime(restaurantId, handlers)` hook
- Subscribes to channel `restaurant:{restaurantId}` via Supabase JS client
- Handles 7 events: `order_created`, `order_status_changed`, `order_ready`, `order_served`, `order_out_for_delivery`, `order_delivered`, `payment_completed`
- Stable subscription: uses `handlersRef` to avoid re-subscribing on handler changes

### `lib/email-server.ts` (server only)
- `enqueueReceiptEmail(orderId)` — idempotent; skips if already queued or `ReceiptEmailSent` event exists
- `sendReceiptEmail(orderId)` — immediate attempt via Resend SDK; records `ReceiptEmailSent` in `order_events`
- `processEmailQueue()` — batch worker; processes up to 50 eligible jobs; retries up to 3× with exponential backoff (0 → 60s → 300s)
- All monetary values in email HTML use `(Number(x) || 0).toFixed(2)` — no NaN possible

### `lib/storage.ts`
localStorage helpers for menu, tables, PINs, staff (NOT orders).
Also exports: `getWhatsappNumber()`, `saveWhatsappNumber()`, `buildWhatsappOrderUrl()`, `SplitBill` interface.

### `lib/auth.ts`
PIN-based session management. Separate sessions for: `kitchen`, `waiter`, `manager`, `delivery`, `admin`.

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/orders` | GET | List all orders (supports `status` + `type` filter params) |
| `/api/orders` | POST | Create order; sets `awaiting_waiter` for dine-in, `pending` for others; creates `OrderPlaced` event; broadcasts |
| `/api/orders/[id]` | GET | Single order |
| `/api/orders/[id]` | PATCH | Update status / discount / tip / items; logs event; broadcasts; enqueues receipt on `completed` |
| `/api/orders/[id]/events` | GET | Order events (timeline) |
| `/api/tabs` | GET + POST | List / create customer tabs |
| `/api/tabs/[id]` | PATCH | Close tab (recalculates total from DB, marks orders completed, frees table, enqueues receipts) or generic update |
| `/api/analytics` | GET | Aggregated stats (period + tz params) |
| `/api/email/receipt` | POST | Manual receipt resend for any order |
| `/api/email/process-queue` | GET/POST | Cron worker (secured by `CRON_SECRET`) |
| `/api/menu` | GET + POST | List / create menu items |
| `/api/menu/[id]` | PATCH + DELETE | Update / delete menu item |
| `/api/staff` | GET + POST | List / create staff |
| `/api/staff/[id]` | PATCH + DELETE | Update / delete staff |
| `/api/tables` | GET + POST | List / create tables |
| `/api/tables/[id]` | PATCH | Update table (status, capacity) |
| `/api/shifts` | GET + POST | List / open shift |
| `/api/shifts/[id]` | PATCH | Close shift with performance counters |
| `/api/lookup` | GET | Find order by name + phone (for track page) |
| `/api/track` | GET | Verify tracking token |
| `/api/init` | GET | Seed initial restaurant data |

### PATCH `/api/orders/[id]` — Discount handling
Discount computation always fetches `subtotal` from the database so the correct `total = subtotal - discount` is saved. This prevents the `total = -discount` bug that occurs when callers omit the subtotal.

---

## Analytics API — `/api/analytics`

**Query params:** `restaurantId`, `period` (today/week/month/all), `tz` (browser UTC offset in minutes).

**Timezone-safe "today":**
```
browser: tz = -new Date().getTimezoneOffset()   // IST = +330
server:  localMidnight = now + tzOffset * 60000
         utcMidnight   = localMidnight - tzOffset * 60000
         query: created_at >= utcMidnight
```

**Response shape:**
```typescript
{
  period:     string;
  topItems:   { name: string; qty: number; revenue: number }[];
  peakHours:  { hour: number; count: number }[];
  revenueByDay: { day: string; revenue: number; orders: number }[];
  summary: {
    totalRevenue:   number;
    totalOrders:    number;
    avgOrderValue:  number;
    countDineIn?:   number;   // per-type KPIs
    countPickup?:   number;
    countDelivery?: number;
    countOnline?:   number;
  };
  byCategory: { category: string; orders: number; items: number }[];
  waiterPerformance: {
    staffId: string; name: string; ordersServed: number;
    revenueHandled: number; shiftHours: number;
    shiftStart?: string; shiftEnd?: string;
  }[];
  tableStats: [];
}
```

---

## Email Receipt System

```
Order completed / tab closed
         │
         ▼
enqueueReceiptEmail(orderId)
  ├─ No customer_email? → skip
  ├─ Already in queue (pending/sent)? → skip
  ├─ ReceiptEmailSent event exists? → skip
  └─ Insert email_queue row (status: pending, next_retry_at: NOW())
         │
         ▼ (Vercel Cron: every minute)
/api/email/process-queue
  ├─ Fetch pending/failed where retry_count < 3 AND next_retry_at <= now
  ├─ For each job:
  │     sendReceiptEmail(orderId)
  │       ├─ Check ReceiptEmailSent event (idempotency)
  │       ├─ Build HTML receipt (all amounts: Number(x || 0).toFixed(2))
  │       ├─ Send via Resend SDK
  │       └─ Insert ReceiptEmailSent event
  └─ On failure: retry_count++, next_retry_at += delay[retry_count]
       Delays: 0ms → 60s → 300s (3 attempts max)
```

**Trigger points:**
1. `PATCH /api/orders/[id]` → `status === 'completed'` AND order has `customer_email`
2. `PATCH /api/tabs/[id]` → tab close → all completed tab orders with email

---

## Realtime Event Flow

```
Action                          API Route               Broadcast Event
──────                          ─────────               ───────────────
New order created            →  POST /api/orders      → order_created
Kitchen: start/ready         →  PATCH /api/orders/[id]→ order_status_changed (pending→preparing)
Kitchen: mark prepared       →  PATCH /api/orders/[id]→ order_ready
Waiter: mark served          →  PATCH /api/orders/[id]→ order_served
Waiter: hand to delivery     →  PATCH /api/orders/[id]→ order_out_for_delivery
Delivery: mark delivered     →  PATCH /api/orders/[id]→ order_delivered
Payment / tab close          →  PATCH /api/tabs/[id]  → payment_completed
```

All portals subscribe via `useRealtime` → `refresh()` triggered instantly.

---

## Bugs Fixed (Full History)

### Session 1 (previous context)
| Bug | Root Cause | Fix |
|---|---|---|
| `AnalyticsCharts` crash | API returned `revenue` field, code read `.revenueHandled.toFixed()` on undefined | Renamed field + `Number(x ?? 0).toFixed()` guards |
| Admin sales always 0 | `getOrdersInPeriod()` read empty localStorage | `filterByPeriod(orders, salesTab)` on live Supabase orders |
| Pickup in delivery portal | `getDeliveryQueue()` filtered `type !== 'dine-in'` (included pickup) | Changed to `type === 'delivery'` only |
| Pickup sent to `out_for_delivery` | `markServed()` checked `type === 'delivery' \|\| type === 'pickup'` → both to delivery | Three-branch if/else in `markServed()` |
| Track page wrong step | `Served` step only in `forTypes: ['dine-in']` | Added separate `Served` entry for `['pickup']` with "Ready at Counter" label |
| Analytics timezone bug | `setHours(0,0,0,0)` on UTC server wrong for IST | `tz` param + UTC-midnight computation from local midnight |
| Missing WhatsApp exports | `getWhatsappNumber` etc. missing from storage.ts | Added all three exports |
| `Foodie_Lover/` TS errors | Legacy dir compiled; outdated 1-arg `loginDelivery(name)` call | Added to `tsconfig.json` `exclude` |
| `SplitBill` type mismatch | `useState<Record<string,unknown>\|null>` vs `SplitBill` | Imported `SplitBill` type |
| `unknown[]` in waiter | `disputes`, `waiterCalls` typed as `unknown[]` | Explicit inline types with `id`, `tableId`, `customerName`, `at` |
| `byCategory` shape | API returned `{name, value}` but interface expected `{category, orders, items}` | Fixed route response |
| `tabStatus !== 'closed'` TS error | TypeScript narrowed `tabStatus` after early-return at line 794 | Changed to explicit `=== 'open' \|\| === 'awaiting_payment'` |

### Session 2 (this session — full re-audit)
| Bug | Root Cause | Fix |
|---|---|---|
| **CRITICAL:** Admin `advance()` sends pickup through delivery flow | `isDelivery = o.type === 'delivery' \|\| o.type === 'pickup'` — pickup wrongly included | Three separate flow constants: `STATUS_FLOW_DELIVERY`, `STATUS_FLOW_PICKUP`, `STATUS_FLOW_DINE_IN`; ternary selects by `o.type` |
| **CRITICAL:** `applyDiscount()` saves negative `total` | `PATCH /api/orders/[id]` used `body.subtotal` (undefined) → `total = 0 - discount = -discount` | Route now fetches current `subtotal` from DB before computing `total = Math.max(0, subtotal - discount)` |
| Admin `advance()` can't advance dine-in from `awaiting_waiter` | `STATUS_FLOW_DINE_IN` started at `'pending'`, skipped `awaiting_waiter` | Added `'awaiting_waiter'` as first step in `STATUS_FLOW_DINE_IN` |
| Waiter bill banners not instant after payment | `payment_completed` event not handled in waiter's realtime subscriptions | Added `order_served` + `payment_completed` handlers |
| Debug `console.log` in production | `computeOnlineOrderStats` had verbose logging; admin page had log calls | Removed all debug logs |

---

## Environment Variables

```env
# Required — throw clear error if missing
NEXT_PUBLIC_SUPABASE_URL=      # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=     # Service role key (server only, never browser)

# Required for email receipts
RESEND_API_KEY=                # Resend.com API key (re_...)
CRON_SECRET=                   # Bearer token for cron endpoint security
EMAIL_FROM=                    # Verified Resend sender (production: noreply@yourdomain.com)
                               # For testing: onboarding@resend.dev

# Optional
NEXT_PUBLIC_RESTAURANT_ID=rest_default  # Defaults to 'rest_default'
```

---

## Database Migrations

| File | Contents |
|---|---|
| `supabase/migration_001.sql` | Full schema (orders, order_items, customer_tabs, order_events, staff, tables, menu_items, shift_logs, restaurants, expenses) |
| `supabase/migration_002.sql` | Adds `assigned_at`, `delivered_at`, `delivery_person` to orders (delivery tracking) |
| `supabase/migration_003.sql` | Creates `email_queue` table + worker indexes |
| `supabase/schema.sql` | Consolidated idempotent schema (use for fresh project setup) |

---

## Local Development

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 3. Run schema on Supabase
# Dashboard → SQL Editor → paste supabase/schema.sql + migration_002.sql + migration_003.sql

# 4. Start dev server (webpack — no Turbopack)
npm run dev
```

**Portal URLs:**
| Portal | URL | Auth |
|---|---|---|
| Customer ordering | `http://localhost:3000/online` | None |
| Table QR | `http://localhost:3000/table?tableId=T1` | None |
| Kitchen | `http://localhost:3000/kitchen` | Kitchen PIN |
| Waiter | `http://localhost:3000/waiter` | Staff username + PIN |
| Delivery | `http://localhost:3000/delivery` | Delivery username + PIN |
| Manager | `http://localhost:3000/manager` | Manager PIN |
| Admin | `http://localhost:3000/admin` | Admin PIN |
| Track order | `http://localhost:3000/track?id=X&token=Y` | None (token-based) |

---

## Defensive Programming Checklist

All critical values are guarded throughout the codebase:

- **Numeric rendering:** `Number(value ?? 0).toFixed(n)` — no bare `.toFixed()` on unguarded values
- **Array iteration:** `(array ?? []).map(...)` — never `.map()` directly on potentially-undefined
- **Order total:** discount PATCH fetches authoritative `subtotal` from DB — `total = Math.max(0, subtotal - discount)`
- **Email amounts:** `(Number(x) || 0).toFixed(2)` — handles null/undefined item subtotals
- **Env vars:** `getServerClient()` throws a descriptive error if either Supabase env var is missing
- **Realtime:** `useRealtime` uses `handlersRef` to avoid stale closure bugs in event handlers
