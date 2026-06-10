-- ============================================================
--  Migration 004 — Suppliers + Purchasing (with supplier debt)
--  Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- ---- Suppliers ----
CREATE TABLE IF NOT EXISTS suppliers (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  contact    TEXT,                                 -- contact person
  address    TEXT,
  note       TEXT,
  balance    DECIMAL(10, 2) NOT NULL DEFAULT 0,    -- amount WE OWE the supplier (positive = our debt)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Purchases (one row per purchase document / delivery) ----
CREATE TABLE IF NOT EXISTS purchases (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,                              -- denormalized snapshot
  total         DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid          DECIMAL(10, 2) NOT NULL DEFAULT 0, -- paid at purchase time (rest becomes debt)
  items_count   INTEGER NOT NULL DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created  ON purchases(created_at);

-- ---- Purchase line items (denormalized like sale_items) ----
CREATE TABLE IF NOT EXISTS purchase_items (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_id  UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  barcode      TEXT,
  quantity     INTEGER NOT NULL,
  unit_cost    DECIMAL(10, 2) NOT NULL,
  total_cost   DECIMAL(10, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

-- ---- Supplier payments (paying down our debt later) ----
CREATE TABLE IF NOT EXISTS supplier_payments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  amount      DECIMAL(10, 2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);

-- ---- RLS: authenticated full access (same as the rest of the app) ----
ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated full access" ON suppliers;
DROP POLICY IF EXISTS "authenticated full access" ON purchases;
DROP POLICY IF EXISTS "authenticated full access" ON purchase_items;
DROP POLICY IF EXISTS "authenticated full access" ON supplier_payments;
CREATE POLICY "authenticated full access" ON suppliers         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON purchases         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON purchase_items    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated full access" ON supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
--  ATOMIC PURCHASE
--  Insert purchase + items, raise stock, refresh purchase_price,
--  and add unpaid remainder to the supplier's balance — in one tx.
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
      -- Raise stock and refresh the product's cost to the latest purchase price.
      UPDATE products
        SET quantity = quantity + v_qty,
            purchase_price = v_cost
        WHERE id = v_pid;
    END IF;
  END LOOP;

  -- Unpaid remainder becomes our debt to the supplier.
  IF p_supplier_id IS NOT NULL THEN
    UPDATE suppliers
      SET balance = balance + (p_total - COALESCE(p_paid,0))
      WHERE id = p_supplier_id;
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
  p_note        TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_payment supplier_payments;
  v_supplier suppliers;
BEGIN
  INSERT INTO supplier_payments(supplier_id, amount, note)
  VALUES (p_supplier_id, p_amount, p_note)
  RETURNING * INTO v_payment;

  UPDATE suppliers SET balance = balance - p_amount
    WHERE id = p_supplier_id
    RETURNING * INTO v_supplier;

  RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'supplier', to_jsonb(v_supplier));
END;
$$;
