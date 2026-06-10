-- ============================================================
--  Migration 002 — Cart discounts + Held (parked) carts
--  Run this once in Supabase → SQL Editor → New query.
--  Safe to re-run.
-- ============================================================

-- ---- 1. Discount column on sales (final total stays in `total`) ----
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- ---- 2. Held carts (parked sales waiting at the counter) ----
CREATE TABLE IF NOT EXISTS held_carts (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  label          TEXT,                                  -- optional note / customer name
  items          JSONB NOT NULL DEFAULT '[]',           -- cart line items (product_id, name, unit_price, quantity, ...)
  discount       DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- computed discount amount
  discount_type  TEXT CHECK (discount_type IN ('amount','percent')),
  discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- raw value the cashier typed (₾ or %)
  total          DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- final total snapshot (after discount)
  items_count    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_held_carts_created ON held_carts(created_at);

ALTER TABLE held_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated full access" ON held_carts;
CREATE POLICY "authenticated full access" ON held_carts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---- 3. Extend create_sale with p_discount ----
--  Drop the old signature first so we don't create an overload.
DROP FUNCTION IF EXISTS create_sale(NUMERIC, TEXT, INTEGER, BOOLEAN, JSONB, TEXT, UUID);

CREATE OR REPLACE FUNCTION create_sale(
  p_total          NUMERIC,
  p_payment_method TEXT,
  p_items_count    INTEGER,
  p_is_fiscal      BOOLEAN,
  p_items          JSONB,
  p_type           TEXT DEFAULT 'sale',
  p_reversal_of    UUID DEFAULT NULL,
  p_discount       NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_sale sales;
  v_item JSONB;
  v_dir  INTEGER := CASE WHEN p_type = 'return' THEN 1 ELSE -1 END;
BEGIN
  INSERT INTO sales(total, discount, payment_method, items_count, is_fiscal, fiscal_status, type, reversal_of)
  VALUES (p_total, COALESCE(p_discount, 0), p_payment_method, p_items_count, p_is_fiscal,
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
