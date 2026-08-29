// ─── Foodie Lover — PIN hashing (remediation of audit finding C3) ─────────────
//
// All staff/admin/kitchen/manager PINs were previously stored and compared as
// plain text in Postgres (`restaurant_settings.value` for the shared
// admin/kitchen/manager PINs, `staff.pin` for per-account waiter/delivery
// PINs). Anyone with read access to the database (or a future SQL-injection-
// class bug, or a leaked service-role key) would see every PIN in the clear.
//
// This module adds salted-hash storage using Node's built-in `crypto.scrypt`
// (no new dependency — matches the "no broad dependency upgrades unless
// required" constraint) with a SAFE, ZERO-DOWNTIME upgrade path:
//
//   - New PINs (staff created, PIN changed/reset) are ALWAYS stored hashed.
//   - Existing plaintext PINs keep working exactly as before — verifyPin()
//     recognizes a stored value that isn't in the "scrypt:<salt>:<hash>"
//     format as legacy plaintext and compares it directly.
//   - Every call site that verifies a PIN calls `needsRehash()` after a
//     successful check and — only on success — transparently rewrites that
//     row to the hashed format. Existing users are never locked out, never
//     asked to reset anything, and are migrated one login at a time with no
//     bulk migration script and no downtime.
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const PREFIX  = 'scrypt';
const KEY_LEN = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, KEY_LEN);
  return `${PREFIX}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function isHashedPin(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}:`);
}

/**
 * Verifies `pin` against `stored`, which may be either a hashed value
 * (format: "scrypt:<saltHex>:<hashHex>") or a legacy plaintext PIN.
 * Returns false for any malformed/empty input rather than throwing, so
 * callers can use it directly in an `if (!verifyPin(...))` guard.
 */
export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!pin || !stored) return false;

  if (isHashedPin(stored)) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, saltHex, hashHex] = parts;
    try {
      const salt     = Buffer.from(saltHex, 'hex');
      const expected = Buffer.from(hashHex, 'hex');
      const actual   = scryptSync(pin, salt, expected.length);
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  // Legacy plaintext fallback.
  return stored === pin;
}
