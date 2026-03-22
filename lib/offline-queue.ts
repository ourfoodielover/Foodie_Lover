// ─── Offline Queue — persists failed API calls in localStorage ───────────────
// Key: fl_offline_queue
// Used by safe-api.ts and sync-engine.ts
'use client';

export interface QueueEntry {
  id:        string;    // unique: oq_<timestamp>_<random>
  type:      string;    // 'create_order' | 'update_order_status' | 'close_tab' etc.
  payload:   unknown;   // data to replay
  timestamp: number;    // ms since epoch
  retries:   number;    // retry count (max 5)
  idempotencyKey?: string; // to prevent duplicate DB writes
}

const QUEUE_KEY = 'fl_offline_queue';
const MAX_RETRIES = 5;

function safeRead(): QueueEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function safeWrite(queue: QueueEntry[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* storage full */ }
}

export function getQueue(): QueueEntry[] {
  return safeRead();
}

export function enqueue(type: string, payload: unknown, idempotencyKey?: string): QueueEntry {
  const entry: QueueEntry = {
    id:        `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries:   0,
    idempotencyKey,
  };
  const queue = safeRead();
  // Prevent duplicate idempotency keys
  if (idempotencyKey && queue.some(e => e.idempotencyKey === idempotencyKey)) {
    return entry; // already queued
  }
  queue.push(entry);
  safeWrite(queue);
  return entry;
}

export function dequeue(id: string): void {
  safeWrite(safeRead().filter(e => e.id !== id));
}

export function incrementRetry(id: string): void {
  const queue = safeRead().map(e =>
    e.id === id ? { ...e, retries: e.retries + 1 } : e
  );
  // Auto-remove entries that exceeded max retries
  safeWrite(queue.filter(e => e.retries <= MAX_RETRIES));
}

export function clearQueue(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(QUEUE_KEY);
}

export function getQueueCount(): number {
  return safeRead().length;
}
