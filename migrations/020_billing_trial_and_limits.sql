-- ============================================================
--  Migration 020 — Phase 3 billing MVP (manual): trial grace,
--  product limits, upgrade requests.
--
--  Manual model: shops pay by bank transfer; a platform admin
--  flips the plan in /platform. No payment provider yet — the
--  organizations billing columns from 011 stay ready for later.
--  Safe to re-run.
-- ============================================================

-- ---- Upgrade-request flag (shop asks → shows in god panel) ----
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS upgrade_requested    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS upgrade_requested_at TIMESTAMPTZ;

-- ---- Trial enforcement baked into current_org_active() ----
-- A trial org loses WRITE access 3 days after trial_ends_at (grace).
-- Reads stay allowed (USING clauses don't call this). pro/enterprise
-- ignore the trial date. Suspended (manual) is still hard-off.
CREATE OR REPLACE FUNCTION current_org_active() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE((
    SELECT o.status = 'active'
       AND (o.plan <> 'trial' OR o.trial_ends_at IS NULL OR now() < o.trial_ends_at + INTERVAL '3 days')
    FROM organizations o WHERE o.id = auth_org()
  ), false);
$$;
REVOKE EXECUTE ON FUNCTION current_org_active() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION current_org_active() TO authenticated;

-- ---- Product limit: trial shops capped at 50 products ----
CREATE OR REPLACE FUNCTION enforce_product_limit() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_plan  TEXT;
  v_count INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM organizations WHERE id = NEW.org_id;
  IF v_plan = 'trial' THEN
    SELECT count(*) INTO v_count FROM products WHERE org_id = NEW.org_id;
    IF v_count >= 50 THEN
      RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED:50' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_product_limit ON products;
CREATE TRIGGER trg_enforce_product_limit
  BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION enforce_product_limit();

-- ---- request_upgrade(): a shop owner flags they want to upgrade ----
CREATE OR REPLACE FUNCTION request_upgrade() RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public, auth AS $$
  UPDATE organizations
     SET upgrade_requested = true, upgrade_requested_at = now()
   WHERE id = auth_org();
$$;
REVOKE EXECUTE ON FUNCTION request_upgrade() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION request_upgrade() TO authenticated;

-- ---- platform overview now also reports the upgrade flag ----
DROP FUNCTION IF EXISTS platform_org_overview();
CREATE OR REPLACE FUNCTION platform_org_overview()
RETURNS TABLE (
  id UUID, name TEXT, plan TEXT, status TEXT,
  trial_ends_at TIMESTAMPTZ, created_at TIMESTAMPTZ,
  members BIGINT, products BIGINT, sales BIGINT,
  upgrade_requested BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT o.id, o.name, o.plan, o.status, o.trial_ends_at, o.created_at,
           (SELECT count(*) FROM memberships m WHERE m.org_id = o.id),
           (SELECT count(*) FROM products    p WHERE p.org_id = o.id),
           (SELECT count(*) FROM sales       s WHERE s.org_id = o.id AND s.type = 'sale'),
           o.upgrade_requested
    FROM organizations o
    ORDER BY o.upgrade_requested DESC, o.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION platform_org_overview() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION platform_org_overview() TO authenticated;
