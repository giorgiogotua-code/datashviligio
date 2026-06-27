-- ============================================================
--  Migration 014 — Security hardening (Supabase advisor cleanup)
--  1. Pin a stable search_path on the 6 business RPC functions
--     (prevents search_path hijacking — advisor 0011).
--  2. Stop anon from calling the tenant helper functions directly
--     over REST. They stay executable by `authenticated` because
--     the RLS policies invoke them (advisor 0028).
--  No behavioural change for the app. Safe to re-run.
-- ============================================================

-- ---- 1. Pin search_path on the SECURITY INVOKER RPCs ----
ALTER FUNCTION public.create_sale(numeric, text, integer, boolean, jsonb, text, uuid, numeric, uuid, text, numeric, uuid, uuid, text)
  SET search_path = public, extensions;
ALTER FUNCTION public.create_purchase(uuid, text, numeric, numeric, integer, text, jsonb)
  SET search_path = public, extensions;
ALTER FUNCTION public.pay_customer(uuid, numeric, text, uuid, text)
  SET search_path = public, extensions;
ALTER FUNCTION public.pay_supplier(uuid, numeric, text, uuid, text)
  SET search_path = public, extensions;
ALTER FUNCTION public.open_shift(uuid, text, numeric)
  SET search_path = public, extensions;
ALTER FUNCTION public.close_shift(uuid, numeric)
  SET search_path = public, extensions;

-- ---- 2. Lock the tenant helpers down to authenticated only ----
REVOKE EXECUTE ON FUNCTION public.auth_org()           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin()  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_org_active()  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.auth_org()           TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_platform_admin()  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.current_org_active()  TO authenticated;
