# Waiter Confirmation + Printing Workflow

Replaces the live kitchen display with a waiter-driven confirmation step and
direct-to-printer Kitchen Order Tickets (KOTs).

## 1. Summary of the change

Previously: dine-in orders went `awaiting_waiter → pending → preparing → …`,
with kitchen staff watching `/kitchen` for new (`pending`) and in-progress
orders. Pickup/delivery orders skipped the waiter step entirely and started
at `pending`.

Now: **every** order (dine-in, pickup, delivery, online) starts at
`awaiting_waiter`. A waiter reviews it in the Waiter Station and either:

- **🖨️ Confirm & Print** — order moves to `preparing`, a KOT print job is
  queued and printed on the kitchen's thermal printer by the companion print
  agent, OR
- **🚫 Reject** — order moves to `cancelled` with a reason (e.g. item out of
  stock), before the kitchen ever sees it.

Once confirmed, the rest of the lifecycle (`preparing → prepared → served /
out_for_delivery → delivered/completed`) is **unchanged**.

`/kitchen` no longer shows a live order queue — it now displays a short
"retired" notice pointing staff to `/waiter`, and to the **🖨️ Reprint KOT**
button for printer issues.

## 2. Database changes (migration_010.sql)

Run `supabase/migration_010.sql` in the Supabase SQL editor. It is idempotent
(safe to re-run).

- `orders` gains: `confirmed_by`, `confirmed_at`, `rejected_by`,
  `rejected_at` (nullable — existing rows unaffected).
- New table `print_jobs` — the print agent's queue. Columns: `id`,
  `restaurant_id`, `order_id`, `job_type` (`kot`|`receipt`), `status`
  (`queued`|`printing`|`printed`|`failed`|`cancelled`), `printer_id`,
  `payload` (JSONB ticket data), `attempts`, `error`, `requested_by`,
  `is_reprint`, timestamps.
- No changes to `order_items`, `order_events`, `email_queue`,
  `order_issues`, `customer_tabs`, or any reporting views. `orders.status`
  has no CHECK constraint, so the existing `awaiting_waiter` value being used
  by more order types requires no schema change.

## 3. New order_events types

Existing audit trail (`order_events`) gains new `event_type` values, all
written through the same table used today:

| event_type        | Written when                                   |
|--------------------|-------------------------------------------------|
| `WaiterConfirmed`  | Waiter taps Confirm & Print                     |
| `PrintQueued`      | A KOT print job is created                      |
| `Printed`          | Print agent reports success                     |
| `PrintFailed`      | Print agent reports failure                     |
| `Reprinted`        | Waiter taps Reprint KOT                         |
| `WaiterRejected`   | Waiter rejects an order                         |

`statusToEvent('preparing')` still fires `'Preparing'` as before, so the
customer tracking page (`/track`) needs no changes — "Being Prepared" lights
up exactly when it used to (now triggered by Confirm & Print instead of the
kitchen tapping "Start Cooking").

## 4. API changes

### `POST /api/orders`
All new orders now start at `status: 'awaiting_waiter'` (previously only
dine-in did; pickup/delivery started at `pending`).

### `PATCH /api/orders/[id]`
Three new `action` values:

- `{ action: 'confirm_and_print', by }` — `awaiting_waiter`/`pending` →
  `preparing`, queues a `kot` print job, returns `printJobId`.
- `{ action: 'reject', by, reason }` — `awaiting_waiter`/`pending` →
  `cancelled`, sets `rejected_by`/`rejected_at`/`cancel_reason`.
- `{ action: 'reprint', by, jobType? }` — queues another print job
  (`kot` or `receipt`) for any non-cancelled/void order, returns
  `printJobId`. Does not change order status.

`VALID_TRANSITIONS['awaiting_waiter']` now allows `preparing` directly (in
addition to the existing `pending`/`cancelled`), for the confirm action and
for manual admin overrides.

### New: `GET /api/print-jobs` and `PATCH /api/print-jobs/[id]`
Used only by the companion print agent. Both require header
`x-print-agent-key: <PRINT_AGENT_KEY>`.

## 5. Environment variables

Add to the Next.js app's environment (Vercel project settings, `.env.local`):

```
PRINT_AGENT_KEY=<a long random string>
```

Add the **same value** to `print-agent/.env` on the print agent machine.

## 6. Waiter portal changes

`/waiter` — the `awaiting_waiter`/`pending` order cards now show:

- **🖨️ Confirm & Print** (primary action) — confirms + queues KOT.
- **🚫 Reject** — opens a reason field, then rejects the order.

Confirmed orders (`preparing`/`prepared`/`served`) show **🖨️ Reprint KOT**
for reprinting after a printer issue. `preparing`/`prepared` orders also keep
a **❌ Cancel Order** option (separate from Reject, which is only for
not-yet-confirmed orders).

## 7. Printing architecture

```
Waiter taps Confirm & Print
   → orders.status = 'preparing', confirmed_by/at set
   → INSERT print_jobs (status='queued', job_type='kot', payload={order snapshot})
   → order_events: WaiterConfirmed, Preparing, PrintQueued

Companion print agent (runs on restaurant LAN, print-agent/)
   → polls GET /api/print-jobs every ~4s
   → renders ESC/POS 80mm ticket from payload
   → sends raw bytes to printer over TCP port 9100
   → PATCH /api/print-jobs/[id] { status: 'printed' | 'failed', error? }
   → order_events: Printed | PrintFailed
```

