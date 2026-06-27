-- ============================================================
--  Migration 017 — Platform (god-mode) overview function
--  Returns every organization with quick counts, for the
--  super-admin panel. SECURITY DEFINER but gated: it raises
--  unless the caller is a platform admin, so it can never leak
--  the tenant list to a normal shop owner. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION platform_org_overview()
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  plan          TEXT,
  status        TEXT,
  trial_ends_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ,
  members       BIGINT,
  products      BIGINT,
  sales         BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT o.id, o.name, o.plan, o.status, o.trial_ends_at, o.created_at,
           (SELECT count(*) FROM memberships m WHERE m.org_id = o.id),
           (SELECT count(*) FROM products    p WHERE p.org_id = o.id),
           (SELECT count(*) FROM sales       s WHERE s.org_id = o.id AND s.type = 'sale')
    FROM organizations o
    ORDER BY o.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION platform_org_overview() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION platform_org_overview() TO authenticated;
