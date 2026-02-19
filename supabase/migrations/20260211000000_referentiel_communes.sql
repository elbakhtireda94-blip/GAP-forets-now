-- =====================================================
-- Migration: Référentiel communes (DRANEF / DPANEF / ZDTF / Commune)
-- Idempotent. No ADP. GAP Forêts.
-- =====================================================

-- Schema
CREATE SCHEMA IF NOT EXISTS referentiel;

-- 1) DRANEF
CREATE TABLE IF NOT EXISTS referentiel.dranef (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referentiel_dranef_name ON referentiel.dranef(name);

-- 2) DPANEF
CREATE TABLE IF NOT EXISTS referentiel.dpanef (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dranef_id UUID NOT NULL REFERENCES referentiel.dranef(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dranef_id, name)
);

CREATE INDEX IF NOT EXISTS idx_referentiel_dpanef_dranef_id ON referentiel.dpanef(dranef_id);

-- 3) ZDTF
CREATE TABLE IF NOT EXISTS referentiel.zdtf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dpanef_id UUID NOT NULL REFERENCES referentiel.dpanef(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dpanef_id, name)
);

CREATE INDEX IF NOT EXISTS idx_referentiel_zdtf_dpanef_id ON referentiel.zdtf(dpanef_id);

-- 4) Commune (pk = commune_id from CSV)
CREATE TABLE IF NOT EXISTS referentiel.commune (
  id TEXT PRIMARY KEY,
  zdtf_id UUID NOT NULL REFERENCES referentiel.zdtf(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referentiel_commune_zdtf_id ON referentiel.commune(zdtf_id);
CREATE INDEX IF NOT EXISTS idx_referentiel_commune_name ON referentiel.commune(name);

-- RLS
ALTER TABLE referentiel.dranef ENABLE ROW LEVEL SECURITY;
ALTER TABLE referentiel.dpanef ENABLE ROW LEVEL SECURITY;
ALTER TABLE referentiel.zdtf ENABLE ROW LEVEL SECURITY;
ALTER TABLE referentiel.commune ENABLE ROW LEVEL SECURITY;

-- SELECT: anon + authenticated
DROP POLICY IF EXISTS referentiel_dranef_select ON referentiel.dranef;
CREATE POLICY referentiel_dranef_select ON referentiel.dranef FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS referentiel_dpanef_select ON referentiel.dpanef;
CREATE POLICY referentiel_dpanef_select ON referentiel.dpanef FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS referentiel_zdtf_select ON referentiel.zdtf;
CREATE POLICY referentiel_zdtf_select ON referentiel.zdtf FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS referentiel_commune_select ON referentiel.commune;
CREATE POLICY referentiel_commune_select ON referentiel.commune FOR SELECT TO anon, authenticated USING (true);

-- INSERT/UPDATE/DELETE: authenticated only (temp policy)
DROP POLICY IF EXISTS referentiel_dranef_insert ON referentiel.dranef;
CREATE POLICY referentiel_dranef_insert ON referentiel.dranef FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS referentiel_dranef_update ON referentiel.dranef;
CREATE POLICY referentiel_dranef_update ON referentiel.dranef FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS referentiel_dranef_delete ON referentiel.dranef;
CREATE POLICY referentiel_dranef_delete ON referentiel.dranef FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS referentiel_dpanef_insert ON referentiel.dpanef;
CREATE POLICY referentiel_dpanef_insert ON referentiel.dpanef FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS referentiel_dpanef_update ON referentiel.dpanef;
CREATE POLICY referentiel_dpanef_update ON referentiel.dpanef FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS referentiel_dpanef_delete ON referentiel.dpanef;
CREATE POLICY referentiel_dpanef_delete ON referentiel.dpanef FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS referentiel_zdtf_insert ON referentiel.zdtf;
CREATE POLICY referentiel_zdtf_insert ON referentiel.zdtf FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS referentiel_zdtf_update ON referentiel.zdtf;
CREATE POLICY referentiel_zdtf_update ON referentiel.zdtf FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS referentiel_zdtf_delete ON referentiel.zdtf;
CREATE POLICY referentiel_zdtf_delete ON referentiel.zdtf FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS referentiel_commune_insert ON referentiel.commune;
CREATE POLICY referentiel_commune_insert ON referentiel.commune FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS referentiel_commune_update ON referentiel.commune;
CREATE POLICY referentiel_commune_update ON referentiel.commune FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS referentiel_commune_delete ON referentiel.commune;
CREATE POLICY referentiel_commune_delete ON referentiel.commune FOR DELETE TO authenticated USING (true);
