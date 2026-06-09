-- ============================================================
--  AccessoryShop POS — Database Schema
--  Run this whole file in Supabase → SQL Editor → New query.
--  Safe to re-run: it drops and recreates everything.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean slate (so the file can be re-run without errors)
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ============================================================
--  CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES categories(id) ON DELETE CASCADE,
  icon       TEXT,                       -- lucide icon name (e.g. 'smartphone'), NULL for sub-categories
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================================
--  PRODUCTS
-- ============================================================
CREATE TABLE products (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT NOT NULL,
  barcode        TEXT,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sale_price     DECIMAL(10, 2) NOT NULL DEFAULT 0,
  quantity       INTEGER NOT NULL DEFAULT 0,
  photo_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode  ON products(barcode);

-- ============================================================
--  SALES (one row per receipt)
-- ============================================================
CREATE TABLE sales (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  total          DECIMAL(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card')) NOT NULL,
  items_count    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sales_created ON sales(created_at);

-- ============================================================
--  SALE ITEMS (line items per receipt — denormalized so the
--  receipt stays readable even if the product is later deleted)
-- ============================================================
CREATE TABLE sale_items (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id      UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  barcode      TEXT,
  quantity     INTEGER NOT NULL,
  unit_price   DECIMAL(10, 2) NOT NULL,
  total_price  DECIMAL(10, 2) NOT NULL
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ============================================================
--  SETTINGS (key-value)
-- ============================================================
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT INTO settings (key, value) VALUES
  ('companyName', 'AccessoryShop'),
  ('companyId',   ''),
  ('address',     ''),
  ('phone',       ''),
  ('pin',         '1234');     -- in-app quick-lock PIN (separate from the real login)

-- ============================================================
--  ROW LEVEL SECURITY
--  Admin-only portal: any signed-in (authenticated) user has
--  full access; anonymous visitors have none.
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated full access" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON products   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON sales      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON settings   FOR ALL TO authenticated USING (true) WITH CHECK (true);
