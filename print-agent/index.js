#!/usr/bin/env node
// ─── Foodie Lover — Companion Print Agent ────────────────────────────────────
// Polls GET /api/print-jobs for queued KOT/receipt jobs, renders an ESC/POS
// 80mm ticket, and sends it to the printer. Two connection modes:
//
//   PRINTER_TYPE=usb     (default) — USB cable from this laptop/PC to the printer
//   PRINTER_TYPE=network           — LAN/Wi-Fi via TCP port 9100
//
// Run on the laptop or PC that has the printer plugged in. See README.md.

require('dotenv').config();
const net              = require('net');
const os               = require('os');
const fs               = require('fs');
const nodePath         = require('path');
const { execFileSync } = require('child_process');

const {
  APP_BASE_URL,
  RESTAURANT_ID    = 'rest_default',
  PRINT_AGENT_KEY,
  POLL_INTERVAL_MS = '4000',
  PRINTER_TYPE     = 'usb',          // 'usb' or 'network'
  // USB mode
  PRINTER_NAME     = '',             // Windows: exact name from Devices & Printers
  PRINTER_DEV      = '/dev/usb/lp0', // Linux/Mac: USB device path
  // Network mode
  PRINTER_IP,
  PRINTER_PORT     = '9100',
  // Common
  PRINTER_CHARS_PER_LINE = '42',
  PRINTER_STATION_ID     = 'default',
  RESTAURANT_NAME        = 'Foodie Lover',
  MAX_ATTEMPTS           = '5',
} = process.env;

