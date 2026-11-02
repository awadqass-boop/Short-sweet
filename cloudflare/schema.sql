CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
  delivery_address TEXT,
  preferred_date TEXT,
  preferred_time TEXT,
  is_gift INTEGER NOT NULL DEFAULT 0,
  recipient_name TEXT,
  recipient_phone TEXT,
  gift_message TEXT,
  hide_price INTEGER NOT NULL DEFAULT 0,
  notification_preference TEXT,
  promo_code TEXT,
  items_json TEXT NOT NULL,
  total_aed REAL NOT NULL,
  delivery_fee REAL NOT NULL DEFAULT 0,
  payment_link TEXT NOT NULL DEFAULT '',
  paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_availability (
  product_id TEXT PRIMARY KEY,
  available INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_preferred_date ON orders(preferred_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);