// GET  /api/menu — list menu items
// POST /api/menu — create menu item
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

// Menu changes infrequently — allow CDN / browser to cache for 60 seconds.
// This dramatically reduces Supabase round-trips when multiple clients (table
// QR portals, admin, online ordering) all load the menu at the same time.
// The admin portal POSTs a new item and the client re-fetches after a mutation,
// so stale reads are at most 60 seconds in the worst case.
export const dynamic = 'force-dynamic'; // still SSR, but we set Cache-Control manually

export async function GET(req: NextRequest) {
  try {
    const sb  = getServerClient();
    const rid = new URL(req.url).searchParams.get('restaurantId') ?? 'rest_default';
    const { data, error } = await sb
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', rid)
      .order('category')
      .order('name');
    if (error) {
      console.error('[GET /api/menu] Supabase error:', error.message, '| code:', error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const items = (data ?? []).map(r => ({
      id:        r.id,
      name:      r.name,
      category:  r.category,
      price:     r.price,
      desc:      r.description,
      badge:     r.badge,
      img:       r.img_url,
      available: r.available,
      variants:  r.variants ?? [],
    }));
    // Cache: public (CDN) for 60 s, stale-while-revalidate for another 30 s.
    return NextResponse.json(items, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/menu] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb   = getServerClient();
    const body = await req.json() as Record<string, unknown>;
    const rid  = (body.restaurantId as string | undefined) ?? 'rest_default';
    if (!body.name || !body.category) {
      return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
    }
    const variants = Array.isArray(body.variants) && body.variants.length > 0
      ? body.variants
      : (body.price !== undefined ? [{ name: 'Regular', price: Number(body.price) }] : []);
    if (variants.length === 0) {
      return NextResponse.json({ error: 'At least one pricing variant is required' }, { status: 400 });
    }
    const price = variants[0].price;
    const id = newId('MI');
    const { error } = await sb.from('menu_items').insert({
      id, restaurant_id: rid,
      name:        body.name,
      category:    body.category,
      price,
      variants,
      description: body.desc ?? body.description ?? null,
      badge:       body.badge ?? null,
      img_url:     body.img  ?? null,
      available:   body.available !== false,
    });
    if (error) {
      console.error('[POST /api/menu] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/menu] unexpected error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
