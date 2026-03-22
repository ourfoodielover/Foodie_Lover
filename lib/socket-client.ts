// ─── DEPRECATED — DO NOT USE ──────────────────────────────────────────────────
// Socket.io has been fully replaced by Supabase Realtime broadcast channels.
// Use lib/realtime-client.ts and the useRealtime() hook instead.
//
// This file is kept only as a reference. socket.io and socket.io-client have
// been removed from package.json. Importing this file will throw at runtime.
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect, useRef, useCallback } from 'react';

// Lazy import to avoid SSR issues
let _socket: ReturnType<typeof import('socket.io-client').io> | null = null;

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (_socket?.connected) return _socket;

  // Dynamically import socket.io-client
  if (!_socket) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { io } = require('socket.io-client');
    _socket = io({
      path: '/api/socketio',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return _socket;
}

export type SocketEventHandlers = {
  order_created?:        (order: unknown) => void;
  order_status_changed?: (order: unknown) => void;
  order_ready?:          (order: unknown) => void;
  order_served?:         (order: unknown) => void;
  payment_completed?:    (order: unknown) => void;
};

/**
 * React hook for Socket.io real-time updates.
 * - Joins the restaurant room on mount
 * - Registers event handlers
 * - Cleans up on unmount
 */
export function useSocket(
  restaurantId: string,
  handlers: SocketEventHandlers,
  onConnect?: () => void,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers; // always latest reference

  const refresh = useCallback((cb: () => void) => {
    handlersRef.current = { ...handlersRef.current };
    cb();
  }, []);
  void refresh;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const join = () => {
      socket.emit('join_restaurant', restaurantId);
      onConnect?.();
    };

    if (socket.connected) {
      join();
    }
    socket.on('connect', join);

    // Register event handlers
    const events = [
      'order_created', 'order_status_changed', 'order_ready',
      'order_served', 'payment_completed',
    ] as const;

    const wrapped: Record<string, (data: unknown) => void> = {};
    for (const ev of events) {
      wrapped[ev] = (data: unknown) => {
        const h = handlersRef.current[ev];
        if (h) h(data);
      };
      socket.on(ev, wrapped[ev]);
    }

    return () => {
      socket.off('connect', join);
      for (const ev of events) {
        socket.off(ev, wrapped[ev]);
      }
    };
  }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps
}