See `print-agent/README.md` for full setup, multi-printer routing, and the
ESC/POS ticket layout.

## 8. Printer integration strategy

- **Recommended**: any 80mm ESC/POS thermal printer with Ethernet/Wi-Fi,
  raw "9100" port support (Epson TM-T20III, TM-T81, TM-T88, Xprinter
  XP-Q80x, etc). Give it a static IP.
- The print agent is a small always-on Node process on a LAN PC/Pi —
  no cloud printing service or browser print dialog involved.
- For multiple stations (e.g. kitchen + bar), run one agent instance per
  printer with different `PRINTER_STATION_ID`/`PRINTER_IP`, and extend the
  confirm handler to insert one `print_jobs` row per `printer_id` (see
  print-agent README "Multi-printer setups").

## 9. Notifications / email

No changes to `lib/email-server.ts`. Order confirmation emails still send on
order creation (any status); "ready" and receipt emails still trigger on
`prepared`/`completed`/`delivered` exactly as before.

`/track` adds one new message for the `awaiting_waiter` state across **all**
order types: *"Order received — confirming with the restaurant…"* (previously
this state only existed for dine-in and showed nothing).

## 10. Testing checklist

- [ ] Run `migration_010.sql` against a staging Supabase project; verify
      `print_jobs` table and new `orders` columns exist.
- [ ] Place a dine-in order from `/table` → confirm it lands in
      `awaiting_waiter` and appears in the Waiter Station's Active list.
- [ ] Place a pickup order from `/online` → confirm it now starts at
      `awaiting_waiter` (previously `pending`) and appears in Waiter Station.
- [ ] Place a delivery order → same check.
- [ ] Tap **Confirm & Print** → order moves to `preparing`; a row appears in
      `print_jobs` with `status='queued'`; `/track` shows "Being Prepared".
- [ ] Start `print-agent` (`npm run test-print` first to verify printer
      connectivity, then `npm start`) → confirm the queued job is printed and
      `print_jobs.status` becomes `printed`; `order_events` gets `Printed`.
- [ ] Tap **Reject** with a reason on an `awaiting_waiter` order → order
      becomes `cancelled`, `cancel_reason`/`rejected_by`/`rejected_at` set,
      order disappears from the active queue, customer tracking shows
      "Order Cancelled".
- [ ] Tap **Reprint KOT** on a `preparing` order → new `print_jobs` row with
      `is_reprint=true`; agent prints a second ticket.
- [ ] Disconnect the printer, queue a confirm → job ends up `status='failed'`
      with an `error` message; `order_events` gets `PrintFailed`; order
      remains `preparing` (kitchen workflow not blocked).
- [ ] Reconnect printer, tap Reprint → job prints successfully.
- [ ] Verify `/kitchen` shows the retirement notice and links to `/waiter`
      (still requires kitchen PIN login).
- [ ] Verify `/admin` analytics/reporting numbers (today's revenue, order
      counts, issue rate) are unchanged in shape — they already excluded only
      `cancelled` orders.
- [ ] Verify existing `pending`-status orders (created before this change, if
      any) still appear correctly and can be confirmed via Confirm & Print
      (transition `pending → preparing` is allowed).

## 11. Failure recovery

| Scenario | Behavior |
|---|---|
| Printer offline when waiter confirms | Order still moves to `preparing` normally (printing is a side effect, not a gate). `print_jobs` row stays `queued`/`failed`; print agent retries automatically up to `MAX_ATTEMPTS` (default 5). |
| Printer runs out of paper mid-job | Print agent reports `failed` with the TCP error; waiter can tap **Reprint KOT** any time to queue a fresh job. |
| Print agent process down | Jobs simply queue up in `print_jobs` (`status='queued'`) until the agent restarts and catches up — no data loss. |
| Waiter double-taps Confirm & Print | First tap moves status to `preparing`; the second tap's `confirm_and_print` action returns a 409 (`Cannot confirm an order in status "preparing"`) — no duplicate print job from a clean double-click within the same render, but a true double network request could still queue two jobs. If this proves to be an issue in practice, add a short client-side debounce (the portal already disables the button via `actionBusy` while a request is in flight). |
| Waiter rejects an order that was already confirmed | `reject` action returns 409 — rejection is only allowed from `awaiting_waiter`/`pending`. |
| Reprint requested for a cancelled/void order | `reprint` action returns 409. |

## 12. Impact analysis — what was NOT changed

- **Reporting/analytics** (`/api/analytics`, `/admin` dashboards): unchanged
  query logic; only excludes `cancelled` orders, same as before.
- **`order_events` audit trail**: append-only, new event types added, no
  existing rows or event types modified.
- **Email queue / receipts** (`email_queue`, `order_issues`): untouched.
- **Customer tracking** (`/track`): existing steps/timeline mapping
  untouched; one new informational message added for the
  `awaiting_waiter` state.
- **Manager, table, delivery portals**: all already filtered on
  `['awaiting_waiter', 'pending', ...]` for "active" orders, so they continue
  to work without changes.
- **Existing in-flight `pending` orders** (created before this migration):
  remain valid — `pending` is still a known status and
  `awaiting_waiter`/`pending → preparing` via Confirm & Print both work.
