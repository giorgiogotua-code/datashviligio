-- ============================================================
--  Migration 019 — Remove the platform-admin bypass from
--  business-table RLS (tenant-isolation fix).
--
--  Bug: migration 013 included `OR is_platform_admin()` in every
--  business-table policy, so a platform admin who also uses the
--  POS saw EVERY tenant's products/sales/etc. in their own shop.
--
--  Fix: business tables isolate strictly by org. God-mode access
--  lives only in the /platform console, which reads via the
--  SECURITY DEFINER platform_org_overview() and the organizations
--  policies — it never queries business tables directly. The
--  organizations / memberships / platform_admins policies keep
--  their is_platform_admin() bypass (the console needs it).
--  Safe to re-run.
-- ============================================================

DO $$
DECLARE
  t    TEXT;
  tbls TEXT[] := ARRAY[
    'categories','products','sales','sale_items','suppliers','purchases',
    'purchase_items','supplier_payments','customers','customer_payments',
    'cashiers','shifts','held_carts','fiscal_reports','settings'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant isolation" ON %I', t);
    EXECUTE format($f$
      CREATE POLICY "tenant isolation" ON %I
        FOR ALL TO authenticated
        USING (org_id = auth_org())
        WITH CHECK (org_id = auth_org() AND current_org_active())
    $f$, t);
  END LOOP;
END $$;
