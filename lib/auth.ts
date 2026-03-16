// ─── Foodie Lover — Auth System ───────────────────────────────────────────────
// Role-based session management using localStorage.
// No backend required — all state is local.

export type Role = 'admin' | 'kitchen' | 'waiter' | 'manager' | 'delivery';

export interface StaffAccount {
  id:        string;
  username:  string;
  pin:       string;   // 4–6 digit PIN
  role:      'waiter'; // Only waiters have individual accounts
  name:      string;   // Display name
  active:    boolean;
  createdAt: string;
}

export interface AuthSession {
  accountId?: string;  // Set for waiter individual accounts
  role:       Role;
  name:       string;
  username:   string;
  loginAt:    string;
  expiresAt:  string;
}

// ─── Security recovery types ──────────────────────────────────────────────────
export interface SecuritySetup {
  question: string;
  answerHash: string;  // lowercased + trimmed answer stored as-is (no real hashing — localStorage only)
  setupAt: string;
}

// ─── localStorage keys ────────────────────────────────────────────────────────
const SESSION_KEY: Record<Role, string> = {
  admin:    'fl_session_admin',
  kitchen:  'fl_session_kitchen',
  waiter:   'fl_session_waiter',
  manager:  'fl_session_manager',
  delivery: 'fl_session_delivery',
};

const KEYS = {
  kitchenPin:    'fl_kitchen_pin',
  managerPin:    'fl_manager_pin',
  staffAccounts: 'fl_staff_accounts',
  securitySetup: 'fl_admin_security',
};

// Sessions expire after 8 hours of inactivity
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

// ─── PINs ─────────────────────────────────────────────────────────────────────
export const getKitchenPin  = (): string    => ls_get<string>(KEYS.kitchenPin, '0000');
export const saveKitchenPin = (p: string)   => ls_set(KEYS.kitchenPin, p);
export const getManagerPin  = (): string    => ls_get<string>(KEYS.managerPin, '9999');
export const saveManagerPin = (p: string)   => ls_set(KEYS.managerPin, p);

// ─── Staff Accounts ───────────────────────────────────────────────────────────
export const getStaffAccounts  = (): StaffAccount[] =>
  ls_get<StaffAccount[]>(KEYS.staffAccounts, []);
export const saveStaffAccounts = (a: StaffAccount[]) =>
  ls_set(KEYS.staffAccounts, a);

export function createStaffAccount(
  name:     string,
  username: string,
  pin:      string,
): StaffAccount | { error: string } {
  const accounts = getStaffAccounts();
  if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase().trim())) {
    return { error: 'Username already exists' };
  }
  if (pin.length < 4) return { error: 'PIN must be at least 4 digits' };

  const account: StaffAccount = {
    id:        `STAFF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    username:  username.trim(),
    pin:       pin.trim(),
    role:      'waiter',
    name:      name.trim(),
    active:    true,
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  saveStaffAccounts(accounts);
  return account;
}

export function deleteStaffAccount(id: string): void {
  saveStaffAccounts(getStaffAccounts().filter(a => a.id !== id));
}

export function toggleStaffAccount(id: string): void {
  saveStaffAccounts(
    getStaffAccounts().map(a => a.id === id ? { ...a, active: !a.active } : a),
  );
}

export function updateStaffPin(id: string, newPin: string): void {
  saveStaffAccounts(
    getStaffAccounts().map(a => a.id === id ? { ...a, pin: newPin } : a),
  );
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

// ─── Login functions ──────────────────────────────────────────────────────────
export function loginAdmin(pin: string, ownerPin: string): AuthSession | null {
  if (pin !== ownerPin) return null;
  const s: AuthSession = {
    role: 'admin', name: 'Admin', username: 'admin',
    loginAt:   new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  saveSession(s);
  return s;
}

export function loginKitchen(pin: string): AuthSession | null {
  if (pin !== getKitchenPin()) return null;
  const s: AuthSession = {
    role: 'kitchen', name: 'Kitchen Staff', username: 'kitchen',
    loginAt:   new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  saveSession(s);
  return s;
}

export function loginWaiter(username: string, pin: string): AuthSession | null {
  const account = getStaffAccounts().find(
    a =>
      a.username.toLowerCase() === username.toLowerCase().trim() &&
      a.pin === pin.trim() &&
      a.active,
  );
  if (!account) return null;
  const s: AuthSession = {
    accountId: account.id,
    role:      'waiter',
    name:      account.name,
    username:  account.username,
    loginAt:   new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  saveSession(s);
  return s;
}

export function loginManager(pin: string): AuthSession | null {
  if (pin !== getManagerPin()) return null;
  const s: AuthSession = {
    role: 'manager', name: 'Manager', username: 'manager',
    loginAt:   new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  saveSession(s);
  return s;
}

/**
 * Delivery login — no PIN required for the prototype.
 * The delivery person just enters their name.
 */
export function loginDelivery(name: string): AuthSession {
  const n = name.trim() || 'Delivery';
  const s: AuthSession = {
    role:      'delivery',
    name:      n,
    username:  n.toLowerCase().replace(/\s+/g, '_'),
    loginAt:   new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  saveSession(s);
  return s;
}

// ─── Security Question (Admin PIN Recovery) ───────────────────────────────────

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

export function getSecuritySetup(): SecuritySetup | null {
  return ls_get<SecuritySetup | null>(KEYS.securitySetup, null);
}

export function saveSecuritySetup(question: string, answer: string): void {
  const setup: SecuritySetup = {
    question,
    answerHash: answer.toLowerCase().trim(),
    setupAt:    new Date().toISOString(),
  };
  ls_set(KEYS.securitySetup, setup);
}

export function verifySecurityAnswer(answer: string): boolean {
  const setup = getSecuritySetup();
  if (!setup) return false;
  return setup.answerHash === answer.toLowerCase().trim();
}

/** Reset the admin PIN after successful security-question verification. */
export function resetAdminPinWithSecurity(newPin: string, answer: string): boolean {
  if (!verifySecurityAnswer(answer)) return false;
  // savePin is in storage.ts — we import it at call-site to avoid circular deps
  return true; // caller must call savePin(newPin) after this returns true
}
