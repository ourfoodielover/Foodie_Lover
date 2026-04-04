-- ============================================================
-- Foodie Lover POS — Supabase Schema
-- Run once in: https://supabase.com/dashboard/project/unmvkybtmjdpdwpzeydk/sql/new
-- ============================================================

-- ─── TABLES ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS restaurants (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT 'Foodie Lover',
  timezone   TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL,
  pin           TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('waiter','kitchen','delivery','manager','admin')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  capacity      INTEGER NOT NULL DEFAULT 4,
  status        TEXT NOT NULL DEFAULT 'available',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  description   TEXT,
  badge         TEXT,
  img_url       TEXT,
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_tabs (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id      TEXT REFERENCES tables(id),
  waiter_id     TEXT,
  waiter_name   TEXT,
  status        TEXT NOT NULL DEFAULT 'open',
  total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  restaurant_id    TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number     INTEGER NOT NULL,
  type             TEXT NOT NULL DEFAULT 'dine-in' CHECK (type IN ('dine-in','pickup','delivery')),
  table_id         TEXT REFERENCES tables(id),
  tab_id           TEXT REFERENCES customer_tabs(id),
  customer_name    TEXT,
  customer_email   TEXT,
  phone            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_reason  TEXT,
  tip              NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method   TEXT DEFAULT 'cod',
  tracking_token   TEXT,
  delivery_address TEXT,
  delivery_person  TEXT,
  cancel_reason    TEXT,
  source           TEXT NOT NULL DEFAULT 'in-store',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT,
  name         TEXT NOT NULL,
  qty          INTEGER NOT NULL DEFAULT 1,
  price        NUMERIC(10,2) NOT NULL,
  subtotal     NUMERIC(10,2) NOT NULL,
  item_status  TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_events (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  performed_by TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_logs (
  id              TEXT PRIMARY KEY,
  restaurant_id   TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id        TEXT NOT NULL,
  staff_name      TEXT,
  shift_start     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift_end       TIMESTAMPTZ,
  orders_served   INTEGER NOT NULL DEFAULT 0,
  revenue_handled NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  description   TEXT,
  amount        NUMERIC(10,2) NOT NULL,
  date          TEXT NOT NULL,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_type       ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_oid   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_oid  ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff      ON shift_logs(staff_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- RLS must be enabled for Supabase Realtime postgres_changes to work.
-- These open policies are appropriate for an internal POS system.

ALTER TABLE restaurants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables        ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses      ENABLE ROW LEVEL SECURITY;

-- Open policies — all roles can read/write (internal POS app)
DO $$ BEGIN
  CREATE POLICY "all_access" ON restaurants   FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON staff         FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON tables        FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON menu_items    FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON customer_tabs FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON orders        FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON order_items   FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON order_events  FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON shift_logs    FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "all_access" ON expenses      FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── REALTIME PUBLICATION ─────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE order_events;

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

INSERT INTO restaurants (id, name) VALUES ('rest_default', 'Foodie Lover')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO tables (id, restaurant_id, name, capacity) VALUES
  ('tbl_01', 'rest_default', 'T1',  4),
  ('tbl_02', 'rest_default', 'T2',  4),
  ('tbl_03', 'rest_default', 'T3',  4),
  ('tbl_04', 'rest_default', 'T4',  6),
  ('tbl_05', 'rest_default', 'T5',  6),
  ('tbl_06', 'rest_default', 'T6',  4),
  ('tbl_07', 'rest_default', 'T7',  4),
  ('tbl_08', 'rest_default', 'T8',  2),
  ('tbl_09', 'rest_default', 'T9',  2),
  ('tbl_10', 'rest_default', 'T10', 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, restaurant_id, name, category, price, description, badge, available) VALUES
  ('mi_01','rest_default','Chicken Biryani',      'Biryani',  280,'Aromatic basmati rice with tender chicken','bestseller',true),
  ('mi_02','rest_default','Mutton Biryani',        'Biryani',  350,'Slow-cooked mutton with fragrant spices','famous',true),
  ('mi_03','rest_default','Veg Biryani',           'Biryani',  200,'Garden vegetables with saffron rice',NULL,true),
  ('mi_04','rest_default','Paneer Tikka',          'Starters', 220,'Marinated paneer grilled in tandoor','popular',true),
  ('mi_05','rest_default','Chicken 65',            'Starters', 200,'Spicy deep-fried chicken','bestseller',true),
  ('mi_06','rest_default','Veg Manchurian',        'Starters', 160,'Crispy vegetable balls in Indo-Chinese sauce',NULL,true),
  ('mi_07','rest_default','Butter Chicken',        'Mains',    300,'Tender chicken in rich tomato-butter gravy','chef',true),
  ('mi_08','rest_default','Dal Makhani',           'Mains',    180,'Slow-cooked black lentils with cream','popular',true),
  ('mi_09','rest_default','Paneer Butter Masala',  'Mains',    240,'Soft paneer in aromatic masala gravy',NULL,true),
  ('mi_10','rest_default','Garlic Naan',           'Breads',    50,'Freshly baked naan with garlic butter',NULL,true),
  ('mi_11','rest_default','Butter Roti',           'Breads',    30,'Soft whole wheat roti with butter',NULL,true),
  ('mi_12','rest_default','Laccha Paratha',        'Breads',    45,'Layered flaky whole wheat paratha',NULL,true),
  ('mi_13','rest_default','Gulab Jamun',           'Desserts',  80,'Soft milk-solid dumplings in sugar syrup','popular',true),
  ('mi_14','rest_default','Rasgulla',              'Desserts',  70,'Spongy cottage cheese balls in light syrup',NULL,true),
  ('mi_15','rest_default','Mango Lassi',           'Drinks',    90,'Chilled yogurt drink with fresh mango','bestseller',true),
  ('mi_16','rest_default','Masala Chai',           'Drinks',    40,'Spiced tea with milk',NULL,true)
ON CONFLICT (id) DO NOTHING;
