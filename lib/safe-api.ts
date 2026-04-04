// ─── safeApiCall — wraps API calls with offline fallback ─────────────────────
// If the API call fails (network error, 5xx), the action is queued in localStorage.
// When back online, syncQueue() replays all queued actions automatically.
'use client';

import { enqueue } from './offline-queue';

export interface SafeResult<T> {
  data:    T | null;
  queued:  boolean;   // true if stored offline
  error:   string | null;
}

export async function safeApiCall<T>(
  type:    string,
  fn:      () => Promise<T>,
  payload?: unknown,
  idempotencyKey?: string,
): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { data, queued: false, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const isNetworkOrServer = error.includes('Network error') ||
      error.includes('HTTP 5') || error.includes('fetch') || !navigator.onLine;

    if (isNetworkOrServer && payload !== undefined) {
      enqueue(type, payload, idempotencyKey);
      return { data: null, queued: true, error };
    }
    return { data: null, queued: false, error };
  }
}
