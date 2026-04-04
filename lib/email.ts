// ─── Foodie Lover — Resend email utility ────────────────────────────────────
// SERVER-SIDE ONLY.  Never import this in 'use client' files.
//
// Single source of truth for:
//   • the sender address (FROM)
//   • Resend client singleton initialisation
//   • the base sendEmail() function
//
// Higher-level helpers (receipt HTML, queue logic) live in lib/email-server.ts
// and call sendEmail() from here.
//
import { Resend } from 'resend';

// ─── Sender identity ─────────────────────────────────────────────────────────
// Must be a Resend-verified domain address.
// Verify at: https://resend.com/domains → add mail.ourfoodielover.com
const FROM = 'Foodie Lover <noreply@mail.ourfoodielover.com>';

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
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });

    if (error) {
      // Resend error objects have shape { name, message, statusCode }
      const errObj = error as unknown as { message?: string; name?: string };
      const errMsg = errObj.message ?? errObj.name ?? JSON.stringify(error);
      return { error: errMsg };
    }

    const messageId = (data as { id?: string } | null)?.id ?? 'unknown';
    return { messageId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
