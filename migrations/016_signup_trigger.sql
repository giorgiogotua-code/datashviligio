-- ============================================================
--  Migration 016 — Self-serve signup (handle_new_user)
--  When a new user registers (supabase.auth.signUp), this trigger
--  atomically provisions their tenant: an organization (14-day
--  trial), an owner membership, and the default settings rows.
--
--  SECURITY DEFINER so it can write these tables during signup
--  (the new user has no membership yet, so RLS would otherwise
--  block it). It only ever creates rows for NEW.id — never
--  touches another user's data.
--
--  The shop name comes from signUp options.data.shop_name.
--  Safe to re-run (CREATE OR REPLACE + idempotent guards).
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org  UUID;
  v_shop TEXT := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'shop_name'), ''), 'ჩემი მაღაზია');
BEGIN
  -- A user already attached to an org (e.g. backfilled) gets nothing new.
  IF EXISTS (SELECT 1 FROM memberships WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO organizations(name, plan, status)
  VALUES (v_shop, 'trial', 'active')
  RETURNING id INTO v_org;

  INSERT INTO memberships(org_id, user_id, role)
  VALUES (v_org, NEW.id, 'owner');

  INSERT INTO settings(org_id, key, value) VALUES
    (v_org, 'companyName', v_shop),
    (v_org, 'companyId',  ''),
    (v_org, 'address',    ''),
    (v_org, 'phone',      '')
  ON CONFLICT (org_id, key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
