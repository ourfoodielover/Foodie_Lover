// ─── Foodie Lover — Resend email utility ────────────────────────────────────
// SERVER-SIDE ONLY.  Never import this in 'use client' files.
//
// Single source of truth for:
//   • the sender address — read from FROM_EMAIL env var, NEVER hardcoded
//   • Resend client singleton initialisation
//   • the base sendEmail() function
//
// Required env vars:
//   FROM_EMAIL       — e.g. "Foodie Lover <noreply@ourfoodielover.com>"
//                      Must be on a Resend-verified domain.
//   RESEND_API_KEY   — API key from resend.com/api-keys
//
// Higher-level helpers (receipt HTML, queue logic) live in lib/email-server.ts
// and call sendEmail() from here.
//
import { Resend } from 'resend';

// ─── Startup diagnostics ─────────────────────────────────────────────────────
// Logged once on the first sendEmail() call so every deploy shows config state.
let _startupLogged = false;

function logStartupDiagnostics(): void {
  if (_startupLogged) return;
  _startupLogged = true;
  const fromEmail = process.env.FROM_EMAIL ?? '(NOT SET)';
  const apiKey    = process.env.RESEND_API_KEY ?? '';
  const maskedKey = apiKey.length >= 8
    ? `${apiKey.slice(0, 5)}****${apiKey.slice(-3)}`
    : apiKey.length > 0 ? '****' : '(NOT SET)';
  const env = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
  console.info(
    `[Foodie Lover Email] ─── Startup diagnostics ───\n` +
    `  FROM_EMAIL:      ${fromEmail}\n` +
    `  RESEND_API_KEY:  ${maskedKey}\n` +
    `  Environment:     ${env}`,
  );
}

// ─── Lazy singleton ───────────────────────────────────────────────────────────
// Defer initialisation so the module can be imported at build time without
// RESEND_API_KEY being present.  The first real call to sendEmail() checks for it.
let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[Foodie Lover] RESEND_API_KEY env var is not set. ' +
      'Add it in Vercel → Settings → Environment Variables.',
    );
  }
  _resend = new Resend(apiKey);
  return _resend;
}

// ─── sendEmail ────────────────────────────────────────────────────────────────
/**
 * Send a single transactional email via Resend.
 *
 * The sender address is always read from process.env.FROM_EMAIL — it is NEVER
 * hardcoded.  If the env var is missing the call returns { error } immediately
 * rather than sending from a wrong/unauthorised address.
 *
 * Returns { messageId } on success or { error } on failure — never throws —
 * so callers can decide whether to retry, queue, or just log.
 *
 * @param to      Recipient address, e.g. "customer@example.com"
 * @param subject Email subject line
 * @param html    HTML body (use inline styles — email clients strip <style> tags)
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to:      string;
  subject: string;
  html:    string;
}): Promise<{ messageId: string } | { error: string }> {
  // Log startup config on first call
  logStartupDiagnostics();

  // ── Sender address — read from env; NO fallback, NO hardcoded value ──────
  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) {
    console.error(
      '[sendEmail] ❌ FROM_EMAIL env var is not set. ' +
      'Add it in Vercel → Settings → Environment Variables.',
    );
    return { error: 'FROM_EMAIL env var is not set. Add it in Vercel → Settings → Environment Variables.' };
  }

  // ── Pre-send log ──────────────────────────────────────────────────────────
  console.info(
    `[sendEmail] → Sending | from: ${fromEmail} | to: ${to} | subject: "${subject}" | html: ${html.length} chars`,
  );

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from:    fromEmail,   // ← always from env var
      to,
      subject,
      html,
    });

    if (error) {
      // Resend error objects have shape { name, message, statusCode }
      const errObj = error as unknown as { message?: string; name?: string };
      const errMsg = errObj.message ?? errObj.name ?? JSON.stringify(error);
      console.error(`[sendEmail] ❌ Resend rejected | to: ${to} | error: ${errMsg}`);
      return { error: errMsg };
    }

    const messageId = (data as { id?: string } | null)?.id ?? 'unknown';
    console.info(`[sendEmail] ✅ Accepted by Resend | to: ${to} | messageId: ${messageId}`);
    return { messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sendEmail] ❌ Unexpected error | to: ${to} | error: ${msg}`);
    return { error: msg };
  }
}
