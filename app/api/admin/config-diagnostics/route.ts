// GET /api/admin/config-diagnostics
//
// Powers the Admin Settings "Configuration" diagnostics panel. Returns, for
// every non-secret setting that participates in the ENV > Admin > Default
// priority rule, its effective value and which source is currently
// controlling it — so an Admin who changes a value in the dashboard and sees
// no effect can immediately tell whether an Environment Variable is
// overriding it, instead of guessing.
//
// NEVER returns a secret value — only whether each secret ENV var is
// configured (true/false). See lib/config-server.ts for the resolver this
// route is a thin read-only wrapper around.
import { NextResponse } from 'next/server';
import { getConfigDiagnostics } from '@/lib/config-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const diagnostics = await getConfigDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (err) {
    console.error('[GET /api/admin/config-diagnostics]', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
