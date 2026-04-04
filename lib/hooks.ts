'use client';
/**
 * lib/hooks.ts — Shared data-fetching hooks
 *
 * These hooks centralise all Supabase polling + realtime subscription logic so
 * individual portal pages don't each re-implement their own interval/cleanup
 * code.  They are thin wrappers around the existing `lib/api.ts` functions and
 * the `useRealtime` realtime hook.
 *
 * Usage:
 *   const { orders, loading, error, refresh } = useOrders({ activeOnly: true, limit: 100 });
 *   const { tables, loading, refresh }        = useTables();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOrders, getTables, Order, Table } from '@/lib/api';
import { useRealtime } from '@/lib/realtime-client';

const DEFAULT_RESTAURANT_ID =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RESTAURANT_ID) ||
  'rest_default';

// ─── useOrders ────────────────────────────────────────────────────────────────
export interface UseOrdersOptions {
  /** Exclude completed / cancelled / void orders (default: false) */
  activeOnly?: boolean;
  /** Max rows — server caps at 200 (default: 150) */
  limit?: number;
  /** Only fetch orders for this specific tab (customer portal) */
  tabId?: string;
  /** ISO timestamp — only orders newer than this */
  since?: string;
  /** Polling interval in ms. Pass 0 to disable polling (rely on realtime only). Default: 0 */
  pollMs?: number;
  /** Whether to subscribe to realtime order events (default: true) */
  realtime?: boolean;
  /** Only run when true — lets portals gate on auth check (default: true) */
  enabled?: boolean;
}

export interface UseOrdersResult {
  orders:  Order[];
  loading: boolean;
  error:   string;
  refresh: () => Promise<void>;
}

export function useOrders(opts: UseOrdersOptions = {}): UseOrdersResult {
  const {
    activeOnly = false,
    limit,
    tabId,
    since,
    pollMs = 0,
    realtime: enableRealtime = true,
    enabled = true,
  } = opts;

  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setError('');
      const data = await getOrders({ activeOnly, limit, tabId, since });
      setOrders(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load orders';
      setError(msg);
      console.error('[useOrders] refresh error:', e);
    }
  }, [enabled, activeOnly, limit, tabId, since]);

  // Initial load
  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh, enabled]);

  // Optional polling
  useEffect(() => {
    if (!enabled || !pollMs) return;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
  }, [refresh, enabled, pollMs]);

  // Realtime: refresh on any order event
  useRealtime(
    DEFAULT_RESTAURANT_ID,
    enableRealtime && enabled
      ? {
          order_created:          () => { void refresh(); },
          order_status_changed:   () => { void refresh(); },
          order_ready:            () => { void refresh(); },
          order_served:           () => { void refresh(); },
          order_out_for_delivery: () => { void refresh(); },
          order_delivered:        () => { void refresh(); },
          payment_completed:      () => { void refresh(); },
        }
      : {},
  );

  return { orders, loading, error, refresh };
}

// ─── useTables ────────────────────────────────────────────────────────────────
export interface UseTablesOptions {
  /** Polling interval in ms. 0 = disabled (default: 0) */
  pollMs?:  number;
  /** Only run when true (default: true) */
  enabled?: boolean;
}

export interface UseTablesResult {
  tables:  Table[];
  loading: boolean;
  error:   string;
  refresh: () => Promise<void>;
}

export function useTables(opts: UseTablesOptions = {}): UseTablesResult {
  const { pollMs = 0, enabled = true } = opts;

  const [tables,  setTables]  = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setError('');
      const data = await getTables();
      setTables(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load tables';
      setError(msg);
      console.error('[useTables] refresh error:', e);
    }
  }, [enabled]);

  // Initial load
  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh, enabled]);

  // Optional polling
  useEffect(() => {
    if (!enabled || !pollMs) return;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
  }, [refresh, enabled, pollMs]);

  // Realtime: refresh when a tab opens or closes
  useRealtime(
    DEFAULT_RESTAURANT_ID,
    enabled
      ? {
          table_session_started: () => { void refresh(); },
          payment_completed:     () => { void refresh(); },
        }
      : {},
  );

  return { tables, loading, error, refresh };
}

// ─── useNewOrderAlert ────────────────────────────────────────────────────────
/**
 * Tracks which order IDs have already been alerted.
 * Returns a Set of "new" IDs (since the last render) and a Web Audio beep fn.
 * Usage:
 *   const { newIds, playAlert } = useNewOrderAlert(orders, relevantStatuses);
 *   useEffect(() => { if (newIds.size) playAlert(); }, [newIds, playAlert]);
 */
export function useNewOrderAlert(
  orders: Order[],
  relevantStatuses: string[],
): { newIds: Set<string>; playAlert: () => void } {
  const seenRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const relevant = orders.filter(o => relevantStatuses.includes(o.status));
    const fresh: string[] = [];
    for (const o of relevant) {
      if (!seenRef.current.has(o.id)) {
        seenRef.current.add(o.id);
        fresh.push(o.id);
      }
    }
    // Only alert after the initial seed (seenRef had entries before this batch)
    if (fresh.length > 0 && seenRef.current.size > fresh.length) {
      setNewIds(new Set(fresh));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const playAlert = useCallback(() => {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* AudioContext not available (SSR or restricted context) */ }
  }, []);

  return { newIds, playAlert };
}
