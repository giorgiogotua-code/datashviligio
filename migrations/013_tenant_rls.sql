-- ============================================================
--  Migration 013 — Tenant-isolation RLS (Phase 1, step 3/3)
--  Replaces the old "authenticated full access" (USING true)
--  policies on every business table with org-scoped isolation.
--
--    READ  : your own org, OR you are a platform admin
--    WRITE : your own org AND the org is active (not suspended),
--            OR you are a platform admin
--
--  Suspending an org (status='suspended') therefore freezes all
--  writes for its users while still letting them read their data
--  (the app shows a "suspended" screen). Platform admins bypass
--  everything for support.
--
--  Transparent to the live single shop: auth_org() = Org #1 for
--  the current user, so it keeps full access to its own data.
--  Safe to re-run.
-- ============================================================

DO $$
DECLARE
  t    TEXT;
  pol  TEXT;
  tbls TEXT[] := ARRAY[
    'categories','products','sales','sale_items','suppliers','purchases',
    'purchase_items','supplier_payments','customers','customer_payments',
    'cashiers','shifts','held_carts','fiscal_reports','settings'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Make sure RLS is on, then drop every existing policy on the table.
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON %I', pol, t);
    END LOOP;

    -- One tenant-isolation policy per table.
    EXECUTE format($f$
      CREATE POLICY "tenant isolation" ON %I
        FOR ALL TO authenticated
        USING (org_id = auth_org() OR is_platform_admin())
        WITH CHECK ((org_id = auth_org() AND current_org_active()) OR is_platform_admin())
    $f$, t);
  END LOOP;
END $$;