if (!APP_BASE_URL) {
  console.error('FATAL: APP_BASE_URL is not set. Copy .env.example to .env and configure it.');
  process.exit(1);
}
if (PRINTER_TYPE === 'network' && !PRINTER_IP) {
  console.error('FATAL: PRINTER_TYPE=network but PRINTER_IP is not set.');
  process.exit(1);
}
if (PRINTER_TYPE === 'usb' && os.platform() === 'win32' && !PRINTER_NAME) {
  console.error('FATAL: PRINTER_TYPE=usb on Windows requires PRINTER_NAME.');
  console.error('  Open "Devices & Printers", right-click your thermal printer → Printer Properties, and copy the exact name.');
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

/** Send raw ESC/POS buffer to the printer, using whichever connection mode is configured. */
function printBuffer(buffer) {
  if (PRINTER_TYPE === 'network') return printViaNetwork(buffer);
  return printViaUSB(buffer);
}

/** TCP/network mode — printer must have Ethernet/Wi-Fi and raw port 9100. */
function printViaNetwork(buffer) {
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

// ── Windows raw-print script (Winspool.Drv P/Invoke via PowerShell) ──────────
// Sends a binary ESC/POS file to a named Windows printer with datatype=RAW.
// Parameters: -PrinterName <string>  -DataFile <path>
// No native addons — works on any Node.js version; PowerShell is built into Windows 10/11.
const WIN_PRINT_PS1 = `
param([string]$PrinterName, [string]$DataFile)

$bytes = [System.IO.File]::ReadAllBytes($DataFile)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinPrint {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA",     SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint="ClosePrinter",     SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern Int32 StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter",    SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter",   SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="WritePrinter",     SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
}
"@

$hPrinter = [IntPtr]::Zero
if (-not [WinPrint]::OpenPrinter($PrinterName, [ref]$hPrinter, [IntPtr]::Zero)) {
    throw "OpenPrinter('$PrinterName') failed — verify PRINTER_NAME in .env matches Windows Devices and Printers exactly."
}

$doc = New-Object WinPrint+DOCINFOA
$doc.pDocName    = 'FL-PRINT'
$doc.pOutputFile = $null
$doc.pDataType   = 'RAW'

$jobId = [WinPrint]::StartDocPrinter($hPrinter, 1, $doc)
if ($jobId -le 0) {
    [WinPrint]::ClosePrinter($hPrinter)
    throw "StartDocPrinter failed"
}

[WinPrint]::StartPagePrinter($hPrinter) | Out-Null

$ptr     = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
$written = 0
[System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $ptr, $bytes.Length)
[WinPrint]::WritePrinter($hPrinter, $ptr, $bytes.Length, [ref]$written) | Out-Null
[System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)

[WinPrint]::EndPagePrinter($hPrinter)  | Out-Null
[WinPrint]::EndDocPrinter($hPrinter)   | Out-Null
[WinPrint]::ClosePrinter($hPrinter)    | Out-Null

Write-Host "Sent $written of $($bytes.Length) bytes to '$PrinterName' (job $jobId)"
`;

/** USB mode — printer is physically connected to this machine via USB cable. */
async function printViaUSB(buffer) {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: send raw ESC/POS bytes via Winspool.Drv P/Invoke through PowerShell.
    // No native addon or build tools required — works on any Node.js version.
    // PRINTER_NAME must match the name exactly as shown in Windows Devices & Printers.
    const tmpBin = nodePath.join(os.tmpdir(), `fl-escpos-${process.pid}-${Date.now()}.bin`);
    const tmpPs1 = nodePath.join(os.tmpdir(), `fl-print-${process.pid}-${Date.now()}.ps1`);
    try {
      fs.writeFileSync(tmpBin, buffer);
      fs.writeFileSync(tmpPs1, WIN_PRINT_PS1, 'utf8');
      try {
        execFileSync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy', 'Bypass',
          '-File', tmpPs1,
          '-PrinterName', PRINTER_NAME,
          '-DataFile', tmpBin,
        ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
      } catch (err) {
        const detail = (err.stderr && err.stderr.length)
          ? err.stderr.toString().trim()
          : err.message;
        throw new Error(`Windows print failed: ${detail}`);
      }
    } finally {
      for (const f of [tmpBin, tmpPs1]) {
        try { fs.unlinkSync(f); } catch { /* ignore cleanup errors */ }
      }
    }

  } else {
    // Linux / Mac: write raw bytes directly to the USB device file.
    // Default is /dev/usb/lp0 — check `ls /dev/usb/` if that doesn't work.
    // On Mac with USB: the device may appear as /dev/cu.usbmodem* or similar.
    // On Linux you may need: sudo chmod a+rw /dev/usb/lp0  (or add user to 'lp' group)
    fs.writeFileSync(PRINTER_DEV, buffer);
  }
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
    await printBuffer(ticket);

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
    const target = PRINTER_TYPE === 'network'
      ? `${PRINTER_IP}:${PRINTER_PORT} (network)`
      : os.platform() === 'win32'
        ? `"${PRINTER_NAME}" (USB/Windows)`
        : `${PRINTER_DEV} (USB/Linux)`;
    console.log(`[print-agent] Sending test ticket to ${target}...`);
    const testPayload = {
      orderId: 'TEST', orderNumber: 0, type: 'dine-in', tableId: 'T01',
      customerName: 'Test Order', createdAt: new Date().toISOString(),
      items: [{ name: 'Chicken Burger', qty: 2 }, { name: 'Fries (Large)', qty: 1 }],
      notes: 'Test print from Foodie Lover print agent.',
    };
    await printBuffer(buildKot(testPayload));
    console.log('[print-agent] Test ticket sent OK.');
    return;
  }

  const target = PRINTER_TYPE === 'network'
    ? `${PRINTER_IP}:${PRINTER_PORT}`
    : os.platform() === 'win32' ? `USB → "${PRINTER_NAME}"` : `USB → ${PRINTER_DEV}`;
  console.log(`[print-agent] Starting. Polling ${APP_BASE_URL}/api/print-jobs every ${POLL_MS}ms`);
  console.log(`[print-agent] Printer: ${target} (mode=${PRINTER_TYPE}, station="${PRINTER_STATION_ID}")`);

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
