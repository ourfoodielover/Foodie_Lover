-- ============================================================
-- Foodie Lover POS — Migration 001
-- Run in: https://supabase.com/dashboard/project/unmvkybtmjdpdwpzeydk/sql/new
-- Adds missing columns to customer_tabs
-- ============================================================

ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS discount        NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS discount_reason TEXT;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS payment_method  TEXT DEFAULT 'cod';
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS customer_name   TEXT;
ALTER TABLE customer_tabs ADD COLUMN IF NOT EXISTS party_size      INTEGER NOT NULL DEFAULT 1;
