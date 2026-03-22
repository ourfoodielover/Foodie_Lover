# Foodie Lover POS — Complete Application Flow

> **Stack:** Next.js 15 App Router · Supabase (PostgreSQL + Realtime) · Resend (email)
> **Last updated:** March 2026

---

## 1. Architecture Overview

```
Customer (Browser)
  ├─ /online          → Place pickup / delivery orders
  ├─ /track           → Real-time order tracking
  └─ /                → Home / info page

Staff Portals (Browser — protected by localStorage session)
  ├─ /kitchen         → Kitchen staff sees & prepares orders
  ├─ /waiter          → Waiter accepts, serves, monitors tabs
  ├─ /delivery        → Delivery person manages pickup & delivery
  └─ /manager         → Manager handles bills, tabs, analytics

Backend (Next.js API Routes — server-side only)
  ├─ /api/orders          → CRUD for orders
  ├─ /api/orders/[id]     → Single order get/update
  ├─ /api/tabs            → CRUD for customer tabs (dine-in sessions)
  ├─ /api/tabs/[id]       → Close tab, apply discount, update
  ├─ /api/tables          → Table list
  ├─ /api/menu            → Menu items
  ├─ /api/delivery        → (alias helper) Delivery queue
  ├─ /api/lookup          → Find order by name + phone
  ├─ /api/track/[id]      → Verify tracking token
  ├─ /api/analytics       → Revenue, order counts, peak hours
  └─ /api/email/receipt   → Send receipt via Resend

Database (Supabase PostgreSQL)
  ├─ orders           → All orders (dine-in, pickup, delivery)
  ├─ order_items      → Line items for each order
  ├─ order_events     → Audit log / timeline for each order
  ├─ customer_tabs    → Dine-in sessions (groups orders per table)
  ├─ tables           → Restaurant table definitions
  ├─ menu_items       → Menu (name, price, category, availability)
  └─ shifts           → Staff shift records

Real-time (Supabase Realtime broadcast channels)
  └─ Channel: `restaurant:{restaurantId}`
     Events: order_created · order_ready · order_served ·
             order_status_changed · payment_completed
```

---

## 2. Order Types & Status Lifecycles

### 2A. Dine-In Order

```
Customer sits → Waiter opens tab → Waiter places order (in-store)

awaiting_waiter  →  pending  →  preparing  →  prepared  →  served  →  completed
      ↑                ↑             ↑              ↑           ↑           ↑
   (created)       Waiter        Kitchen         Kitchen      Waiter     Manager
                  accepts        accepts        finishes     serves    closes tab
```

**Who does what:**
- **Waiter** opens a tab for the table, places the order → status starts at `awaiting_waiter`
- **Waiter** taps "Accept & Send to Kitchen" → `pending`
- **Kitchen** taps "Accept" → `preparing`
- **Kitchen** taps "Mark Ready" → `prepared` — realtime `order_ready` fires
- **Waiter** sees "Ready to Serve" alert, picks up food, taps "Mark as Served" → `served` — realtime `order_served` fires
- **Manager** closes the tab (collects payment) → all orders in tab move to `completed` — realtime `payment_completed` fires

---

### 2B. Pickup Order (online or in-store)

```
Customer orders online → Kitchen prepares → Waiter hands to customer (optional) → Pickup → completed

pending  →  preparing  →  prepared  →  served  →  out_for_delivery*  →  completed
   ↑             ↑              ↑          ↑                ↑               ↑
(created)     Kitchen        Kitchen    Waiter/         Delivery         Customer
              accepts        finishes   handoff         picks up        confirms
```

*For pickup, `out_for_delivery` is used when a delivery person physically carries it. If customer picks up at counter themselves, the order goes `prepared → served (waiter handoff) → completed`.

---

### 2C. Delivery Order (online)

```
Customer places delivery order online

pending  →  preparing  →  prepared  →  served  →  out_for_delivery  →  delivered  →  completed
   ↑             ↑              ↑          ↑               ↑                ↑             ↑
(created)     Kitchen        Kitchen    Waiter           Delivery         Delivery      Customer
              accepts        finishes  hands off          picks up         drops off    confirms
                                      to delivery                                   (tracking page)
                                      person
```

**Key point:** For delivery, when the Waiter taps **"Hand to Delivery Person"** (status → `served`), this is the trigger that notifies the Delivery portal in real-time.

