#!/usr/bin/env node
// ─── Foodie Lover — Companion Print Agent ────────────────────────────────────
// Polls GET /api/print-jobs for queued KOT/receipt jobs, renders an ESC/POS
// 80mm ticket, sends it to a network thermal printer (port 9100), and reports
// the result back via PATCH /api/print-jobs/[id].
//
// Run on a machine on the same LAN as the kitchen printer (e.g. a small
// PC/Raspberry Pi at the restaurant). See README.md for setup.

require('dotenv').config();
const net = require('net');

const {
  APP_BASE_URL,
  RESTAURANT_ID = 'rest_default',
  PRINT_AGENT_KEY,
  POLL_INTERVAL_MS = '4000',
  PRINTER_IP,
  PRINTER_PORT = '9100',
  PRINTER_CHARS_PER_LINE = '42',
  PRINTER_STATION_ID = 'default',
  RESTAURANT_NAME = 'Foodie Lover',
  MAX_ATTEMPTS = '5',
} = process.env;

if (!APP_BASE_URL) {
  console.error('FATAL: APP_BASE_URL is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}
if (!PRINTER_IP) {
  console.error('FATAL: PRINTER_IP is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}

const CHARS = parseInt(PRINTER_CHARS_PER_LINE, 10) || 42;
const POLL_MS = parseInt(POLL_INTERVAL_MS, 10) || 4000;
const ATTEMPT_CAP = parseInt(MAX_ATTEMPTS, 10) || 5;

// ── ESC/POS byte helpers ──────────────────────────────────────────────────────
const ESC = 0x1b, GS = 0x1d;
const CMD = {
  INIT:        Buffer.from([ESC, 0x40]),
  BOLD_ON:     Buffer.from([ESC, 0x45, 1]),
  BOLD_OFF:    Buffer.from([ESC, 0x45, 0]),
  ALIGN_LEFT:  Buffer.from([ESC, 0x61, 0]),
  ALIGN_CENTER:Buffer.from([ESC, 0x61, 1]),
  DOUBLE_ON:   Buffer.from([GS, 0x21, 0x11]), // double width + height
  DOUBLE_OFF:  Buffer.from([GS, 0x21, 0x00]),
  CUT:         Buffer.from([GS, 0x56, 0x42, 0x00]), // partial cut + feed
  FEED:        (n) => Buffer.from([ESC, 0x64, n]),
};

function line(text = '') {
  return Buffer.concat([Buffer.from(text, 'utf8'), Buffer.from('\n')]);
}
function divider(ch = '-') {
  return line(ch.repeat(CHARS));
}
// Two-column row: left-aligned label, right-aligned value (e.g. "Cheese Pizza   x2")
function row(left, right) {
  const space = Math.max(1, CHARS - left.length - right.length);
  return line(left + ' '.repeat(space) + right);
}

// ── Ticket builders ────────────────────────────────────────────────────────────
function buildKot(payload) {
  const parts = [CMD.INIT, CMD.ALIGN_CENTER, CMD.DOUBLE_ON];
  parts.push(line('KITCHEN ORDER TICKET'));
  parts.push(CMD.DOUBLE_OFF);
  parts.push(CMD.BOLD_ON);
  parts.push(line(`#${payload.orderNumber ?? payload.orderId}`));
  parts.push(CMD.BOLD_OFF);
  parts.push(CMD.ALIGN_LEFT);
  parts.push(divider('='));

  const typeLabel =
    payload.type === 'delivery' ? 'DELIVERY' :
    payload.type === 'pickup'   ? 'PICKUP'   : 'DINE-IN';
  parts.push(line(`Type:  ${typeLabel}`));
  if (payload.tableId)        parts.push(line(`Table: ${payload.tableId}`));
  if (payload.customerName)   parts.push(line(`Guest: ${payload.customerName}`));
  if (payload.deliveryAddress) {
    parts.push(line(`Addr:  ${String(payload.deliveryAddress).slice(0, CHARS - 7)}`));
  }
  parts.push(line(`Time:  ${new Date(payload.createdAt ?? Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}`));
  parts.push(divider('='));

  parts.push(CMD.BOLD_ON);
  for (const item of payload.items ?? []) {
    parts.push(row(String(item.name).slice(0, CHARS - 6), `x${item.qty}`));
  }
  parts.push(CMD.BOLD_OFF);
  parts.push(divider('='));

  if (payload.notes) {
    parts.push(line(`Note: ${payload.notes}`));
    parts.push(divider('-'));
  }

  parts.push(CMD.ALIGN_CENTER);
  parts.push(line('--- Send to kitchen ---'));
  parts.push(CMD.FEED(3));
  parts.push(CMD.CUT);
  return Buffer.concat(parts);
}

function buildReceipt(payload) {
  const parts = [CMD.INIT, CMD.ALIGN_CENTER, CMD.DOUBLE_ON];
  parts.push(line(RESTAURANT_NAME));
  parts.push(CMD.DOUBLE_OFF);
  parts.push(line('Order Receipt'));
  parts.push(CMD.ALIGN_LEFT);
  parts.push(divider('='));
  parts.push(line(`Order #${payload.orderNumber ?? payload.orderId}`));
  if (payload.customerName) parts.push(line(`Guest: ${payload.customerName}`));
  parts.push(divider('-'));
  for (const item of payload.items ?? []) {
    parts.push(row(String(item.name).slice(0, CHARS - 6), `x${item.qty}`));
  }
  parts.push(divider('='));
  parts.push(CMD.ALIGN_CENTER);
  parts.push(line('Thank you for visiting!'));
  parts.push(CMD.FEED(3));
  parts.push(CMD.CUT);
  return Buffer.concat(parts);
}

// ── Printer I/O ────────────────────────────────────────────────────────────────
function printToNetworkPrinter(buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: PRINTER_IP, port: parseInt(PRINTER_PORT, 10) || 9100 });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Printer connection timed out (${PRINTER_IP}:${PRINTER_PORT})`));
    }, 8000);

    socket.on('connect', () => {
      socket.write(buffer, (err) => {
        if (err) { clearTimeout(timeout); socket.destroy(); return reject(err); }
        socket.end();
      });
    });
    socket.on('close', () => { clearTimeout(timeout); resolve(); });
    socket.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

// ── API helpers ────────────────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${APP_BASE_URL}${path}`, {
    headers: { 'x-print-agent-key': PRINT_AGENT_KEY ?? '' },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${APP_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-print-agent-key': PRINT_AGENT_KEY ?? '' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Main poll loop ────────────────────────────────────────────────────────────
async function processJob(job) {
  console.log(`[print-agent] Job ${job.id} (${job.job_type}) for order ${job.order_id} — printing...`);
  try {
    await apiPatch(`/api/print-jobs/${job.id}`, { status: 'printing' });

    const ticket = job.job_type === 'receipt' ? buildReceipt(job.payload) : buildKot(job.payload);
    await printToNetworkPrinter(ticket);

    await apiPatch(`/api/print-jobs/${job.id}`, { status: 'printed' });
    console.log(`[print-agent] Job ${job.id} printed OK`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[print-agent] Job ${job.id} FAILED: ${msg}`);
    if ((job.attempts ?? 0) + 1 >= ATTEMPT_CAP) {
      console.error(`[print-agent] Job ${job.id} reached max attempts (${ATTEMPT_CAP}) — marking failed permanently.`);
    }
    try {
      await apiPatch(`/api/print-jobs/${job.id}`, { status: 'failed', error: msg });
    } catch (patchErr) {
      console.error(`[print-agent] Could not report failure for job ${job.id}:`, patchErr);
    }
  }
}

async function pollOnce() {
  const params = new URLSearchParams({
    restaurantId: RESTAURANT_ID,
    printerId:    PRINTER_STATION_ID,
    limit:        '20',
  });
  const jobs = await apiGet(`/api/print-jobs?${params}`);
  for (const job of jobs) {
    if ((job.attempts ?? 0) >= ATTEMPT_CAP) continue; // skip permanently-failed jobs
    await processJob(job);
  }
}

async function main() {
  if (process.argv.includes('--test-print')) {
    console.log(`[print-agent] Sending test ticket to ${PRINTER_IP}:${PRINTER_PORT}...`);
    const testPayload = {
      orderId: 'TEST', orderNumber: 0, type: 'dine-in', tableId: 'T01',
      customerName: 'Test Order', createdAt: new Date().toISOString(),
      items: [{ name: 'Test Item', qty: 1 }],
      notes: 'This is a test print from the Foodie Lover print agent.',
    };
    await printToNetworkPrinter(buildKot(testPayload));
    console.log('[print-agent] Test ticket sent.');
    return;
  }

  console.log(`[print-agent] Starting. Polling ${APP_BASE_URL}/api/print-jobs every ${POLL_MS}ms`);
  console.log(`[print-agent] Printer target: ${PRINTER_IP}:${PRINTER_PORT} (station "${PRINTER_STATION_ID}")`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await pollOnce();
    } catch (err) {
      console.error('[print-agent] poll error:', err instanceof Error ? err.message : err);
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
}

main();
