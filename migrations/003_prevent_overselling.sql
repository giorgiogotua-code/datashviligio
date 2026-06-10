-- ============================================================
--  Migration 003 — Prevent overselling
--  create_sale now rejects a sale if stock is insufficient.
--  Uses SELECT ... FOR UPDATE so two cashiers can't oversell
--  the same product concurrently. The whole function is one
--  transaction, so a rejection rolls back the partial sale.
--  Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

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
BEGIN
  INSERT INTO sales(total, discount, payment_method, items_count, is_fiscal, fiscal_status, type, reversal_of)
  VALUES (p_total, COALESCE(p_discount, 0), p_payment_method, p_items_count, p_is_fiscal,
          CASE WHEN p_is_fiscal THEN 'pending' ELSE 'none' END, p_type, p_reversal_of)
  RETURNING * INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid := NULLIF(v_item->>'product_id','')::uuid;
    v_qty := (v_item->>'quantity')::int;

    INSERT INTO sale_items(sale_id, product_id, product_name, barcode, quantity, unit_price, total_price)
    VALUES (
      v_sale.id, v_pid,
      v_item->>'product_name',
      v_item->>'barcode',
      v_qty,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric
    );

    IF v_pid IS NOT NULL THEN
      -- Lock the product row so concurrent sales can't both pass the check.
      SELECT quantity INTO v_avail FROM products WHERE id = v_pid FOR UPDATE;

      -- For a sale, reject if there isn't enough stock.
      IF p_type = 'sale' AND v_avail IS NOT NULL AND v_avail < v_qty THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%', COALESCE(v_item->>'product_name','?'), v_avail
          USING ERRCODE = 'P0001';
      END IF;

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