---

## 3. Page-by-Page Flow

### 3A. `/online` — Customer Online Ordering
1. Customer browses the menu (fetched from `/api/menu`)
2. Adds items to cart
3. Clicks "Proceed to Checkout" → fills name, phone, email (optional), type (pickup/delivery), address, payment
4. Clicks "Place Order" → `POST /api/orders` → order created with `status=pending`, `tracking_token` generated
5. Confirmation shown with a tracking link (`/track?id=...&token=...`)
6. **Track Order button** in banner → modal asks name + phone → `GET /api/lookup` → redirects to `/track`
- **Offline support:** If network fails, order is queued in localStorage and replayed on reconnect

### 3B. `/track` — Customer Order Tracking
1. Opens via link with `?id=&token=` OR via name+phone lookup form
2. Verifies token against DB via `GET /api/track/[id]`
3. Polls every 4 seconds for live status updates
4. Shows progress stepper (order placed → accepted → preparing → ready → out for delivery → delivered)
5. When status = `delivered` → customer sees **"Confirm Delivery"** button → taps it → `PATCH /api/orders/[id]` with `action=customer_confirm` → status → `completed`

---

### 3C. `/kitchen` — Kitchen Portal
**Auth:** Username/password stored in localStorage session

1. Fetches all active orders (`getOrders()` → `/api/orders`)
2. Filters: `pending`, `preparing`, `prepared` orders (excluding dine-in `awaiting_waiter`)
3. Shows orders as cards with timer (turns red after 15 min)
4. **"Accept"** → status `preparing` — realtime `order_status_changed`
5. **"Mark Ready"** → status `prepared` — realtime `order_ready`
6. Realtime: refreshes on `order_created`, `order_status_changed`
7. Auto-polls every 5 seconds as backup

---

### 3D. `/waiter` — Waiter Portal
**Auth:** Username/password stored in localStorage session

1. Fetches orders + tabs + tables every 5 seconds
2. Shows **active** orders (`awaiting_waiter`, `pending`, `preparing`, `prepared`)
3. **Smart banners:**
   - 🛵 Delivery orders ready — reminds waiter to hand them to delivery person
   - 💳 Bill requested — tells waiter to direct customer to counter
4. **Per order actions:**
   - `awaiting_waiter` → **"Accept & Send to Kitchen"** → status `pending`
   - `prepared` (dine-in) → **"Mark as Served"** → status `served` → broadcasts `order_served`
   - `prepared` (delivery/pickup) → **"Hand to Delivery Person"** → status `served` → broadcasts `order_served` → **Delivery portal is notified in real-time**
5. Can cancel orders in `awaiting_waiter` or `pending` state with a reason

---

### 3E. `/delivery` — Delivery Portal
**Auth:** Username/password stored in localStorage session

1. Fetches delivery queue every 5 seconds via `getDeliveryQueue()` → all non-dine-in orders with status in `[prepared, served, out_for_delivery, delivered]`
2. **Real-time listeners:** `order_ready`, `order_served`, `order_status_changed`
3. Filter tabs: All · Ready (prepared/served) · En Route (out_for_delivery) · Delivered
4. **"Pick Up Order"** (shown for `prepared` or `served` orders) → confirms → `markOrderPickedUp()` → status `out_for_delivery`, logs `delivery_person` name
5. **"Mark as Delivered"** (shown for `out_for_delivery`) → confirms → `markOrderDelivered()` → status `delivered`
6. Shows customer tracking link per order
7. Urgent banner appears if an order has been ready >15 minutes

**Delivery order lifecycle from Delivery portal's perspective:**
```
[Ready ✅] prepared / served
     ↓ Tap "Pick Up Order"
[En Route 🛵] out_for_delivery
     ↓ Tap "Mark as Delivered"
[Delivered 📦] delivered
     ↓ Customer confirms on /track
[Completed 🎉] completed
```

---

### 3F. `/manager` — Manager Portal
**Auth:** Username/password stored in localStorage session

1. Fetches tabs, orders, tables, analytics
2. **Tabs view:** See all open dine-in sessions, their orders, totals
3. **Close Tab:**
   - Manager applies discount (optional)
   - Selects payment method
   - Clicks "Close & Charge" → `PATCH /api/tabs/[id]` with `close: true`
   - API: recalculates total from orders, marks all active orders `completed`, frees the table, broadcasts `payment_completed`
