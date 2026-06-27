-- ============================================================
--  Migration 015 — settings primary key becomes (org_id, key)
--  Until now settings used `key` alone as the PK (single shop).
--  For multi-tenant each org keeps its own copy of every key, so
--  the PK must include org_id.
--
--  ⚠️  DEPLOY COUPLING: the app upserts settings with
--      onConflict='org_id,key' from this point on. Apply this
--      migration together with the matching app build, never
--      before — the old build's onConflict='key' will break the
--      moment this runs. Safe to re-run.
-- ============================================================

ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings ADD  CONSTRAINT settings_pkey PRIMARY KEY (org_id, key);
