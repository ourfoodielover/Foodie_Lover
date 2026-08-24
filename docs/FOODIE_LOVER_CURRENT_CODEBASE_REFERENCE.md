# Foodie Lover — Current Codebase Reference

**Generated from current repository inspection.**
**Date generated:** 2026-08-23 (23:26 UTC / 2026-08-23 18:26 US Central)
**Repository state / branch:** `main`
**Commit:** `618a9a7832b2365b173ece0a6fa3632023d1e115` — commit message `"fix"`, authored 2026-08-23T16:43:11-05:00
**Uncommitted changes at time of audit:** None to application code. `git status --porcelain` showed exactly one untracked item, `_snapshot_tmp/fl_docaudit_snapshot.tar.gz` — a tarball this audit process itself created on the device to pull a clean repository snapshot into the sandbox for analysis. It is not an application file, was not committed, and does not affect any of the findings below. The working tree of tracked files was 100% clean.

**How this document was produced.** This is a from-scratch inspection of the current repository, database migration files, and configuration code — not an update of the prior `docs/foodie-lover-reference.docx`. That prior document was **not modified or overwritten**; it remains in `docs/` for historical comparison. Nine parallel research passes read every portal page (`app/**/page.tsx`), every API route (`app/api/**/route.ts`), every `lib/*.ts` file, all 23 SQL files under `supabase/`, and the print-agent companion process, each citing real `file:line` evidence. A subset of the highest-stakes claims (authentication gaps, the dine-in coupon bug, the Manager "Expenses Today" bug, the offline-queue duplicate risk, PIN handling, RLS policies, the order state machine, the config resolver) were independently re-verified by direct `grep`/`Read` against the fresh snapshot while writing this document, and are marked **Confirmed directly** below. Findings drawn from the research passes that were not independently re-opened in this final pass are marked **Per code-reading agent, not re-opened in final pass** — still code-grounded with file:line citations, just not re-clicked-through a second time by the document author.

**What this document is not.** It does not claim runtime behavior that would require an actual running instance, a live Supabase project, or manual click-through testing — those items are explicitly labeled "Needs Runtime Verification." It does not invent information that isn't visible in the code. Where the code is genuinely ambiguous or a comment contradicts the implementation, both are stated and the contradiction is flagged rather than silently resolved.

---

## Table of Contents

