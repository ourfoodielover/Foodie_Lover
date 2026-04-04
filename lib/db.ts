// ─── Foodie Lover — SQLite Database Layer ────────────────────────────────────
// Uses Node.js 22 built-in node:sqlite (no external package needed)
// Database file: ./foodie.db (relative to project root)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => NodeSQLiteDB;
};

import path from 'path';
import fs from 'fs';

// ─── Type stubs for node:sqlite ───────────────────────────────────────────────
interface NodeSQLiteDB {
  exec(sql: string): void;
  prepare(sql: string): NodeSQLiteStatement;
  close(): void;
}
interface NodeSQLiteStatement {
  run(...params: unknown[]): { lastInsertRowid: number | bigint; changes: number };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

// ─── Singleton DB ─────────────────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), 'foodie.db');

let _db: NodeSQLiteDB | null = null;

export function getDB(): NodeSQLiteDB {
  if (_db) return _db;
  _db = new DatabaseSync(DB_PATH);
  initSchema(_db);
  return _db;
}

// ─── Schema initialization ────────────────────────────────────────────────────
function initSchema(db: NodeSQLiteDB) {
  db.exec(`PRAGMA journal_mode=WAL;`);
  db.exec(`PRAGMA foreign_keys=ON;`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      UNIQUE(restaurant_id, username)
    );

    CREATE TABLE IF NOT EXISTS shift_logs (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      restaurant_id TEXT NOT NULL,
      shift_start TEXT NOT NULL,
      shift_end TEXT,
      orders_served INTEGER NOT NULL DEFAULT 0,
      revenue_handled REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE,
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      badge TEXT NOT NULL DEFAULT '',
      available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      active INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      order_number INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      table_id TEXT,
      tab_id TEXT,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      phone TEXT,
      status TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      discount_reason TEXT NOT NULL DEFAULT '',
      tip REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cod',
      tracking_token TEXT UNIQUE,
      delivery_address TEXT,
      delivery_person TEXT,
      cancel_reason TEXT,
      source TEXT NOT NULL DEFAULT 'in-store',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      menu_item_id TEXT,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      item_status TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      performed_by TEXT NOT NULL DEFAULT 'system',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customer_tabs (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      table_id TEXT,
      customer_name TEXT NOT NULL,
      party_size INTEGER NOT NULL DEFAULT 1,
      tab_status TEXT NOT NULL DEFAULT 'open',
      total_amount REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      discount_reason TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT 'cod',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT,
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      added_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);
    CREATE INDEX IF NOT EXISTS idx_staff_restaurant ON staff(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_menu_restaurant ON menu_items(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_tabs_restaurant ON customer_tabs(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shift_logs(staff_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_restaurant ON expenses(restaurant_id);
  `);

  // Seed default restaurant if none exists
  const existing = db.prepare('SELECT id FROM restaurants LIMIT 1').get();
  if (!existing) {
    seedDefaults(db);
  }
}

// ─── Seed default data ────────────────────────────────────────────────────────
function seedDefaults(db: NodeSQLiteDB) {
  const rid = 'rest_default';
  db.prepare('INSERT OR IGNORE INTO restaurants(id, name) VALUES(?,?)').run(rid, 'Foodie Lover');

  // Default tables (T1–T10)
  for (let i = 1; i <= 10; i++) {
    const tid = `T${i}`;
    db.prepare(
      'INSERT OR IGNORE INTO tables(id, restaurant_id, name, capacity) VALUES(?,?,?,?)'
    ).run(tid, rid, `Table ${String(i).padStart(2, '0')}`, 4);
  }

  // Default menu
  const menu = [
    { id: 'M1',  cat: 'Biryani',   name: 'Chicken Biryani',         price: 280, badge: 'bestseller' },
    { id: 'M2',  cat: 'Biryani',   name: 'Mutton Biryani',          price: 360, badge: 'famous'     },
    { id: 'M3',  cat: 'Biryani',   name: 'Veg Biryani',             price: 200, badge: ''           },
    { id: 'M4',  cat: 'Starters',  name: 'Chicken 65',              price: 200, badge: 'popular'    },
    { id: 'M5',  cat: 'Starters',  name: 'Paneer Tikka',            price: 220, badge: ''           },
    { id: 'M6',  cat: 'Starters',  name: 'Fish Fry',                price: 260, badge: ''           },
    { id: 'M7',  cat: 'Mains',     name: 'Butter Chicken',          price: 320, badge: 'chef'       },
    { id: 'M8',  cat: 'Mains',     name: 'Dal Makhani',             price: 200, badge: ''           },
    { id: 'M9',  cat: 'Mains',     name: 'Palak Paneer',            price: 220, badge: ''           },
    { id: 'M10', cat: 'Breads',    name: 'Butter Naan',             price: 40,  badge: ''           },
    { id: 'M11', cat: 'Breads',    name: 'Tandoori Roti',           price: 25,  badge: ''           },
    { id: 'M12', cat: 'Desserts',  name: 'Gulab Jamun',             price: 80,  badge: 'popular'    },
    { id: 'M13', cat: 'Desserts',  name: 'Kulfi',                   price: 100, badge: ''           },
    { id: 'M14', cat: 'Drinks',    name: 'Mango Lassi',             price: 80,  badge: ''           },
    { id: 'M15', cat: 'Drinks',    name: 'Fresh Lime Soda',         price: 60,  badge: ''           },
    { id: 'M16', cat: 'Drinks',    name: 'Masala Chai',             price: 40,  badge: 'new'        },
  ];

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO menu_items(id, restaurant_id, category, name, price, badge) VALUES(?,?,?,?,?,?)'
  );
  for (const item of menu) {
    stmt.run(item.id, rid, item.cat, item.name, item.price, item.badge);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a short CUID-like unique ID */
export function newId(prefix = ''): string {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}${rnd}`.toUpperCase();
}

/** ISO timestamp string */
export function now(): string {
  return new Date().toISOString();
}

/** Get next order number for a restaurant */
export function nextOrderNum(restaurantId: string): number {
  const db = getDB();
  const row = db.prepare(
    'SELECT COALESCE(MAX(order_number),0)+1 AS n FROM orders WHERE restaurant_id = ?'
  ).get(restaurantId) as { n: number };
  return row.n;
}
