-- ============================================================
-- Migration 002 — Delivery Tracking Timestamps
-- Run in: https://supabase.com/dashboard/project/unmvkybtmjdpdwpzeydk/sql/new
-- ============================================================
--
-- Adds two columns to the orders table to track delivery milestones:
--   assigned_at  — set when status transitions to 'out_for_delivery'
--   delivered_at — set when status transitions to 'delivered'
--
-- Also adds delivery_person_id for future staff FK if needed.
-- ============================================================

-- Add assigned_at: timestamp when order was dispatched for delivery
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Add delivered_at: timestamp when delivery was confirmed complete
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add delivery_person_id: optional FK to staff table for delivery person
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_person_id TEXT;

-- ── Index for fast delivery dashboard queries ─────────────────────────────────
-- Helps filter orders by delivery status efficiently
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status
  ON orders (restaurant_id, status)
  WHERE status IN ('out_for_delivery', 'delivered');

-- ── Verify ────────────────────────────────────────────────────────────────────
-- Run this SELECT to confirm the columns were added:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
--   AND column_name IN ('assigned_at', 'delivered_at', 'delivery_person_id')
-- ORDER BY column_name;
