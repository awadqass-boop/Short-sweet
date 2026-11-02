-- Run this ONCE in the existing short-sweet-orders D1 database Console.
-- It upgrades the database created from the earlier schema.

ALTER TABLE orders ADD COLUMN delivery_address TEXT;
ALTER TABLE orders ADD COLUMN recipient_phone TEXT;
ALTER TABLE orders ADD COLUMN delivery_fee REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN payment_link TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_orders_preferred_date ON orders(preferred_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Reset availability rows to the current menu. Existing rows are harmless.
INSERT OR IGNORE INTO product_availability(product_id,available) VALUES
('khaliya_mini',1),('khaliya_regular',1),('khaliya_family',1),
('shorties_jar',1),('shorties_box4',1),('shorties_box10',1),
('bowl_large_1',1),('bowl_large_2',1),('bowl_large_3',1),
('bowl_medium_1',1),('bowl_medium_2',1),('bowl_medium_3',1),
('bowl_small_1',1),('bowl_small_2',1),('bowl_small_3',1),
('bowl_mini_1',1),('bowl_mini_2',1),('bowl_mini_3',1),
('voucher_50',1),('voucher_100',1),('voucher_150',1),
('flavour:cc-dark',1),('flavour:cc-white',1),('flavour:cc-mixed',1),
('flavour:pistachio',1),('flavour:caramel',1);