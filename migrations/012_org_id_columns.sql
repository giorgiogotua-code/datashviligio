-- ============================================================
--  Migration 012 — org_id on every business table (Phase 1, step 2/3)
--  Adds org_id to all 15 tenant tables, backfills existing rows to
--  the home org (Org #1), then makes it NOT NULL with a DEFAULT of
--  auth_org(). Because the default auto-stamps the inserter's org,
--  NO application or RPC code needs to change to populate org_id.
--
--  Transparent to the live single-shop app: it omits org_id on
--  inserts (default fills Org #1) and still reads everything.
--  Safe to re-run.
--
--  NOTE: settings keeps its (key) primary key here. The per-org
--  (org_id, key) key change ships with Phase 2 (self-serve signup),
--  alongside the matching app onConflict update — that is the first
--  moment a second org can exist.
-- ============================================================

DO $$
DECLARE
  v_org UUID;
  t     TEXT;
  tbls  TEXT[] := ARRAY[
    'categories','products','sales','sale_items','suppliers','purchases',
    'purchase_items','supplier_payments','customers','customer_payments',
    'cashiers','shifts','held_carts','fiscal_reports','settings'
  ];
BEGIN
  SELECT id INTO v_org FROM organizations WHERE name = 'AccessoryShop' LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Home org missing — run migration 011 first';
  END IF;

  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE %I SET org_id = %L WHERE org_id IS NULL', t, v_org);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN org_id SET DEFAULT auth_org()', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN org_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(org_id)', 'idx_'||t||'_org', t);
  END LOOP;
END $$;

-- Cashier PIN uniqueness is now per-organization (active PINs only).
DROP INDEX IF EXISTS idx_cashiers_pin_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cashiers_pin_active
  ON cashiers(org_id, pin) WHERE active;
