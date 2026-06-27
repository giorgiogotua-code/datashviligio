-- ============================================================
--  Migration 018 — Lock down the signup trigger function
--  handle_new_user() runs only as the AFTER INSERT trigger on
--  auth.users; it must never be reachable as a REST RPC. Triggers
--  fire regardless of EXECUTE grants, so revoking is safe.
--  Safe to re-run.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
