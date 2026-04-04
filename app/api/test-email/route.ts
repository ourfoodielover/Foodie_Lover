// GET /api/test-email?to=you@example.com
// Sends a test email to verify that Resend is wired up correctly.
//
// Usage:
//   curl "https://your-app.vercel.app/api/test-email?to=you@example.com"
//
// Returns:
//   { ok: true,  messageId: "..." }   — Resend accepted the message
//   { ok: false, error: "..." }       — something went wrong (check logs)
//
// DO NOT expose this endpoint publicly in production — add auth if needed.

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const to = new URL(req.url).searchParams.get('to');

  if (!to || !to.includes('@')) {
    return NextResponse.json(
      { ok: false, error: 'Provide a valid ?to=email@example.com query param' },
      { status: 400 },
    );
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:32px 16px">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px">🍽️</div>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#E65C00">Foodie Lover</h1>
        </div>
        <h2 style="font-size:18px;color:#16a34a;margin:0 0 12px">✅ Email test successful!</h2>
        <p style="font-size:14px;color:#475569;margin:0 0 16px">
          If you're reading this, Resend is correctly configured and emails
          are being delivered from <strong>noreply@mail.ourfoodielover.com</strong>.
        </p>
        <p style="font-size:13px;color:#94a3b8;margin:0">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await sendEmail({
      to,
      subject: '✅ Foodie Lover — Email Test',
      html,
    });

    if ('error' in result) {
      console.error('[GET /api/test-email] Resend error:', result.error);
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId, sentTo: to });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/test-email] Unexpected error:', err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
