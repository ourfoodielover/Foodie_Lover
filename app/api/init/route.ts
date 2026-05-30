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
        // ── Non Veg Biryani ─────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken Dum Biryani', category: 'Non Veg Biryani', price: 140, description: 'Authentic Hyderabadi Dum Biryani with tender chicken', badge: 'bestseller', available: true, variants: [{ name: 'Half', price: 140 }, { name: 'Full', price: 260 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Mutton Dum Biryani', category: 'Non Veg Biryani', price: 180, description: 'Slow-cooked mutton with fragrant basmati rice', badge: 'famous', available: true, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 320 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Prawn Biryani', category: 'Non Veg Biryani', price: 200, description: 'Juicy prawns layered with aromatic saffron rice', badge: '', available: true, variants: [{ name: 'Half', price: 200 }, { name: 'Full', price: 380 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Egg Biryani', category: 'Non Veg Biryani', price: 100, description: 'Boiled eggs cooked with spiced basmati rice', badge: '', available: true, variants: [{ name: 'Half', price: 100 }, { name: 'Full', price: 180 }] },
        // ── Veg Biryani ─────────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Veg Dum Biryani', category: 'Veg Biryani', price: 100, description: 'Garden vegetables with saffron-infused basmati', badge: '', available: true, variants: [{ name: 'Half', price: 100 }, { name: 'Full', price: 180 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Paneer Biryani', category: 'Veg Biryani', price: 120, description: 'Soft paneer cubes layered with fragrant rice', badge: 'popular', available: true, variants: [{ name: 'Half', price: 120 }, { name: 'Full', price: 220 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Mushroom Biryani', category: 'Veg Biryani', price: 110, description: 'Fresh mushrooms cooked with aromatic spices and rice', badge: '', available: true, variants: [{ name: 'Half', price: 110 }, { name: 'Full', price: 200 }] },
        // ── Non Veg Starters ────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken 65', category: 'Non Veg Starters', price: 230, description: 'Crispy deep-fried chicken with bold spices', badge: 'bestseller', available: true, variants: [{ name: 'Half', price: 230 }, { name: 'Full', price: 420 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken Tikka', category: 'Non Veg Starters', price: 250, description: 'Marinated chicken grilled in clay oven', badge: 'popular', available: true, variants: [{ name: 'Half', price: 250 }, { name: 'Full', price: 460 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken Lollipop', category: 'Non Veg Starters', price: 220, description: 'Crispy chicken wings in Indo-Chinese style', badge: '', available: true, variants: [{ name: '4 Pcs', price: 220 }, { name: '8 Pcs', price: 420 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Fish Fry', category: 'Non Veg Starters', price: 220, description: 'Crispy fried fish with Hyderabadi spice blend', badge: '', available: true, variants: [{ name: 'Half', price: 220 }, { name: 'Full', price: 400 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Prawn Fry', category: 'Non Veg Starters', price: 260, description: 'Spicy fried prawns with coastal masala', badge: '', available: true, variants: [{ name: 'Half', price: 260 }, { name: 'Full', price: 480 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Mutton Seekh Kebab', category: 'Non Veg Starters', price: 260, description: 'Minced mutton kebab grilled on skewer', badge: '', available: true, variants: [{ name: 'Half', price: 260 }, { name: 'Full', price: 480 }] },
        // ── Veg Starters ────────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Paneer Tikka', category: 'Veg Starters', price: 180, description: 'Marinated paneer grilled in clay oven', badge: 'popular', available: true, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 340 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Gobi Manchurian', category: 'Veg Starters', price: 130, description: 'Crispy cauliflower in Indo-Chinese sauce', badge: '', available: true, variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 240 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Veg Manchurian', category: 'Veg Starters', price: 130, description: 'Crispy vegetable balls in tangy Manchurian gravy', badge: '', available: true, variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 240 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Mushroom 65', category: 'Veg Starters', price: 160, description: 'Deep-fried mushrooms with spicy coating', badge: '', available: true, variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 300 }] },
        // ── Main Course Non Veg ──────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Butter Chicken', category: 'Main Course Non Veg', price: 200, description: 'Tender chicken in rich tomato-butter gravy', badge: 'chef', available: true, variants: [{ name: 'Half', price: 200 }, { name: 'Full', price: 380 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken Masala', category: 'Main Course Non Veg', price: 180, description: 'Chicken cooked in bold onion-tomato masala', badge: '', available: true, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 340 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Mutton Curry', category: 'Main Course Non Veg', price: 220, description: 'Slow-cooked mutton in aromatic curry', badge: '', available: true, variants: [{ name: 'Half', price: 220 }, { name: 'Full', price: 400 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Fish Curry', category: 'Main Course Non Veg', price: 200, description: 'Fresh fish in tangy coastal curry', badge: '', available: true, variants: [{ name: 'Half', price: 200 }, { name: 'Full', price: 380 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Prawn Masala', category: 'Main Course Non Veg', price: 240, description: 'Juicy prawns in spiced masala gravy', badge: '', available: true, variants: [{ name: 'Half', price: 240 }, { name: 'Full', price: 440 }] },
        // ── Main Course Veg ──────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Dal Makhani', category: 'Main Course Veg', price: 140, description: 'Slow-cooked black lentils with cream', badge: 'popular', available: true, variants: [{ name: 'Half', price: 140 }, { name: 'Full', price: 260 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Paneer Butter Masala', category: 'Main Course Veg', price: 160, description: 'Soft paneer in creamy tomato-butter gravy', badge: '', available: true, variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 300 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Palak Paneer', category: 'Main Course Veg', price: 150, description: 'Cottage cheese in smooth spinach gravy', badge: '', available: true, variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 280 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Mix Veg Curry', category: 'Main Course Veg', price: 130, description: 'Seasonal vegetables in spiced gravy', badge: '', available: true, variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 240 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Dal Tadka', category: 'Main Course Veg', price: 120, description: 'Yellow lentils tempered with cumin and spices', badge: '', available: true, variants: [{ name: 'Half', price: 120 }, { name: 'Full', price: 220 }] },
        // ── Tandoori Specials ────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Tandoori Chicken', category: 'Tandoori Specials', price: 280, description: 'Whole chicken marinated and roasted in clay oven', badge: 'famous', available: true, variants: [{ name: 'Half', price: 280 }, { name: 'Full', price: 520 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Murgh Malai Tikka', category: 'Tandoori Specials', price: 260, description: 'Creamy malai-marinated chicken tikka', badge: '', available: true, variants: [{ name: 'Half', price: 260 }, { name: 'Full', price: 480 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Seekh Kebab', category: 'Tandoori Specials', price: 260, description: 'Spiced minced meat grilled on skewer', badge: '', available: true, variants: [{ name: 'Half', price: 260 }, { name: 'Full', price: 480 }] },
        // ── Rice Items ───────────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Jeera Rice', category: 'Rice Items', price: 80, description: 'Basmati rice tempered with cumin', badge: '', available: true, variants: [{ name: 'Regular', price: 80 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Ghee Rice', category: 'Rice Items', price: 100, description: 'Fragrant basmati rice cooked with ghee', badge: '', available: true, variants: [{ name: 'Regular', price: 100 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Egg Fried Rice', category: 'Rice Items', price: 120, description: 'Wok-tossed rice with scrambled eggs', badge: '', available: true, variants: [{ name: 'Regular', price: 120 }] },
        // ── Indian Breads ────────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Roti', category: 'Indian Breads', price: 10, description: 'Soft whole wheat flatbread', badge: '', available: true, variants: [{ name: 'Regular', price: 10 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Butter Roti', category: 'Indian Breads', price: 15, description: 'Soft whole wheat flatbread with butter', badge: '', available: true, variants: [{ name: 'Regular', price: 15 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Naan', category: 'Indian Breads', price: 20, description: 'Soft leavened bread from the tandoor', badge: '', available: true, variants: [{ name: 'Regular', price: 20 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Butter Naan', category: 'Indian Breads', price: 25, description: 'Fluffy tandoor naan brushed with butter', badge: '', available: true, variants: [{ name: 'Regular', price: 25 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Garlic Naan', category: 'Indian Breads', price: 30, description: 'Tandoor naan topped with garlic and herbs', badge: 'popular', available: true, variants: [{ name: 'Regular', price: 30 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Laccha Paratha', category: 'Indian Breads', price: 30, description: 'Layered flaky whole wheat paratha', badge: '', available: true, variants: [{ name: 'Regular', price: 30 }] },
        // ── Egg Specials ─────────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Egg Masala', category: 'Egg Specials', price: 100, description: 'Boiled eggs in spiced onion-tomato masala', badge: '', available: true, variants: [{ name: 'Half', price: 100 }, { name: 'Full', price: 180 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Egg Bhurji', category: 'Egg Specials', price: 90, description: 'Scrambled eggs with onions, tomatoes and spices', badge: '', available: true, variants: [{ name: 'Regular', price: 90 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Egg Curry', category: 'Egg Specials', price: 100, description: 'Boiled eggs in rich curry sauce', badge: '', available: true, variants: [{ name: 'Half', price: 100 }, { name: 'Full', price: 180 }] },
        // ── Pot Specials ─────────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Chicken Pot Biryani', category: 'Pot Specials', price: 320, description: 'Chicken biryani slow-cooked and served in a clay pot', badge: 'chef', available: true, variants: [{ name: 'Regular', price: 320 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Mutton Pot Biryani', category: 'Pot Specials', price: 400, description: 'Mutton biryani slow-cooked and served in a clay pot', badge: '', available: true, variants: [{ name: 'Regular', price: 400 }] },
        // ── Arabic Mandi ─────────────────────────────────────────────────────────────
        { id: newId('MI'), restaurant_id: rid, name: 'Arabic Chicken Fried Mandi', category: 'Arabic Mandi', price: 220, description: 'Crispy fried chicken served over fragrant mandi rice', badge: 'bestseller', available: true, variants: [{ name: '1 Piece', price: 220 }, { name: '2 Piece', price: 430 }, { name: '3 Piece', price: 600 }, { name: '4 Piece', price: 760 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Arabic Chicken Mandi', category: 'Arabic Mandi', price: 200, description: 'Tender slow-cooked chicken on aromatic mandi rice', badge: 'popular', available: true, variants: [{ name: '1 Piece', price: 200 }, { name: '2 Piece', price: 380 }, { name: '3 Piece', price: 540 }, { name: '4 Piece', price: 700 }] },
        { id: newId('MI'), restaurant_id: rid, name: 'Arabic Mutton Mandi', category: 'Arabic Mandi', price: 280, description: 'Slow-roasted mutton on traditional mandi rice', badge: '', available: true, variants: [{ name: '1 Piece', price: 280 }, { name: '2 Piece', price: 540 }, { name: '3 Piece', price: 780 }, { name: '4 Piece', price: 1000 }] },
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
