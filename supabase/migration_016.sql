-- ─── migration_016: Fix all FK constraints that block order deletion ──────────
--
-- WHY: Deleting from `orders` hits two separate FK constraint paths:
--
--  PATH A (direct RESTRICT back-refs from reward_coupons → orders):
--    reward_coupons.source_order_id   → orders(id)  RESTRICT
--    reward_coupons.reserved_order_id → orders(id)  RESTRICT
--    reward_coupons.redeemed_order_id → orders(id)  RESTRICT
--    Fix: ON DELETE SET NULL  (coupon survives order deletion, ref nulled)
--
--  PATH B (cascade chain blocked by reward_coupons → spin_results):
--    spin_results.order_id → orders(id)  ON DELETE CASCADE  (migration_011)
--    reward_coupons.spin_id → spin_results(id)  RESTRICT
--    When Postgres cascades order → spin_results, the spin_id RESTRICT blocks it.
--    Fix: ON DELETE CASCADE  (coupon is deleted when its spin_result is deleted)
--
-- After this migration, deleting an order automatically:
--   • Cascades to spin_results (existing behaviour)
--   • Cascades spin_results → reward_coupons (new — coupon deleted with its spin)
--   • Nulls source/reserved/redeemed_order_id on any coupon from another order
--
-- SAFE TO RUN: DROP CONSTRAINT IF EXISTS is idempotent.  All three source/
-- reserved/redeemed columns are already nullable (migration_012).  The spin_id
-- column is NOT NULL, which is compatible with ON DELETE CASCADE.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── PATH B: spin_id → ON DELETE CASCADE ──────────────────────────────────────

ALTER TABLE reward_coupons
  DROP CONSTRAINT IF EXISTS reward_coupons_spin_id_fkey;

ALTER TABLE reward_coupons
  ADD CONSTRAINT reward_coupons_spin_id_fkey
  FOREIGN KEY (spin_id)
  REFERENCES spin_results(id)
  ON DELETE CASCADE;

-- ── PATH A: order back-refs → ON DELETE SET NULL ──────────────────────────────

ALTER TABLE reward_coupons
  DROP CONSTRAINT IF EXISTS reward_coupons_source_order_id_fkey;

ALTER TABLE reward_coupons
  ADD CONSTRAINT reward_coupons_source_order_id_fkey
  FOREIGN KEY (source_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;

ALTER TABLE reward_coupons
  DROP CONSTRAINT IF EXISTS reward_coupons_reserved_order_id_fkey;

ALTER TABLE reward_coupons
  ADD CONSTRAINT reward_coupons_reserved_order_id_fkey
  FOREIGN KEY (reserved_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;

ALTER TABLE reward_coupons
  DROP CONSTRAINT IF EXISTS reward_coupons_redeemed_order_id_fkey;

ALTER TABLE reward_coupons
  ADD CONSTRAINT reward_coupons_redeemed_order_id_fkey
  FOREIGN KEY (redeemed_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;
