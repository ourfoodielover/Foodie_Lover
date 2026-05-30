// GET /api/init — verify Supabase connection, seed defaults if missing
// Safe to call repeatedly — all inserts use ON CONFLICT DO NOTHING / upsert.
import { NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

    // ── 1. Ensure restaurant row exists ──────────────────────────────────────
    const { data: existing } = await sb
      .from('restaurants').select('id, name').eq('id', rid).maybeSingle();

    if (!existing) {
      await sb.from('restaurants').insert({ id: rid, name: 'Foodie Lover' });
    }

    // ── 2. Seed default tables (idempotent — skip any that already exist) ────
    // Uses upsert with ignoreDuplicates so re-running init never errors.
    await sb.from('tables').upsert(
      Array.from({ length: 10 }, (_, i) => ({
        id:            `tbl_${String(i + 1).padStart(2, '0')}`,
        restaurant_id: rid,
        name:          `T${i + 1}`,
        capacity:      i < 2 ? 2 : i < 6 ? 4 : i < 8 ? 6 : 8,
        status:        'available',
      })),
      { onConflict: 'id', ignoreDuplicates: true },
    );

    // ── 3. Seed default restaurant settings (PINs, tax rate, etc.) ───────────
    // Non-secret settings: insert once, never overwrite (ignoreDuplicates: true).
    const nonSecretSettings = [
      { key: 'tax_rate',             value: '5'    },
      { key: 'service_charge',       value: '0'    },
      { key: 'currency',             value: 'INR'  },
      { key: 'restaurant_name',      value: 'Foodie Lover' },
      { key: 'allow_table_ordering', value: 'true' },
      { key: 'allow_pickup',         value: 'true' },
      { key: 'allow_delivery',       value: 'true' },
      { key: 'waiter_call_cooldown', value: '120'  },
      { key: 'receipt_email_from',   value: ''     },
    ];
    await sb.from('restaurant_settings').upsert(
      nonSecretSettings.map(s => ({
        id:            `RS_${s.key}`,
        restaurant_id: rid,
        key:           s.key,
        value:         s.value,
      })),
      { onConflict: 'id', ignoreDuplicates: true },
    );

    // PIN settings: seeded from Vercel env vars on FIRST RUN ONLY.
    // Once a PIN row exists in Supabase, /api/init never touches it again —
    // all PIN changes after that go through the Admin panel (→ PATCH /api/settings).
    // This prevents a redeploy from wiping admin-panel PIN changes.
    const adminPin   = process.env.ADMIN_PIN   ?? null;
    const kitchenPin = process.env.KITCHEN_PIN ?? null;
    const managerPin = process.env.MANAGER_PIN ?? null;

    const pinSettings: { key: string; value: string }[] = [];
    if (adminPin)   pinSettings.push({ key: 'admin_pin',   value: adminPin });
    if (kitchenPin) pinSettings.push({ key: 'kitchen_pin', value: kitchenPin });
    if (managerPin) pinSettings.push({ key: 'manager_pin', value: managerPin });

    // ignoreDuplicates: true — only insert if the row doesn't exist yet.
    // Existing PIN rows are left untouched; admin panel changes are preserved.
    if (pinSettings.length > 0) {
      const { error: pinErr } = await sb.from('restaurant_settings').upsert(
        pinSettings.map(s => ({
          restaurant_id: rid,
          key:           s.key,
          value:         s.value,
        })),
        { onConflict: 'restaurant_id,key', ignoreDuplicates: true },
      );
      if (pinErr) throw new Error(`PIN upsert failed: ${pinErr.message}`);
    }

    // ── 4. Seed menu items (skip any that already exist by name) ─────────────
    // Only insert if restaurant had no items at all (avoids duplicate names)
    const { count: menuCount } = await sb
      .from('menu_items').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', rid);

    if (!menuCount || menuCount === 0) {
      await sb.from('menu_items').insert([
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken Biryani',     category: 'Biryani',  price: 280, description: 'Aromatic basmati with tender chicken',               badge: 'bestseller', available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Mutton Biryani',      category: 'Biryani',  price: 350, description: 'Slow-cooked mutton with fragrant spices',             badge: 'famous',     available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Veg Biryani',         category: 'Biryani',  price: 200, description: 'Garden vegetables with saffron rice',                               available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Paneer Tikka',        category: 'Starters', price: 220, description: 'Marinated paneer grilled in tandoor',               badge: 'popular',    available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken 65',          category: 'Starters', price: 200, description: 'Spicy deep-fried chicken',                          badge: 'bestseller', available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Veg Manchurian',      category: 'Starters', price: 160, description: 'Crispy vegetable balls in Indo-Chinese sauce',                      available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Butter Chicken',      category: 'Mains',    price: 300, description: 'Tender chicken in rich tomato-butter gravy',       badge: 'chef',       available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Dal Makhani',         category: 'Mains',    price: 180, description: 'Slow-cooked black lentils with cream',             badge: 'popular',    available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Paneer Butter Masala',category: 'Mains',    price: 240, description: 'Soft paneer in aromatic masala gravy',                             available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Garlic Naan',         category: 'Breads',   price: 50,  description: 'Freshly baked naan with garlic butter',                            available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Butter Roti',         category: 'Breads',   price: 30,  description: 'Soft whole wheat roti with butter',                               available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Laccha Paratha',      category: 'Breads',   price: 45,  description: 'Layered flaky whole wheat paratha',                               available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Gulab Jamun',         category: 'Desserts', price: 80,  description: 'Soft milk-solid dumplings in sugar syrup',         badge: 'popular',    available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Rasgulla',            category: 'Desserts', price: 70,  description: 'Spongy cottage cheese balls in light syrup',                       available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Mango Lassi',         category: 'Drinks',   price: 90,  description: 'Chilled yogurt drink with fresh mango',           badge: 'bestseller', available: true },
        { id: newId('MI'), restaurant_id: rid, name: 'Masala Chai',         category: 'Drinks',   price: 40,  description: 'Spiced tea with milk',                                             available: true },
      ]);
    }

    return NextResponse.json({
      ok:           true,
      restaurantId: rid,
      name:         existing?.name ?? 'Foodie Lover',
      seeded:       !existing,
      // Shows which PIN env vars were detected — values never exposed
      pinsUpdated: pinSettings.map(s => s.key),
      pinEnvMissing: [
        !adminPin   && 'ADMIN_PIN',
        !kitchenPin && 'KITCHEN_PIN',
        !managerPin && 'MANAGER_PIN',
      ].filter(Boolean),
    });
  } catch (err) {
    console.error('[GET /api/init] unexpected error:', err);
    const initErrMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: initErrMsg }, { status: 500 });
  }
}
