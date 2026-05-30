// GET /api/menu/seed
// Batch-inserts all missing menu items from the complete restaurant catalog.
// Safe to call at any time — checks existing names first, only inserts missing items.
// Returns: { ok: true, inserted: N, skipped: N }
import { NextResponse } from 'next/server';
import { getServerClient, newId } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// ── Image URLs — Unsplash CDN (stable, optimised, commercially licensed) ──────
// Each photo ID is a specific stable Unsplash image. Admin can replace via panel.
const IMG = {
  biryani:      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=75&fit=crop',
  biryaniMutton:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=75&fit=crop',
  paneer:       'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d6?w=400&q=75&fit=crop',
  dal:          'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=75&fit=crop',
  curry:        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=75&fit=crop',
  chickenGrill: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=75&fit=crop',
  kebab:        'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?w=400&q=75&fit=crop',
  rice:         'https://images.unsplash.com/photo-1512058454905-6b841e7ad132?w=400&q=75&fit=crop',
  bread:        'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&q=75&fit=crop',
  egg:          'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=75&fit=crop',
  mandi:        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=75&fit=crop',
  vegStarter:   'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=75&fit=crop',
  fishFry:      'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=400&q=75&fit=crop',
  prawns:       'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=75&fit=crop',
  wings:        'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&q=75&fit=crop',
};

