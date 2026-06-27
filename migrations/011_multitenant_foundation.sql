-- ============================================================
--  Migration 011 — Multi-tenant foundation (Phase 1, step 1/3)
--  Adds organizations + memberships + platform_admins and the
--  helper functions that every later RLS policy relies on.
--
--  PURELY ADDITIVE: this migration does NOT touch any existing
--  business table or its RLS, so the current single shop keeps
--  working unchanged after it runs. Safe to re-run.
--
--  Model: 1 shop = 1 organization. A shop owner is a Supabase
--  user with a membership(role='owner'); cashiers stay in-app
--  (PIN) and need no Supabase account. A platform admin (god
--  mode) can see/manage every org regardless of membership.
-- ============================================================

-- ---- Organizations (the tenant) ----
CREATE TABLE IF NOT EXISTS organizations (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name                TEXT NOT NULL,
  plan                TEXT NOT NULL DEFAULT 'trial'  CHECK (plan   IN ('trial','pro','enterprise')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  -- Billing placeholders (Phase 3 — additive, no logic yet)
  billing_customer_id TEXT,
  subscription_status TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Platform admins (god mode — cross-org access) ----
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Memberships (user ↔ org ↔ role) ----
CREATE TABLE IF NOT EXISTS memberships (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- ============================================================
--  Helper functions — SECURITY DEFINER so they can read these
--  tables regardless of RLS (this also avoids policy recursion,
--  since business-table policies call auth_org()).
-- ============================================================

-- The current user's organization (1 org per user in v1).
CREATE OR REPLACE FUNCTION auth_org() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT org_id FROM memberships WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Is the current user a platform (god-mode) admin?
CREATE OR REPLACE FUNCTION is_platform_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
$$;

-- Is the current user's org active (not suspended by a platform admin)?
CREATE OR REPLACE FUNCTION current_org_active() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE((SELECT status = 'active' FROM organizations WHERE id = auth_org()), false);
$$;

-- ============================================================
--  RLS for the new tables
-- ============================================================
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships     ENABLE ROW LEVEL SECURITY;

-- organizations: a member sees their own org; a platform admin sees all.
-- Only platform admins may write (plan/status changes, suspension).
-- New orgs are created by the signup trigger (SECURITY DEFINER, Phase 2).
DROP POLICY IF EXISTS "org read"  ON organizations;
DROP POLICY IF EXISTS "org write" ON organizations;
CREATE POLICY "org read"  ON organizations FOR SELECT TO authenticated
  USING (id = auth_org() OR is_platform_admin());
CREATE POLICY "org write" ON organizations FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- platform_admins: only platform admins can see or change the list.
DROP POLICY IF EXISTS "platform admins only" ON platform_admins;
CREATE POLICY "platform admins only" ON platform_admins FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- memberships: a user sees their own rows; a platform admin sees all.
-- Writes are via the signup trigger or a platform admin.
DROP POLICY IF EXISTS "membership read"  ON memberships;
DROP POLICY IF EXISTS "membership write" ON memberships;
CREATE POLICY "membership read"  ON memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin());
CREATE POLICY "membership write" ON memberships FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ============================================================
--  Backfill — adopt the existing single shop as Org #1 and make
--  the developer's real login the first platform admin.
-- ============================================================
DO $$
DECLARE
  v_org UUID;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE name = 'AccessoryShop' LIMIT 1;
  IF v_org IS NULL THEN
    INSERT INTO organizations(name, plan, status, trial_ends_at)
    VALUES ('AccessoryShop', 'enterprise', 'active', NULL)
    RETURNING id INTO v_org;
  END IF;

  -- Every existing auth user becomes an owner of the home org.
  INSERT INTO memberships(org_id, user_id, role)
  SELECT v_org, u.id, 'owner' FROM auth.users u
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- The real login (datashviligiorgi11) gets god mode.
  INSERT INTO platform_admins(user_id)
  VALUES ('68b89472-1822-4e1b-900b-3224e0e176db')
  ON CONFLICT (user_id) DO NOTHING;
END $$;
