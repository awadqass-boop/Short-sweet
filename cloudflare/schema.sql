CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
  preferred_date TEXT,
  preferred_time TEXT,
  is_gift INTEGER NOT NULL DEFAULT 0,
  recipient_name TEXT,
  gift_message TEXT,
  hide_price INTEGER NOT NULL DEFAULT 0,
  notification_preference TEXT,
  promo_code TEXT,
  items_json TEXT NOT NULL,
  total_aed REAL NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_availability (
  product_id TEXT PRIMARY KEY,
  available INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO product_availability(product_id,available) VALUES
('khaliya_mini',1),('khaliya_regular',1),('khaliya_family',1),
('shorties_jar',1),('shorties_box4',1),('shorties_box10',1),
('voucher_50',1),('voucher_100',1),('voucher_150',1);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);