// ── Complete restaurant catalog ───────────────────────────────────────────────
const CATALOG = [
  // Veg Starters
  { name: 'Paneer Tikka',      category: 'Veg Starters',      description: 'Marinated cottage cheese cubes grilled in a clay oven until perfectly charred.',            badge: 'popular',    img_url: IMG.paneer,       variants: [{name:'Half',price:180},{name:'Full',price:340}] },
  { name: 'Gobi Manchurian',   category: 'Veg Starters',      description: 'Crispy cauliflower florets tossed in a bold Indo-Chinese Manchurian sauce.',                 badge: '',           img_url: IMG.vegStarter,   variants: [{name:'Half',price:130},{name:'Full',price:240}] },
  { name: 'Veg Manchurian',    category: 'Veg Starters',      description: 'Deep-fried vegetable balls in a tangy, spicy Manchurian gravy.',                             badge: '',           img_url: IMG.vegStarter,   variants: [{name:'Half',price:130},{name:'Full',price:240}] },
  { name: 'Mushroom 65',       category: 'Veg Starters',      description: 'Crispy fried mushrooms coated in a spicy South Indian-style batter.',                        badge: '',           img_url: IMG.vegStarter,   variants: [{name:'Half',price:160},{name:'Full',price:300}] },
  { name: 'Chilli Paneer',     category: 'Veg Starters',      description: 'Crispy paneer cubes stir-fried with peppers and a fiery Indo-Chinese sauce.',                 badge: '',           img_url: IMG.paneer,       variants: [{name:'Half',price:160},{name:'Full',price:300}] },
  { name: 'Paneer 65',         category: 'Veg Starters',      description: 'South Indian spiced deep-fried paneer with curry leaves and green chilli.',                   badge: '',           img_url: IMG.paneer,       variants: [{name:'Half',price:170},{name:'Full',price:320}] },
  { name: 'Spring Rolls',      category: 'Veg Starters',      description: 'Golden crispy rolls stuffed with spiced mixed vegetables.',                                   badge: '',           img_url: IMG.vegStarter,   variants: [{name:'4 Pcs',price:120},{name:'8 Pcs',price:220}] },
  { name: 'Veg Crispy',        category: 'Veg Starters',      description: 'Assorted vegetables deep-fried to a golden crisp, served with dipping sauce.',               badge: '',           img_url: IMG.vegStarter,   variants: [{name:'Half',price:120},{name:'Full',price:220}] },

  // Non Veg Starters
  { name: 'Chicken 65',        category: 'Non Veg Starters',  description: 'Legendary Hyderabadi crispy fried chicken with bold chilli and curry leaf marinade.',         badge: 'bestseller', img_url: IMG.chickenGrill, variants: [{name:'Half',price:230},{name:'Full',price:420}] },
  { name: 'Chicken Tikka',     category: 'Non Veg Starters',  description: 'Juicy chicken marinated in yoghurt and spices, slow-roasted in the tandoor.',                  badge: 'popular',    img_url: IMG.chickenGrill, variants: [{name:'Half',price:250},{name:'Full',price:460}] },
  { name: 'Chicken Lollipop',  category: 'Non Veg Starters',  description: 'Crispy chicken wing drumettes marinated in Indo-Chinese spices.',                             badge: '',           img_url: IMG.wings,        variants: [{name:'4 Pcs',price:220},{name:'8 Pcs',price:420}] },
  { name: 'Fish Fry',          category: 'Non Veg Starters',  description: 'Fresh fish marinated in a bold Hyderabadi spice blend, fried to a golden crisp.',             badge: '',           img_url: IMG.fishFry,      variants: [{name:'Half',price:220},{name:'Full',price:400}] },
  { name: 'Prawn Fry',         category: 'Non Veg Starters',  description: 'Tiger prawns marinated in coastal masala and deep-fried until perfectly crispy.',              badge: '',           img_url: IMG.prawns,       variants: [{name:'Half',price:260},{name:'Full',price:480}] },
  { name: 'Mutton Seekh Kebab',category: 'Non Veg Starters',  description: 'Minced mutton mixed with aromatic spices and grilled on iron skewers.',                       badge: '',           img_url: IMG.kebab,        variants: [{name:'Half',price:260},{name:'Full',price:480}] },
  { name: 'Chicken Wings',     category: 'Non Veg Starters',  description: 'Spiced chicken wings marinated in a tangy masala and grilled until charred.',                 badge: '',           img_url: IMG.wings,        variants: [{name:'Half',price:220},{name:'Full',price:420}] },
  { name: 'Egg 65',            category: 'Non Veg Starters',  description: 'Boiled eggs coated in a spicy South Indian-style batter and deep-fried.',                     badge: '',           img_url: IMG.egg,          variants: [{name:'4 Pcs',price:80},{name:'8 Pcs',price:150}] },

  // Veg Biryani
  { name: 'Veg Dum Biryani',   category: 'Veg Biryani',       description: 'Garden fresh vegetables slow-cooked with saffron-infused basmati in the classic dum style.',  badge: '',           img_url: IMG.rice,         variants: [{name:'Half',price:100},{name:'Full',price:180}] },
  { name: 'Paneer Biryani',    category: 'Veg Biryani',       description: 'Soft paneer cubes layered with fragrant basmati, slow-cooked dum style.',                     badge: 'popular',    img_url: IMG.biryani,      variants: [{name:'Half',price:120},{name:'Full',price:220}] },
  { name: 'Mushroom Biryani',  category: 'Veg Biryani',       description: 'Fresh mushrooms cooked with aromatic spices and fragrant basmati rice.',                      badge: '',           img_url: IMG.rice,         variants: [{name:'Half',price:110},{name:'Full',price:200}] },

  // Non Veg Biryani
  { name: 'Chicken Dum Biryani',category:'Non Veg Biryani',   description: 'Authentic Hyderabadi Dum Biryani — tender marinated chicken slow-cooked with saffron rice.',  badge: 'bestseller', img_url: IMG.biryani,      variants: [{name:'Half',price:140},{name:'Full',price:260}] },
  { name: 'Mutton Dum Biryani',category: 'Non Veg Biryani',   description: 'Slow-cooked tender mutton pieces layered with fragrant saffron basmati rice.',                badge: 'famous',     img_url: IMG.biryaniMutton,variants: [{name:'Half',price:180},{name:'Full',price:320}] },
  { name: 'Prawn Biryani',     category: 'Non Veg Biryani',   description: 'Juicy prawns marinated in coastal spices, layered with aromatic saffron rice.',               badge: '',           img_url: IMG.biryani,      variants: [{name:'Half',price:200},{name:'Full',price:380}] },
  { name: 'Egg Biryani',       category: 'Non Veg Biryani',   description: 'Perfectly boiled eggs cooked with spiced masala and layered basmati rice.',                   badge: '',           img_url: IMG.biryani,      variants: [{name:'Half',price:100},{name:'Full',price:180}] },
  { name: 'Fish Biryani',      category: 'Non Veg Biryani',   description: 'Fresh fish marinated in coastal spices, layered with fragrant basmati rice.',                 badge: '',           img_url: IMG.biryani,      variants: [{name:'Half',price:180},{name:'Full',price:340}] },

  // Main Course Veg
  { name: 'Dal Makhani',       category: 'Main Course Veg',   description: 'Slow-cooked black lentils simmered overnight with butter and cream.',                         badge: 'popular',    img_url: IMG.dal,          variants: [{name:'Half',price:140},{name:'Full',price:260}] },
  { name: 'Paneer Butter Masala',category:'Main Course Veg',  description: 'Soft paneer in a velvety tomato-butter gravy — a timeless Indian classic.',                  badge: '',           img_url: IMG.paneer,       variants: [{name:'Half',price:160},{name:'Full',price:300}] },
  { name: 'Palak Paneer',      category: 'Main Course Veg',   description: 'Cottage cheese cubes nestled in a smooth, spiced spinach gravy.',                             badge: '',           img_url: IMG.paneer,       variants: [{name:'Half',price:150},{name:'Full',price:280}] },
  { name: 'Mix Veg Curry',     category: 'Main Course Veg',   description: 'A medley of fresh seasonal vegetables simmered in a rich, spiced gravy.',                     badge: '',           img_url: IMG.dal,          variants: [{name:'Half',price:130},{name:'Full',price:240}] },
  { name: 'Dal Tadka',         category: 'Main Course Veg',   description: 'Yellow lentils tempered with cumin, garlic, and dried red chilli.',                           badge: '',           img_url: IMG.dal,          variants: [{name:'Half',price:120},{name:'Full',price:220}] },
  { name: 'Matar Paneer',      category: 'Main Course Veg',   description: 'Green peas and paneer cooked in a rich, tomato-onion gravy.',                                 badge: '',           img_url: IMG.paneer,       variants: [{name:'Half',price:150},{name:'Full',price:280}] },
  { name: 'Aloo Gobi',         category: 'Main Course Veg',   description: 'Potatoes and cauliflower dry-cooked with aromatic Indian spices.',                             badge: '',           img_url: IMG.dal,          variants: [{name:'Half',price:110},{name:'Full',price:200}] },
  { name: 'Kadai Paneer',      category: 'Main Course Veg',   description: 'Paneer cooked with bell peppers and spices in a traditional kadai.',                           badge: '',           img_url: IMG.paneer,       variants: [{name:'Half',price:160},{name:'Full',price:300}] },
  { name: 'Shahi Paneer',      category: 'Main Course Veg',   description: 'Paneer in a royal Mughal-style creamy cashew and tomato gravy.',                               badge: 'chef',       img_url: IMG.paneer,       variants: [{name:'Half',price:170},{name:'Full',price:320}] },

  // Main Course Non Veg
  { name: 'Butter Chicken',    category: 'Main Course Non Veg', description: 'Tender chicken in a rich, velvety tomato-butter gravy — India\'s most loved dish.',        badge: 'chef',       img_url: IMG.curry,        variants: [{name:'Half',price:200},{name:'Full',price:380}] },
  { name: 'Chicken Masala',    category: 'Main Course Non Veg', description: 'Chicken cooked in a bold, caramelised onion-tomato masala with whole spices.',               badge: '',           img_url: IMG.curry,        variants: [{name:'Half',price:180},{name:'Full',price:340}] },
  { name: 'Mutton Curry',      category: 'Main Course Non Veg', description: 'Slow-cooked bone-in mutton in a deeply spiced, aromatic curry sauce.',                      badge: '',           img_url: IMG.curry,        variants: [{name:'Half',price:220},{name:'Full',price:400}] },
  { name: 'Fish Curry',        category: 'Main Course Non Veg', description: 'Fresh fish simmered in a tangy, coconut-infused coastal curry sauce.',                      badge: '',           img_url: IMG.curry,        variants: [{name:'Half',price:200},{name:'Full',price:380}] },
  { name: 'Prawn Masala',      category: 'Main Course Non Veg', description: 'Succulent prawns cooked in a rich, spiced masala sauce.',                                   badge: '',           img_url: IMG.prawns,       variants: [{name:'Half',price:240},{name:'Full',price:440}] },
  { name: 'Chicken Tikka Masala',category:'Main Course Non Veg',description: 'Tandoor-grilled chicken tikka simmered in a creamy, spiced tomato gravy.',                  badge: 'popular',    img_url: IMG.curry,        variants: [{name:'Half',price:200},{name:'Full',price:380}] },
  { name: 'Kadai Chicken',     category: 'Main Course Non Veg', description: 'Chicken cooked with crushed spices and capsicum in a heavy-bottomed kadai.',                badge: '',           img_url: IMG.curry,        variants: [{name:'Half',price:190},{name:'Full',price:360}] },
  { name: 'Mutton Masala',     category: 'Main Course Non Veg', description: 'Tender mutton pieces cooked in a rich, bold masala with whole aromatic spices.',            badge: '',           img_url: IMG.curry,        variants: [{name:'Half',price:230},{name:'Full',price:420}] },

  // Tandoori Specials
  { name: 'Tandoori Chicken',  category: 'Tandoori Specials',  description: 'Whole chicken marinated in yoghurt and spices, roasted in a clay tandoor.',                  badge: 'famous',     img_url: IMG.chickenGrill, variants: [{name:'Half',price:280},{name:'Full',price:520}] },
  { name: 'Murgh Malai Tikka', category: 'Tandoori Specials',  description: 'Tender chicken marinated in creamy malai and mild spices, grilled to a delicate finish.',    badge: '',           img_url: IMG.chickenGrill, variants: [{name:'Half',price:260},{name:'Full',price:480}] },
  { name: 'Seekh Kebab',       category: 'Tandoori Specials',  description: 'Spiced minced mutton mixed with herbs and grilled on skewers in the tandoor.',                badge: '',           img_url: IMG.kebab,        variants: [{name:'Half',price:260},{name:'Full',price:480}] },
  { name: 'Fish Tikka',        category: 'Tandoori Specials',  description: 'Fish fillets marinated in tandoori spices and grilled in the clay oven.',                     badge: '',           img_url: IMG.fishFry,      variants: [{name:'Half',price:260},{name:'Full',price:480}] },
  { name: 'Reshmi Kebab',      category: 'Tandoori Specials',  description: 'Silky-smooth chicken kebab marinated in cashew paste and cream, grilled gently.',            badge: '',           img_url: IMG.kebab,        variants: [{name:'Half',price:260},{name:'Full',price:480}] },

  // Rice Items
  { name: 'Jeera Rice',        category: 'Rice Items',         description: 'Fragrant basmati rice tempered with golden cumin in ghee.',                                   badge: '',           img_url: IMG.rice,         variants: [{name:'Regular',price:80}] },
  { name: 'Ghee Rice',         category: 'Rice Items',         description: 'Long-grain basmati cooked with whole spices, finished with pure cow ghee.',                  badge: '',           img_url: IMG.rice,         variants: [{name:'Regular',price:100}] },
  { name: 'Veg Fried Rice',    category: 'Rice Items',         description: 'Wok-tossed basmati with fresh vegetables in an Indo-Chinese style.',                          badge: '',           img_url: IMG.rice,         variants: [{name:'Regular',price:100}] },
  { name: 'Egg Fried Rice',    category: 'Rice Items',         description: 'Wok-tossed basmati with scrambled eggs and vegetables, smoky Indo-Chinese style.',            badge: '',           img_url: IMG.rice,         variants: [{name:'Regular',price:120}] },
  { name: 'Chicken Fried Rice',category: 'Rice Items',         description: 'Wok-tossed rice with tender chicken and vegetables in a bold Indo-Chinese sauce.',            badge: '',           img_url: IMG.rice,         variants: [{name:'Regular',price:140}] },
  { name: 'Prawn Fried Rice',  category: 'Rice Items',         description: 'Wok-tossed basmati with succulent prawns and fresh vegetables.',                              badge: '',           img_url: IMG.rice,         variants: [{name:'Regular',price:160}] },

  // Indian Breads
  { name: 'Roti',              category: 'Indian Breads',      description: 'Soft, thin whole wheat flatbread baked fresh.',                                               badge: '',           img_url: IMG.bread,        variants: [{name:'Regular',price:10}] },
  { name: 'Butter Roti',       category: 'Indian Breads',      description: 'Freshly baked whole wheat roti generously brushed with butter.',                              badge: '',           img_url: IMG.bread,        variants: [{name:'Regular',price:15}] },
  { name: 'Tandoori Roti',     category: 'Indian Breads',      description: 'Whole wheat bread baked directly in the clay tandoor — crisp outside, soft inside.',         badge: '',           img_url: IMG.bread,        variants: [{name:'Regular',price:15}] },
  { name: 'Naan',              category: 'Indian Breads',      description: 'Pillowy leavened bread baked in the tandoor — perfect for mopping up curries.',               badge: '',           img_url: IMG.bread,        variants: [{name:'Regular',price:20}] },
  { name: 'Butter Naan',       category: 'Indian Breads',      description: 'Fluffy tandoor naan generously brushed with melted butter.',                                  badge: '',           img_url: IMG.bread,        variants: [{name:'Regular',price:25}] },
  { name: 'Garlic Naan',       category: 'Indian Breads',      description: 'Tandoor naan topped with minced garlic, butter, and fresh coriander.',                        badge: 'popular',    img_url: IMG.bread,        variants: [{name:'Regular',price:30}] },
  { name: 'Laccha Paratha',    category: 'Indian Breads',      description: 'Flaky, layered whole wheat paratha with a crispy, buttery finish.',                           badge: '',           img_url: IMG.bread,        variants: [{name:'Regular',price:30}] },

  // Egg Specials
  { name: 'Egg Masala',        category: 'Egg Specials',       description: 'Boiled eggs simmered in a bold, spiced onion-tomato masala gravy.',                           badge: '',           img_url: IMG.egg,          variants: [{name:'Half',price:100},{name:'Full',price:180}] },
  { name: 'Egg Bhurji',        category: 'Egg Specials',       description: 'Scrambled eggs cooked with onions, tomatoes, and aromatic spices.',                           badge: '',           img_url: IMG.egg,          variants: [{name:'Regular',price:90}] },
  { name: 'Egg Curry',         category: 'Egg Specials',       description: 'Boiled eggs in a rich, tangy curry sauce with whole spices.',                                 badge: '',           img_url: IMG.egg,          variants: [{name:'Half',price:100},{name:'Full',price:180}] },
  { name: 'Egg Roast',         category: 'Egg Specials',       description: 'Spiced boiled eggs pan-roasted in a dry Kerala-style masala.',                                badge: '',           img_url: IMG.egg,          variants: [{name:'Half',price:100},{name:'Full',price:180}] },
  { name: 'Omelette',          category: 'Egg Specials',       description: 'Fluffy egg omelette with onions, tomatoes, and green chilli.',                                badge: '',           img_url: IMG.egg,          variants: [{name:'Single',price:30},{name:'Double',price:55}] },

  // Pot Specials
  { name: 'Chicken Pot Biryani',category:'Pot Specials',       description: 'Aromatic chicken biryani slow-cooked and served dramatically in a sealed clay pot.',          badge: 'chef',       img_url: IMG.biryani,      variants: [{name:'Regular',price:320}] },
  { name: 'Mutton Pot Biryani',category: 'Pot Specials',       description: 'Rich mutton biryani slow-cooked and served in a traditional clay pot.',                      badge: '',           img_url: IMG.biryaniMutton,variants: [{name:'Regular',price:400}] },

  // Arabic Mandi
  { name: 'Arabic Chicken Fried Mandi', category:'Arabic Mandi', description: 'Crispy golden fried chicken served over fragrant slow-cooked mandi rice with Yemeni spices.', badge:'bestseller', img_url: IMG.mandi, variants: [{name:'1 Piece',price:220},{name:'2 Piece',price:430},{name:'3 Piece',price:600},{name:'4 Piece',price:760}] },
  { name: 'Arabic Chicken Mandi',       category:'Arabic Mandi', description: 'Tender slow-roasted chicken on a bed of aromatic basmati mandi rice — authentic Arabian.',     badge:'popular',    img_url: IMG.mandi, variants: [{name:'1 Piece',price:200},{name:'2 Piece',price:380},{name:'3 Piece',price:540},{name:'4 Piece',price:700}] },
  { name: 'Arabic Mutton Mandi',        category:'Arabic Mandi', description: 'Slow-roasted succulent mutton served over fragrant Yemeni-spiced mandi rice.',                  badge:'',           img_url: IMG.mandi, variants: [{name:'1 Piece',price:280},{name:'2 Piece',price:540},{name:'3 Piece',price:780},{name:'4 Piece',price:1000}] },
] as const;

