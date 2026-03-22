// ─── Foodie Lover — Auth System ───────────────────────────────────────────────
// Session management using localStorage for session TOKENS only.
// All PIN verification is done server-side via Supabase (see /api/settings,
// /api/staff routes). localStorage is ONLY used to persist the session token
// between page reloads — never for business data.
//
// Login flows:
//   admin/login   → GET /api/settings { owner_pin }  → verify → saveSession()
//   kitchen/login → GET /api/settings { kitchen_pin } → verify → saveSession()
//   manager/login → GET /api/settings { manager_pin } → verify → saveSession()
//   waiter/login  → GET /api/staff (lookup by username + pin) → saveSession()
//   delivery/login → GET /api/staff (lookup by username + pin) → saveSession()

export type Role = 'admin' | 'kitchen' | 'waiter' | 'manager' | 'delivery';

export interface AuthSession {
  accountId?: string;  // Set for waiter/delivery individual accounts
  role:       Role;
  name:       string;
  username:   string;
  loginAt:    string;
  expiresAt:  string;
}

// ─── localStorage keys ────────────────────────────────────────────────────────
const SESSION_KEY: Record<Role, string> = {
  admin:    'fl_session_admin',
  kitchen:  'fl_session_kitchen',
  waiter:   'fl_session_waiter',
  manager:  'fl_session_manager',
  delivery: 'fl_session_delivery',
};

// Sessions expire after 8 hours of inactivity
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// ─── Storage helpers ──────────────────────────────────────────────────────────
function ls_get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function ls_set<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── Session management ───────────────────────────────────────────────────────
export function getSession(role: Role): AuthSession | null {
  const s = ls_get<AuthSession | null>(SESSION_KEY[role], null);
  if (!s) return null;
  if (new Date(s.expiresAt) < new Date()) {
    clearSession(role);
    return null;
  }
  return s;
}

export function saveSession(s: AuthSession): void {
  ls_set(SESSION_KEY[s.role], s);
}

export function clearSession(role: Role): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY[role]);
}

// ─── Security Questions (Admin PIN Recovery — UI display list only) ───────────
// Note: The actual answer is verified server-side via /api/settings.
// This list is only used to populate the <select> dropdown in admin settings.
export const SECURITY_QUESTIONS = [
  "What is the name of your first pet?",
  "What was the name of your first school?",
  "What is your mother's maiden name?",
  "What is the name of the street you grew up on?",
  "What was the make of your first car?",
  "What is the name of your favourite restaurant?",
  "What city were you born in?",
  "What was the name of your childhood best friend?",
];
