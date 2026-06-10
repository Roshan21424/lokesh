const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isPkg = typeof process.pkg !== 'undefined';

const DB_DIR = isPkg
  ? path.join(path.dirname(process.execPath), 'data')
  : path.join(__dirname, 'data');

const DB_PATH = path.join(DB_DIR, 'restaurant.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

console.log('Database:', DB_PATH);
// Safety pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','staff')),
    is_active  INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active  INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name            TEXT    NOT NULL COLLATE NOCASE,
    price           REAL    NOT NULL CHECK(price >= 0),
    tax_rate        REAL    NOT NULL DEFAULT 0 CHECK(tax_rate >= 0 AND tax_rate <= 100),
    is_available    INTEGER NOT NULL DEFAULT 1 CHECK(is_available IN (0,1)),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
    replaced_by_id  INTEGER REFERENCES menu_items(id),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE(category_id, name)
  );

  CREATE TABLE IF NOT EXISTS bill_calculations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    type       TEXT    NOT NULL CHECK(type IN ('percentage','flat')),
    value      REAL    NOT NULL,
    is_deduction INTEGER NOT NULL DEFAULT 0 CHECK(is_deduction IN (0,1)),
    is_active  INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number  INTEGER NOT NULL UNIQUE,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    status       TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open','billed','cancelled')),
    order_type   TEXT    NOT NULL DEFAULT 'dine-in' CHECK(order_type IN ('dine-in','takeaway','delivery')),
    table_label  TEXT,
    customer_name TEXT,
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    billed_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id             INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    menu_item_id         INTEGER NOT NULL REFERENCES menu_items(id),
    item_name_snapshot   TEXT    NOT NULL,
    category_name_snapshot TEXT  NOT NULL,
    qty                  INTEGER NOT NULL CHECK(qty > 0),
    unit_price_snapshot  REAL    NOT NULL CHECK(unit_price_snapshot >= 0),
    tax_rate_snapshot    REAL    NOT NULL CHECK(tax_rate_snapshot >= 0),
    line_total           REAL    NOT NULL CHECK(line_total >= 0)
  );

  CREATE TABLE IF NOT EXISTS bills (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         INTEGER NOT NULL UNIQUE REFERENCES orders(id),
    bill_number      INTEGER NOT NULL UNIQUE,
    subtotal         REAL    NOT NULL CHECK(subtotal >= 0),
    calculations_json TEXT   NOT NULL DEFAULT '[]',
    grand_total      REAL    NOT NULL CHECK(grand_total >= 0),
    payment_mode     TEXT    NOT NULL CHECK(payment_mode IN ('cash','upi','card','other')),
    billed_by_name   TEXT    NOT NULL,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bill_sequence (
    id  INTEGER PRIMARY KEY CHECK(id = 1),
    seq INTEGER NOT NULL DEFAULT 1000
  );

  INSERT OR IGNORE INTO bill_sequence(id, seq) VALUES(1, 1000);

  INSERT OR IGNORE INTO settings(key, value) VALUES
    ('restaurant_name', 'My Restaurant'),
    ('address', ''),
    ('gstin', ''),
    ('phone', ''),
    ('receipt_footer', 'Thank you for dining with us!');
`);

// Create default admin if none exists
const bcrypt = require('bcryptjs');
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 12);
  db.prepare('INSERT INTO users(username, password, role) VALUES(?,?,?)').run('admin', hash, 'admin');
  console.log('Default admin created: admin / admin123 — CHANGE THIS PASSWORD!');
}

module.exports = db;