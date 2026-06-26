-- ============================================================
--  Migration 010 — Shift cash reconciliation
--  Link customer/supplier payments to the open shift and give
--  each a payment method, so the Z-report's expected cash also
--  reflects cash debt repayments (in) and cash supplier payments
--  (out). Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- ---- Payment tables: shift link + method ----
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS method   TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','card','transfer'));
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS method   TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','card','transfer'));
CREATE INDEX IF NOT EXISTS idx_customer_payments_shift ON customer_payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_shift ON supplier_payments(shift_id);

-- ---- Z-report snapshot columns on shifts ----
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS customer_payments_cash DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS supplier_payments_cash DECIMAL(10,2) NOT NULL DEFAULT 0;

-- ============================================================
--  pay_customer — now records the shift + method.
-- ============================================================
DROP FUNCTION IF EXISTS pay_customer(UUID, NUMERIC, TEXT);
CREATE OR REPLACE FUNCTION pay_customer(
  p_customer_id UUID,
  p_amount      NUMERIC,
  p_note        TEXT DEFAULT NULL,
  p_shift_id    UUID DEFAULT NULL,
  p_method      TEXT DEFAULT 'cash'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER AS $$
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
--  pay_supplier — now records the shift + method.
-- ============================================================
DROP FUNCTION IF EXISTS pay_supplier(UUID, NUMERIC, TEXT);
CREATE OR REPLACE FUNCTION pay_supplier(
  p_supplier_id UUID,
  p_amount      NUMERIC,
  p_note        TEXT DEFAULT NULL,
  p_shift_id    UUID DEFAULT NULL,
  p_method      TEXT DEFAULT 'cash'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER AS $$
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

-- ============================================================
--  close_shift — expected cash now also reflects cash debt
--  repayments (in) and cash supplier payments (out).
-- ============================================================
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
