-- ============================================================
--  Migration 007 — Cashiers + Shifts (ცვლები) + Z-report
--  Named cashiers (with a PIN) open/close shifts on the shared
--  terminal. Selling requires an open shift. Closing computes a
--  Z-report snapshot. Run once in Supabase → SQL Editor.
--  Safe to re-run.
-- ============================================================

-- ---- Cashiers (employees who run the till) ----
CREATE TABLE IF NOT EXISTS cashiers (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  pin        TEXT NOT NULL,                      -- 4-digit PIN to open a shift
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Shifts (one per cashier session; Z-report snapshot on close) ----
CREATE TABLE IF NOT EXISTS shifts (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cashier_id    UUID REFERENCES cashiers(id) ON DELETE SET NULL,
  cashier_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_cash  DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- cash float at open
  closing_cash  DECIMAL(10, 2),                      -- counted cash at close
  -- Z-report snapshot (filled at close)
  cash_sales    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  card_sales    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credit_sales  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credit_paid   DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- cash down-payments on credit sales
  returns_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sales_count   INTEGER NOT NULL DEFAULT 0,
  expected_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  difference    DECIMAL(10, 2) NOT NULL DEFAULT 0,    -- counted − expected
  opened_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);

-- ---- Sales: link each sale to its shift + cashier ----
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_id     UUID REFERENCES shifts(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_id   UUID REFERENCES cashiers(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_name TEXT;
CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id);

-- ---- RLS ----
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated full access" ON cashiers;
DROP POLICY IF EXISTS "authenticated full access" ON shifts;
CREATE POLICY "authenticated full access" ON cashiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON shifts   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
--  OPEN SHIFT — only one shift may be open at a time.
-- ============================================================
CREATE OR REPLACE FUNCTION open_shift(
  p_cashier_id   UUID,
  p_cashier_name TEXT,
  p_opening_cash NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_shift shifts;
BEGIN
  IF EXISTS (SELECT 1 FROM shifts WHERE status = 'open') THEN
    RAISE EXCEPTION 'SHIFT_ALREADY_OPEN' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO shifts(cashier_id, cashier_name, opening_cash, status)
  VALUES (p_cashier_id, p_cashier_name, COALESCE(p_opening_cash, 0), 'open')
  RETURNING * INTO v_shift;

  RETURN to_jsonb(v_shift);
END;
$$;

-- ============================================================
--  CLOSE SHIFT — aggregate the shift's sales into a Z-report.
--  expected_cash = opening + cash sales + cash down-payments − cash returns.
-- ============================================================
CREATE OR REPLACE FUNCTION close_shift(
  p_shift_id     UUID,
  p_closing_cash NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_shift        shifts;
  v_cash         NUMERIC;
  v_card         NUMERIC;
  v_credit       NUMERIC;
  v_credit_paid  NUMERIC;
  v_returns      NUMERIC;
  v_cash_returns NUMERIC;
  v_count        INTEGER;
  v_expected     NUMERIC;
  v_open_cash    NUMERIC;
BEGIN
  SELECT opening_cash INTO v_open_cash FROM shifts WHERE id = p_shift_id;

  SELECT
    COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash'   AND type = 'sale'),   0),
    COALESCE(SUM(total) FILTER (WHERE payment_method = 'card'   AND type = 'sale'),   0),
    COALESCE(SUM(total) FILTER (WHERE payment_method = 'credit' AND type = 'sale'),   0),
    COALESCE(SUM(paid)  FILTER (WHERE payment_method = 'credit' AND type = 'sale'),   0),
    COALESCE(SUM(total) FILTER (WHERE type = 'return'),                               0),
    COALESCE(SUM(total) FILTER (WHERE type = 'return' AND payment_method = 'cash'),   0),
    COALESCE(COUNT(*)   FILTER (WHERE type = 'sale'),                                 0)
  INTO v_cash, v_card, v_credit, v_credit_paid, v_returns, v_cash_returns, v_count
  FROM sales WHERE shift_id = p_shift_id;

  v_expected := COALESCE(v_open_cash, 0) + v_cash + v_credit_paid - v_cash_returns;

  UPDATE shifts SET
    status        = 'closed',
    closed_at     = NOW(),
    closing_cash  = COALESCE(p_closing_cash, 0),
    cash_sales    = v_cash,
    card_sales    = v_card,
    credit_sales  = v_credit,
    credit_paid   = v_credit_paid,
    returns_total = v_returns,
    sales_count   = v_count,
    expected_cash = v_expected,
    difference    = COALESCE(p_closing_cash, 0) - v_expected
  WHERE id = p_shift_id
  RETURNING * INTO v_shift;

  RETURN to_jsonb(v_shift);
END;
$$;

-- ============================================================
--  create_sale v4 — adds shift + cashier tagging.
-- ============================================================
DROP FUNCTION IF EXISTS create_sale(NUMERIC, TEXT, INTEGER, BOOLEAN, JSONB, TEXT, UUID, NUMERIC, UUID, TEXT, NUMERIC);

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

  IF p_customer_id IS NOT NULL AND p_type = 'sale' THEN
    UPDATE customers SET balance = balance + (p_total - v_paid) WHERE id = p_customer_id;
  END IF;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(si)), '[]'::jsonb) FROM sale_items si WHERE si.sale_id = v_sale.id)
  );
END;
$$;
