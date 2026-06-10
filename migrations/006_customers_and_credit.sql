-- ============================================================
--  Migration 006 — Customers + credit sales (ნისია)
--  Sell on credit (fully or partially); track what each customer
--  owes us and record their repayments.
--  Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- ---- Customers ----
CREATE TABLE IF NOT EXISTS customers (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  note       TEXT,
  balance    DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- amount the customer OWES US (positive = their debt)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Customer payments (repayments toward their debt) ----
CREATE TABLE IF NOT EXISTS customer_payments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount      DECIMAL(10, 2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customer_id);

-- ---- Sales: link to a customer + record how much was paid at sale time ----
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS paid          DECIMAL(10, 2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

-- Allow 'credit' as a payment method.
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD  CONSTRAINT sales_payment_method_check CHECK (payment_method IN ('cash','card','credit'));

-- ---- RLS ----
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated full access" ON customers;
DROP POLICY IF EXISTS "authenticated full access" ON customer_payments;
CREATE POLICY "authenticated full access" ON customers         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON customer_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
--  create_sale v3 — adds customer + paid; unpaid remainder of a
--  credit sale is added to the customer's balance (their debt).
-- ============================================================
DROP FUNCTION IF EXISTS create_sale(NUMERIC, TEXT, INTEGER, BOOLEAN, JSONB, TEXT, UUID, NUMERIC);

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
  p_paid           NUMERIC DEFAULT NULL
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
  v_paid  NUMERIC := COALESCE(p_paid, p_total);  -- non-credit sales are fully paid
BEGIN
  INSERT INTO sales(total, discount, payment_method, items_count, is_fiscal, fiscal_status,
                    type, reversal_of, customer_id, customer_name, paid)
  VALUES (p_total, COALESCE(p_discount, 0), p_payment_method, p_items_count, p_is_fiscal,
          CASE WHEN p_is_fiscal THEN 'pending' ELSE 'none' END, p_type, p_reversal_of,
          p_customer_id, p_customer_name, v_paid)
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
      UPDATE products
        SET quantity = GREATEST(0, quantity + v_dir * v_qty)
        WHERE id = v_pid;
    END IF;
  END LOOP;

  -- Unpaid remainder of a credit sale becomes the customer's debt.
  IF p_customer_id IS NOT NULL AND p_type = 'sale' THEN
    UPDATE customers SET balance = balance + (p_total - v_paid) WHERE id = p_customer_id;
  END IF;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(si)), '[]'::jsonb) FROM sale_items si WHERE si.sale_id = v_sale.id)
  );
END;
$$;

-- ============================================================
--  PAY CUSTOMER — record a repayment and lower their debt.
-- ============================================================
CREATE OR REPLACE FUNCTION pay_customer(
  p_customer_id UUID,
  p_amount      NUMERIC,
  p_note        TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_payment customer_payments;
  v_customer customers;
BEGIN
  INSERT INTO customer_payments(customer_id, amount, note)
  VALUES (p_customer_id, p_amount, p_note)
  RETURNING * INTO v_payment;

  UPDATE customers SET balance = balance - p_amount
    WHERE id = p_customer_id
    RETURNING * INTO v_customer;

  RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'customer', to_jsonb(v_customer));
END;
$$;
