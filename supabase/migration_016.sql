-- ─── migration_016: reward_coupons → orders FK: RESTRICT → ON DELETE SET NULL ──
--
-- WHY: reward_coupons has three columns that reference orders(id).  The original
-- constraints used default RESTRICT behaviour, which prevents any row in orders
-- from being deleted while a coupon still references it.  This caused:
--
--   "update or delete on table 'orders' violates foreign key constraint
--    reward_coupons_source_order_id_fkey on table 'reward_coupons'"
--
-- The correct semantic is ON DELETE SET NULL: when an order is deleted, the
-- coupon loses its back-reference but remains valid for the customer to redeem.
--
-- Three constraints are affected:
--   • reward_coupons_source_order_id_fkey   (source_order_id   — already nullable via migration_012)
--   • reward_coupons_reserved_order_id_fkey (reserved_order_id — always nullable)
--   • reward_coupons_redeemed_order_id_fkey (redeemed_order_id — always nullable)
--
-- SAFE TO RUN: All three columns are already nullable, so ON DELETE SET NULL is
-- valid.  The DROP + ADD pattern is the only way to change ON DELETE behaviour
-- in Postgres — ALTER CONSTRAINT cannot change it.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. source_order_id
ALTER TABLE reward_coupons
  DROP CONSTRAINT IF EXISTS reward_coupons_source_order_id_fkey;

ALTER TABLE reward_coupons
  ADD CONSTRAINT reward_coupons_source_order_id_fkey
  FOREIGN KEY (source_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;

-- 2. reserved_order_id
ALTER TABLE reward_coupons
  DROP CONSTRAINT IF EXISTS reward_coupons_reserved_order_id_fkey;

ALTER TABLE reward_coupons
  ADD CONSTRAINT reward_coupons_reserved_order_id_fkey
  FOREIGN KEY (reserved_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;

-- 3. redeemed_order_id
ALTER TABLE reward_coupons
  DROP CONSTRAINT IF EXISTS reward_coupons_redeemed_order_id_fkey;

ALTER TABLE reward_coupons
  ADD CONSTRAINT reward_coupons_redeemed_order_id_fkey
  FOREIGN KEY (redeemed_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;
