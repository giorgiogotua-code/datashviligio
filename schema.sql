-- ============================================================
--  AccessoryShop POS — Database Schema
--  Run this whole file in Supabase → SQL Editor → New query.
--  Safe to re-run: it drops and recreates everything.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean slate (so the file can be re-run without errors)
DROP TABLE IF EXISTS fiscal_reports CASCADE;
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
  type           TEXT NOT NULL DEFAULT 'sale' CHECK (type IN ('sale','return')),
  reversal_of    UUID REFERENCES sales(id) ON DELETE SET NULL,   -- for returns: original sale
  -- Fiscalization (RS.GE cash register). is_fiscal = was a receipt requested for this sale.
  is_fiscal      BOOLEAN NOT NULL DEFAULT false,
  fiscal_status  TEXT NOT NULL DEFAULT 'none' CHECK (fiscal_status IN ('none','pending','success','failed')),
  fiscal_id      TEXT,            -- receipt number returned by the fiscal device
  fiscal_data    JSONB,           -- full raw response (QR, sequence, device id, ...)
  fiscalized_at  TIMESTAMPTZ,
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
--  FISCAL REPORTS (audit log of Z / X reports from the device)
-- ============================================================
CREATE TABLE fiscal_reports (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type       TEXT NOT NULL CHECK (type IN ('Z','X')),   -- Z = day close, X = mid-day read
  report_id  TEXT,                                       -- report number from the device
  data       JSONB,                                      -- full device response (daily totals, ...)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  ROW LEVEL SECURITY
--  Admin-only portal: any signed-in (authenticated) user has
--  full access; anonymous visitors have none.
-- ============================================================
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated full access" ON categories     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON products       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON sales          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON sale_items     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON settings       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON fiscal_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
--  ATOMIC SALE
--  Insert sale + line items + adjust stock in one transaction.
--  p_type = 'sale' lowers stock, 'return' restores it.
--  SECURITY INVOKER -> runs as the caller, so RLS still applies.
-- ============================================================
CREATE OR REPLACE FUNCTION create_sale(
  p_total          NUMERIC,
  p_payment_method TEXT,
  p_items_count    INTEGER,
  p_is_fiscal      BOOLEAN,
  p_items          JSONB,
  p_type           TEXT DEFAULT 'sale',
  p_reversal_of    UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_sale sales;
  v_item JSONB;
  v_dir  INTEGER := CASE WHEN p_type = 'return' THEN 1 ELSE -1 END;
BEGIN
  INSERT INTO sales(total, payment_method, items_count, is_fiscal, fiscal_status, type, reversal_of)
  VALUES (p_total, p_payment_method, p_items_count, p_is_fiscal,
          CASE WHEN p_is_fiscal THEN 'pending' ELSE 'none' END, p_type, p_reversal_of)
  RETURNING * INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items(sale_id, product_id, product_name, barcode, quantity, unit_price, total_price)
    VALUES (
      v_sale.id,
      NULLIF(v_item->>'product_id','')::uuid,
      v_item->>'product_name',
      v_item->>'barcode',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric
    );

    IF NULLIF(v_item->>'product_id','') IS NOT NULL THEN
      UPDATE products
        SET quantity = GREATEST(0, quantity + v_dir * (v_item->>'quantity')::int)
        WHERE id = (v_item->>'product_id')::uuid;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(si)), '[]'::jsonb) FROM sale_items si WHERE si.sale_id = v_sale.id)
  );
END;
$$;