export async function GET() {
  try {
    const sb  = getServerClient();
    const rid = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

    // Fetch all existing item names (case-insensitive comparison)
    const { data: existing } = await sb
      .from('menu_items')
      .select('name')
      .eq('restaurant_id', rid);

    const existingNames = new Set(
      (existing ?? []).map(r => r.name.trim().toLowerCase()),
    );

    // Filter to only items not already in DB
    const toInsert = CATALOG.filter(
      item => !existingNames.has(item.name.trim().toLowerCase()),
    );

    const skipped = CATALOG.length - toInsert.length;

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped, message: 'All items already exist' });
    }

    // Batch insert in chunks of 20 to avoid payload limits
    const CHUNK = 20;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error } = await sb.from('menu_items').insert(
        chunk.map(item => ({
          id:            newId('MI'),
          restaurant_id: rid,
          name:          item.name,
          category:      item.category,
          description:   item.description,
          badge:         item.badge || null,
          img_url:       item.img_url,
          available:     true,
          variants:      item.variants,
          price:         item.variants[0].price,
        })),
      );
      if (error) {
        console.error('[GET /api/menu/seed] insert error:', error.message);
        // Continue with remaining chunks even if one fails
      } else {
        inserted += chunk.length;
      }
    }

    return NextResponse.json({ ok: true, inserted, skipped });
  } catch (err) {
    console.error('[GET /api/menu/seed] unexpected error:', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
