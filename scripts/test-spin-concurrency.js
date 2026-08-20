/**
 * scripts/test-spin-concurrency.js
 *
 * Concurrency test for perform_spin() atomic allocation.
 * Fires N simultaneous spin RPCs against a reward with daily_win_limit = 1
 * and asserts that exactly 1 coupon is issued.
 *
 * Run:  node scripts/test-spin-concurrency.js
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

// ── Load env vars ──────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const N           = 10;  // concurrent customers
const TEST_SUFFIX = randomBytes(4).toString('hex');
const TEST_RID    = `test_concurrent_${TEST_SUFFIX}`;

// Test data IDs
const LIMITED_REWARD_ID = `SR-LTD-${TEST_SUFFIX}`;
const NO_REWARD_ID      = `SR-NRW-${TEST_SUFFIX}`;
const ORDER_IDS         = Array.from({ length: N }, (_, i) => `ORD-TEST-${TEST_SUFFIX}-${i}`);

// ─────────────────────────────────────────────────────────────────────────────

async function setup() {
  console.log(`\nSetting up isolated test data (suffix=${TEST_SUFFIX})...`);

  // Insert a minimal restaurant row (needed for orders FK)
  const { error: restErr } = await sb.from('restaurants').insert({
    id:   TEST_RID,
    name: 'Test Restaurant (concurrency)',
  });
  if (restErr) throw new Error(`restaurants insert: ${restErr.message}`);

  // Insert spin_config
  const { error: cfgErr } = await sb.from('spin_config').insert({
    id:                   `SC-${TEST_SUFFIX}`,
    restaurant_id:        TEST_RID,
    enabled:              true,
    min_order_amount:     0,
    eligible_order_types: ['pickup', 'delivery', 'dine-in'],
    timezone:             'Asia/Kolkata',
  });
  if (cfgErr) throw new Error(`spin_config insert: ${cfgErr.message}`);

  // Insert two rewards: one limited (daily_win_limit=1), one no_reward
  const { error: rwdErr } = await sb.from('spin_rewards').insert([
    {
      id:              LIMITED_REWARD_ID,
      restaurant_id:   TEST_RID,
      label:           '30% OFF MEGA JACKPOT',
      reward_type:     'percent',
      reward_value:    30,
      weight:          50,
      min_next_order:  0,
      expires_days:    30,
      active:          true,
      archived:        false,
      daily_win_limit: 1,    // ← must not exceed 1 today
      sort_order:      1,
    },
    {
      id:            NO_REWARD_ID,
      restaurant_id: TEST_RID,
      label:         'Better Luck Next Time',
      reward_type:   'no_reward',
      reward_value:  0,
      weight:        50,
      min_next_order: 0,
      expires_days:  0,
      active:        true,
      archived:      false,
      sort_order:    2,
    },
  ]);
  if (rwdErr) throw new Error(`spin_rewards insert: ${rwdErr.message}`);

  // Insert N completed pickup orders (one per concurrent customer)
  const { error: ordErr } = await sb.from('orders').insert(
    ORDER_IDS.map((id, i) => ({
      id,
      restaurant_id: TEST_RID,
      order_number:  9000 + i,
      type:          'pickup',
      status:        'completed',
      total:         500,
      subtotal:      500,
      discount:      0,
      tax:           0,
      tip:           0,
      source:        'in-store',
    }))
  );
  if (ordErr) throw new Error(`orders insert: ${ordErr.message}`);

  console.log(`✅ Setup: 1 limited reward (daily_win_limit=1), 1 no_reward, ${N} test orders`);
}

async function runConcurrentSpins() {
  console.log(`\nFiring ${N} simultaneous spins (single reward with daily_win_limit=1)...`);
  const start = Date.now();

  const promises = ORDER_IDS.map(orderId =>
    sb.rpc('perform_spin', {
      p_spin_id:       'SR-' + randomBytes(12).toString('hex'),
      p_order_id:      orderId,
      p_tab_id:        null,
      p_restaurant_id: TEST_RID,
      p_email:         'test@concurrency.example',
      p_phone:         '9999999999',
      p_timezone:      'Asia/Kolkata',
      p_reward_ids:    [LIMITED_REWARD_ID, NO_REWARD_ID],
    })
  );

  const results = await Promise.all(promises);
  const elapsed = Date.now() - start;
  console.log(`Completed in ${elapsed}ms`);
  return results;
}

async function verify(results) {
  let winners      = 0;
  let noWins       = 0;
  let alreadySpun  = 0;
  let rpcErrors    = 0;

  for (const { data, error } of results) {
    if (error) {
      rpcErrors++;
      console.error('  RPC error:', error.message);
      continue;
    }
    const r = data;
    if (r.already_spun) { alreadySpun++; continue; }
    if (r.is_winner)    { winners++;     continue; }
    noWins++;
  }

  // Count coupons for the limited reward in the DB (ground truth)
  const { count: couponCount, error: cntErr } = await sb
    .from('reward_coupons')
    .select('id', { count: 'exact', head: true })
    .eq('reward_id', LIMITED_REWARD_ID);
  if (cntErr) throw new Error(`coupon count: ${cntErr.message}`);

  // Count spin_results for all test orders
  const { count: spinCount, error: spnErr } = await sb
    .from('spin_results')
    .select('id', { count: 'exact', head: true })
    .in('order_id', ORDER_IDS);
  if (spnErr) throw new Error(`spin_results count: ${spnErr.message}`);

  console.log('\n════════════════ RESULTS ════════════════');
  console.log(`Concurrent requests:             ${N}`);
  console.log(`RPC errors:                      ${rpcErrors}`);
  console.log(`RPC winners (is_winner=true):    ${winners}`);
  console.log(`RPC no-wins (is_winner=false):   ${noWins}`);
  console.log(`RPC already_spun:                ${alreadySpun}`);
  console.log(`spin_results rows in DB:         ${spinCount}`);
  console.log(`reward_coupons for limited rwd:  ${couponCount}`);

  const pass =
    rpcErrors   === 0     &&
    couponCount === 1     &&  // exactly 1 coupon, even with 10 concurrent spins
    spinCount   === N;        // every customer got a spin result

  console.log(`\n${ pass ? '✅ PASS' : '❌ FAIL' }`);

  if (!pass) {
    if (rpcErrors > 0)    console.error(`  Expected 0 RPC errors, got ${rpcErrors}`);
    if (couponCount !== 1) console.error(`  Expected exactly 1 coupon for limited reward, got ${couponCount}`);
    if (spinCount !== N)   console.error(`  Expected ${N} spin_results, got ${spinCount}`);
  }

  return pass;
}

async function cleanup() {
  console.log('\nCleaning up test data...');
  // Delete in FK dependency order (child → parent)
  await sb.from('reward_coupons').delete().in('source_order_id', ORDER_IDS);
  await sb.from('spin_results').delete().in('order_id', ORDER_IDS);
  await sb.from('orders').delete().in('id', ORDER_IDS);
  await sb.from('spin_rewards').delete().in('id', [LIMITED_REWARD_ID, NO_REWARD_ID]);
  await sb.from('spin_config').delete().eq('restaurant_id', TEST_RID);
  await sb.from('restaurants').delete().eq('id', TEST_RID);
  console.log('Cleanup complete.');
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  let pass = false;
  try {
    await setup();
    const results = await runConcurrentSpins();
    pass = await verify(results);
  } catch (err) {
    console.error('\n❌ Test threw an error:', err.message ?? err);
  } finally {
    await cleanup().catch(e => console.warn('Cleanup error (non-fatal):', e.message));
  }
  process.exit(pass ? 0 : 1);
}

main();
