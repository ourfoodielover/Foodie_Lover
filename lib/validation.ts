// ─── Shared validation helpers ────────────────────────────────────────────────
//
// Phone: India only (+91).  Mobile numbers are 10 digits starting with 6–9.
// Email: standard RFC-ish format check (not a full RFC 5322 parser, but covers
//        all real-world valid addresses used in practice).

// ─── Phone ────────────────────────────────────────────────────────────────────

/**
 * Strip optional +91 / 91 prefix and return the bare 10-digit number,
 * or null if the input cannot be normalised to a valid Indian mobile.
 *
 * Accepts:
 *   +91 98765 43210   +91-98765-43210   9876543210   91 9876543210
 * Rejects:
 *   numbers starting with 0-5, lengths ≠ 10 after stripping prefix
 */
export function normaliseIndianPhone(raw: string): string | null {
  // Remove all spaces, dashes, dots, parentheses
  let s = raw.replace(/[\s\-.() ]/g, '');

  // Strip leading +
  if (s.startsWith('+')) s = s.slice(1);

  // Strip country code 91 if present AND followed by 10 digits
  if (/^91\d{10}$/.test(s)) s = s.slice(2);

  // Must now be exactly 10 digits starting with 6, 7, 8, or 9
  if (/^[6-9]\d{9}$/.test(s)) return s;

  return null;
}

/**
 * Returns an error message string, or '' if valid.
 * Use in form onChange handlers.
 */
export function validateIndianPhone(raw: string): string {
  if (!raw.trim()) return 'Phone number is required';
  const n = normaliseIndianPhone(raw);
  if (!n) {
    return 'Enter a valid 10-digit Indian mobile number (starting with 6–9). Example: 9876543210';
  }
  return '';
}

// ─── Email ────────────────────────────────────────────────────────────────────

/** Returns true for addresses that look like valid emails. */
export function isValidEmail(raw: string): boolean {
  if (!raw.trim()) return false;
  // Must have exactly one @, something before it, a dot in the domain part,
  // no consecutive dots, no leading/trailing dots in local or domain parts.
  return /^[^\s@"'<>()[\]\\,;:]+@[^\s@"'<>()[\]\\,;:]+\.[^\s@"'<>()[\]\\,;:.]{2,}$/.test(
    raw.trim().toLowerCase(),
  );
}

/**
 * Returns an error message string, or '' if valid (or empty — email is optional).
 * Pass required=true to also reject empty strings.
 */
export function validateEmail(raw: string, required = false): string {
  if (!raw.trim()) {
    return required ? 'Email address is required' : '';
  }
  if (!isValidEmail(raw)) {
    return 'Enter a valid email address (e.g. name@example.com)';
  }
  return '';
}
