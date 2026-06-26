-- ============================================================
--  AccessoryShop POS — Database Schema
--  Run this whole file in Supabase → SQL Editor → New query.
--  Safe to re-run: it drops and recreates everything.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean slate (so the file can be re-run without errors)
DROP TABLE IF EXISTS fiscal_reports CASCADE;
DROP TABLE IF EXISTS held_carts CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customer_payments CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS cashiers CASCADE;
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
--  CUSTOMERS (credit / ნისია — created before sales for the FK)
-- ============================================================
CREATE TABLE customers (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  note       TEXT,
  balance    DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- amount the customer OWES US (positive = their debt)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  CASHIERS + SHIFTS (created before sales for the FKs)
-- ============================================================
CREATE TABLE cashiers (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  pin        TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- PIN identifies the cashier at shift open → unique among active cashiers.
CREATE UNIQUE INDEX idx_cashiers_pin_active ON cashiers(pin) WHERE active;

CREATE TABLE shifts (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cashier_id    UUID REFERENCES cashiers(id) ON DELETE SET NULL,
  cashier_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_cash  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  closing_cash  DECIMAL(10, 2),
  cash_sales    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  card_sales    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credit_sales  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credit_paid   DECIMAL(10, 2) NOT NULL DEFAULT 0,
  returns_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sales_count   INTEGER NOT NULL DEFAULT 0,
  customer_payments_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- cash debt repayments during the shift (+)
  supplier_payments_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- cash paid to suppliers during the shift (−)
  expected_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
  difference    DECIMAL(10, 2) NOT NULL DEFAULT 0,
  opened_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);
CREATE INDEX idx_shifts_status ON shifts(status);

-- ============================================================
--  SALES (one row per receipt)
-- ============================================================
CREATE TABLE sales (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  total          DECIMAL(10, 2) NOT NULL,
  discount       DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- discount amount applied (total is already net)
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'credit')) NOT NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,  -- for credit sales
  customer_name  TEXT,                                              -- denormalized snapshot
  paid           DECIMAL(10, 2) NOT NULL DEFAULT 0,                 -- amount paid at sale time (credit down-payment)
  shift_id       UUID REFERENCES shifts(id) ON DELETE SET NULL,     -- the open shift this sale belongs to
  cashier_id     UUID REFERENCES cashiers(id) ON DELETE SET NULL,
  cashier_name   TEXT,
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
  total_price  DECIMAL(10, 2) NOT NULL,
  unit_cost    DECIMAL(10, 2) NOT NULL DEFAULT 0   -- product cost at sale time (for real margin)
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ============================================================
--  SETTINGS (key-value)
-- ============================================================
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ============================================================
--  CUSTOMER PAYMENTS (repayments toward a customer's debt)
-- ============================================================
CREATE TABLE customer_payments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount      DECIMAL(10, 2) NOT NULL,
  note        TEXT,
  shift_id    UUID REFERENCES shifts(id) ON DELETE SET NULL,
  method      TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','card','transfer')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customer_payments_shift ON customer_payments(shift_id);
CREATE INDEX idx_customer_payments_customer ON customer_payments(customer_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_shift    ON sales(shift_id);

-- ============================================================
--  HELD CARTS (parked sales waiting at the counter)
-- ============================================================
CREATE TABLE held_carts (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  label          TEXT,                                  -- optional note / customer name
  items          JSONB NOT NULL DEFAULT '[]',           -- cart line items
  discount       DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- computed discount amount
  discount_type  TEXT CHECK (discount_type IN ('amount','percent')),
  discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- raw value the cashier typed (₾ or %)
  total          DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- final total snapshot (after discount)
  items_count    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_held_carts_created ON held_carts(created_at);

-- ============================================================
--  SUPPLIERS + PURCHASING (with supplier debt)
-- ============================================================
CREATE TABLE suppliers (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  contact    TEXT,
  address    TEXT,
  note       TEXT,
  balance    DECIMAL(10, 2) NOT NULL DEFAULT 0,    -- amount WE OWE the supplier (positive = our debt)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchases (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  total         DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid          DECIMAL(10, 2) NOT NULL DEFAULT 0,
  items_count   INTEGER NOT NULL DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_created  ON purchases(created_at);

CREATE TABLE purchase_items (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_id  UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  barcode      TEXT,
  quantity     INTEGER NOT NULL,
  unit_cost    DECIMAL(10, 2) NOT NULL,
  total_cost   DECIMAL(10, 2) NOT NULL
);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);

CREATE TABLE supplier_payments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  amount      DECIMAL(10, 2) NOT NULL,
  note        TEXT,
  shift_id    UUID REFERENCES shifts(id) ON DELETE SET NULL,
  method      TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','card','transfer')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_shift ON supplier_payments(shift_id);

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
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_carts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashiers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_reports    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated full access" ON categories        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON products          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON sales             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON sale_items        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON settings          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON held_carts        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON customers         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON customer_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON cashiers          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON shifts            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON suppliers         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON purchases         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON purchase_items    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON fiscal_reports    FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
  v_paid  NUMERIC := COALESCE(p_paid, p_total);  -- non-credit sales are fully paid
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

    -- Lock the product to read its cost + current stock.
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

-- ============================================================
--  PAY CUSTOMER — record a repayment and lower their debt.
-- ============================================================
CREATE OR REPLACE FUNCTION pay_customer(
  p_customer_id UUID,
  p_amount      NUMERIC,
  p_note        TEXT DEFAULT NULL,
  p_shift_id    UUID DEFAULT NULL,
  p_method      TEXT DEFAULT 'cash'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_payment customer_payments;
  v_customer customers;
BEGIN
  INSERT INTO customer_payments(customer_id, amount, note, shift_id, method)
  VALUES (p_customer_id, p_amount, p_note, p_shift_id, COALESCE(p_method,'cash'))
  RETURNING * INTO v_payment;

  UPDATE customers SET balance = balance - p_amount
    WHERE id = p_customer_id
    RETURNING * INTO v_customer;

  RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'customer', to_jsonb(v_customer));
END;
$$;

-- ============================================================
--  OPEN / CLOSE SHIFT (Z-report)
-- ============================================================
CREATE OR REPLACE FUNCTION open_shift(p_cashier_id UUID, p_cashier_name TEXT, p_opening_cash NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_shift shifts;
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

CREATE OR REPLACE FUNCTION close_shift(p_shift_id UUID, p_closing_cash NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_shift shifts;
  v_cash NUMERIC; v_card NUMERIC; v_credit NUMERIC; v_credit_paid NUMERIC;
  v_returns NUMERIC; v_cash_returns NUMERIC; v_count INTEGER; v_expected NUMERIC; v_open_cash NUMERIC;
  v_cust_cash NUMERIC; v_supp_cash NUMERIC;
BEGIN
  SELECT opening_cash INTO v_open_cash FROM shifts WHERE id = p_shift_id;
  SELECT
    COALESCE(SUM(total) FILTER (WHERE payment_method='cash'   AND type='sale'),   0),
    COALESCE(SUM(total) FILTER (WHERE payment_method='card'   AND type='sale'),   0),
    COALESCE(SUM(total) FILTER (WHERE payment_method='credit' AND type='sale'),   0),
    COALESCE(SUM(paid)  FILTER (WHERE payment_method='credit' AND type='sale'),   0),
    COALESCE(SUM(total) FILTER (WHERE type='return'),                             0),
    COALESCE(SUM(total) FILTER (WHERE type='return' AND payment_method='cash'),   0),
    COALESCE(COUNT(*)   FILTER (WHERE type='sale'),                               0)
  INTO v_cash, v_card, v_credit, v_credit_paid, v_returns, v_cash_returns, v_count
  FROM sales WHERE shift_id = p_shift_id;

  SELECT COALESCE(SUM(amount),0) INTO v_cust_cash FROM customer_payments WHERE shift_id = p_shift_id AND method='cash';
  SELECT COALESCE(SUM(amount),0) INTO v_supp_cash FROM supplier_payments WHERE shift_id = p_shift_id AND method='cash';

  v_expected := COALESCE(v_open_cash,0) + v_cash + v_credit_paid + v_cust_cash - v_cash_returns - v_supp_cash;

  UPDATE shifts SET
    status='closed', closed_at=NOW(), closing_cash=COALESCE(p_closing_cash,0),
    cash_sales=v_cash, card_sales=v_card, credit_sales=v_credit, credit_paid=v_credit_paid,
    returns_total=v_returns, sales_count=v_count,
    customer_payments_cash=v_cust_cash, supplier_payments_cash=v_supp_cash,
    expected_cash=v_expected, difference=COALESCE(p_closing_cash,0) - v_expected
  WHERE id = p_shift_id
  RETURNING * INTO v_shift;
  RETURN to_jsonb(v_shift);
END;
$$;

-- ============================================================
--  ATOMIC PURCHASE — insert purchase + items, raise stock,
--  refresh purchase_price, add unpaid remainder to supplier debt.
-- ============================================================
CREATE OR REPLACE FUNCTION create_purchase(
  p_supplier_id   UUID,
  p_supplier_name TEXT,
  p_total         NUMERIC,
  p_paid          NUMERIC,
  p_items_count   INTEGER,
  p_note          TEXT,
  p_items         JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_purchase purchases;
  v_item     JSONB;
  v_pid      UUID;
  v_qty      INTEGER;
  v_cost     NUMERIC;
BEGIN
  INSERT INTO purchases(supplier_id, supplier_name, total, paid, items_count, note)
  VALUES (p_supplier_id, p_supplier_name, p_total, COALESCE(p_paid,0), p_items_count, p_note)
  RETURNING * INTO v_purchase;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid  := NULLIF(v_item->>'product_id','')::uuid;
    v_qty  := (v_item->>'quantity')::int;
    v_cost := (v_item->>'unit_cost')::numeric;

    INSERT INTO purchase_items(purchase_id, product_id, product_name, barcode, quantity, unit_cost, total_cost)
    VALUES (v_purchase.id, v_pid, v_item->>'product_name', v_item->>'barcode', v_qty, v_cost, v_qty * v_cost);

    IF v_pid IS NOT NULL THEN
      UPDATE products SET quantity = quantity + v_qty, purchase_price = v_cost WHERE id = v_pid;
    END IF;
  END LOOP;

  IF p_supplier_id IS NOT NULL THEN
    UPDATE suppliers SET balance = balance + (p_total - COALESCE(p_paid,0)) WHERE id = p_supplier_id;
  END IF;

  RETURN jsonb_build_object(
    'purchase', to_jsonb(v_purchase),
    'items', (SELECT COALESCE(jsonb_agg(to_jsonb(pi)), '[]'::jsonb) FROM purchase_items pi WHERE pi.purchase_id = v_purchase.id)
  );
END;
$$;

-- ============================================================
--  PAY SUPPLIER — record a payment and lower our debt.
-- ============================================================
CREATE OR REPLACE FUNCTION pay_supplier(
  p_supplier_id UUID,
  p_amount      NUMERIC,
  p_note        TEXT DEFAULT NULL,
  p_shift_id    UUID DEFAULT NULL,
  p_method      TEXT DEFAULT 'cash'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_payment supplier_payments;
  v_supplier suppliers;
BEGIN
  INSERT INTO supplier_payments(supplier_id, amount, note, shift_id, method)
  VALUES (p_supplier_id, p_amount, p_note, p_shift_id, COALESCE(p_method,'cash'))
  RETURNING * INTO v_payment;

  UPDATE suppliers SET balance = balance - p_amount
    WHERE id = p_supplier_id
    RETURNING * INTO v_supplier;

  RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'supplier', to_jsonb(v_supplier));
END;
$$;