4. **Split Bill:** Manager manually splits the bill into portions
5. **Analytics:** Revenue by day, peak hours, order counts
6. **Table map:** Visual floor plan with table status (available/occupied)
7. Can void/cancel individual orders, apply discounts per order

---

## 4. Real-Time Event Flow

```
Event               Broadcast by          Received by
──────────────────────────────────────────────────────────────
order_created       POST /api/orders      Kitchen, Waiter
order_ready         PATCH /api/orders/[id] (status=prepared)   Waiter, Delivery
order_served        PATCH /api/orders/[id] (status=served)     Delivery ← KEY FIX
order_status_changed PATCH /api/orders/[id] (all other status) Kitchen, Waiter, Delivery
payment_completed   PATCH /api/tabs/[id]  (close=true)        Waiter, Kitchen, Manager
```

All events are sent via Supabase Realtime broadcast API:
`POST {SUPABASE_URL}/realtime/v1/api/broadcast`

Pages subscribe via the `useRealtime()` hook in `lib/realtime-client.ts`.

---

## 5. Offline-First Support (Online Page)

```
Customer places order → network failure?
   ↓ YES
   safeApiCall() → enqueue to localStorage (fl_offline_queue)
   UI shows: "Saved offline. Will sync shortly."

   NetworkBanner (sticky) shows: 🔴 Offline / 🟡 X items queued

   On reconnect:
   syncQueue() replays each queued entry → POST /api/orders
   Idempotency key prevents duplicates
   NetworkBanner shows: 🟢 All synced
```

**Files:**
- `lib/offline-queue.ts` — localStorage queue operations
- `lib/sync-engine.ts` — replays queue on reconnect
- `lib/safe-api.ts` — wraps API calls with offline fallback
- `components/NetworkBanner.tsx` — sticky UI indicator
- `components/ErrorBoundary.tsx` — catches React render crashes

---

## 6. Authentication Model

- **No JWT/OAuth** — simple localStorage sessions per role
- Session key per role: `fl_session_waiter`, `fl_session_kitchen`, `fl_session_delivery`, `fl_session_manager`
- Login pages: `/waiter/login`, `/kitchen/login`, `/delivery/login`, `/manager/login`
- Session checked on page load → redirect to login if missing
- `lib/auth.ts` — `getSession(role)`, `setSession(role, session)`, `clearSession(role)`

---

## 7. Database Tables (Supabase)

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | e.g. `ORD_abc123` |
| restaurant_id | text | multi-tenant support |
| order_number | integer | sequential display number |
| type | text | `dine-in` / `pickup` / `delivery` |
| status | text | see lifecycle above |
| table_id | text FK | nullable |
| tab_id | text FK | nullable |
| customer_name | text | |
| customer_email | text | nullable |
| phone | text | nullable |
| subtotal | numeric | |
| tax | numeric | |
| tip | numeric | |
| total | numeric | |
| discount | numeric | |
| payment_method | text | `cod` / `gpay` / `upi` / `card` |
| delivery_address | text | nullable |
| delivery_person | text | set when picked up |
| tracking_token | text | set for online orders |
| cancel_reason | text | nullable |
| source | text | `online` / `in-store` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `order_items`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| order_id | text FK | |
| menu_item_id | text | nullable |
| name | text | |
| qty | integer | |
| price | numeric | unit price |
| subtotal | numeric | price × qty |

### `order_events` (timeline/audit log)
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| order_id | text FK | |
| event_type | text | `OrderPlaced`, `KitchenAccepted`, `Preparing`, `Prepared`, `Served`, `OutForDelivery`, `Delivered`, `CustomerConfirmed`, `OrderCancelled`, `PaymentCompleted` |
| performed_by | text | name of staff member or "Customer" |
| note | text | nullable |
| created_at | timestamptz | |

### `customer_tabs`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| restaurant_id | text | |
| table_id | text FK | |
| waiter_name | text | |
| customer_name | text | |
| party_size | integer | |
| status | text | `open` / `awaiting_payment` / `closed` |
| total | numeric | recalculated on close |
| discount | numeric | |
| discount_reason | text | nullable |
| payment_method | text | |
| created_at | timestamptz | |
| closed_at | timestamptz | nullable |

