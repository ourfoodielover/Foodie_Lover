import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { pin } = await req.json() as { pin?: string };

    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    }

    // Verify admin PIN server-side
    const { data: pinRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_pin')
      .single();

    if (!pinRow || pinRow.value !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    // Delete in dependency order: order_events → order_items → orders
    const { error: evErr } = await supabase
      .from('order_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

    if (evErr) {
      return NextResponse.json({ error: `Failed to clear order events: ${evErr.message}` }, { status: 500 });
    }

    const { error: itErr } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (itErr) {
      return NextResponse.json({ error: `Failed to clear order items: ${itErr.message}` }, { status: 500 });
    }

    const { error: ordErr } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (ordErr) {
      return NextResponse.json({ error: `Failed to clear orders: ${ordErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'All orders cleared successfully.' });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
