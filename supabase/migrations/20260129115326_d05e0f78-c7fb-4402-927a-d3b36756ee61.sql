-- =============================================
-- PHASE 3A: Tables de référence territoriale
-- =============================================

-- Table des régions administratives
CREATE TABLE IF NOT EXISTS public.regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT UNIQUE,
  area_km2 NUMERIC,
  population INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des DRANEF (Directions Régionales)
CREATE TABLE IF NOT EXISTS public.dranef (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des DPANEF (Directions Provinciales)
CREATE TABLE IF NOT EXISTS public.dpanef (
  id TEXT PRIMARY KEY,
  dranef_id TEXT NOT NULL REFERENCES public.dranef(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des communes
CREATE TABLE IF NOT EXISTS public.communes (
  id TEXT PRIMARY KEY,
  dpanef_id TEXT NOT NULL REFERENCES public.dpanef(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT,
  area_km2 NUMERIC,
  population INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 3B: Colonnes de validation workflow
-- =============================================

-- Ajouter colonnes validation sur field_activities
ALTER TABLE public.field_activities 
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Ajouter colonnes validation sur conflicts
ALTER TABLE public.conflicts 
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Ajouter colonnes validation sur organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Ajouter colonnes validation sur cahier_journal_entries
ALTER TABLE public.cahier_journal_entries 
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status validation_status DEFAULT 'draft';

-- =============================================
-- PHASE 3C: Index de performance
-- =============================================

-- Index sur tables de référence
CREATE INDEX IF NOT EXISTS idx_dranef_region_id ON public.dranef(region_id);
CREATE INDEX IF NOT EXISTS idx_dpanef_dranef_id ON public.dpanef(dranef_id);
CREATE INDEX IF NOT EXISTS idx_communes_dpanef_id ON public.communes(dpanef_id);

-- Index sur status pour toutes les tables métier
CREATE INDEX IF NOT EXISTS idx_field_activities_status ON public.field_activities(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON public.conflicts(status);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_pdfcp_programs_status ON public.pdfcp_programs(status);
CREATE INDEX IF NOT EXISTS idx_pdfcp_actions_status ON public.pdfcp_actions(status);
CREATE INDEX IF NOT EXISTS idx_adp_agents_status ON public.adp_agents(status);

-- Index sur dates pour reporting
CREATE INDEX IF NOT EXISTS idx_field_activities_date ON public.field_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_conflicts_reported_date ON public.conflicts(reported_date);
CREATE INDEX IF NOT EXISTS idx_cahier_journal_entry_date ON public.cahier_journal_entries(entry_date);

-- =============================================
-- PHASE 3D: RLS sur tables de référence (lecture publique)
-- =============================================

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dranef ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpanef ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;

-- Lecture autorisée pour tous les utilisateurs authentifiés
CREATE POLICY "regions_select" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "dranef_select" ON public.dranef FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpanef_select" ON public.dpanef FOR SELECT TO authenticated USING (true);
CREATE POLICY "communes_select" ON public.communes FOR SELECT TO authenticated USING (true);

-- Seul ADMIN peut modifier les références
CREATE POLICY "regions_admin_all" ON public.regions FOR ALL USING (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "dranef_admin_all" ON public.dranef FOR ALL USING (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "dpanef_admin_all" ON public.dpanef FOR ALL USING (has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "communes_admin_all" ON public.communes FOR ALL USING (has_role(auth.uid(), 'ADMIN'));

-- =============================================
-- PHASE 3E: Triggers updated_at
-- =============================================

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dranef_updated_at BEFORE UPDATE ON public.dranef
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dpanef_updated_at BEFORE UPDATE ON public.dpanef
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communes_updated_at BEFORE UPDATE ON public.communes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();