// ─── Foodie Lover — Supabase Browser Client ───────────────────────────────────
// Safe to import in client components (uses ANON key only).
//
// WHY lazy initialisation instead of a module-level createClient() call:
//
//   During `next build`, every module in the client bundle is evaluated —
//   even those behind a 'use client' boundary.  createClient() throws
//   "supabaseUrl is required" if the env vars are absent at that moment.
//   By deferring initialisation to the first real call-site we guarantee:
//
//     ✅  Build succeeds even if NEXT_PUBLIC_* vars aren't set in CI
//     ✅  First actual usage throws a clear, actionable error if config is wrong
//     ✅  No "placeholder" values that silently swallow misconfigurations
//     ✅  Singleton — one client instance for the lifetime of the page
//
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[Foodie Lover] Supabase env vars missing. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'in your Vercel project → Settings → Environment Variables.',
    );
  }

  _client = createClient(url, key, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  return _client;
}
