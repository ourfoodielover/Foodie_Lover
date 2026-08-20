-- ─── migration_018: Atomic spin reward allocation ────────────────────────────
--
-- Adds the perform_spin() PostgreSQL function, which replaces the previous
-- application-side read-check-write pattern with a fully atomic transaction:
--
--   1. Acquire FOR UPDATE row-level locks on every spin_rewards row in the pool
--      (in consistent id ORDER to prevent deadlock).
--   2. Check daily/monthly win limits inside the lock — no concurrent transaction
--      can insert a coupon for the same reward until we commit.
--   3. Pick a reward by weighted probability from the eligible (within-limit) set.
--   4. Insert spin_results (UNIQUE constraint serialises same-order/tab races).
--   5. Insert reward_coupons in the same transaction — auto-rolled-back on error.
--
-- GUARANTEES delivered:
--   • Same order/tab + simultaneous requests  → exactly one spin_result, one coupon
--   • Different orders, daily_win_limit = 1   → exactly one coupon issued that day
--   • Different orders, monthly_win_limit = 1 → exactly one coupon issued that month
--   • Failed transaction                       → no orphan coupon or spin result
--   • All-limits-exhausted fallback            → spin recorded as no_reward (no coupon)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.perform_spin(
  p_spin_id        TEXT,
  p_order_id       TEXT,      -- NULL for tab-based spins
  p_tab_id         TEXT,      -- NULL for order-based spins
  p_restaurant_id  TEXT,
  p_email          TEXT,
  p_phone          TEXT,
  p_timezone       TEXT,      -- IANA tz from spin_config.timezone (e.g. 'Asia/Kolkata')
  p_reward_ids     TEXT[]     -- active non-archived reward IDs to consider
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start    TIMESTAMPTZ;
  v_month_start    TIMESTAMPTZ;
  v_reward         spin_rewards%ROWTYPE;
  v_eligible_ids   TEXT[]  := ARRAY[]::TEXT[];
  v_eligible_wts   FLOAT[] := ARRAY[]::FLOAT[];
  v_no_rwd_ids     TEXT[]  := ARRAY[]::TEXT[];
  v_no_rwd_wts     FLOAT[] := ARRAY[]::FLOAT[];
  v_daily_count    BIGINT;
  v_monthly_count  BIGINT;
  v_chosen_id      TEXT;
  v_chosen         spin_rewards%ROWTYPE;
  v_is_winner      BOOLEAN;
  v_force_no_win   BOOLEAN := false;
  v_total_w        FLOAT   := 0;
  v_rand           FLOAT;
  v_cumul          FLOAT;
  v_i              INT;
  v_coupon_id      TEXT;
  v_coupon_code    TEXT;
  v_expires_at     TIMESTAMPTZ;
BEGIN
  -- ── 0. Timezone-aware day/month boundaries ──────────────────────────────────
  -- Use restaurant's configured timezone so daily limits reset at local midnight,
  -- not UTC midnight. Matches the intent of spin_config.timezone.
  v_today_start := date_trunc('day',   now() AT TIME ZONE p_timezone) AT TIME ZONE p_timezone;
  v_month_start := date_trunc('month', now() AT TIME ZONE p_timezone) AT TIME ZONE p_timezone;

  -- ── 1. Idempotency fast-path (before acquiring locks) ──────────────────────
  IF p_order_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM spin_results WHERE order_id = p_order_id) THEN
      RETURN jsonb_build_object('already_spun', true);
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM spin_results WHERE tab_id = p_tab_id) THEN
      RETURN jsonb_build_object('already_spun', true);
    END IF;
  END IF;

  -- ── 2. Lock all reward rows (prevents concurrent limit over-spend) ───────────
  -- ORDER BY id gives a deterministic lock-acquisition order, which prevents
  -- deadlocks even when two transactions share only a subset of reward IDs.
  -- Any concurrent perform_spin() that shares at least one reward ID will BLOCK
  -- on the first shared row until this transaction commits.
  FOR v_reward IN
    SELECT * FROM spin_rewards
    WHERE id = ANY(p_reward_ids)
    ORDER BY id
    FOR UPDATE
  LOOP
    IF v_reward.reward_type = 'no_reward' THEN
      -- no_reward is always eligible (no coupon issued, no limit to check)
      v_eligible_ids := array_append(v_eligible_ids, v_reward.id);
      v_eligible_wts := array_append(v_eligible_wts, v_reward.weight::FLOAT);
      v_no_rwd_ids   := array_append(v_no_rwd_ids,   v_reward.id);
      v_no_rwd_wts   := array_append(v_no_rwd_wts,   v_reward.weight::FLOAT);
      CONTINUE;
    END IF;

    -- Daily limit check — count is now stable: no other transaction can
    -- insert a coupon for this reward_id until we release the FOR UPDATE lock.
    IF v_reward.daily_win_limit IS NOT NULL THEN
      SELECT COUNT(*) INTO v_daily_count
      FROM reward_coupons
      WHERE reward_id = v_reward.id
        AND issued_at >= v_today_start;
      IF v_daily_count >= v_reward.daily_win_limit THEN
        CONTINUE; -- Reward exhausted for today; skip
      END IF;
    END IF;

    -- Monthly limit check (same guarantee)
    IF v_reward.monthly_win_limit IS NOT NULL THEN
      SELECT COUNT(*) INTO v_monthly_count
      FROM reward_coupons
      WHERE reward_id = v_reward.id
        AND issued_at >= v_month_start;
      IF v_monthly_count >= v_reward.monthly_win_limit THEN
        CONTINUE; -- Reward exhausted for this month; skip
      END IF;
    END IF;

    v_eligible_ids := array_append(v_eligible_ids, v_reward.id);
    v_eligible_wts := array_append(v_eligible_wts, v_reward.weight::FLOAT);
  END LOOP;

  -- ── 3. Fallback: all winning rewards exhausted ──────────────────────────────
  IF array_length(v_eligible_ids, 1) IS NULL THEN
    IF array_length(v_no_rwd_ids, 1) IS NOT NULL THEN
      -- Use "Better Luck Next Time" entries — safe fallback, no coupon issued
      v_eligible_ids := v_no_rwd_ids;
      v_eligible_wts := v_no_rwd_wts;
    ELSE
      -- Edge case: admin has only winning rewards, all now capped, none has no_reward.
      -- Use first pool entry as a structural placeholder and force no-win outcome.
      SELECT id INTO v_chosen_id FROM spin_rewards WHERE id = ANY(p_reward_ids) ORDER BY id LIMIT 1;
      v_eligible_ids := ARRAY[v_chosen_id];
      v_eligible_wts := ARRAY[1.0];
      v_force_no_win := true;
    END IF;
  END IF;

  -- ── 4. Weighted random selection ────────────────────────────────────────────
  v_total_w := 0;
  FOR v_i IN 1..array_length(v_eligible_wts, 1) LOOP
    v_total_w := v_total_w + v_eligible_wts[v_i];
  END LOOP;

  v_rand  := random() * v_total_w;
  v_cumul := 0;
  v_chosen_id := v_eligible_ids[array_length(v_eligible_ids, 1)]; -- safety fallback = last

  FOR v_i IN 1..array_length(v_eligible_ids, 1) LOOP
    v_cumul := v_cumul + v_eligible_wts[v_i];
    IF v_rand <= v_cumul THEN
      v_chosen_id := v_eligible_ids[v_i];
      EXIT;
    END IF;
  END LOOP;

  SELECT * INTO v_chosen FROM spin_rewards WHERE id = v_chosen_id;
  v_is_winner := (NOT v_force_no_win) AND (v_chosen.reward_type IS DISTINCT FROM 'no_reward');

  -- ── 5. Insert spin result ────────────────────────────────────────────────────
  -- UNIQUE(order_id) / UNIQUE INDEX ON tab_id serialises same-order/tab races:
  -- the second concurrent INSERT will raise a unique_violation, which we catch
  -- and return already_spun so the caller fetches the existing result.
  BEGIN
    INSERT INTO spin_results (id, order_id, tab_id, reward_id, is_winner, customer_email, customer_phone)
    VALUES (p_spin_id, p_order_id, p_tab_id, v_chosen_id, v_is_winner, p_email, p_phone);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('already_spun', true, 'race', true);
  END;

  -- ── 6. Issue coupon (same transaction — rolls back atomically on failure) ────
  IF v_is_winner THEN
    v_coupon_id  := 'CPN' || replace(gen_random_uuid()::text, '-', '');
    v_expires_at := now() + (v_chosen.expires_days * INTERVAL '1 day');

    -- Retry up to 10 times on coupon_code uniqueness collision (astronomically rare)
    FOR v_i IN 1..10 LOOP
      v_coupon_code := 'FL-' || upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 6));
      BEGIN
        INSERT INTO reward_coupons (
          id, coupon_code, spin_id, reward_id, reward_type, reward_value,
          free_item_id, label, customer_email, customer_phone,
          issued_at, expires_at, min_next_order, status,
          max_discount, bogo_eligible_items, bogo_eligible_categories, max_free_item_value,
          source_order_id, source_tab_id
        ) VALUES (
          v_coupon_id,
          v_coupon_code,
          p_spin_id,
          v_chosen_id,
          v_chosen.reward_type,
          v_chosen.reward_value,
          v_chosen.free_item_id,
          v_chosen.label,
          p_email,
          p_phone,
          now(),
          v_expires_at,
          v_chosen.min_next_order,
          'active',
          v_chosen.max_discount,
          v_chosen.bogo_eligible_items,
          v_chosen.bogo_eligible_categories,
          v_chosen.max_free_item_value,
          p_order_id,
          p_tab_id
        );
        EXIT; -- success — leave retry loop
      EXCEPTION WHEN unique_violation THEN
        NULL; -- coupon_code collision: retry with a new code
      END;
    END LOOP;
  END IF;

  -- ── 7. Return allocation result ──────────────────────────────────────────────
  RETURN jsonb_build_object(
    'spin_id',       p_spin_id,
    'reward_id',     v_chosen_id,
    'reward_label',  v_chosen.label,
    'reward_type',   v_chosen.reward_type,
    'reward_value',  v_chosen.reward_value::FLOAT,
    'is_winner',     v_is_winner,
    'coupon_id',     CASE WHEN v_is_winner THEN v_coupon_id   ELSE NULL END,
    'coupon_code',   CASE WHEN v_is_winner THEN v_coupon_code ELSE NULL END,
    'expires_at',    CASE WHEN v_is_winner THEN v_expires_at  ELSE NULL END
  );
END;
$$;

-- Allow the service-role backend client to call this function
GRANT EXECUTE ON FUNCTION public.perform_spin TO service_role;
