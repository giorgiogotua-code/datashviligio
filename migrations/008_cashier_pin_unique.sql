-- ============================================================
--  Migration 008 — Enforce unique cashier PIN (among active)
--  A shift is opened by typing a PIN, which identifies the
--  cashier. Two active cashiers must not share a PIN, or the
--  wrong one could be picked. Deactivated cashiers may reuse a
--  PIN (the partial index only covers active = true).
--  Run once in Supabase → SQL Editor. Safe to re-run.
--
--  NOTE: if two ACTIVE cashiers already share a PIN this will
--  fail — fix the duplicate first, then re-run.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_cashiers_pin_active
  ON cashiers(pin) WHERE active;