### `tables`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| restaurant_id | text | |
| name | text | e.g. "Table 1" |
| capacity | integer | |
| status | text | `available` / `occupied` |

### `menu_items`
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | |
| restaurant_id | text | |
| name | text | |
| category | text | Biryani / Starters / etc. |
| price | numeric | |
| desc | text | |
| img | text | URL, nullable |
| badge | text | `bestseller` / `popular` / `chef` / `new` |
| available | boolean | |

---

## 8. Key API Routes Summary

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/menu | All menu items |
| GET | /api/orders | All orders (filter by status/type) |
| POST | /api/orders | Create new order |
| GET | /api/orders/[id] | Single order with items + timeline |
| PATCH | /api/orders/[id] | Update status / discount / payment / confirm |
| GET | /api/tabs | All open tabs |
| POST | /api/tabs | Open new tab |
| PATCH | /api/tabs/[id] | Update tab / close tab + collect payment |
| GET | /api/tables | All tables |
| GET | /api/lookup | Find order by name + phone |
| GET | /api/analytics | Revenue by day, peak hours, counts |
| POST | /api/email/receipt | Send email receipt via Resend |

---

## 9. Complete End-to-End Scenario: Delivery Order

```
1. CUSTOMER (/online)
   → Selects items, fills name "Ravi", phone "9876543210", delivery address
   → Clicks "Place Order"
   → POST /api/orders → { type: 'delivery', status: 'pending', tracking_token: 'TRK_xxx' }
   → Sees: "✅ Order placed! Track: /track?id=...&token=..."

2. KITCHEN (/kitchen)
   → Sees new order card (status: pending) via realtime order_created
   → Taps "Accept" → PATCH status=preparing → broadcast order_status_changed
   → Prepares food
   → Taps "Mark Ready" → PATCH status=prepared → broadcast order_ready

3. WAITER (/waiter)
   → Sees "🛵 Delivery Orders Ready" banner
   → Sees order card: "📦 Ready for delivery!" badge
   → Taps "Hand to Delivery Person" on card (or detail modal)
   → PATCH status=served → broadcast order_served

4. DELIVERY (/delivery)
   → Receives order_served realtime event → refreshes immediately
   → Sees order in "Ready ✅" tab (status: served)
   → Taps "Pick Up Order" → confirms → PATCH status=out_for_delivery, delivery_person=name
   → Rides to customer

5. DELIVERY (/delivery)
   → Arrives at customer's location
   → Taps "Mark as Delivered" → PATCH status=delivered

6. CUSTOMER (/track)
   → Sees "Your order has been delivered!"
   → Taps "✅ Confirm Delivery"
   → PATCH action=customer_confirm → status=completed
   → Sees "🎉 Delivery Confirmed! Thank you."

7. MANAGER (/manager)
   → Sees completed delivery order in analytics
   → Revenue updated in daily chart
```

---

## 10. Complete End-to-End Scenario: Dine-In Order

```
1. WAITER (/waiter)
   → Customer seated at Table 3
   → Opens tab: POST /api/tabs → tab created (status: open)
   → Places food order: POST /api/orders → { type: 'dine-in', status: 'awaiting_waiter' }

2. WAITER (/waiter)
   → Sees own order in active list (status: awaiting_waiter)
   → Taps "Accept & Send to Kitchen" → PATCH status=pending

3. KITCHEN (/kitchen)
   → Sees order (status: pending)
   → Taps "Accept" → preparing
   → Taps "Mark Ready" → prepared → realtime order_ready fires

4. WAITER (/waiter)
   → Sees "✅ Ready to serve!" on order card
   → Picks up food from kitchen pass
   → Taps "Mark as Served" → PATCH status=served

5. CUSTOMER requests bill
   → Waiter updates tab status to awaiting_payment (via tab settings)
   → Smart banner shows: "💳 Bill Ready — direct Table 3 to counter"

6. MANAGER (/manager)
   → Customer arrives at counter
   → Manager reviews tab, applies discount (optional), selects payment
   → Clicks "Close & Charge"
   → PATCH /api/tabs/[id] with close=true
   → API: recalculates total, marks all orders completed, frees table
   → realtime payment_completed fires

7. All portals refresh automatically
   → Table 3 shows as "Available" again
   → Waiter's active list clears
   → Manager sees revenue update in analytics
```
