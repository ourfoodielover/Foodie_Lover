// ─── Foodie Lover — Supabase Realtime Hook ────────────────────────────────────
// Drop-in replacement for lib/socket-client.ts
// Uses Supabase Realtime broadcast channels instead of Socket.io
'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RealtimeEventHandlers = {
  order_created?:            (payload: unknown) => void;
  order_status_changed?:     (payload: unknown) => void;
  order_ready?:              (payload: unknown) => void;
  order_served?:             (payload: unknown) => void;
  order_out_for_delivery?:   (payload: unknown) => void;
  order_delivered?:          (payload: unknown) => void;
  payment_completed?:        (payload: unknown) => void;
  // Fired by POST /api/tabs when a new session is opened at a table.
  // Lets the waiter portal show a "party seated" alert even before an order.
  table_session_started?:    (payload: unknown) => void;
  // Fired by POST /api/waiter-calls when a customer rings for service.
  waiter_called?:             (payload: unknown) => void;
  // Fired by PATCH /api/waiter-calls when a waiter acknowledges a call —
  // lets other logged-in waiter devices dismiss the same alert immediately.
  waiter_call_acknowledged?:  (payload: unknown) => void;
  // ── Order issue events (not-received workflow) ────────────────────────────
  order_issue_reported?:     (payload: unknown) => void;
  order_issue_escalated?:    (payload: unknown) => void;
  order_issue_reserving?:    (payload: unknown) => void;
  order_issue_resolved?:     (payload: unknown) => void;
  // Fired by POST /api/orders/[id]/events — custom audit events such as
  // CustomerConfirmed, FoodDisputed, DisputeResolved appended to an order.
  order_event_added?:        (payload: unknown) => void;
};

// ─── useRealtime hook ─────────────────────────────────────────────────────────
// Subscribe to restaurant broadcast channel. Cleans up on unmount.

export function useRealtime(
  restaurantId:  string,
  handlers:      RealtimeEventHandlers,
  onConnect?:    () => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Keep handlers ref up to date without re-subscribing
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase.channel(`restaurant:${restaurantId}`, {
      config: { broadcast: { ack: false } },
    });

    ([
      'order_created', 'order_status_changed', 'order_ready',
      'order_served', 'order_out_for_delivery', 'order_delivered',
      'payment_completed', 'table_session_started',
      'waiter_called', 'waiter_call_acknowledged',
      'order_issue_reported', 'order_issue_escalated',
      'order_issue_reserving', 'order_issue_resolved',
      'order_event_added',
    ] as const)
      .forEach(event => {
        channel.on('broadcast', { event }, ({ payload }) => {
          handlersRef.current[event]?.(payload);
        });
      });

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        onConnect?.();
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[useRealtime] channel error on restaurant:${restaurantId}`, err);
        // Supabase will attempt to reconnect automatically; no action needed here.
        // If the subscription stays broken for >30s the SDK fires TIMED_OUT.
      } else if (status === 'TIMED_OUT') {
        console.warn(`[useRealtime] subscription timed out for restaurant:${restaurantId} — will retry`);
      } else if (status === 'CLOSED') {
        console.info(`[useRealtime] channel closed for restaurant:${restaurantId}`);
      }
    });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);
}
