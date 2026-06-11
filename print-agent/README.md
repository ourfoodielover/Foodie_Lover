# Foodie Lover — Companion Print Agent

A small Node.js process that runs **on the restaurant's local network** and
turns confirmed orders into printed Kitchen Order Tickets (KOTs) on a
standard 80mm ESC/POS thermal printer.

## How it fits in

```
Customer / Waiter            Foodie Lover (Vercel/Next.js + Supabase)             Print Agent (LAN)            Printer
        |                              |                                                  |                       |
        |-- place order -------------->|  status = awaiting_waiter                       |                       |
        |                              |                                                  |                       |
  Waiter taps "Confirm & Print" ------>|  status = preparing                             |                       |
        |                              |  INSERT print_jobs (status=queued, payload=KOT) |                       |
        |                              |<--- GET /api/print-jobs (poll every ~4s) -------|                       |
        |                              |---- [job] -------------------------------------->|                       |
        |                              |                                                  |-- ESC/POS bytes ----->|
        |                              |<--- PATCH /api/print-jobs/:id {status:printed} -|                       |
```

No kitchen display is involved. The printed ticket on the kitchen counter
**is** the kitchen's queue.

## Requirements

- Node.js 18+ running on a PC, mini-PC, or Raspberry Pi connected to the
  same LAN as the kitchen printer.
- A network (Ethernet/Wi-Fi) ESC/POS thermal printer — e.g. Epson TM-T20III,
  TM-T81, TM-T88, or any compatible 80mm printer listening on TCP port 9100
  (the standard "raw 9100" / JetDirect port most thermal printers support
  out of the box).
- The Foodie Lover app deployed and reachable from this machine
  (`APP_BASE_URL`).

## Setup

```bash
cd print-agent
npm install
cp .env.example .env
# edit .env: set APP_BASE_URL, PRINT_AGENT_KEY, PRINTER_IP, etc.
```

`PRINT_AGENT_KEY` must match the `PRINT_AGENT_KEY` environment variable set
on the Foodie Lover server (Vercel project settings). This is a simple
shared-secret check — anyone with this key can read/update print jobs, so
treat it like a password and don't commit `.env`.

### Find your printer's IP

Most network thermal printers print a "self-test" page (hold the feed button
while powering on) that shows the current IP address. Make sure the printer
has a **static IP** (set via its config page or your router's DHCP
reservations) so it doesn't change after a power cycle.

### Test the printer connection

```bash
npm run test-print
```

This sends a sample KOT directly to the printer without touching the API —
useful for verifying `PRINTER_IP`/`PRINTER_PORT` and paper width before
going live.

### Run

```bash
npm start
```

Leave this running. For production, run it under a process manager so it
restarts automatically:

- **Linux (systemd)**: create `/etc/systemd/system/foodie-print-agent.service`
  with `ExecStart=/usr/bin/node /path/to/print-agent/index.js`,
  `Restart=always`, then `systemctl enable --now foodie-print-agent`.
- **Windows**: use [NSSM](https://nssm.cc/) or Task Scheduler with
  "run at startup" + "restart on failure".
- **Any OS**: [`pm2`](https://pm2.keymetrics.io/) — `pm2 start index.js
  --name foodie-print-agent && pm2 save && pm2 startup`.

## Multi-printer setups

If you have separate printers for, say, the main kitchen and a bar/dessert
station:

1. Run one instance of this agent per printer (different `.env` files /
   working directories), each with a different `PRINTER_STATION_ID` and
   `PRINTER_IP`.
2. Currently every KOT is queued with `printer_id = 'default'`. To route
   tickets to specific stations, extend the "Confirm & Print" handler in
   `app/api/orders/[id]/route.ts` to insert one `print_jobs` row per station
   (e.g. by grouping `order_items` by category) with the matching
   `printer_id`.

## Failure handling

- If the printer is unreachable, the job is marked `failed` with the error
  message, and an `order_events` row (`PrintFailed`) is recorded for the
  audit trail.
- Failed jobs are retried automatically on the next poll, up to
  `MAX_ATTEMPTS` (default 5). After that they're left in `failed` state.
- Waiters can always tap **🖨️ Reprint KOT** in the waiter portal to queue a
  fresh job — useful after fixing a paper jam or printer outage.
- The order's status and the customer's tracking page are **not** affected
  by print failures — printing is a side-effect of confirmation, not a
  blocker for the kitchen workflow.

## Ticket format

Tickets are 80mm / 42-character ESC/POS text tickets (see `index.js` for the
exact layout). Adjust `PRINTER_CHARS_PER_LINE` in `.env` if your printer uses
a different default font width (e.g. 32 for 58mm paper, 48 for condensed
font on 80mm).