1. [Purpose & Scope of This Document](#1-purpose--scope-of-this-document)
2. [System Architecture](#2-system-architecture)
3. [Complete Portal Inventory](#3-complete-portal-inventory)
4. [Order Lifecycle & State Machine](#4-order-lifecycle--state-machine)
5. [Customer Tab Architecture (Dine-In)](#5-customer-tab-architecture-dine-in)
6. [Table Management](#6-table-management)
7. [Menu Architecture](#7-menu-architecture)
8. [Waiter Portal](#8-waiter-portal)
9. [Kitchen Portal & Printing](#9-kitchen-portal--printing)
10. [Manager Portal](#10-manager-portal)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Finance — System Overview](#12-finance--system-overview)
13. [Finance — System Sales](#13-finance--system-sales)
14. [Finance — Account Balances](#14-finance--account-balances)
15. [Finance — Vendor Accounting](#15-finance--vendor-accounting)
16. [Finance — Salary Accounting](#16-finance--salary-accounting)
17. [Finance — Manager Expenses vs. Finance Expenses](#17-finance--manager-expenses-vs-finance-expenses)
18. [Finance — Daily Closing](#18-finance--daily-closing)
19. [Authentication & Authorization Audit](#19-authentication--authorization-audit)
20. [PIN Storage & Handling Audit](#20-pin-storage--handling-audit)
21. [API Inventory (Categorized)](#21-api-inventory-categorized)
22. [Database Documentation & ER Diagram](#22-database-documentation--er-diagram)
23. [Realtime Architecture](#23-realtime-architecture)
24. [Email System](#24-email-system)
25. [Rewards / Spin & Win](#25-rewards--spin--win)
26. [Payment Architecture](#26-payment-architecture)
27. [Configuration System](#27-configuration-system)
28. [Full Environment Variable List](#28-full-environment-variable-list)
29. [Hardcoded Configuration Search](#29-hardcoded-configuration-search)
30. [Caching Audit](#30-caching-audit)
31. [localStorage Inventory](#31-localstorage-inventory)
32. [Order Deletion Documentation](#32-order-deletion-documentation)
33. [Auditability](#33-auditability)
34. [Error Handling Patterns](#34-error-handling-patterns)
35. [Idempotency & Duplicate-Protection Audit](#35-idempotency--duplicate-protection-audit)
36. [Known Issues — Fresh Audit (Critical/High/Medium/Low)](#36-known-issues--fresh-audit-criticalhighmediumlow)
37. [Recheck of Previously-Reported Issues](#37-recheck-of-previously-reported-issues)
38. [Dead Code & Duplicate Systems](#38-dead-code--duplicate-systems)
39. [Performance Review](#39-performance-review)
40. [Build / Project Health](#40-build--project-health)
41. [Migration Status Inventory](#41-migration-status-inventory)
42. [Current Feature-Status Matrix](#42-current-feature-status-matrix)
43. [End-to-End Business Flow](#43-end-to-end-business-flow)
44. [Production-Readiness Assessment](#44-production-readiness-assessment)
45. [Executive Summary](#45-executive-summary)
46. [Environment / Configuration Summary](#46-environment--configuration-summary)
47. [Database / Migration Summary](#47-database--migration-summary)
48. [Finance Summary](#48-finance-summary)
49. [Security / Authentication Summary](#49-security--authentication-summary)
50. [Appendix: Files Read For This Audit](#50-appendix-files-read-for-this-audit)

---

## 1. Purpose & Scope of This Document

Foodie Lover is a single-restaurant (single-tenant, in practice) restaurant-operations web application built on Next.js App Router, with Supabase Postgres as the sole data store and Supabase Realtime (broadcast channels, not Postgres logical-replication CDC) as the live-update mechanism. It covers the full loop from a customer scanning a table QR code or opening the online-ordering page, through kitchen preparation, waiter/delivery handling, manager billing, and admin-level configuration, reporting, and financial bookkeeping.

This document exists to give a new engineer or a new AI assistant a complete, code-verified picture of the system **as it exists in commit `618a9a7`**, without relying on any prior documentation's claims about what the system does. Every non-trivial claim below is backed by a specific file and, where useful, a line number, from the fresh repository snapshot pulled for this audit. Sections 36 and 37 are the parts most likely to change release-to-release; everything else describes structure that is unlikely to move quickly.

Two things this document deliberately keeps separate throughout: **implemented behavior** (what the code actually does, right now) versus **planned/aspirational behavior** (what a comment, dead code path, or half-wired UI element suggests was *intended*). Wherever a comment in the code describes behavior that the code next to it does not actually implement, both are called out explicitly — this turned out to be a recurring and important pattern in this codebase (see Sections 35 and 37).

---

## 2. System Architecture

**Stack:** Next.js (App Router) on React 19.2.3, TypeScript in strict mode, Supabase (Postgres + Realtime + Storage) as the only backend, no ORM (`prisma/schema.prisma` exists in the repo but is dead — see Section 38), raw `fetch`-based REST calls to Next.js API routes from the browser.

**Request flow (confirmed structurally consistent across every portal):**

```
Browser (React client components, 'use client')
   → lib/api.ts (apiFetch / safeApiCall wrappers)
   → Next.js API routes under app/api/**/route.ts
   → lib/supabase-server.ts (getServerClient(), using the SUPABASE_SERVICE_ROLE_KEY)
   → Supabase Postgres
```

**Realtime fan-out (confirmed):**

```
API route performs a mutation
   → broadcast() helper in lib/supabase-server.ts
   → Supabase Realtime broadcast channel `restaurant:{restaurantId}`
   → useRealtime() hook (lib/realtime-client.ts), subscribed to per-portal
   → portal calls its own refresh() — no incremental/optimistic patching anywhere;
     every realtime event triggers a full re-fetch of that portal's data set
```

There is no server-side session, no cookies, and no middleware-level auth check anywhere in the app (confirmed — no `middleware.ts` exists at the repo root or under `app/`). Every portal page is a client component that checks a role-scoped `localStorage` token on mount (`lib/auth.ts`) and client-redirects to a `/login` route if it's missing or expired; the underlying API routes themselves are reachable directly with no credential. This is covered in full in Section 19.

**Single-tenant assumption:** a `restaurantId` is threaded through nearly every table and route, but in practice it defaults to the literal string `'rest_default'` via `NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default'`, duplicated by hand in roughly 29 separate files (confirmed by direct grep against the fresh snapshot: `grep -rn "NEXT_PUBLIC_RESTAURANT_ID.*rest_default"` returns 29 hits across `app/` and `lib/`). There is a centralized resolver for this (`resolveRestaurantId()` in `lib/config-server.ts`) but it is not actually called from any of those 29 sites — see Section 27.

**External dependencies:**
- Supabase (Postgres, Realtime, Storage) — the only database.
- Resend — transactional email provider (`lib/email-server.ts`).
- Google Generative AI (`@google/generative-ai`) — powers `app/api/ai/chat/route.ts`.
- `api.qrserver.com` — third-party QR image generator, called live from `app/qr/page.tsx` with no local generation and no error fallback if the third party is unreachable.
- A standalone Node.js companion process, `print-agent/index.js`, run separately from the Next.js app (on a machine physically connected to a receipt printer), which polls the `print_jobs` table over the network and renders ESC/POS raw bytes to a USB or network printer.

**Ten portals total**, all thin clients over the same API surface and the same database (confirmed count and list in Section 3).

---

## 3. Complete Portal Inventory

| # | Portal | Route(s) | Audience | Auth |
|---|---|---|---|---|
| 1 | Online Ordering | `/online` | Public, no login | None (customer-facing) |
| 2 | Table QR Ordering | `/table?table=<id>` | Public, scanned from table QR | 4-digit session PIN (`customer_tabs.pin`), stored client-side only |
| 3 | Order Tracking | `/track?id=&token=` | Public, link from email/checkout | Tracking token, checked **client-side only** (Section 19) |
| 4 | Spin & Win | `/spin?orderId=\|tabId=&token=` | Public, email-link only | Token re-verified server-side in `GET /api/rewards/spin-verify` |
| 5 | QR Generator | `/qr` | Staff utility, no login | None |
| 6 | Kitchen Display | `/kitchen` (+ `/kitchen/login`) | Staff | Shared kitchen PIN vs. `restaurant_settings` |
| 7 | Waiter Station | `/waiter` (+ `/waiter/login`) | Staff | Per-account username + PIN vs. `staff` table |
| 8 | Delivery Dashboard | `/delivery` (+ `/delivery/login`) | Staff | Per-account username + PIN vs. `staff` table |
| 9 | Manager Portal | `/manager`, `/manager/expenses`, `/manager/tables` | Management | Shared manager PIN |
| 10 | Admin Dashboard | `/admin` (+ `/admin/login`) | Management | Shared admin PIN; step-up PIN re-check on discount/danger actions |

All ten are client components (`'use client'`) rendered by the Next.js App Router; there is no server-rendered/authenticated page anywhere — "protection" for staff/management portals is a client-side redirect if a `localStorage` session token (`fl_session_<role>`, see `lib/auth.ts`) is absent or past its 8-hour TTL. The Admin Dashboard is the largest single file in the app, `app/admin/page.tsx`, at roughly 6,000 lines covering 13 sub-sections behind one internal nav bar (Section 11).

A note on the Waiter portal specifically, since the user's original request called for an **explicit check of whether "Take Order" exists**: the Waiter Station (`app/waiter/page.tsx`) does **not** have its own "create a new order from scratch" flow — waiters *confirm* orders that already exist in `awaiting_waiter` status (created by the customer through Online/Table) into `preparing`, they do not originate orders. A separate component, `components/WaiterTakeOrder.tsx`, does exist in the repository and does implement a full manual order-creation UI (menu grid, cart, submit) usable by waiter staff — but it is a standalone component, not currently mounted into `app/waiter/page.tsx`'s render tree in the fresh snapshot (per code-reading agent research; the component file is present and complete, but no import/usage of `WaiterTakeOrder` was found inside `app/waiter/page.tsx`). In other words: the code to let a waiter manually key in a table order exists in the repository, but it is not wired into the live Waiter Station UI as shipped — a customer-initiated order via Table/Online is the only path into the system for dine-in and online orders. **Confidence: Per code-reading agent, not re-opened in final pass** for the exact "not imported anywhere" claim — recommended a final `grep -rn "WaiterTakeOrder" app/` before treating this as settled if it matters operationally.

---

## 4. Order Lifecycle & State Machine

The order status state machine is enforced **entirely in application code**, not by a database `CHECK` constraint — confirmed directly by reading `app/api/orders/[id]/route.ts` lines 30–54 in the fresh snapshot:

```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  awaiting_waiter:   ['pending', 'preparing', 'cancelled'],
  pending:           ['preparing', 'cancelled'],
  preparing:         ['prepared', 'served', 'cancelled'],
  prepared:          ['served', 'out_for_delivery', 'completed', 'cancelled'],
  served:            ['completed', 're_serve_required', 'cancelled', 'out_for_delivery'],
  re_serve_required: ['preparing', 'out_for_delivery', 'served', 're_serve_required'],
  out_for_delivery:  ['delivered', 're_serve_required'],
  delivered:         ['completed', 're_serve_required'],
  completed:         [],   // terminal
  cancelled:         [],   // terminal
  void:              [],   // terminal
};
```

Every order also carries a `type` (`dine-in` / `pickup` / `delivery`); the code comments in this map explain two important non-obvious facts, confirmed verbatim from the file:
- `awaiting_waiter` is the **actual starting status for new orders** under the current waiter-confirmation workflow; `pending` is kept only "for backward compatibility with any orders already in that state from before this workflow existed." A new order does not pass through `pending` in the current flow — a waiter's "Confirm & Print" or "Confirm & Send to Kitchen" action moves it straight from `awaiting_waiter` to `preparing`.
- `served → out_for_delivery` exists specifically so the delivery portal can pick up orders left in `served` state, described in-code as "backward compat for re-serve flow and any dine-in→delivery handoff edge cases."

`re_serve_required` is a side-branch entered whenever a customer reports "not received" (via `POST /api/order-issues`, capped at `ISSUE_MAX_RETRIES = 3` reports before auto-escalating to the manager), not a normal forward-progress state.

**Terminal states:** `completed`, `cancelled`, `void` — none has any outgoing transition; the map enforces this by giving each an empty array.

**Where the check happens:** `PATCH /api/orders/[id]` validates `body.status` against `KNOWN_STATUSES` (the key set of the map above) and, when a status change is requested, checks the current row's status against `VALID_TRANSITIONS[currentStatus]` before writing. This is the single authoritative place order status is allowed to change in the codebase — confirmed no other route directly writes `orders.status` outside this file and `app/api/orders/delete-selective/route.ts` (which deletes rows outright rather than transitioning them) and `app/api/orders/clear/route.ts` (full wipe, Section 32).

**A confirmed race condition:** the "confirm and print" / "confirm and kitchen" waiter actions inside this same PATCH handler follow a check-then-act pattern (read current status, decide the KOT payload, then write) with no row-level lock or optimistic-concurrency version check between the read and the write — two waiters (or a client double-tap without proper request de-duplication) hitting confirm on the same order in close succession could both pass the initial status check before either write lands. **Confidence: Per code-reading agent, not re-opened in final pass.**

---

## 5. Customer Tab Architecture (Dine-In)

Dine-in ordering is built around a `customer_tabs` table: each individual diner scanning the table QR and joining gets their **own** `customer_tabs` row (not one shared tab per table) — confirmed by the old reference document's own framing, cross-checked structurally against `app/table/page.tsx`'s state machine (`landing → join → menu → cart → tracking`, with a hard override to a "Thank You" screen once the tab closes).

**Session/device binding:** a persistent `fl_device_id` written to `localStorage` is looked up against a `tab_devices` table on load; if it matches an open tab at the current table, the page restores straight into the tracking view. Manual recovery (`POST /api/tab-devices/verify`) checks name + PIN — but against `customer_tabs.pin`, **not** `tab_devices.personal_pin`, even though `personal_pin` is written on every session start. `tab_devices.personal_pin` is therefore write-only in the current code: nothing reads it back. **Confirmed directly** by grepping `personal_pin` usage in `app/api/tab-devices/**` — only insert/update sites were found, no `.eq('personal_pin', ...)` or equivalent select-and-compare site.

**Order merging:** placing an order from the Table portal calls the order-creation path with `tabId` set; if the tab already has an order in `awaiting_waiter`, the server merges new items into that existing order rather than creating a second one — this is how repeated "Place Order" taps before a waiter confirms end up as a single ticket rather than a flood of separate orders.

**Closing a tab is server-authoritative**, not a simple status flip. `PATCH /api/tabs/[id]` (the manager-portal close-tab action): recomputes the tab total from every non-void order on the tab, attempts reward-coupon redemption (see the confirmed bug in Section 37), marks every order on the tab `completed`, frees the underlying table only if no other open tab still references it, broadcasts `payment_completed`, and fires both a receipt email and a Spin & Win invite email. If any order on the tab is still `re_serve_required`, the close is blocked with an HTTP 409 unless force-closed.

**The dine-in reward-coupon redemption bug — confirmed still present in the fresh snapshot:**
- `app/table/page.tsx` line 637 reserves a coupon for a dine-in bill by calling `POST /api/rewards/reserve-coupon` with `body: JSON.stringify({ couponId: dineAppliedCoupon.couponId, orderId: tabId })` — i.e., it passes the **tab's ID** in the `orderId` field.
- `app/api/rewards/reserve-coupon/route.ts` only ever writes that value into the `reserved_order_id` column: `.update({ status: 'reserved', reserved_order_id: orderId, ... })`. There is no code path in this route that writes `reserved_tab_id`.
- `app/api/tabs/[id]/route.ts` line 93, at tab-close time, looks for coupons to redeem with `.eq('reserved_tab_id', id)` — a **different column**, which the dine-in reserve flow above never populates.
- Net effect: a reward coupon applied to a dine-in bill via the Table portal is stored under `reserved_order_id = <tabId>`, but the tab-close redemption query searches `reserved_tab_id = <tabId>` and will never find it. The coupon stays at `status = 'reserved'` indefinitely and its discount is never actually subtracted from what the customer pays at close, even though the Table portal's UI shows the coupon as successfully applied.

This is a real money-affecting bug, confirmed by reading all three files directly in this pass (`app/table/page.tsx`, `app/api/rewards/reserve-coupon/route.ts`, `app/api/tabs/[id]/route.ts`), not carried forward from the prior document without re-checking. See Section 37, item 4, for its status against the prior report.

---

## 6. Table Management

Tables are a first-class Postgres table (`tables`), with full CRUD exposed at `app/api/tables/route.ts` and `app/api/tables/[id]/route.ts` (the latter supports `DELETE`, confirmed present). Two different UI surfaces touch table state:

- **Manager Portal → Table Map** (`app/manager/tables/page.tsx` / the `tables` section of `app/manager/page.tsx`): a **read-only** occupancy grid with a seat-usage progress bar per table. Per code-reading agent research, this view has no click-through and no per-table actions wired to it at all, despite the backing `/api/tables/[id]` endpoint fully supporting edit and force-close — table administration has to happen from the Admin Dashboard's own Tables section instead, not from the Manager table map.
- **Admin Dashboard → Tables section**: full table CRUD plus a "force-close" action for stuck sessions (a table whose tab never properly closed).

**Occupancy semantics:** a table is considered occupied while any `customer_tabs` row referencing it is open; it's only freed by the tab-close flow in Section 5 once no other open tab still references it, or via the Admin force-close escape hatch. The Admin Overview's table grid additionally colors a table red as "stale" once its open tab has existed past 4 hours — a client-computed presentation threshold, not a database-enforced timeout (no server-side job automatically closes or flags stale tables).

The QR Generator portal (`/qr`) is the table-map producer: it pulls the current list from `GET /api/tables` and renders one card per selected table, each pointing a live `<img>` at `api.qrserver.com` encoding `{origin}/table?table={tableId}` — note the query parameter is `table=`, not `tableId=`; the Table portal itself accepts both for backward compatibility, but the QR generator only ever emits `table=`.

---

## 7. Menu Architecture

`menu_items` is the single source-of-truth table for both dine-in and online menus — there is no per-portal menu split. Pricing supports **variants**: a JSONB `variants` column (added by `supabase/migrations/20260530_add_variants.sql`, confirmed: `ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb`, with a GIN index for querying). The migration's own comment states the flat `price` column is "always set to the first variant's price (or 0 if no variants)" and that "all pricing logic should use the `variants` array" — meaning `price` is effectively a legacy/derived display column once an item has variants, and any code that reads `price` directly instead of `variants[0].price` is reading a value the schema itself calls secondary.

**Two independent hardcoded menu catalogs exist** in the codebase — confirmed directly: `app/api/menu/seed/route.ts` (184 lines, 70 `name:` occurrences) and `app/api/init/route.ts` (186 lines, 50 `name:` occurrences) both contain their own hand-written arrays of menu items with overlapping but not identical contents. These are invoked separately (seed is a dedicated re-seed endpoint; init is the first-run bootstrap path), so a restaurant initialized via one path can end up with a different starting menu than one seeded via the other — a duplication/maintenance risk rather than a correctness bug in normal operation, since neither runs automatically after first setup.

The menu editor UI (variant-aware add/edit form, CSV import/export with a downloadable template, category management) is **byte-for-byte the same component logic**, called through the same `lib/api.ts` functions and the same `app/api/menu/**` routes, from both the Manager Portal's Menu section and the Admin Dashboard's Menu section — there is no menu-specific permission difference between the two roles; anyone with either PIN can edit the full menu.

`GET /api/menu` is cached 60 seconds at the edge (see Section 30 for the full caching audit) and is fetched once on mount by each portal; search and category filtering both run entirely client-side over the in-memory array — nothing re-fetches as a customer types or switches category tabs.

---

## 8. Waiter Portal

The Waiter Station (`app/waiter/page.tsx`) is, by portal complexity, the busiest console in the app: confirming new orders into the kitchen, marking food served or handed to delivery, working the bill-ready and re-serve queues, and responding to "call waiter" pings, all layered onto one order list. Login is per-account username + PIN checked against the `staff` table (Section 20 covers the security implications of how that check happens).

**Confirm-routing step.** New orders arrive at `awaiting_waiter`. Depending on the restaurant's kitchen-routing mode (Ask / Printer / Kitchen Display, set from Admin — see the dual-resolution-path finding in Section 27), the waiter sees "Confirm & Print KOT," "Confirm & Send to Kitchen," or both, plus a Reject option. Confirmed directly in `app/api/orders/[id]/route.ts`: `body.action === 'confirm_and_print'` sets `updates.kitchen_route = 'printer'` and — non-fatally, i.e. failure here does not fail the whole request — queues a `print_jobs` row via `buildKotPayload()` (line 538) for the external print-agent to pick up; `body.action === 'confirm_and_kitchen'` sets `updates.kitchen_route = 'kitchen_display'` and creates no print job at all, per an explicit in-code comment ("For confirm_and_kitchen, no print job is created — the kitchen display..."). Either action moves the order from `awaiting_waiter` to `preparing` and fires an order-confirmation email (see Section 24), and either action is logged as the same `order_confirmed` event type regardless of which route was chosen.

**The three-branch "Mark Served" action.** Once an order is `prepared`, the waiter sees exactly one button matched to `order.type`: delivery → "📦 Hand to Delivery" (sets status `out_for_delivery` and records the **confirming waiter's own name** as `delivery_person` — there is no actual courier-assignment step anywhere in the app, so "who delivered it" in the data model is really "which waiter tapped the button"); pickup and dine-in both simply advance to `served`.

**Bill-ready banner total.** The "Bill Requested" banner's total is computed client-side from the live order list and, per code-reading agent research, does not subtract a reserved reward-coupon discount — so it can quote the customer a higher amount than the tab will actually close for once (if) the coupon redemption succeeds. **Confidence: Per code-reading agent, not re-opened in final pass.**

**Login PIN comparison happens in the browser**, not on the server — see Section 20 for the full mechanism and evidence (`GET /api/staff/[id]` returns the plaintext PIN to the client for comparison).

---

## 9. Kitchen Portal & Printing

### Kitchen Display (`app/kitchen/page.tsx`)

A digital KOT (kitchen order ticket) board for orders routed to the screen rather than a physical printer, gated by a single shared kitchen PIN verified server-side against `restaurant_settings`. Only orders with `status` in `pending`/`preparing`/`prepared` **and** `kitchen_route !== 'printer'` appear here — printer-routed tickets are physically handled and excluded entirely from this view.

**Elapsed-time timer measures order-creation time, not "entered preparing" time** — so the wait a customer's order spent sitting in `awaiting_waiter` before a waiter confirmed it counts toward the kitchen's "urgent" (red, pulsing "URGENT" banner past 10 minutes) threshold, even though the kitchen had no visibility into or control over that earlier wait.

**Item-index mismatch risk — confirmed by cross-referencing multiple independent research passes on this file.** Per-item "advance" buttons send the item's array position from the client's own (unordered, as fetched) item list; the server resolves that same numeric index against its own `created_at`-sorted query of `order_items`. If the client's fetch ordering and the server's `created_at` ordering ever diverge — which can happen with items inserted in rapid succession or with clock-precision ties — the index sent by the client can point at a different row server-side than the one the cook actually tapped, silently advancing the wrong item's status. **Confidence: Per code-reading agent (independently confirmed by three separate research passes in this audit), not re-opened line-by-line by the document author in this final pass** beyond confirming the `.map((item, i) => ... key={i} ...)` pattern is present in `app/kitchen/page.tsx`.

**New-order alert system:** a two-tone Web Audio beep plus an optional spoken announcement (browser `speechSynthesis`) fires for any order not previously seen (tracked via an in-memory seen-IDs set, with the spoken-announcement de-dupe additionally persisted to `sessionStorage` so a page refresh doesn't replay the whole queue aloud). The mute toggle silences only the voice announcement — the beep itself ignores the mute flag entirely, per the underlying alert-playing function.

### Printing (`print-agent/`, `app/api/print-jobs/**`)

Printing is architecturally split from the Next.js app: `print_jobs` is a normal Postgres table written by the waiter-confirm action (Section 8), and a **separate, standalone Node.js process** (`print-agent/index.js`), run on hardware physically connected to the receipt printer, polls `GET /api/print-jobs` over the network for pending jobs and renders them as raw ESC/POS byte sequences, supporting both USB (`PRINTER_TYPE=usb`, via a named Windows printer or a Linux/Mac device path) and network (`PRINTER_TYPE=network`, raw TCP to port 9100 by default) modes, configured entirely through its own `.env` file (`PRINTER_TYPE`, `PRINTER_NAME`, `PRINTER_DEV`, `PRINTER_IP`, `PRINTER_PORT`, `PRINTER_CHARS_PER_LINE`, `PRINTER_STATION_ID`).

**Fail-open authentication — confirmed directly.** `app/api/print-jobs/route.ts` intends to authenticate the print-agent via an `x-print-agent-key` header checked against `process.env.PRINT_AGENT_KEY`, but if that environment variable is simply not set, the route logs a warning — `console.warn('[GET /api/print-jobs] PRINT_AGENT_KEY is not set — endpoint is unauthenticated')` — and continues to serve the request rather than refusing it. An operator who forgets to set `PRINT_AGENT_KEY` gets a fully open print-job-listing endpoint rather than a hard failure that would force them to notice the missing configuration.

---

## 10. Manager Portal

`app/manager/page.tsx` (plus the `/manager/expenses` and `/manager/tables` sub-routes, all sharing one login session) is the front-of-house billing headquarters: closes tabs, collects payment, splits bills, edits the menu, and gives a read-only view of table occupancy and expenses.

**Stats bar — confirmed broken.** Six live tiles sit under the header: Revenue, Expenses, Net Profit, Awaiting Payment, Open Tabs, Closed Today. Directly confirmed in this pass: `todayExpenses` is declared with `const [todayExpenses, setTodayExpenses] = useState(0)` at line 132 of `app/manager/page.tsx`, and **`setTodayExpenses` is never called anywhere else in the file** — a full-file search for the setter turns up only its own declaration. The "Expenses Today" tile therefore permanently displays ₹0, and since `todayNetProfit = todayRevenue - todayExpenses` (line 479) depends on it, **"Net Profit Today" always simply equals gross revenue**, silently, with nothing in the UI indicating the figure is not real. This was previously reported and is confirmed **still present** in the current codebase (Section 37).

A second, related inconsistency: "Revenue Today" in this stats bar includes cancelled/void orders, while the separate End-of-Day panel and the Expenses sub-page both correctly exclude them — so the two revenue figures shown to the same manager for the same day can legitimately disagree.

**Billing board & Close Tab.** Tab cards are filtered Awaiting Payment / Open / Closed Today. Opening one shows itemized orders, a bill summary, split-billing tools (by person or by payment method), a discount form, and finally Close Tab, which routes through the server-authoritative `PATCH /api/tabs/[id]` flow described in Section 5. Split-by-person "mark paid" tracking is purely informational in the UI — it does not feed into which payment method actually gets recorded on the tab at close, so a manager could mark portions paid by different methods in the split-bill tool and still have the tab close under a single, unrelated recorded payment method.

**Table Map:** read-only, no click-through (Section 6).

**Menu Management / Expenses:** the same menu CRUD surface described in Section 7; a separate expense tracker (category chips, add form, two-step-confirm delete) that writes to its own table (Section 17 covers how this relates to, and differs from, the Finance module's expense tracking).

---

## 11. Admin Dashboard

`app/admin/page.tsx` is the largest single file in the application — roughly 6,000 lines — organized as 13 sections behind one internal nav bar: Overview, Orders, Sales Report, Menu, Offers, Tables, Transparency/Fraud, Staff, Email, Feedback, Spin & Win, Rewards Audit, and Kitchen Routing. Only the Overview tab auto-loads on mount; most other sections require an explicit "Load" click before they fetch anything, which is a deliberate performance choice (Section 39) but also means an admin can be looking at an empty or stale section without realizing data simply hasn't been requested yet.

**Overview:** three KPI rows (dine-in/general, online orders, order issues), an active-issues list, the color-coded table occupancy grid (Section 6), and an End-of-Day report — all computed client-side from the day's live orders, refreshed on a 5-second poll plus roughly ten distinct realtime event types.

**Orders & Sales Report tabs share one fetch that only re-runs when the date filter changes** — not on the 5-second interval and not on any realtime event that keeps the Overview tab fresh. An admin sitting on either tab without touching the date filter can be looking at a genuinely stale order list while new orders arrive unseen in the background. This is a caching/refresh-strategy inconsistency internal to this single file, not a caching-layer bug (see Section 30).

**Transparency / Fraud tab:** cancellation rate, high-discount orders (>30%), discount log, cancellation log, today's "not received" issue log, per-waiter accountability, an embedded analytics chart set, and a fraud-alert log built from cancellation/dispute timeline events. Per code-reading agent research, the "Staff Accountability" cancellation column is structurally always zero: it is derived from `customer_tabs`, and tabs are only ever opened or closed in this codebase, never marked cancelled — so the per-waiter cancellation-rate flag has no code path that can ever set it to a nonzero value, independent of actual waiter behavior. **Confidence: Per code-reading agent, not re-opened in final pass.**

**Staff / Email / Feedback tab:** Admin PIN change and a security-question recovery flow; kitchen/manager PIN rotation; waiter and delivery account CRUD (this is the only place "delivery agent" accounts are managed — there is no separate delivery-staff tab); a Resend configuration/diagnostics panel with a test-send button; a raw feedback-ratings table; and the two danger-zone deletion tools covered in full in Section 32.

**Spin & Win / Rewards Audit / Kitchen Routing tab:** global spin configuration (enable flag, required contact fields, minimum order amount, eligible order types), a reward-pool table with live win-probability display, per-reward daily-usage tracking, CSV import with a two-phase preview/confirm and safe-delete-to-archive (rather than hard delete) semantics, a read-only paginated (200-row) coupon audit trail, and the kitchen-routing mode selector that every waiter confirm action downstream depends on (Section 27 covers this setting's dual resolution-path finding in the config system specifically).

---

## 12. Finance — System Overview

Finance is the newest and largest subsystem in the app (added by `migration_019_finance.sql`, 10 new tables) and, notably, **the one part of the codebase with genuine, consistently-applied server-side authorization** — confirmed directly by reading `lib/finance-server.ts`, whose own header comment states the rationale explicitly: *"Finance is owner-level, sensitive functionality. The rest of this codebase's existing API routes largely have no server-side authorization (verified during inspection)... Every Finance route (including GETs, since Finance must not be readable by simply hiding a nav link) follows [the admin-PIN] pattern here, applied consistently across all new endpoints."* This is the codebase's own internal audit note, written by whoever built Finance, independently corroborating this document's Section 19 findings about the rest of the app.

**Authorization mechanism:** `requireAdminPin(req)` (`lib/finance-server.ts`) accepts the PIN via an `x-admin-pin` request header on GETs or a `pin` field in the JSON body on mutations, and validates it with `verifyAdminPin()` against `restaurant_settings.value` where `key = 'admin_pin'` — the exact same shared admin PIN used everywhere else in the app (Section 20 covers the implication of Finance reusing this single shared secret rather than having its own).

**The 10 Finance tables** (all with the same universally-permissive RLS policy as every other table in the app — see Section 19): `finance_accounts`, `finance_categories`, `finance_transactions`, `finance_audit_log`, `vendors`, `vendor_purchases`, `vendor_payments`, `staff_salary_config`, `salary_payments`, `daily_finance_closings`.

**19 API routes** under `app/api/finance/`, organized into resource groups: `accounts`, `audit-log`, `categories`, `closings`, `salary-config`, `salary-payments`, `summary`, `system-sales`, `transactions`, `vendor-payments`, `vendor-purchases`, `vendors`.

**UI:** a single large client component, `components/AdminFinance.tsx`, mounted as a tab inside the Admin Dashboard.

**Design principle, stated in-code:** Finance deliberately does not duplicate or migrate the pre-existing Manager "Expenses" feature (`expenses` table, powering the Manager Portal's own expense tracker) — it reads that table live for reporting purposes but keeps its own, separate `finance_categories` list, explicitly so "neither feature has to change to accommodate the other" (verbatim from the migration file's comment). See Section 17 for exactly how these two expense concepts relate and where that separation could confuse an operator.

---

## 13. Finance — System Sales

"System Sales" is **always computed live, never stored**, by `computeSystemSales()` in `lib/finance-server.ts` — confirmed by reading the function directly. For a given date range it unions two independent sources:

1. **Dine-in tabs:** every `customer_tabs` row with `status = 'closed'` and `closed_at` in range, contributing `gross = total`, `discount = discount + coupon_discount`, `net = max(0, gross - discount)`.
2. **Non-tab orders (pickup/delivery/online):** every `orders` row with `status = 'completed'`, `tab_id IS NULL`, and `updated_at` in range, contributing `gross = subtotal ?? total`, `discount = discount`, `net = total` (the stored order total, not independently recomputed).

The two sources are explicitly filtered to be non-overlapping (`tab_id IS NULL` on the orders side) so a dine-in order that's part of a tab is counted exactly once, through the tab, not twice. Rows are merged, sorted by `occurredAt` descending, and returned; `sumSystemSales()` reduces them to `{ count, gross, discount, net }` with results rounded to 2 decimal places via `Math.round(x * 100) / 100`.

Because this is computed on every request rather than persisted, System Sales for a given historical date can change if underlying `orders`/`customer_tabs` rows are edited or deleted after the fact (see Section 32's interaction with Finance data — order deletion does **not** touch `finance_transactions`, `vendor_payments`, or `salary_payments`, so a deleted order's sales figure simply disappears from future System Sales computations for that date without leaving any trace that it once existed, unless a `daily_finance_closings` snapshot was taken beforehand).

---

## 14. Finance — Account Balances

`finance_accounts` models cash/bank "buckets" (seeded by the migration with two starter accounts: `FACC_cash_default` "Cash Drawer" and `FACC_bank_default` "Bank / UPI", each carrying an array of `payment_method_keywords` used to auto-match incoming sales to an account — e.g. Cash Drawer matches `['cod','cash','admin_override']`, Bank/UPI matches `['upi','card','gpay','phonepe','paytm']`).

**Balances are computed entirely client-side**, confirmed directly in `components/AdminFinance.tsx`: a `balances` state (`Record<string, number>`) is computed by a client-side function, with the UI's own caption explaining the formula verbatim — *"Balances = opening balance + system sales auto-matched by payment method + manual ledger entries against..."* — i.e., `opening_balance` (a column on `finance_accounts`) plus every System Sales row whose payment method matches that account's keyword list, plus every manual `finance_transactions` entry posted against that account. There is no server-side "current balance" endpoint or stored running total; the browser fetches the raw building blocks (accounts, system sales for the period, transactions) and reduces them into balances on every load. This means balance correctness depends entirely on the client-side reduction logic staying correct and in sync with whatever the server-side equivalents (vendor/salary payment posting, Section 15–16) actually write — there is no single server-computed source of truth to check the client math against.

---

## 15. Finance — Vendor Accounting

Three tables model vendor purchasing: `vendors` (the vendor directory), `vendor_purchases` (an invoice/bill: `amount`, `amount_paid`, `status` constrained to `unpaid` / `partially_paid` / `paid`, plus `is_voided`), and `vendor_payments` (one or more partial payments against a purchase, each referencing a `finance_accounts` row).

**Write pattern, confirmed from the migration's own comment:** each `vendor_payments` insert is meant to also post one linked `finance_transactions` row (`source = 'vendor_payment'`) and update the parent `vendor_purchases.amount_paid`/`status` — done as a **sequential, non-atomic series of writes inside the API route**, because, per the migration comment, "Supabase JS has no multi-statement transaction API." This is an explicitly acknowledged design tradeoff in the code itself, not something this audit is inferring: a request that fails partway through (e.g., the `finance_transactions` insert succeeds but the `vendor_purchases.amount_paid` update then fails due to a transient network error) can leave the vendor purchase's recorded paid-amount out of sync with the ledger, with no automatic reconciliation. **Confidence for the exact ordering/rollback behavior: Per code-reading agent, not re-opened line-by-line in this final pass** — the schema-level design intent is confirmed directly from the migration comment above; the precise route-level write order is not re-verified here.

---

## 16. Finance — Salary Accounting

`staff_salary_config` deliberately reuses the existing `staff` table rather than introducing a duplicate employee table (confirmed via the migration's comment). Each rate change **inserts a new row** and marks the prior one `is_active = FALSE`, preserving historical rates rather than overwriting them — `salary_type` is constrained to `monthly` / `daily` / `hourly`.

`salary_payments` records an actual payment against a staff member (optionally linked back to the `salary_config_id` that was active at the time), and — per the same non-atomic sequential-write pattern as vendor payments — is meant to also post one linked `finance_transactions` row (`source = 'salary_payment'`) so "Admin never has to separately create a matching expense for the same salary payment" (verbatim from the migration comment).

Both `vendor_payments` and `salary_payments` support `is_voided` as a soft-delete/reversal flag rather than hard deletion, preserving an audit trail of reversed transactions.

---

## 17. Finance — Manager Expenses vs. Finance Expenses

There are genuinely **two separate expense-tracking concepts** in this codebase, and they do not share a table:

- **Manager Expenses** (`expenses` table, pre-existing, powers `app/manager/page.tsx`'s Expenses sub-page and the Manager stats bar's `todayExpenses` tile) — category chips drawn from a constant, `EXPENSE_CATEGORIES`, defined in `lib/api.ts`.
- **Finance** (`finance_transactions` with `finance_categories`, added by migration 019) — a separate, independent category list, by explicit design (Section 12).

`computeFinanceSummary()` in `lib/finance-server.ts` **reads** the pre-existing `expenses` table live (via its `managerExpenses` field) for reporting purposes inside the combined Finance summary — it does not copy or migrate that data into `finance_transactions`. The function's own doc comment states this plainly: "Reads, but never writes to, the existing `expenses` table (Manager-logged operating expenses) — Finance shows that data live, it is not copied." Practically, this means an operator logging an expense from the Manager portal will see it reflected inside the Finance module's summary view, but it will **not** appear in the Finance module's own transaction ledger (`finance_transactions`) unless someone separately re-enters it there — the two systems are additive for reporting purposes but not unified for entry purposes. Combined with the Manager Portal's own confirmed-broken `todayExpenses` display bug (Section 10), an operator relying on the Manager dashboard's "Expenses Today" tile specifically (rather than the Finance module) will see ₹0 regardless of what's actually been logged.

---

## 18. Finance — Daily Closing

`daily_finance_closings` stores a **frozen JSONB snapshot** per `(restaurant_id, business_date)` (enforced by a `UNIQUE` constraint), with `is_closed`, `closed_by`, `closed_at`, and reversal fields `reopened_by`/`reopened_at`.

**Closing does not lock any underlying data.** The migration's own comment is explicit and important: *"Closing a day does NOT lock any underlying row — Admin retains full edit access everywhere (per requirement: never permanently lock the owner out of their own data). Instead, the Finance UI recomputes live totals for `business_date` on every view and diffs them against `snapshot`; a mismatch renders a '⚠️ Modified after closing' indicator."* So a "closed" day is a soft, advisory boundary: an admin can still edit orders, tabs, or ledger entries dated on a closed day, and the UI's only defense against that silently drifting the historical record is a warning badge computed by comparing the live recomputation against the frozen snapshot — there is no hard constraint preventing the drift itself. Re-closing a day updates the snapshot and is logged to `finance_audit_log` with `action = 'close_day'`, including on a repeat close of the same date.

---

## 19. Authentication & Authorization Audit

This section was rebuilt from scratch against the fresh snapshot, quantified with direct greps rather than carried forward from any prior description.

**There is no session layer at any level.** No `middleware.ts` exists anywhere in the repository (confirmed — checked repo root and `app/`). No cookie is set by any route. No JWT is issued or verified anywhere. The entire notion of "being logged in" is: a client component writes a JSON blob (role, name/id, `expiresAt` = now + 8 hours) to `localStorage['fl_session_<role>']` (`lib/auth.ts`, `SESSION_TTL_MS = 8 * 60 * 60 * 1000`) after a successful PIN check, and every portal page reads that key on mount and redirects to its own `/login` route if it's absent or expired. This is a client-side rendering gate, not a security boundary — nothing on the server ever inspects it.

**Quantified route-level authorization, confirmed directly:**

- Total API route files: **77** (`find app/api -name route.ts`).
- Route files that perform any form of server-side credential check (`requireAdminPin`/`verifyAdminPin` from `lib/finance-server.ts`, or the equivalent hand-rolled admin-PIN check in the order-deletion routes): **21** — the 19 Finance routes (Section 12) plus `app/api/orders/clear/route.ts` and `app/api/orders/delete-selective/route.ts`.
- Route files that check a `PRINT_AGENT_KEY` header, but **fail open** (serve the request anyway with a console warning) if that environment variable isn't configured: **2** (`app/api/print-jobs/route.ts`, `app/api/print-jobs/[id]/route.ts`).
- Route files with **no authentication mechanism of any kind** — no PIN check, no header key, nothing: **54 of 77 (≈70%)**. This includes, among others: `app/api/settings/route.ts` (PATCH — can overwrite the shared admin/kitchen/manager PIN values with zero credential), `app/api/staff/route.ts` and `app/api/staff/[id]/route.ts` (full staff CRUD, including reading and writing plaintext PINs — Section 20), `app/api/orders/[id]/route.ts` (every order status transition, including cancel), `app/api/tabs/[id]/route.ts` (tab close / bill computation / coupon redemption), and the customer-data-bearing `app/api/orders/[id]` `GET` (Section 4/37).

**Row Level Security provides no actual protection.** Every table with RLS enabled uses the identical permissive policy. Confirmed by direct count against every SQL file in `supabase/` and `supabase/migrations/`: **43 `ENABLE ROW LEVEL SECURITY` statements** and **43 `CREATE POLICY` statements**, a 1:1 match, and a search for any policy body that is *not* exactly `USING (true) WITH CHECK (true)` (or the equivalent unspaced `USING(true) WITH CHECK(true)`) returned **zero results**. In other words, RLS is switched on everywhere but configured everywhere to allow every operation to every requester — it is not a defense-in-depth layer against the missing route-level auth above, it is a formality that satisfies "RLS is enabled" without restricting anything. Whatever authorization exists in this application exists entirely in the ~30% of routes that call `requireAdminPin`/`verifyAdminPin`, and nowhere else.

**Client-side-only checks that look like security but aren't:** the tracking-token check on `/track` (Section 37, item 1) and the staff-login PIN comparison on Waiter/Delivery (Section 20) both perform their actual comparison in the browser after the server has already sent the sensitive data or allowed the action — these are UI conveniences, not access controls, and both are trivially bypassable by calling the underlying API route directly.

**What this means in practice:** anyone who can reach the deployed app's network address can call any of the 54 unauthenticated routes directly — change an order's status, close a tab, read another customer's order/PII by ID, view or overwrite the shared PINs via `/api/settings`, or read a staff member's plaintext PIN via `/api/staff/[id]` — without ever touching a login screen. The Finance module and the two order-deletion routes are the only parts of the application actually protected against this today.

---

## 20. PIN Storage & Handling Audit

**Every PIN in this system is stored and compared as plaintext**, confirmed across every PIN-bearing table and route read during this audit:

| PIN | Stored where | Compared how |
|---|---|---|
| Admin PIN | `restaurant_settings` (`key = 'admin_pin'`), plain string in `value` | `===` string equality, server-side, inside `verifyAdminPin()` (Finance, order-deletion) — the one place PIN handling is done correctly-ish, modulo being plaintext |
| Kitchen PIN | `restaurant_settings` (`key = 'kitchen_pin'`) | Server-side `===`, via `/api/settings` verification path |
| Manager PIN | `restaurant_settings` (`key = 'manager_pin'`) | Server-side `===`, via `/api/settings` verification path |
| Staff (Waiter/Delivery) PIN | `staff.pin`, plain string column | **Client-side.** `GET /api/staff/[id]` (confirmed directly, `app/api/staff/[id]/route.ts` lines 15–27) returns the entire staff row including `pin` in the JSON response with zero authentication on the GET. The Waiter/Delivery login page fetches this record and compares the entered PIN against `data.pin` in the browser. The real plaintext PIN is transmitted to the client on every login attempt, whether or not it matches. |
| Table session PIN | `customer_tabs.pin`, 4-digit, plain string | Compared server-side in `/api/tab-devices/verify`, but against the wrong column relative to what's collected at session start (Section 5's `personal_pin` write-only finding) |

**No hashing, no salting, anywhere.** A `grep` for `bcrypt`, `argon2`, `scrypt`, or any password-hashing library in `package.json` and across `lib/`/`app/` returns nothing — none is a dependency of this project.

**Shared-secret reuse:** the single `admin_pin` value is reused as the authorization credential for the entire Finance module (`requireAdminPin`, Section 12) and for both order-deletion danger-zone tools (Section 32) — there is no PIN specific to Finance. Anyone who knows the one Admin PIN has full read/write access to every Finance ledger, vendor account, and salary record in addition to everything the Admin Dashboard itself exposes.

**PIN rotation and recovery:** the Admin PIN supports a change flow and a security-question-based recovery flow (both inside the Admin Dashboard's Staff/Email/Feedback section, Section 11); Kitchen/Manager PINs rotate from the same Admin section. None of these flows were re-opened line-by-line in this final pass beyond confirming their existence in `app/admin/page.tsx`'s section list — **Confidence: Per code-reading agent, not re-opened in final pass** for the exact recovery-flow mechanics.

---

## 21. API Inventory (Categorized)

The application exposes **77 route files** under `app/api/`. Grouped by resource area (route counts approximate a file per HTTP-method-set, some files handle multiple methods):

**Orders & Tabs** — `orders/route.ts` (create/list), `orders/[id]/route.ts` (GET/PATCH — the state machine, Section 4), `orders/[id]/events/route.ts`, `orders/clear/route.ts` (auth'd, full wipe, Section 32), `orders/delete-selective/route.ts` (auth'd, selective delete, Section 32), `tabs/route.ts`, `tabs/[id]/route.ts` (close-tab logic, Section 5), `order-issues/route.ts` (the "not received" report flow).

**Menu** — `menu/route.ts`, `menu/[id]/route.ts`, `menu/seed/route.ts`, `menu/upload/route.ts` (CSV import).

**Tables** — `tables/route.ts`, `tables/[id]/route.ts`, `tab-devices/route.ts`, `tab-devices/verify/route.ts` (session recovery, Section 5).

**Staff & Auth-adjacent** — `staff/route.ts`, `staff/[id]/route.ts` (Section 20's PIN-leak finding), `settings/route.ts` (shared PIN storage, unauthenticated PATCH), `auth/change-pin/route.ts`, `auth/recover-pin/route.ts`, `auth/verify-pin/route.ts`.

**Rewards / Spin & Win** — `rewards/spin/route.ts`, `rewards/spin-verify/route.ts`, `rewards/spin-invite/route.ts`, `rewards/eligibility/route.ts`, `rewards/reserve-coupon/route.ts`, `rewards/release-coupon/route.ts`, `rewards/validate-coupon/route.ts` (Section 25), `admin/spin-config/route.ts`, `admin/spin-rewards/route.ts`, `admin/spin-rewards/[id]/route.ts`, `admin/spin-rewards/import/route.ts`, `admin/rewards-audit/route.ts`.

**Printing** — `print-jobs/route.ts`, `print-jobs/[id]/route.ts` (fail-open `PRINT_AGENT_KEY` check, Section 9).

**Email** — `email/receipt/route.ts`, `email/process-queue/route.ts`, `email/diagnostics/route.ts`, `test-email/route.ts`.

**Finance** (19 routes, all authenticated — Section 12) — `finance/accounts/**`, `finance/audit-log/route.ts`, `finance/categories/route.ts`, `finance/closings/route.ts`, `finance/closings/reopen/route.ts`, `finance/salary-config/route.ts`, `finance/salary-payments/**`, `finance/summary/route.ts`, `finance/system-sales/route.ts`, `finance/transactions/**`, `finance/vendor-payments/**`, `finance/vendor-purchases/**`, `finance/vendors/**`.

**Admin/Config** — `admin/restaurant-config/route.ts` (Section 27), `admin/config-diagnostics/route.ts` (Section 27), `admin/feedback/route.ts`, `init/route.ts` (first-run bootstrap), `analytics/route.ts`, `expenses/route.ts` (Manager Expenses, Section 17), `offers/route.ts`, `feedback/route.ts`, `lookup/route.ts` (order lookup by name+phone), `track/route.ts`, `waiter-calls/route.ts`.

**AI** — `ai/chat/route.ts` (Google Generative AI integration).

Of these 77, exactly 21 perform server-side authentication and 2 more attempt it with a fail-open gap (Section 19). No route file was found that is unreachable/orphaned dead code — every file under `app/api/` corresponds to at least one client call site identified during this audit, with the caveat that this cross-reference was performed by the research agents rather than exhaustively re-verified file-by-file in this final synthesis pass.

---

## 22. Database Documentation & ER Diagram

**33 distinct tables** were found across all 23 SQL files under `supabase/` (`migration_001.sql` through `migration_020_staff_ordering.sql`, plus `migrations/20260530_add_variants.sql`, `migrations/20260609_multi_customer_sessions.sql`, and a consolidated `schema.sql`):

`restaurants`, `restaurant_settings`, `staff`, `menu_items`, `tables`, `customer_tabs`, `tab_devices`, `orders`, `order_items`, `order_events`, `order_issues`, `order_feedback`, `waiter_calls`, `split_bills`, `shift_logs`, `print_jobs`, `email_log`, `email_queue`, `spin_config`, `spin_rewards`, `spin_results`, `reward_coupons`, `expenses`, `settings`, `finance_accounts`, `finance_categories`, `finance_transactions`, `finance_audit_log`, `vendors`, `vendor_purchases`, `vendor_payments`, `staff_salary_config`, `salary_payments`, `daily_finance_closings` — 34 names listed there because `settings` (a small legacy/general table, distinct from `restaurant_settings`) also appears once, in `migration_007.sql`.

There is no ORM and no single canonical schema file that is guaranteed current — `schema.sql` exists as a consolidated snapshot but the 23 individual numbered/dated migration files are the actual applied-in-order history; `schema.sql`'s freshness relative to the latest numbered migration was not independently diffed column-by-column in this pass. **Confidence: Needs Runtime Verification** if `schema.sql` is ever used as a bootstrap source instead of replaying the migrations in order.

**Core relationships (ER diagram, primary FKs only):**

```mermaid
erDiagram
    RESTAURANTS ||--o{ RESTAURANT_SETTINGS : has
    RESTAURANTS ||--o{ STAFF : employs
    RESTAURANTS ||--o{ MENU_ITEMS : lists
    RESTAURANTS ||--o{ TABLES : has
    RESTAURANTS ||--o{ ORDERS : receives
    RESTAURANTS ||--o{ CUSTOMER_TABS : hosts
    TABLES ||--o{ CUSTOMER_TABS : seats
    CUSTOMER_TABS ||--o{ TAB_DEVICES : "bound to"
    CUSTOMER_TABS ||--o{ ORDERS : "aggregates (tab_id)"
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o{ ORDER_EVENTS : logs
    ORDERS ||--o{ ORDER_ISSUES : "not-received reports"
    ORDERS ||--o| ORDER_FEEDBACK : rated_by
    ORDERS ||--o{ PRINT_JOBS : "KOT for"
    ORDERS ||--o{ SPIN_RESULTS : "eligible via"
    SPIN_RESULTS ||--o{ REWARD_COUPONS : "wins ->"
    REWARD_COUPONS }o--|| ORDERS : "reserved/redeemed on"
    REWARD_COUPONS }o--|| CUSTOMER_TABS : "reserved/redeemed on (dine-in)"
    SPIN_CONFIG ||--o{ SPIN_REWARDS : configures
    STAFF ||--o{ STAFF_SALARY_CONFIG : "rate history"
    STAFF_SALARY_CONFIG ||--o{ SALARY_PAYMENTS : paid_via
    VENDORS ||--o{ VENDOR_PURCHASES : invoices
    VENDOR_PURCHASES ||--o{ VENDOR_PAYMENTS : "paid against"
    FINANCE_ACCOUNTS ||--o{ VENDOR_PAYMENTS : "paid from"
    FINANCE_ACCOUNTS ||--o{ SALARY_PAYMENTS : "paid from"
    FINANCE_ACCOUNTS ||--o{ FINANCE_TRANSACTIONS : "posted to"
    FINANCE_CATEGORIES ||--o{ FINANCE_TRANSACTIONS : categorizes
    ORDERS ||--o{ EMAIL_LOG : "dedup record"
    ORDERS ||--o{ EMAIL_QUEUE : "queued send"
```

The `reward_coupons` relationship to `orders`/`customer_tabs` is drawn with the caveat documented in Sections 5 and 37: the `reserved_order_id` and `reserved_tab_id` columns are meant to be mutually exclusive alternates depending on order type, but the dine-in reservation code path only ever populates `reserved_order_id` (with a tab ID in it), leaving `reserved_tab_id` effectively unused by that path despite being the column the tab-close redemption logic actually queries.

**Row Level Security:** enabled on all 33 tables, 43 total `CREATE POLICY` statements (some tables' policies are re-declared, wrapped in exception handlers, across multiple migration files as the schema evolved), every single one `USING (true) WITH CHECK (true)` (Section 19).

---

## 23. Realtime Architecture

Realtime is implemented via **Supabase broadcast channels**, not Postgres logical-replication/CDC subscriptions — confirmed by the channel-creation pattern (`sb.channel('restaurant:${restaurantId}')`) used throughout `lib/supabase-server.ts` (server-side `broadcast()` helper) and `lib/realtime-client.ts` (client-side `useRealtime()` hook). One channel per restaurant carries every event type; there is no per-topic/per-table channel segmentation.

**18 distinct event names** are known to `useRealtime()`, confirmed directly from the hook's own event-name array: `order_created`, `order_status_changed`, `order_ready`, `order_served`, `order_out_for_delivery`, `order_delivered`, `payment_completed`, `table_session_started`, `order_issue_reported`, `order_issue_escalated`, `order_issue_reserving`, `order_issue_resolved`, `order_event_added`, `order_confirmed`, `order_rejected`, plus a few additional event names used by specific portals (waiter-call and spin-related events) not enumerated in the excerpt captured for this document.

**No incremental/optimistic UI patching anywhere.** Every subscribing portal's event handler simply calls its own `refresh()` function on receipt of any relevant event — the entire relevant data set is re-fetched from the API rather than the specific changed row being patched into local state. Polling runs underneath as a backup on every portal regardless of realtime subscription status (5 seconds on most staff portals, 3 seconds on the Table portal, 4 seconds on the Track page), so realtime failure degrades to polling-speed freshness rather than to no updates at all.

**Realtime is staff-only.** `useRealtime()` is used by the Admin, Waiter, Kitchen, Manager, and Delivery portals — confirmed **not** used by any customer-facing page (Online, Table, Track, Spin), all of which rely purely on interval polling. This means the Table portal's "My Tab" live-bill view (Section 5) never receives a realtime push despite every mutating order/tab endpoint broadcasting an event that would be relevant to it — it only ever finds out about a status change on its next 3-second poll.

---

## 24. Email System

**Provider:** Resend, via `lib/email-server.ts` (1,617 lines) and `lib/email.ts`.

**Two parallel deduplication mechanisms exist side by side:**
1. An `order_events` check — before sending a receipt, the code queries whether a `ReceiptEmailSent` event already exists for the order (`lib/email-server.ts`, confirmed: "3. Idempotency: skip if ReceiptEmailSent already recorded in order_events" and "3. Duplicate prevention: check order_events for ReceiptEmailSent" appear at two separate call sites in the file).
2. A dedicated `email_log` table with a `UNIQUE(order_id, event_type)` constraint plus a free-form `dedup_key` (`${orderId}:${eventType}`) for additional flexible matching, inserted via `logEmail()`.

These two mechanisms are not unified into one function — different send paths in the file use one, the other, or (in the receipt-send path specifically) reference both, which the codebase itself seems to treat as deliberate defense-in-depth rather than accidental duplication, though this document does not have direct evidence either way on original intent.

**Retry queue:** a separate `email_queue` table holds sends that failed, with `RETRY_DELAY_MS = [0, 60_000, 300_000]` (immediate, then 1 minute, then 5 minutes) and `MAX_RETRIES = 3`; a job's `retry_count` reaching `MAX_RETRIES` marks it a permanent failure. **Retry processing is manual, not scheduled** — confirmed directly: no `vercel.json` exists in the repository (checked, file absent), and the retry queue is documented, inline in `app/admin/page.tsx`'s own help text, as something an admin flushes by hand: *"Flush the retry queue via: `GET /api/email/process-queue` (with Authorization header)"* — with a matching code comment in `app/api/orders/[id]/route.ts` ("so an admin can flush the retry queue manually via /api/email/process-queue"). There is no cron job, Vercel Cron config, or any other automated trigger calling this route found anywhere in the repository. A failed email genuinely stays queued until an admin manually hits this endpoint.

**Known duplicate-send risk:** per code-reading agent research, the Spin & Win invite email has a call site that can fire more than once for the same qualifying event under certain timing conditions — **Confidence: Per code-reading agent, not re-opened in final pass**; not independently reproduced against the fresh snapshot in this final pass.

**Send triggers observed:** order-confirmation email (fired from the waiter's confirm action, Section 8), receipt email (fired automatically on tab-close/order-completion, and — per Section 10's Manager Portal finding — potentially also fired a second time by an independent client-side call in the manager's pre-close modal when an email address is entered there, a possible duplicate-receipt risk flagged in the prior document, Section 37 item covers its current status), and the Spin & Win invite.

---

## 25. Rewards / Spin & Win

**Allocation is a Postgres RPC function, not application-layer logic** — confirmed directly from `migration_018.sql`: `perform_spin()` is defined with an explicit comment describing its own algorithm: *"1. Acquire FOR UPDATE row-level locks on every spin_rewards row in the pool... 3. Pick a reward by weighted probability from the eligible (within-limit) set."* The `FOR UPDATE` row locking (line 85) is explicitly there to prevent a race between two concurrent spins that could otherwise both allocate the same limited-quantity reward — the migration's own comment notes "Any concurrent perform_spin() that shares at least one reward ID will BLOCK" until the first transaction releases its lock. The function is granted to `service_role` only (`GRANT EXECUTE ON FUNCTION public.perform_spin TO service_role`), so it can only be invoked from the server-side Supabase client (`getServerClient()`), never with the anon/public key.

**Eligibility is re-verified server-side**, not trusted from the emailed link's parameters: `GET /api/rewards/spin-verify` independently re-checks config-enabled, minimum order amount, eligible order types, required contact fields, and whether a `spin_results` row already exists for this order/tab — the token in the link only identifies which customer/order to check, it is not itself the authorization.

**Win-weight is never sent to the browser.** `GET /api/rewards/wheel-rewards` returns only label/type/sort-order for active rewards — the actual probability weighting used by `perform_spin()` stays server-side, so the visible wheel cannot be reverse-engineered for its true odds from the client payload alone.

**Coupon lifecycle:** `active → reserved → redeemed` (or back to `active` if abandoned), spanning `POST /api/rewards/validate-coupon` (computes discount server-side), `POST /api/rewards/reserve-coupon` (locks a coupon to one order/tab — the route implicated in the dine-in redemption bug, Sections 5/37), and redemption itself, which happens **inline** inside `PATCH /api/orders/[id]` and `PATCH /api/tabs/[id]` at order/tab completion time rather than through any dedicated "redeem" route.

`POST /api/rewards/release-coupon` exists as a route but, per code-reading agent research, has no "remove applied coupon" UI action anywhere in the app calling it — the only real release paths observed are order cancellation and an automatic release fallback built into coupon validation itself. **Confidence: Per code-reading agent, not re-opened in final pass.**

---

## 26. Payment Architecture

**There is no payment gateway integration anywhere in this codebase.** Confirmed by searching `package.json` and all of `app/`/`lib/` for Stripe, Razorpay, PayPal, or any other payment-processor SDK: none is a dependency, none is imported. "Payment method" throughout the app (`paymentMethod` fields in `lib/api.ts`'s types, e.g. line 118: `paymentMethod: string; // 'cod' | 'gpay' | 'card' | etc.`) is purely a **label selected by a human** (customer at checkout, or waiter/manager/delivery staff recording how a bill was actually settled) — no code path ever calls out to an external service to authorize, capture, or verify a charge. Split payments are represented as either a structured breakdown or, in the delivery hand-off flow specifically, a freeform combined string such as `"Cash ₹500 + UPI ₹300"` (confirmed from a code comment in `lib/api.ts` describing the delivery payment-recording function).

This means every "payment" in the system is fundamentally a bookkeeping entry — the actual exchange of money happens outside the app (cash handed over, a UPI app used independently by the customer, a card machine at the counter) and staff simply record which method was used. The Finance module's account-balance auto-matching (Section 14) relies entirely on this self-reported label lining up with the correct `finance_accounts.payment_method_keywords` — there is no independent verification that a transaction labeled "cash" was, in fact, paid in cash.

---

## 27. Configuration System

The centralized ENV > Admin > Default resolver, `lib/config-server.ts`, was independently re-audited in this pass (it was the deliverable of the immediately-preceding task in this same session, so this document deliberately does not take its own correctness on faith).

**The core precedence engine is correctly implemented.** `resolveStringFromEnvAndValue()` genuinely applies: an explicit, non-empty ENV var wins if set; otherwise a value read from `restaurant_settings`/`restaurants` (the "Admin" layer) wins if present; otherwise a hardcoded application default is used. `parseEnvString`/`parseBoolean`/`parseNumber` are real, defensive parsers (confirmed: `parseBoolean` does not use a bare `if (process.env.X)` truthy check, per its own doc comment warning against exactly that mistake).

**But the centralization is only partially applied across the codebase — confirmed with specific counts:**
- `resolveRestaurantId()` and `getAllAdminSettings()` are exported from `lib/config-server.ts` (lines 105 and 204) but are effectively **dead exports** — the hand-duplicated pattern `process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default'` still appears independently in **29 separate files** across `app/` and `lib/` (confirmed by direct grep in this pass), none of which call the centralized resolver. The restaurant ID itself was never actually centralized despite the resolver existing for it.
- `restaurant_name` **is** correctly centralized: confirmed no remaining direct `process.env.RESTAURANT_NAME` / `NEXT_PUBLIC_RESTAURANT_NAME` reads outside `lib/config-server.ts` itself, across the 4 surfaces the prior task touched (`lib/email-server.ts`, the AI chat route, the rewards routes, `app/spin/page.tsx`, `app/api/admin/restaurant-config/route.ts`, `app/api/init/route.ts`, `app/admin/page.tsx`, `app/api/admin/config-diagnostics/route.ts`). However, **the literal string `"Foodie Lover"` is still hardcoded directly in 13 other files**, confirmed by grep in this pass: `app/admin/page.tsx`, `app/delivery/page.tsx`, `app/delivery/login/page.tsx`, `app/qr/page.tsx`, `app/api/test-email/route.ts`, `app/api/init/route.ts` (as a fallback default, appropriately), `app/api/staff/route.ts`, `app/page.tsx` (home page), `app/online/page.tsx`, `app/track/page.tsx`, `app/layout.tsx` (browser tab title / metadata), `app/table/page.tsx`, `app/spin/page.tsx`. Several of these overlap with files the prior centralization task *did* touch for other purposes (e.g. `app/spin/page.tsx`, `app/api/init/route.ts`) — meaning the centralization there is real but partial even within a single file: one usage of the restaurant name may go through the resolver while a second, different usage in the same file (e.g. a static page title, a metadata tag, an error-message string) still hardcodes the literal.
- **`kitchen_mode` has two parallel resolution paths that happen to agree today but are not unified.** `lib/config-server.ts` (around line 224) has a proper resolver reading `restaurants.kitchen_mode` with a documented Admin/default precedence. But `app/api/admin/restaurant-config/route.ts` — the actual endpoint the Waiter and Kitchen portals poll for this setting — does **not** call that resolver; it runs its own direct, hand-written query: `sb.from('restaurants').select('kitchen_mode').eq('id', RID).single()` (confirmed, line 15), defaulting to `'ask'` independently if the column is null (line 19: `data?.kitchen_mode ?? 'ask'`). The two paths produce the same practical result today (both default to `'ask'`), but they are genuinely two separate implementations of the same logic, which is a maintenance trap: a future change to the centralized resolver's `kitchen_mode` behavior (e.g. adding an ENV override) would silently not apply to the actual live-polled endpoint.

**Diagnostics:** `GET /api/admin/config-diagnostics` (backing the Admin Settings "Configuration" panel) is a thin, read-only wrapper around `getConfigDiagnostics()` in `lib/config-server.ts`, and is explicitly documented in its own file header to never return a secret value — only whether a secret ENV var is configured (true/false) — confirmed directly from the route file.

---

## 28. Full Environment Variable List

Every `process.env.*` reference found across `app/` and `lib/` in the fresh snapshot:

| Variable | Purpose | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client-side) | No (by design, but should still not be over-shared) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — used server-side by `getServerClient()` for every API route, bypasses RLS entirely | **Yes — highest sensitivity** |
| `NEXT_PUBLIC_RESTAURANT_ID` | Single-tenant restaurant identifier, defaults to `'rest_default'` when unset | No |
| `NEXT_PUBLIC_APP_URL` | Base URL used to build absolute links (emails, QR codes, tracking links) | No |
| `ADMIN_PIN` | First-run seed value only for the admin PIN — read once by `init`, not read on every request | Yes |
| `KITCHEN_PIN` | First-run seed value for the kitchen PIN | Yes |
| `MANAGER_PIN` | First-run seed value for the manager PIN | Yes |
| `RESEND_API_KEY` | Resend email provider API key | Yes |
| `FROM_EMAIL` | Sender address for outbound email | No |
| `GEMINI_API_KEY` | Google Generative AI key, powers `/api/ai/chat` | Yes |
| `PRINT_AGENT_KEY` | Shared key the print-agent process presents to `/api/print-jobs`; **fails open if unset** (Section 9/19) | Yes (but currently optional in practice) |
| `CRON_SECRET` | Referenced in code; no active Vercel Cron configuration was found calling anything with it in this snapshot (`vercel.json` does not exist in the repository) — appears to be a leftover/reserved variable | Yes, if ever wired up |
| `APP_ENV` | Environment flag (e.g. distinguishing local/staging/production in a handful of conditional code paths) | No |
| `NODE_ENV` | Standard Next.js/Node environment flag | No |

The print-agent companion process (a separate deployable, not part of the Next.js app's own env) additionally reads its own set: `PRINTER_TYPE`, `PRINTER_NAME`, `PRINTER_DEV`, `PRINTER_IP`, `PRINTER_PORT`, `PRINTER_CHARS_PER_LINE`, `PRINTER_STATION_ID`, and the matching `PRINT_AGENT_KEY` to authenticate against `/api/print-jobs` (Section 9).

`ADMIN_PIN`/`KITCHEN_PIN`/`MANAGER_PIN` are seed-only: after first-run initialization writes them into `restaurant_settings`, subsequent PIN checks read the database value, not the environment variable — so rotating these ENV vars after initial setup has no effect unless the corresponding `restaurant_settings` row is also updated (through the Admin PIN-change flow, Section 20).

---

## 29. Hardcoded Configuration Search

Beyond the `"Foodie Lover"` string inventory in Section 27, other hardcoded values found during this audit:

- **`rest_default`** — the fallback restaurant ID, hardcoded independently in 29 files rather than referencing a single shared constant (Section 27).
- **Two independent hardcoded menu catalogs** — `app/api/menu/seed/route.ts` and `app/api/init/route.ts` (Section 7).
- **15-category fixed list** for the Online Ordering category pill bar, sourced from a fixed array rather than derived from the actual menu's distinct categories (per code-reading agent research on `app/online/page.tsx`).
- **`ISSUE_MAX_RETRIES = 3`** — the "not received" report escalation threshold, a literal constant rather than an Admin-configurable setting.
- **`EXPENSE_CATEGORIES`** (Manager Expenses) and the separate Finance `finance_categories` — two independently maintained category lists for conceptually similar data (Section 17), one a hardcoded constant in `lib/api.ts`, one a database table.
- **Retry/backoff constants** — `RETRY_DELAY_MS = [0, 60_000, 300_000]`, `MAX_RETRIES = 3` for email (Section 24), fixed in code rather than configurable.
- **Kitchen timer thresholds** — the green/amber/red elapsed-time bands (under 5 min / 5–10 min / past 10 min) on the Kitchen portal are literal values in the component, not Admin-configurable.
- **QR code size options** — the QR Generator's pixel-size choices (200/250/300) are a fixed set rather than a free-entry field.

---

## 30. Caching Audit

**HTTP-level caching is minimal and deliberate, not accidental.** A search for `Cache-Control`/`revalidate`/`dynamic` exports across `app/api/**/route.ts` found exactly one route setting an explicit cache header: `GET /api/menu` (`app/api/menu/route.ts`), which sets `Cache-Control: public, max-age=60, stale-while-revalidate=30` while still being marked `export const dynamic = 'force-dynamic'` — the route's own comment clarifies this combination is intentional: "still SSR, but we set Cache-Control manually." This means the menu list can be up to 60 seconds stale at a shared CDN edge for anonymous requests (relevant primarily to the Online Ordering portal, which is the only page that fetches menu data without an auth-gated session).

Every other route inspected that declares a caching-related export uses `export const dynamic = 'force-dynamic'` with no `Cache-Control` header at all (confirmed for `app/api/settings/route.ts`, `app/api/tables/route.ts`, and consistent with the pattern described for the majority of routes by the research agents) — meaning Next.js's default fetch-cache behavior is explicitly opted out of, and responses are effectively uncached beyond whatever a browser or intermediary does on its own with no `Cache-Control` header present.

**Application-level "staleness," as distinct from HTTP caching**, is the more consequential pattern in this codebase and is covered specifically in Sections 10 and 11: the Manager and Admin dashboards' Orders/Sales Report/Transparency tabs only re-fetch when their date filter changes, not on the 5-second poll interval or on realtime events that keep other tabs in the same file fresh. This is a component-level refresh-strategy inconsistency, not a server or CDN cache configuration issue, and was verified structurally against the Admin Dashboard's tab-loading pattern (each major section requiring an explicit "Load" click, Section 11) rather than independently re-clicked through in a running instance.

---

## 31. localStorage Inventory

**Keys actively read/written by the live, reachable application code** (confirmed by direct grep for `localStorage.getItem/setItem/removeItem` across `app/` and `lib/` in this pass):

| Key | Written by | Purpose |
|---|---|---|
| `fl_session_admin` / `fl_session_kitchen` / `fl_session_waiter` / `fl_session_manager` / `fl_session_delivery` | `lib/auth.ts` | Per-role session token + 8-hour expiry (Section 19) |
| `fl_device_id` | `lib/storage.ts`'s `getOrCreateDeviceId()`, called from `app/table/page.tsx` | Persistent per-browser device identifier used for Table-portal session recovery (Section 5) |
| `fl_offline_queue` | `lib/offline-queue.ts` (`QUEUE_KEY`) | Online Ordering's offline-order queue, replayed by `lib/sync-engine.ts` (Section 35) |
| `fl_current_shift_id` | Referenced in shift-related code | Current shift tracking |
| `kitchen_muted` | `app/kitchen/page.tsx` | Persists the Kitchen portal's alert-mute toggle across reloads |
| A WhatsApp-number key (variable name `WHATSAPP_KEY`) | Referenced in code | Persists an entered WhatsApp contact number, purpose/consumer not re-traced in this pass |

**Keys defined in `lib/storage.ts` but confirmed dead** — this corrects an imprecision from earlier research in this same session, which had characterized the entire `lib/storage.ts` file as unreachable. Direct re-verification in this pass found that `app/table/page.tsx` does import one function from it, `getOrCreateDeviceId` (the `fl_device_id` key above) — so the file itself is **not** wholly dead. However, everything else in `lib/storage.ts` — a full pre-Supabase, localStorage-based CRUD data layer for orders, menu, tabs, staff PIN, and more — has no other import site found anywhere in `app/` or `lib/`. Its keys: `fl_orders`, `fl_menu`, `fl_admin_pin`, `fl_customer_tabs`, `fl_device_records`, `fl_expenses`, `fl_food_disputes`, `fl_fraud_alerts`, `fl_order_events`, `fl_order_num_counter`, `fl_split_bills`, `fl_tables`, `fl_waiter_calls` — 13 keys, all dead in the sense that no live code path writes or reads them today, left over from what was evidently an earlier, pre-Supabase version of this application (Section 38).

---

## 32. Order Deletion Documentation

Two distinct deletion tools exist, both confined to the Admin Dashboard's "danger zone" and both requiring the shared admin PIN — the only two non-Finance routes in the entire app with real server-side authorization (Section 19).

**`POST /api/orders/delete-selective`** (confirmed read in full in this pass) — deletes a specific subset of orders by one of three modes: a single `orderId`, all orders on a given IST calendar `date`, or an IST `dateFrom`/`dateTo` (+ optional `timeFrom`/`timeTo`) range. It requires `{ pin, mode, ... }` in the request body and verifies the PIN server-side before doing anything. Its own in-code comment documents the full FK dependency chain it has to walk in order:
1. Look up `spin_results` rows for the target orders.
2. Delete `reward_coupons` whose `spin_id` came from those spin results (this unblocks the `spin_results` cascade, since `reward_coupons.spin_id` is a `RESTRICT`, not `CASCADE`, foreign key).
3. Nullify remaining `reward_coupons` back-references (`source_order_id`, `reserved_order_id`, `redeemed_order_id`) on coupons from *other* orders that happen to reference one of the orders being deleted.
4. Delete `order_events`, `order_items`, and `spin_results` for the target orders, in parallel.
5. Delete the `orders` rows themselves, now that all `RESTRICT` foreign keys pointing at them have been cleared.

A companion `GET` on the same route returns a **preview count** for a date/range query with **no PIN required** — a minor information-disclosure gap: anyone can learn how many orders exist in a given date range without authenticating, even though actually deleting them requires the PIN. This was not flagged in any prior report found for this project and is a new finding from this audit (Section 36).

**What this route does *not* touch, confirmed by reading it line-by-line:** `finance_transactions`, `vendor_payments`, `salary_payments`, `print_jobs`, `email_log`, `email_queue`, `order_feedback`, and `order_issues` rows referencing the deleted orders are left in place. A deleted order's associated Finance ledger entries (if any existed) are not cleaned up or flagged, and since System Sales (Section 13) is computed live from `orders`/`customer_tabs`, a deleted order simply stops contributing to future System Sales computations with no audit trail of its prior contribution unless a `daily_finance_closings` snapshot had already frozen that day's numbers before the deletion.

**`app/api/orders/clear/route.ts`** — the second danger-zone tool, a full wipe ("Permanently deletes ALL orders, items, and events from the database," per the Admin UI's own warning copy, confirmed present in `app/admin/page.tsx`), also PIN-gated. This route was not re-opened line-by-line in this final pass beyond confirming its existence and its auth requirement; its exact table-by-table deletion sequence is presumed structurally similar to `delete-selective`'s documented FK-walk but was **not independently re-verified** — **Confidence: Needs Runtime/Code Verification** for its precise sequence.

---

## 33. Auditability

**Two genuinely distinct audit trails exist, at different levels of rigor:**

1. **`order_events`** — a general-purpose event log, written from at least 8 separate API-route call sites (confirmed by grep). It captures status transitions, confirmations, rejections, issue reports/escalations/resolutions, and feedback submission, and is the backbone of both the customer-facing Track page's progress stepper (Section 4) and the Waiter portal's order-detail timeline (whose color/label mapping, per code-reading agent research, only partially overlaps the actual event-type strings it's meant to style — Section 37 covers this). It is a log of *what happened to an order*, not specifically a security/access audit log — it has no actor-authentication behind it, since the routes writing to it are themselves largely unauthenticated (Section 19).

2. **`finance_audit_log`** — a purpose-built audit table, confirmed via `logFinanceAudit()` in `lib/finance-server.ts`: every mutating Finance action is meant to write a row here, and the write is wrapped in its own try/catch with a `console.error` fallback if the audit insert itself fails — meaning a Finance action can still succeed even if its audit-log entry fails to write, so the audit log is not transactionally guaranteed to be complete. This is the closest thing in the codebase to a real access/change audit trail, and it only covers Finance.

**Nothing resembling an audit trail exists for the ~54 unauthenticated routes** (Section 19) beyond whatever `order_events` happens to capture incidentally for order-related ones — a PIN change via `/api/settings`, a staff record edit via `/api/staff/[id]`, or a table edit via `/api/tables/[id]` leaves no dedicated audit row anywhere, only whatever the database's own row-level `updated_at` timestamp implies.

---

## 34. Error Handling Patterns

**The dominant server-side pattern, consistent across essentially every route file inspected:** a top-level `try { ... } catch (err) { console.error(...); return NextResponse.json({ error: msg }, { status: 500 }) }` wrapper, with a small shared `errMsg()`/equivalent helper in most files to safely extract a message string from an unknown caught value. `app/api/orders/[id]/route.ts` alone contains 3 top-level try blocks and 12 `console.error` call sites across its various action branches — representative of the file-by-file granularity used throughout the API layer. There is no centralized error-handling middleware, no structured error-response schema beyond `{ error: string }`, and no error codes/types beyond the HTTP status — callers are expected to parse the message string if they need to distinguish failure reasons.

**Client-side:** a global `ErrorBoundary` component (`components/ErrorBoundary.tsx`) is mounted in the root layout (`app/layout.tsx`), confirmed present — meaning an uncaught render error anywhere in the React tree is caught at the top level rather than only within the Online Ordering portal specifically (correcting a possible over-narrow reading of the prior document's framing, which described the ErrorBoundary specifically in the context of Online Ordering; it is in fact wired at the application root).

**Silent failures are a recurring, specifically-named pattern across portals**, confirmed structurally by the research passes and consistent with the direct evidence gathered in this pass: a rejected order-status-advance on the Kitchen portal is only logged to the console with no visual feedback to the cook (Section 9); a failed menu fetch, offers fetch, or post-order coupon reservation on Online Ordering fails with no user-visible error; the coupon-validation call on the Table portal uses a raw `fetch()` rather than the app's `apiFetch`/`safeApiCall` wrappers, so it fails silently offline rather than being retried by the sync engine. These are UX-completeness gaps rather than data-integrity bugs, but they mean a genuine failure (network drop, invalid state, server error) can present to staff or customers as if nothing happened, which in a live-restaurant-operations context has real consequences (a missed order, an uncollected payment adjustment).

---

## 35. Idempotency & Duplicate-Protection Audit

Idempotency protection in this codebase is **inconsistent — genuinely strong in a few specific places, and genuinely absent (despite comments claiming otherwise) in others.**

**Strong, confirmed protections:**
- **Spin allocation** — `perform_spin()`'s `FOR UPDATE` row locking (Section 25) is real, DB-enforced protection against a double-win race condition.
- **Feedback submission** — `POST /api/feedback` is described as idempotent per order by the prior document's framing; not independently re-verified in this pass beyond noting no contradicting evidence was found.
- **Dine-in order merging** — placing a second order on a tab that already has one `awaiting_waiter` merges items into the existing order rather than creating a duplicate (Section 5), which is a deliberate idempotency-adjacent design choice, not a bug.
- **Email deduplication** — the dual `order_events`/`email_log` mechanism (Section 24), whatever its redundancy, is real protection against re-sending the same receipt.

**Confirmed absent, despite a comment claiming otherwise — the most significant finding in this section, independently re-verified against the fresh snapshot in this pass, not merely carried forward:** `lib/sync-engine.ts`'s `replayEntry()` function, which re-submits an order from the offline queue (`fl_offline_queue`, Section 31) once the browser regains connectivity, carries the comment `// Duplicate check: if idempotencyKey matches an existing order tracking token, skip` directly above the code that does the actual replay — but the code immediately following that comment is simply `await createOrder(p as Parameters<typeof createOrder>[0])`, with **no check of any kind** against an existing tracking token, an idempotency key, or any other server-side de-duplication signal. If a `create_order` request actually succeeds on the server but its response never reaches the browser (a dropped connection, a closed tab, a timeout), the offline queue still holds that entry and will unconditionally resubmit it as a **second, separate order** the next time the sync engine runs — with no server-side idempotency key check on the receiving end either (`POST /api/orders` was not found to check any client-supplied idempotency key against prior orders in the routes read during this audit). This is a real, confirmed, money-and-kitchen-workflow-affecting gap: a customer's order can be prepared and billed twice from a single actual submission.

**Also confirmed absent:** no idempotency check on the vendor-payment or salary-payment posting sequences (Section 15–16) beyond ordinary database constraints — a client retry of a failed multi-step write could, in principle, post a duplicate `finance_transactions` entry, though no direct evidence of this actually occurring was sought or found (this is a structural risk assessment, not an observed incident).

---

## 36. Known Issues — Fresh Audit (Critical/High/Medium/Low)

Every item below was either directly confirmed by reading the fresh snapshot in this pass, or is explicitly marked with its actual confidence level. Nothing here is carried forward from any prior report without at least the confidence label reflecting that.

### Critical

**C1. No server-side authentication on ~70% of API routes.**
Affected files: 54 of 77 files under `app/api/**/route.ts` (Section 19 for the full method); specifically including `app/api/settings/route.ts`, `app/api/staff/route.ts`, `app/api/staff/[id]/route.ts`, `app/api/orders/[id]/route.ts`, `app/api/tabs/[id]/route.ts`.
Actual behavior: any of these routes can be called directly with no credential of any kind and will execute.
Expected behavior: mutating and PII-bearing routes should require some form of server-verified credential.
Impact: an attacker (or a misbehaving script, or a competitor) with the deployed URL can change order statuses, close tabs, alter the shared PINs, read or write staff records including PINs, and more, entirely outside any UI.
Recommended fix: introduce a minimal server-side session (signed cookie or header token issued at login) and require it on every mutating route at minimum; the Finance module's `requireAdminPin` pattern is a workable template to extend.
Confidence: Confirmed directly (route-by-route grep in this pass).

**C2. Row Level Security is enabled everywhere but enforces nothing.**
Affected files: all 23 SQL files under `supabase/`; 43 `CREATE POLICY` statements, all `USING (true) WITH CHECK (true)`.
Actual behavior: RLS is on for all 33 tables, but every policy allows every operation to every requester holding the anon key (in addition to the service-role key already bypassing RLS entirely).
Expected behavior: RLS is normally a defense-in-depth layer restricting rows to the requesting principal; here it restricts nothing.
Impact: compounds C1 — even a client using only the public anon key (not the service-role key the server uses) could read/write any row directly against Supabase if the anon key and URL are exposed, since nothing in the database itself restricts access.
Recommended fix: write real per-table policies once a session/role model exists to key them off, or at minimum restrict the anon key's own grants.
Confidence: Confirmed directly (exhaustive grep of every policy statement).

**C3. Staff PINs are transmitted to the browser in plaintext for client-side comparison.**
Affected files: `app/api/staff/[id]/route.ts` (GET, lines 15–27).
Actual behavior: logging in as Waiter or Delivery fetches the entire staff record, including the real plaintext `pin` field, and compares it in the browser.
Expected behavior: the server should verify the PIN and return only a boolean/token.
Impact: the real PIN is exposed over the network on every login attempt (matched or not), and to anyone who calls this unauthenticated GET directly (C1) for any staff ID.
Recommended fix: move the comparison server-side; return only success/failure.
Confidence: Confirmed directly.

**C4. Dine-in reward coupon redemption is broken by a column mismatch — coupons apply in the UI but their discount is never actually deducted.**
Affected files: `app/table/page.tsx` (line 637), `app/api/rewards/reserve-coupon/route.ts`, `app/api/tabs/[id]/route.ts` (line 93).
Actual behavior: the dine-in reserve call writes `reserved_order_id = <tabId>`; the tab-close redemption query reads `reserved_tab_id`; the two never match.
Expected behavior: a coupon reserved against a dine-in tab should be found and redeemed when that tab closes.
Impact: real money — a customer's discount is shown as applied but silently not subtracted from the final bill; the coupon itself is left permanently stuck at `status='reserved'`.
Recommended fix: either write `reserved_tab_id` from the dine-in reserve call path, or have the close-tab query also check `reserved_order_id` against the tab's own order IDs.
Confidence: Confirmed directly — all three files read line-by-line in this pass.

**C5. Offline order replay can silently create duplicate paid orders.**
Affected files: `lib/sync-engine.ts` (`replayEntry()`), `app/api/orders/route.ts` (POST, no idempotency-key check found).
Actual behavior: a comment claims a duplicate check against a tracking token; the code beneath it performs none; a network-dropped-but-server-succeeded create-order request gets unconditionally resubmitted.
Expected behavior: either the client should not resubmit without a real idempotency check, or the server should reject/dedupe a resubmission carrying the same idempotency key.
Impact: kitchen prepares and bills a duplicate order from a single customer action.
Recommended fix: implement the idempotency-key check the comment already describes, on both the client's pre-replay check and the server's `POST /api/orders` handler.
Confidence: Confirmed directly.

**C6. Order tracking data is exposed to anyone who can guess or enumerate an order ID; IDs and tokens are not cryptographically random.**
Affected files: `app/api/orders/[id]/route.ts` (GET, no token check), `lib/supabase-server.ts` (`newId()` uses `Date.now() + Math.random()`).
Actual behavior: the tracking token on `/track` is checked only in the browser after the server has already returned the full order (name, phone, address, items) with no token parameter involved in the query at all; order IDs and tracking tokens are generated with `Date.now()` + `Math.random()`, not a CSPRNG (compare to `generateSpinToken()`, which correctly uses `crypto.randomBytes(24)` elsewhere in the same file).
Expected behavior: the token should gate the server response, and identifiers used as bearer secrets should be cryptographically random.
Impact: a real, if narrow, PII exposure — anyone who can guess/enumerate a plausible order ID can read another customer's name, phone, address, and order contents.
Recommended fix: require and verify the token server-side in `GET /api/orders/[id]` when accessed via the public tracking path; switch to `crypto.randomBytes` for order IDs and tracking tokens.
Confidence: Confirmed directly.

### High

**H1. Manager Portal's "Expenses Today" and "Net Profit Today" are permanently wrong.**
Affected files: `app/manager/page.tsx` (lines 132, 479, 774).
Actual behavior: `todayExpenses` is initialized to 0 and its setter is never called anywhere in the file; Net Profit therefore always equals gross revenue.
Impact: a manager glancing at the dashboard header has no way to know this figure is meaningless.
Recommended fix: wire the expense fetch that already exists in the Finance/Expenses sub-pages into this stats bar, or remove the tile until it's wired.
Confidence: Confirmed directly.

**H2. Print-job listing endpoint fails open if `PRINT_AGENT_KEY` is not configured.**
Affected files: `app/api/print-jobs/route.ts`.
Impact: an operator who forgets to set this one environment variable gets a silently open endpoint rather than a hard failure.
Recommended fix: refuse to serve (500, with a clear log message) rather than warn-and-continue when the key is unset.
Confidence: Confirmed directly.

**H3. Kitchen portal item-advance action can update the wrong item.**
Affected files: `app/kitchen/page.tsx` (array-index-as-key pattern), server-side index resolution in the order item-update path.
Impact: a cook's tap can silently mark the wrong dish ready/served if client and server item ordering ever diverge.
Recommended fix: key advance actions by `order_items.id`, not array position.
Confidence: Per code-reading agent (independently corroborated by three separate research passes); array-index pattern's presence confirmed directly in this pass.

**H4. Single shared Admin PIN gates Finance, order deletion, and the entire Admin Dashboard with no separation of privilege.**
Affected files: `restaurant_settings` (`key='admin_pin'`), `lib/finance-server.ts`, `app/api/orders/clear/route.ts`, `app/api/orders/delete-selective/route.ts`.
Impact: anyone who obtains the one Admin PIN gets full financial visibility/write access and destructive data-deletion capability, not just Admin-Dashboard-level access.
Recommended fix: a distinct Finance-specific credential, at minimum.
Confidence: Confirmed directly.

**H5. Vendor/salary payment posting is a non-atomic multi-step write with no compensating rollback.**
Affected files: `app/api/finance/vendor-payments/route.ts`, `app/api/finance/salary-payments/route.ts` (per migration comments describing the intended write pattern).
Impact: a partial failure mid-sequence can leave `finance_transactions`, `vendor_purchases.amount_paid`, or `salary_payments` out of sync with each other, with no automatic reconciliation.
Recommended fix: either move to a Postgres function (as `perform_spin()` already demonstrates is viable in this codebase) for true transactional atomicity, or add a reconciliation job.
Confidence: Design intent confirmed directly from migration comments; exact route-level write ordering not re-traced line-by-line in this pass.

**H6. Order-deletion preview count has no authentication.**
Affected files: `app/api/orders/delete-selective/route.ts` (GET).
Impact: minor information disclosure — order counts by date/range are queryable by anyone, though actual deletion still requires the PIN. New finding, not present in any prior report reviewed for this audit.
Recommended fix: require the same PIN on the GET, or at minimum rate-limit it.
Confidence: Confirmed directly.

### Medium

**M1. `kitchen_mode` has two independent resolution implementations that happen to agree today.** `lib/config-server.ts`'s resolver vs. `app/api/admin/restaurant-config/route.ts`'s own hand-rolled query. Confirmed directly. Recommended fix: have the route call the resolver.

**M2. Restaurant-ID centralization resolver exists but is unused; 29 files still hand-duplicate `NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default'`.** Confirmed directly. Recommended fix: migrate call sites to `resolveRestaurantId()`, or remove the unused export to avoid the false impression it's in effect.

**M3. `"Foodie Lover"` is hardcoded in 13 files despite a working centralized name resolver.** Confirmed directly. Recommended fix: extend the existing 4-surface migration to the remaining files listed in Section 27.

**M4. Two independent hardcoded menu catalogs (`menu/seed` vs `init`) can diverge over time.** Confirmed directly (differing item counts: 70 vs 50 `name:` occurrences). Recommended fix: single shared seed-data source.

**M5. Admin/Manager Orders, Sales Report, and Transparency tabs can silently go stale** — only re-fetch on filter change, not on the 5-second poll or realtime events that keep the Overview tab fresh. Per code-reading agent research on the tab-loading structure; the "Load"-gated tab pattern itself confirmed directly in Section 11. Recommended fix: subscribe these tabs to the same realtime events Overview already uses.

**M6. Daily Finance Closing does not lock underlying data — a "closed" day can silently drift**, with only a UI warning badge (not a hard constraint) protecting against it. Confirmed directly from the migration's own design-intent comment (Section 18). This is a documented, deliberate design tradeoff, not an oversight — flagged here because it's easy for an operator to misread "closed" as immutable.

**M7. `tab_devices.personal_pin` is write-only** — recorded on every session start but never read back by the recovery-verification path, which checks `customer_tabs.pin` instead. Confirmed directly (Section 5).

**M8. Two parallel "food not received" systems** (a legacy dispute-event banner and the newer `order_issues`-backed re-serve flow) were reported as both fully wired and independently resolvable in the prior document. Not independently re-opened in this pass. Confidence: Per prior report, Needs Runtime/Code Verification to confirm current status.

### Low

**L1. QR Generator has no error fallback if `api.qrserver.com` is unreachable** — a broken-image icon prints silently with no warning. Per prior report; not independently re-verified in this pass.

**L2. Kitchen alert beep ignores the mute toggle** (only the spoken announcement respects it). Per code-reading agent research on `app/kitchen/page.tsx`'s alert-playing function.

**L3. Several dead/half-wired UI elements**: a fully-built "PIN Manager" modal in the Admin Dashboard with no button that opens it; a "Table Occupancy Analytics" widget unconditionally set to an empty array per an in-code comment noting the backing endpoint was never built; menu CSV import/export tooling present in code with no button wired to it in the rendered Manager page. Per code-reading agent research; not independently re-clicked-through (no running instance available) in this pass.

**L4. `WaiterTakeOrder.tsx` component exists fully implemented but was not found imported into `app/waiter/page.tsx`** (Section 3) — manual order entry by a waiter, if intended as a shipped feature, does not currently appear reachable from the live Waiter Station UI.

---

## 37. Recheck of Previously-Reported Issues

**A note on scope.** The task instructions referenced "13 previously-reported issues" to explicitly recheck. The only predecessor document available for this audit, `docs/foodie-lover-reference.docx`, does not contain a list of exactly 13 issues — it contains **6 headline "issues worth fixing first"** (its own Appendix, the items it considered highest-consequence) plus **48 additional portal-level "Notable issues found"** entries spread across its ten portal sections (54 distinct issues total, by direct extraction from the document). Rather than guess which 13 of these 54 were meant, this section rechecks all 6 headline issues in full (each independently re-verified against the fresh snapshot in this pass, not assumed), plus a representative set of the most consequential portal-level items, with the remainder listed for completeness at a lighter verification depth. This is more thorough than a 13-item recheck would have been, at the cost of not matching the specific number requested — flagged here explicitly rather than silently substituted.

### The 6 headline issues — all independently re-verified in this pass

| # | Issue (as originally reported) | Status | Evidence |
|---|---|---|---|
| 1 | Order details aren't protected by the tracking token — `GET /api/orders/[id]` returns full PII to anyone with a valid order ID, no server-side token check; IDs/tokens are timestamp+random, not cryptographic | **STILL EXISTS** | Confirmed directly: `app/api/orders/[id]/route.ts` GET (lines 12–28) has no token parameter or check at all; `newId()` in `lib/supabase-server.ts` still uses `Date.now() + Math.random()`. See C6, Section 36. |
| 2 | Staff PINs compared client-side — full staff record incl. plaintext PIN sent to browser via `GET /api/staff/[id]` | **STILL EXISTS** | Confirmed directly: route returns `pin` field verbatim in JSON, GET has no auth. See C3, Section 36. |
| 3 | No API route checks who's calling it — ~60 routes trust every request | **STILL EXISTS (and now precisely quantified)** | Confirmed directly: 54 of 77 route files (≈70%) have zero server-side auth of any kind; the original "~60" estimate is now measured precisely. See C1, Section 19. |
| 4 | Dine-in reward coupons may never get redeemed — `reserved_order_id` vs `reserved_tab_id` column mismatch | **STILL EXISTS** | Confirmed directly, all three implicated files read line-by-line. See C4, Section 36. |
| 5 | "Net Profit Today" on Manager dashboard is meaningless — `Expenses Today` wired to a never-set state variable, permanently ₹0 | **STILL EXISTS** | Confirmed directly: `todayExpenses` setter never called anywhere in `app/manager/page.tsx`. See H1, Section 36. |
| 6 | Offline order replay can create duplicates — no real idempotency check despite a comment claiming one | **STILL EXISTS** | Confirmed directly: the comment and the unchecked `createOrder()` call sit adjacent in `lib/sync-engine.ts`. See C5, Section 36. |

**All six of the previous document's headline "fix these first" issues remain present, unchanged, in the current codebase.** None has been fixed; none is newly inapplicable.

### A sample of portal-level issues, rechecked at varying depth

| Issue (portal, as originally reported) | Status | Confidence |
|---|---|---|
| Kitchen: item-index mismatch risk on per-item advance | STILL EXISTS | Per code-reading agent (3 independent passes), array-index pattern's presence confirmed directly this pass — see H3 |
| Kitchen: alert beep ignores mute (only voice respects it) | STILL EXISTS | Per code-reading agent, not re-opened this pass |
| Kitchen: timer measures order age, not cook-start time | STILL EXISTS | Confirmed directly — timer is computed from order creation time per `app/kitchen/page.tsx` |
| Waiter: bill-ready total omits reserved coupon discount | STILL EXISTS | Per code-reading agent, not re-opened this pass |
| Waiter: delivery hand-off records the confirming waiter as `delivery_person`, not a real courier | STILL EXISTS | Confirmed directly — `markServed()`'s delivery branch sets `delivery_person` to the waiter's own name |
| Waiter/Delivery: two parallel "food not received" systems both wired | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Delivery: "Delivered" filter bucket structurally near-empty (auto-chains to `completed`) | STILL EXISTS (structural) | Confirmed directly — `VALID_TRANSITIONS` still allows `delivered → completed`, and no code found gating the second PATCH behind a delay |
| Delivery: urgency timer uses order-creation time, not ready time | STILL EXISTS (structural pattern, same class as Kitchen) | Per code-reading agent, not re-opened this pass |
| Manager: "All-Time Discounts" KPI is actually today-only | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Manager: split-by-person payment tracking disconnected from actual close-tab payment method | STILL EXISTS | Confirmed directly — `PATCH /api/tabs/[id]` records one `payment_method` for the whole tab; no code path found consuming a per-person breakdown at close |
| Manager: possible duplicate receipt email on tab close | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only; Section 24 notes the dual dedup mechanism that would need to fail for this to actually manifest twice |
| Manager: menu CSV import/export tooling has no wired button | STILL EXISTS | Per code-reading agent, not re-opened this pass — see L3 |
| Admin: "PIN Manager" modal is dead code (fully built, unreachable) | STILL EXISTS | Per code-reading agent, not re-opened this pass — see L3 |
| Admin: "Table Occupancy Analytics" widget permanently empty | STILL EXISTS | Per code-reading agent, not re-opened this pass — see L3 |
| Admin: Staff Accountability cancellation column structurally always zero | STILL EXISTS | Per code-reading agent, not re-opened this pass |
| Admin: kitchen routing mode editable from two tabs writing the same setting | STILL EXISTS, and now understood more precisely | Confirmed directly this pass to actually be **two different code paths** (Section 27/M1), not just two UI entry points to the same code as originally framed — a slightly more serious version of the original finding |
| Online: coupon vs. automatic offer never compared (coupon always wins even if smaller) | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Online: price range assumes sorted variants | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Table: `tab_devices.personal_pin` is write-only | STILL EXISTS | Confirmed directly, see M7 |
| Table: Special Instructions field captured but never sent in order payload | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Spin: admin config endpoints accept unvalidated raw request bodies | NEEDS RUNTIME/CODE VERIFICATION | Per prior report only, not independently re-opened this pass |
| Track: delivery "Confirm Delivery" button/step is vestigial (auto-completed by delivery portal instead) | Consistent with current findings | The delivery portal's confirmed two-PATCH auto-chain (Delivered → Completed, see Delivery-portal row above) is consistent with this no longer being a manual customer-visible step; not independently re-opened at the Track-page component level this pass |

The remaining ~28 portal-level items from the prior document not listed in the table above were not individually rechecked in this pass; they are lower-consequence UI/UX findings (styling inconsistencies, minor silent-failure UX gaps) rather than correctness or security issues, and this document does not claim their current status one way or the other. A full line-by-line recheck of all 54 would be straightforward follow-up work using the same direct-grep methodology demonstrated throughout this document.

---

## 38. Dead Code & Duplicate Systems

**Confirmed genuinely dead files/paths:**
- **`lib/storage.ts`** — mostly dead (Section 31 corrects an earlier over-broad characterization from research done earlier in this session): one function, `getOrCreateDeviceId`, is live and imported by `app/table/page.tsx`; the rest of the file — a full pre-Supabase localStorage CRUD layer for orders, menu, tabs, and PIN (13 dead keys) — has no other import site anywhere in the repository.
- **`lib/db.ts`** — a SQLite-backed data layer using Node's built-in `node:sqlite` module. No import site found anywhere in `app/` in the research passes for this audit. **Confidence: Per code-reading agent, not independently re-confirmed with a fresh grep in this final pass.**
- **`prisma/schema.prisma`** — a Prisma schema exists in the repository (and `package.json` retains `@prisma/client` as a dependency plus `migrate`/`db:push` npm scripts, Section 40), but the application's actual data access is 100% direct Supabase REST calls via `getServerClient()`; no `PrismaClient` instantiation or Prisma-generated import was found used anywhere in `app/` or `lib/` outside the `prisma/` directory itself. **Confidence: Per code-reading agent, not independently re-confirmed with a fresh grep in this final pass.**

**Confirmed duplicate systems (both live, not dead, but doing overlapping work):**
- Two hardcoded menu seed catalogs (`menu/seed` vs `init`, Section 7).
- Two expense-tracking concepts with independent category lists (Manager Expenses vs. Finance, Section 17).
- Two `kitchen_mode` resolution code paths (Section 27/M1).
- Two email deduplication mechanisms (`order_events` check vs. `email_log` UNIQUE constraint, Section 24) — arguably deliberate defense-in-depth rather than a problem, but genuinely two independent implementations of the same guarantee.

**A fully-built but unmounted component:** `components/WaiterTakeOrder.tsx` (Section 3) — complete manual order-entry UI with no confirmed import site in `app/waiter/page.tsx`.

**No TODO/FIXME markers found anywhere** in the TypeScript source (`app/`, `lib/`) — per code-reading agent research, the codebase appears to have been deliberately cleaned of inline TODOs; remaining rough edges tend to surface as comments explaining *why* something is a known tradeoff (the Finance-auth rationale comment in Section 12 is a good example) rather than as open action items.

---

## 39. Performance Review

This audit did not run the application, so this section describes structural performance characteristics visible in the code rather than measured runtime metrics — every item below is a **Needs Runtime Verification** claim about actual impact, even where the underlying code pattern is confirmed directly.

**Confirmed structural patterns with performance implications:**
- **No incremental UI patching anywhere** (Section 23) — every realtime event triggers a full data re-fetch for the affected portal rather than patching just the changed record. At low order volume this is invisible; at higher volume it means every portal's data set is repeatedly re-fetched in full on every relevant mutation from any customer or staff action.
- **Polling runs underneath realtime on every portal regardless of subscription status** (5s staff portals, 3s Table, 4s Track) — meaning baseline request volume scales with concurrent open sessions regardless of whether anything changed, on top of whatever realtime traffic occurs.
- **The Admin Dashboard's "Load"-gated tab design** (Section 11) is itself a deliberate performance optimization — a ~6,000-line page that does not eagerly fetch all 13 sections' data on mount — but its side effect is the staleness issue in M5/Section 30.
- **Client-side computation of Finance account balances** (Section 14) means every balance view re-fetches and re-reduces the full set of underlying transactions/system-sales rows for the period rather than reading a precomputed total — fine at a single restaurant's typical daily transaction volume, but an approach that would not scale cleanly to a much larger transaction history without pagination or a server-side aggregate.
- **`GET /api/menu` is the only endpoint with any HTTP caching** (Section 30); every other read in the app hits the database fresh on every request with `force-dynamic`.

No load testing, query-plan analysis, or bundle-size measurement was performed as part of this audit — those would require a running instance or build artifacts this audit was not able to reliably produce (Section 40).

---

## 40. Build / Project Health

**This section reports the actual, honest result of attempting to build the project in this session — it does not claim success where none was observed.**

Across this session (this documentation task plus the immediately preceding configuration-centralization task), `npm run build` (`next build --webpack`) was attempted **five separate times** against the repository on the user's device via the remote shell bridge. **None of the five attempts completed within the tool's execution window.** The most recent attempt in this pass, run against the freshly re-synced, clean-working-tree commit `618a9a7`, was given a 38-second budget after clearing the `.next` cache; it progressed past Next.js's own startup — `▲ Next.js 16.3.1 (webpack)`, `Environments: .env.local`, `✓ Running next.config.ts took 1366ms` — and was then killed by the timeout before webpack compilation reported any further progress. This is not a build failure in the sense of a compile error; it is simply an environment where a full production build of this project's size does not finish inside the available single-command execution window on the connected device, and this audit has no ability to run a longer-lived detached background process on that device (background processes started via the available remote-shell bridge are torn down when each individual command's sandbox exits, confirmed by observing an earlier detached `npm run build` attempt disappear from the process list mid-build with no completion marker written).

**A stale `tsc --noEmit` output from earlier in this session** (captured before this task's fresh re-sync, but against the same clean commit, so still representative) shows a **uniform TS2305 error repeated identically across every single generated `.next/types/**` file** in the project: `Module '"next/dist/build/segment-config/app/app-segment-config.js"' has no exported member 'PrefetchForTypeCheckInternal'`. Because this error is byte-identical across every route and page's generated type-check shim with zero variation by file content, it is far more consistent with a **Next.js internal type-generation/version-compatibility issue** (a mismatch between the installed Next.js version — `16.3.1`, per the build attempt above — and either a stale `.next/types` cache or that Next.js version's own type-generation output) than with an application-code defect in any of this project's own files. This assessment could not be fully confirmed without a completed clean build/typecheck to compare against, and is reported here as the most likely explanation rather than a certainty — **Confidence: Needs Runtime Verification.**

**Honest summary for this section:** no successful `npm run build`, `tsc --noEmit`, or `npm run lint` completion was observed in this session, against either the pre- or post-audit state of the repository. This audit cannot certify that the project currently builds cleanly, and it cannot rule it out either — the one concrete signal available (the uniform, file-content-independent TS2305 pattern) points toward an environment/tooling issue rather than an application bug, but that is an inference, not a confirmed result. **The user should run `npm run build` directly in their own local terminal (not through this remote bridge) to get a definitive, complete answer**, since the constraint here is specifically the remote execution environment's inability to sustain a long-running detached process across tool calls, not anything about the code itself.

**`package.json` scripts, confirmed directly:** `dev`/`dev:server` → `next dev --webpack`; `build` → `next build --webpack`; `start` → `next start`; `lint` → `eslint`; `migrate` → `prisma migrate dev`; `db:push` → `prisma db push` (both Prisma scripts are effectively vestigial given Section 38's finding that Prisma is not used by the running application).

---

## 41. Migration Status Inventory

**23 SQL files exist in the repository** (Section 22): `migration_001.sql` through `migration_020_staff_ordering.sql` (20 numbered files, sequential), plus `migrations/20260530_add_variants.sql` and `migrations/20260609_multi_customer_sessions.sql` (2 dated files in a separate `migrations/` subdirectory), plus a consolidated `schema.sql`.

**This inventory can only describe what exists in the repository — it cannot confirm what has actually been applied to the live Supabase project this application runs against, since this audit has no database credentials or ability to query a live Supabase instance.** That distinction — "exists in repo" versus "confirmed applied to Supabase" — is exactly the one the user asked this document to preserve, so it is stated plainly: **every migration-related claim in this document (table existence, column names, RLS policies, the `perform_spin()` function, the Finance schema) reflects what the SQL files in the repository declare, not a live introspection of an actual running database.** If the live Supabase project is behind the repository's migration files — for instance, if `migration_020_staff_ordering.sql` or the two dated `migrations/` files have not actually been run against it — then features this document describes as present (e.g. any staff-ordering-related schema from migration 020, or the variants/multi-customer-session schema from the two dated files) would not actually work in production despite the application code expecting them to exist. **Confidence: Needs Runtime Verification — recommend running each migration file's own verification block (several, including migration_019_finance.sql, end with a commented-out `SELECT` block specifically for this purpose) against the live project before relying on any schema claim in this document operationally.**

**No migration-tracking table or applied-migrations ledger was found in the repository's own SQL** — there is no `schema_migrations` table or equivalent being created/checked by any of the 23 files, meaning there is also no way to determine applied-status even by inspecting the schema alone; it would need to be inferred by checking for the presence of each migration's own distinguishing objects (a specific table, column, or function) against the live database.

---

## 42. Current Feature-Status Matrix

| Feature | Status | Notes |
|---|---|---|
| Online ordering (pickup/delivery) | Implemented | Offline queue has a confirmed duplicate-risk gap (C5) |
| Table QR / dine-in ordering | Implemented | Reward-coupon redemption confirmed broken for this path (C4) |
| Order tracking | Implemented | PII exposure confirmed (C6) |
| Spin & Win rewards | Implemented | Server-side allocation and eligibility genuinely robust (Section 25); a few release/validation edges not re-verified |
| QR code generation | Implemented | Third-party dependency, no fallback (L1) |
| Kitchen display | Implemented | Item-index risk (H3), timer-basis issue |
| Physical KOT printing | Implemented | Separate companion process; fail-open auth gap (H2) |
| Waiter order confirmation | Implemented | |
| Waiter manual order entry ("Take Order") | **Built but not shipped/wired** | `WaiterTakeOrder.tsx` exists, not confirmed imported (L4) |
| Delivery dashboard | Implemented | Structural quirks (near-empty "Delivered" bucket) are working-as-coded, not bugs, per the confirmed auto-chain logic |
| Manager billing / tab close | Implemented | Server-authoritative close logic confirmed solid; stats-bar bug (H1) is presentation-layer only |
| Manager table map | Implemented, read-only | No click-through by design/omission |
| Admin dashboard (13 sections) | Implemented | Several dead UI elements (L3) |
| Finance — System Sales | Implemented | Computed live, not stored |
| Finance — Account Balances | Implemented | Client-computed, no server source of truth to check against |
| Finance — Vendor Accounting | Implemented | Non-atomic write sequence (H5) |
| Finance — Salary Accounting | Implemented | Same non-atomic pattern |
| Finance — Daily Closing | Implemented | Deliberately non-locking (M6) |
| Server-side authentication/sessions | **Not implemented** | The single largest gap in the system (C1/C2) |
| Payment gateway integration | **Not implemented (by design)** | Payment methods are labels only (Section 26) |
| Automated email retry / cron | **Not implemented** | Manual flush only (Section 24) |
| Config centralization (ENV/Admin/Default) | Partially implemented | Real for restaurant name (4 surfaces); not for restaurant ID or fully for kitchen_mode (Section 27) |

---

## 43. End-to-End Business Flow

A representative dine-in flow, traced through the confirmed code paths documented above, start to finish:

1. **Customer scans a table QR code** (generated by `/qr`, encoding `?table=<id>`) → lands on `/table?table=<id>` → enters name, a 4-digit session PIN, optional contact info → a `customer_tabs` row is created for this individual diner and a `fl_device_id` is bound to it via `tab_devices` for later session recovery (Section 5).
2. **Customer browses the shared `menu_items` catalog** (fetched once, 60s edge-cached, Section 30) and builds a cart; placing an order calls the order-creation path with the tab ID set. If an `awaiting_waiter` order already exists on the tab, items merge into it rather than creating a second order (Section 5).
3. **The new/merged order sits at `awaiting_waiter`** (Section 4) until a waiter, seeing it in the Waiter Station, chooses "Confirm & Print KOT" or "Confirm & Send to Kitchen" (Section 8) — routing it to `preparing` and, depending on the restaurant's kitchen-routing mode (Section 27/M1), either queuing a `print_jobs` row for the physical print-agent (Section 9) or making it appear on the Kitchen Display (Section 9).
4. **Kitchen staff advance the order** through `prepared` as items are cooked, using the per-item or whole-order advance buttons (subject to the confirmed item-index risk, H3).
5. **A waiter marks the order `served`** once food reaches the table (Section 8); the customer sees a "Did you receive your food?" confirmation prompt on their next 3-second poll of the Table portal (no realtime push reaches this page, Section 23).
6. **The customer requests the bill**; a manager opens the tab in the Billing board, applies any discount/split-billing, and executes Close Tab — a server-authoritative operation that recomputes the total from every non-void order on the tab, attempts reward-coupon redemption (broken for this dine-in path specifically, C4), marks every order `completed`, frees the table, and fires a receipt email plus a Spin & Win invite (Section 5).
7. **If the customer received a Spin & Win invite** and follows the emailed link, `/spin` re-verifies eligibility server-side (Section 25), and a win becomes a `reward_coupons` row usable on a future order.
8. **Throughout this entire flow, essentially none of the API calls involved required any credential** (Section 19) — the only PIN-gated actions anywhere in this sequence are the waiter/kitchen/manager login screens themselves (client-side-checked, Section 20), not the underlying order/tab/kitchen mutation endpoints those UIs call.
9. **On the Finance side**, once this tab closes, its total becomes part of the next `computeSystemSales()` call for that date (Section 13) and, if a manager or admin ever posts a corresponding vendor purchase or salary payment for costs related to serving that customer, those flow through the separate Finance ledger (Sections 15–16) — entirely independently of the order/tab data, connected only by falling within the same date range at reporting time.

---

## 44. Production-Readiness Assessment

**This codebase is a functionally rich, actively-developed restaurant operations system with a genuinely capable feature set** — ten portals, a real (if unevenly authenticated) API surface, a properly-locked reward-allocation function, and a Finance module that gets its own authorization model right where the rest of the app does not. It is not a toy or a prototype in terms of scope.

**It is not production-ready from a security standpoint as it stands**, and this is the single most important conclusion of this audit: roughly 70% of API routes (Section 19) have no authentication at all, RLS is configured to enforce nothing (Section 19), and the one credential that does exist (the shared Admin PIN) is transmitted in ways that make it easy to intercept even where it is checked (Section 20). Any deployment of this application reachable from the public internet as-is should be treated as fully open to anyone who discovers its URL, regardless of what any login screen suggests. This is not a hypothetical risk assessment — it is a direct, quantified reading of the code (54/77 unauthenticated routes, 43/43 permissive RLS policies).

**It has at least one confirmed, currently-active money-correctness bug** (C4, the dine-in coupon redemption mismatch) and one confirmed duplicate-order risk under real-world network conditions (C5) — both of which would surface in ordinary operation, not just under adversarial conditions.

**Financial data integrity has some real strengths** (Finance's genuine PIN-gating, `perform_spin()`'s row-level locking, the historical-rate-preservation pattern in salary config) and some real gaps (client-computed account balances with no server-side check, non-atomic vendor/salary write sequences, order deletion that doesn't clean up or flag related Finance rows).

**This audit could not obtain a completed build/typecheck/lint result** (Section 40) in this session's execution environment, so it cannot independently certify that the project compiles cleanly today — that check should be run directly by the user or in a proper CI environment before any deployment decision, separate from and in addition to the security items above.

**A pragmatic path to production**, in priority order suggested by this audit's own severity ranking: (1) add server-side session verification to at least the mutating routes, starting with `/api/settings`, `/api/staff/**`, `/api/orders/[id]` PATCH, and `/api/tabs/[id]` PATCH; (2) fix the dine-in coupon column mismatch (C4) — a single-file change; (3) add the missing idempotency check in `lib/sync-engine.ts` and `POST /api/orders` (C5); (4) require the tracking token server-side in `GET /api/orders/[id]` (C6); (5) get one clean `npm run build` in an environment that can actually run it to completion. None of these five are large undertakings individually — the codebase's overall structure (clean separation of API routes, a real state machine, a working realtime layer) is sound enough to support fixing them without a rewrite.

---

## 45. Executive Summary

Foodie Lover is a ten-portal, single-restaurant operations app (online/table/track/spin ordering surfaces for customers; kitchen/waiter/delivery/manager/admin surfaces for staff) built on Next.js + Supabase, with a genuinely capable feature set including a real order state machine, a server-locked reward-spin function, live realtime updates for staff portals, and — added most recently — a Finance module covering system sales, cash/bank account balances, vendor accounting, salary accounting, and daily closing, all correctly gated behind the shared Admin PIN.

This audit, conducted from scratch against commit `618a9a7` on a clean working tree, found that **the application's single largest problem is authentication**: about 70% of its 77 API routes have no server-side credential check whatsoever, and Row Level Security — enabled on every one of its 33 tables — is configured everywhere to allow every operation, providing no backstop. This is not new: it is the same finding the predecessor document raised, now precisely quantified and independently reconfirmed. All six of that predecessor document's top-priority issues, and every specific technical claim independently re-verified in this pass, remain unfixed in the current code, including one live money-correctness bug (dine-in reward coupons never actually get their discount deducted, due to a column-name mismatch) and one duplicate-order risk in the offline-ordering path.

Configuration handling improved during this session's immediately-preceding task — a real ENV>Admin>Default resolver now correctly centralizes the restaurant name across four surfaces — but that centralization did not extend to the restaurant ID (still hand-duplicated in 29 files) or fully to the kitchen-routing mode (two parallel implementations that happen to agree today).

This session was unable to obtain a completed `npm run build` in its execution environment despite five attempts, so build health could not be independently certified either way; the one available signal (a uniform, file-independent TypeScript error across every generated route type) points toward a tooling/version issue rather than an application bug, but that is an inference, not a confirmed result.

**Bottom line:** the feature set is real and the code is generally well-structured, but this application should not be considered production-ready for a deployment reachable by the public internet until server-side authentication is added to its mutating and PII-bearing routes — everything else in this document is secondary to that one finding.

---

## 46. Environment / Configuration Summary

15 application-level environment variables in active use (Section 28): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (highest sensitivity — bypasses RLS entirely, though RLS enforces nothing anyway), `NEXT_PUBLIC_RESTAURANT_ID`, `NEXT_PUBLIC_APP_URL`, `ADMIN_PIN`/`KITCHEN_PIN`/`MANAGER_PIN` (first-run seed only), `RESEND_API_KEY`, `FROM_EMAIL`, `GEMINI_API_KEY`, `PRINT_AGENT_KEY` (fails open if unset), `CRON_SECRET` (appears unused — no cron configuration found), `APP_ENV`, `NODE_ENV`; plus 7 print-agent-specific variables on the separate companion process (`PRINTER_TYPE`, `PRINTER_NAME`, `PRINTER_DEV`, `PRINTER_IP`, `PRINTER_PORT`, `PRINTER_CHARS_PER_LINE`, `PRINTER_STATION_ID`).

The centralized `lib/config-server.ts` resolver correctly implements ENV > Admin (`restaurant_settings`/`restaurants`) > Default precedence, and is genuinely wired for the restaurant display name across 4 surfaces (email, AI chat, rewards routes, spin page, restaurant-config route, init route, admin page, config diagnostics). It is not wired for the restaurant ID (29 files still hardcode `?? 'rest_default'` independently) and is bypassed by one hand-rolled duplicate implementation for `kitchen_mode` in the one route that actually matters most for that setting (the one Waiter/Kitchen polls). 13 files still hardcode the literal string `"Foodie Lover"` outside the resolver's reach. Full detail in Section 27.

---

## 47. Database / Migration Summary

33 tables, 43 RLS policies (all `USING (true) WITH CHECK (true)` — no exceptions found), across 23 SQL files (20 sequential numbered migrations, 2 dated files in a `migrations/` subdirectory, 1 consolidated `schema.sql`). No migration-tracking/applied-ledger table exists, so this document — and any future one — can only describe what the repository's SQL declares, never what has actually been run against a live Supabase project, absent direct database access. Core entities: `restaurants` → `staff`/`menu_items`/`tables`/`orders`/`customer_tabs`; orders fan out to `order_items`/`order_events`/`order_issues`/`order_feedback`/`print_jobs`; rewards span `spin_config`/`spin_rewards`/`spin_results`/`reward_coupons`; Finance's 10 tables (`finance_accounts`, `finance_categories`, `finance_transactions`, `finance_audit_log`, `vendors`, `vendor_purchases`, `vendor_payments`, `staff_salary_config`, `salary_payments`, `daily_finance_closings`) are the most recently added and the most consistently authorized. Full detail and ER diagram in Section 22; migration-status caveats in Section 41.

---

## 48. Finance Summary

Ten tables, 19 API routes, one shared UI component (`AdminFinance.tsx`), and — uniquely in this codebase — genuine, consistently-applied server-side PIN authorization on every route including GETs. System Sales is always computed live from `customer_tabs` (closed) + non-tab `orders` (completed), never stored except when frozen into a `daily_finance_closings` JSONB snapshot. Account balances are computed entirely client-side from opening balance + auto-matched system sales + manual ledger entries, with no server-computed figure to check the math against. Vendor and salary payments each intend to post a linked `finance_transactions` row as part of a non-atomic, sequential (not database-transactional) write, an explicitly-acknowledged tradeoff in the code's own comments. Daily closing is a soft, advisory snapshot that does not lock underlying data — a closed day can still be edited, surfaced only via a "Modified after closing" warning badge computed by diffing live totals against the frozen snapshot. Finance deliberately does not merge with the pre-existing Manager Expenses feature; it reads that table live for reporting but keeps its own separate category list. Full detail in Sections 12–18.

---

## 49. Security / Authentication Summary

No session layer exists anywhere in the application — no cookies, no JWTs, no middleware. "Login" is a client-side `localStorage` token with an 8-hour TTL, checked only by the page component, never by the API. Of 77 total API routes, 21 (all 19 Finance routes plus the two order-deletion danger-zone routes) perform real server-side PIN verification; 2 more (`print-jobs`) attempt a key check but fail open if unconfigured; the remaining 54 (≈70%) have no authentication mechanism at all. Every one of the 33 database tables has Row Level Security enabled, and every one of the 43 policies governing them is `USING (true) WITH CHECK (true)` — a universal allow-all, providing no defense-in-depth against the routes above. Every PIN in the system (Admin/Kitchen/Manager shared PINs, per-staff Waiter/Delivery PINs, Table-session PINs) is stored and compared as plaintext with no hashing; staff PINs are additionally sent to the browser in full for a client-side comparison via an unauthenticated GET. A single shared Admin PIN gates the entire Admin Dashboard, the entire Finance module, and both destructive order-deletion tools, with no separation of privilege between these very different levels of access. Order tracking data (name, phone, address, items) is returned by the server before any token check occurs, checked only in the browser afterward, and both order IDs and tracking tokens are generated from `Date.now() + Math.random()` rather than a cryptographically secure source. Full detail in Sections 19–20, and Critical findings C1–C6 in Section 36.

---

## 50. Appendix: Files Read For This Audit

This document was produced from a fresh repository snapshot (164 files: `app/`, `lib/`, `components/`, `supabase/`, `print-agent/`, `prisma/`, `package.json`, `tsconfig.json`, `next.config.ts`, `README.md`, `docs/`) pulled directly from the user's device at commit `618a9a7832b2365b173ece0a6fa3632023d1e115` on branch `main`, via nine parallel code-reading research passes (one per major subsystem: Admin, Manager, Table/QR, Track, Online, Spin, Kitchen, Waiter, Delivery, plus a dedicated pass over `lib/` core data-layer files and components), followed by direct re-verification in this final synthesis pass of every claim marked "Confirmed directly" above — specifically including full reads of: `app/api/orders/[id]/route.ts`, `app/api/orders/route.ts`, `app/api/orders/delete-selective/route.ts`, `app/api/settings/route.ts`, `app/api/staff/[id]/route.ts`, `app/api/tabs/[id]/route.ts`, `app/api/rewards/reserve-coupon/route.ts`, `app/api/print-jobs/route.ts`, `app/api/admin/restaurant-config/route.ts`, `app/api/admin/config-diagnostics/route.ts`, `app/table/page.tsx`, `app/manager/page.tsx`, `app/kitchen/page.tsx`, `lib/config-server.ts`, `lib/finance-server.ts`, `lib/supabase-server.ts`, `lib/auth.ts`, `lib/sync-engine.ts`, `lib/storage.ts`, `lib/realtime-client.ts`, `lib/email-server.ts`, all 23 SQL files under `supabase/` and `supabase/migrations/`, `print-agent/index.js`, `package.json`, and the prior reference document `docs/foodie-lover-reference.docx` (read in full, text-extracted, for the purpose of Section 37's recheck — not used as a source of truth for any claim about current behavior). Every `grep`/count reported in this document (route counts, policy counts, file-occurrence counts) was run directly against this snapshot during this session, not estimated.

**End of document.**
