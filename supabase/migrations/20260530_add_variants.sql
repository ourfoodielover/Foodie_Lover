-- Migration: Add variants column to menu_items table
-- Run this SQL in your Supabase SQL Editor BEFORE deploying the updated code.
-- Safe to run multiple times (uses IF NOT EXISTS / conditional checks).

-- Add variants column (JSONB array of {name, price} objects)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Optional: GIN index for fast JSONB queries on variants
CREATE INDEX IF NOT EXISTS idx_menu_items_variants
  ON menu_items USING gin(variants);

-- Note: The existing `price` column is kept for backward compatibility.
-- It is always set to the first variant's price (or 0 if no variants).
-- All pricing logic should use the `variants` array.
