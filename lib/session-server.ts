// ─── Foodie Lover — Server-Side Session Helpers ───────────────────────────────
//
// WHY THIS FILE EXISTS (remediation of audit finding C1):
// Every "login" in this app previously ended with the CLIENT fabricating its
// own localStorage session object after a server PIN check succeeded — the
// server never issued anything the client could later prove it held, so every
// API route downstream had to either re-check a PIN on every single call (the
// pattern Finance/order-deletion already used) or, in ~54 of 77 routes, not
// check anything at all. This file gives every successful login a real,
// server-verifiable credential: a signed, httpOnly cookie the browser cannot
// read or forge, checked by requireRole()/requireSession() on the server.
//
// DESIGN CHOICES, DELIBERATELY MINIMAL:
//   - Stateless (HMAC-signed token, no session table/DB round-trip to verify).
//     No new migration is needed for login itself to start working with real
//     server-side authorization — this can ship before any DB change.
//   - Signing key: SESSION_SECRET if set; otherwise derived via HMAC from
//     SUPABASE_SERVICE_ROLE_KEY so nothing breaks if the operator hasn't
//     provisioned a new secret yet. Set a real SESSION_SECRET in production —
//     see the warning this file logs once if it's missing.
//   - Cookie: httpOnly, sameSite=lax, secure in production, 8h TTL — matching
//     the existing SESSION_TTL_MS the client's own localStorage session used,
//     so behavior (log out after 8h) does not change for staff.
//   - This is additive to the existing localStorage session, not a replacement
//     for it. The client still keeps its own localStorage session for fast,
//     no-network UI redirects (Section 19 of the audit's original pattern);
//     THIS cookie is what API routes now actually check before doing anything
//     sensitive. The two are set together at login and cleared together at
//     logout so they can't drift out of sync.

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'fl_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours — matches lib/auth.ts

export type StaffRole = 'admin' | 'kitchen' | 'manager' | 'waiter' | 'delivery';
export const ALL_ROLES: StaffRole[] = ['admin', 'kitchen', 'manager', 'waiter', 'delivery'];

export interface SessionPayload {
  role:          StaffRole;
  staffId?:      string;   // set for waiter/delivery (per-account); absent for shared-PIN roles
  restaurantId:  string;
  issuedAt:      number;   // epoch ms
  expiresAt:     number;   // epoch ms
}

let warnedMissingSecret = false;

function getSigningKey(): string {
  const explicit = process.env.SESSION_SECRET;
  if (explicit && explicit.length >= 16) return explicit;

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      '[session-server] SESSION_SECRET is not set (or too short) — deriving a signing key ' +
      'from SUPABASE_SERVICE_ROLE_KEY as a fallback. This works, but a dedicated ' +
      'SESSION_SECRET (32+ random bytes) is strongly recommended in production so that ' +
      'rotating one secret does not require rotating the other.',
    );
  }
  if (!fallback) {
    // Last-resort: never silently sign with an empty/undefined key. Fail loudly
    // instead of issuing forgeable sessions.
    throw new Error(
      '[session-server] Cannot create a session: neither SESSION_SECRET nor ' +
      'SUPABASE_SERVICE_ROLE_KEY is configured.',
    );
  }
  return `fl-session-derived:${fallback}`;
}

function sign(data: string): string {
  return createHmac('sha256', getSigningKey()).update(data).digest('base64url');
}

function base64urlEncode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

function base64urlDecode<T>(str: string): T {
  return JSON.parse(Buffer.from(str, 'base64url').toString('utf8')) as T;
}

/** Build a signed token string: base64url(payload).signature */
export function createSessionToken(payload: SessionPayload): string {
  const body = base64urlEncode(payload);
  const sig  = sign(body);
  return `${body}.${sig}`;
}

/** Verify + decode a token. Returns null if malformed, tampered, or expired. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  let expectedSig: string;
  try {
    expectedSig = sign(body);
  } catch {
    return null;
  }

  const sigBuf   = Buffer.from(sig, 'utf8');
  const expBuf   = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: SessionPayload;
  try {
    payload = base64urlDecode<SessionPayload>(body);
  } catch {
    return null;
  }

  if (!payload || typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) return null;
  if (!ALL_ROLES.includes(payload.role)) return null;

  return payload;
}

/** Issue a session: sets the httpOnly cookie on the given response and returns the payload. */
export function issueSession(
  res:          NextResponse,
  role:         StaffRole,
  restaurantId: string,
  staffId?:     string,
): SessionPayload {
  const now = Date.now();
  const payload: SessionPayload = {
    role,
    staffId,
    restaurantId,
    issuedAt:  now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const token = createSessionToken(payload);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   Math.floor(SESSION_TTL_MS / 1000),
  });
  return payload;
}

/** Clears the session cookie (logout). */
export function clearSession(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Reads + verifies the session from an incoming request. Null if absent/invalid/expired. */
export function getSession(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * requireRole — call at the top of a route handler that should only be
 * reachable by one of `roles`. Returns { ok: true, session } on success, or
 * { ok: false, response } with a ready-to-return 401/403 NextResponse.
 *
 * Usage:
 *   const auth = requireRole(req, ['admin', 'manager']);
 *   if (!auth.ok) return auth.response;
 *   // auth.session.role, auth.session.staffId are now available
 */
export function requireRole(
  req:   NextRequest,
  roles: StaffRole[],
): { ok: true; session: SessionPayload } | { ok: false; response: NextResponse } {
  const session = getSession(req);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Not authenticated. Please log in again.' },
        { status: 401 },
      ),
    };
  }
  if (!roles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `This action requires one of: ${roles.join(', ')}.` },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session };
}

/** Same as requireRole but allows ANY authenticated staff/management role. */
export function requireAnyStaff(
  req: NextRequest,
): { ok: true; session: SessionPayload } | { ok: false; response: NextResponse } {
  return requireRole(req, ALL_ROLES);
}
