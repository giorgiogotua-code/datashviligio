-- ============================================================
--  Migration 005 — capture cost at sale time (real margin)
--  sale_items now stores unit_cost (the product's purchase_price
--  at the moment of sale), so profit = revenue − COGS stays
--  accurate even if a product's cost changes later.
--  Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0;

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
  v_sale  sales;
  v_item  JSONB;
  v_dir   INTEGER := CASE WHEN p_type = 'return' THEN 1 ELSE -1 END;
  v_pid   UUID;
  v_qty   INTEGER;
  v_avail INTEGER;
  v_cost  NUMERIC;
BEGIN
  INSERT INTO sales(total, discount, payment_method, items_count, is_fiscal, fiscal_status, type, reversal_of)
  VALUES (p_total, COALESCE(p_discount, 0), p_payment_method, p_items_count, p_is_fiscal,
          CASE WHEN p_is_fiscal THEN 'pending' ELSE 'none' END, p_type, p_reversal_of)
  RETURNING * INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid  := NULLIF(v_item->>'product_id','')::uuid;
    v_qty  := (v_item->>'quantity')::int;
    v_cost := 0;

    -- Look up (and lock) the product to read its cost and current stock.
    IF v_pid IS NOT NULL THEN
      SELECT quantity, purchase_price INTO v_avail, v_cost FROM products WHERE id = v_pid FOR UPDATE;
      IF p_type = 'sale' AND v_avail IS NOT NULL AND v_avail < v_qty THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%', COALESCE(v_item->>'product_name','?'), v_avail
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    INSERT INTO sale_items(sale_id, product_id, product_name, barcode, quantity, unit_price, total_price, unit_cost)
    VALUES (
      v_sale.id, v_pid,
      v_item->>'product_name',
      v_item->>'barcode',
      v_qty,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric,
      COALESCE(v_cost, 0)
    );

    IF v_pid IS NOT NULL THEN
      UPDATE products
        SET quantity = GREATEST(0, quantity + v_dir * v_qty)
        WHERE id = v_pid;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(si)), '[]'::jsonb) FROM sale_items si WHERE si.sale_id = v_sale.id)
  );
END;
$$;
