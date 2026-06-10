-- ============================================================
--  Migration 009 — Returns reverse customer credit debt
--  When a credit (ნისია) sale is returned, the customer's debt
--  must drop by the returned amount. Previously create_sale only
--  adjusted customers.balance for type='sale'.
--  Same 14-param signature as before → CREATE OR REPLACE, no DROP,
--  no overload, no deploy-ordering concern.
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
  p_discount       NUMERIC DEFAULT 0,
  p_customer_id    UUID DEFAULT NULL,
  p_customer_name  TEXT DEFAULT NULL,
  p_paid           NUMERIC DEFAULT NULL,
  p_shift_id       UUID DEFAULT NULL,
  p_cashier_id     UUID DEFAULT NULL,
  p_cashier_name   TEXT DEFAULT NULL
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
  v_paid  NUMERIC := COALESCE(p_paid, p_total);
BEGIN
  INSERT INTO sales(total, discount, payment_method, items_count, is_fiscal, fiscal_status,
                    type, reversal_of, customer_id, customer_name, paid, shift_id, cashier_id, cashier_name)
  VALUES (p_total, COALESCE(p_discount, 0), p_payment_method, p_items_count, p_is_fiscal,
          CASE WHEN p_is_fiscal THEN 'pending' ELSE 'none' END, p_type, p_reversal_of,
          p_customer_id, p_customer_name, v_paid, p_shift_id, p_cashier_id, p_cashier_name)
  RETURNING * INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid  := NULLIF(v_item->>'product_id','')::uuid;
    v_qty  := (v_item->>'quantity')::int;
    v_cost := 0;

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
      UPDATE products SET quantity = GREATEST(0, quantity + v_dir * v_qty) WHERE id = v_pid;
    END IF;
  END LOOP;

  -- Customer balance: a credit sale adds the unpaid remainder to the debt;
  -- a return of a customer-linked sale lowers the debt by the returned amount.
  IF p_customer_id IS NOT NULL THEN
    IF p_type = 'return' THEN
      UPDATE customers SET balance = balance - p_total WHERE id = p_customer_id;
    ELSE
      UPDATE customers SET balance = balance + (p_total - v_paid) WHERE id = p_customer_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(si)), '[]'::jsonb) FROM sale_items si WHERE si.sale_id = v_sale.id)
  );
END;
$$;
