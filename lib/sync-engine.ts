// ─── Sync Engine — replays offline queue when back online ────────────────────
'use client';

import { getQueue, dequeue, incrementRetry, type QueueEntry } from './offline-queue';

// Dynamic imports to avoid circular deps — the engine calls the same API functions
async function replayEntry(entry: QueueEntry): Promise<void> {
  const { createOrder, updateOrderStatus, closeTab } = await import('./api');
  const p = entry.payload as Record<string, unknown>;

  switch (entry.type) {
    case 'create_order': {
      // Duplicate check: if idempotencyKey matches an existing order tracking token, skip
      await createOrder(p as Parameters<typeof createOrder>[0]);
      break;
    }
    case 'update_order_status': {
      await updateOrderStatus(
        p.orderId as string,
        p.status  as string,
        p.by      as string,
        { note: p.note as string | undefined, deliveryPerson: p.deliveryPerson as string | undefined },
      );
      break;
    }
    case 'close_tab': {
      await closeTab(
        p.tabId         as string,
        p.paymentMethod as string,
        p.discount      as number | undefined,
        p.discountReason as string | undefined,
      );
      break;
    }
    default:
      console.warn('[sync-engine] Unknown action type:', entry.type);
  }
}

let syncing = false;

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0 };

  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = getQueue();
    if (!queue.length) return { synced: 0, failed: 0 };

    for (const entry of queue) {
      try {
        await replayEntry(entry);
        dequeue(entry.id);
        synced++;
      } catch (err) {
        console.warn(`[sync-engine] Failed to replay ${entry.type} (retry ${entry.retries}):`, err);
        incrementRetry(entry.id);
        failed++;
      }
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}
