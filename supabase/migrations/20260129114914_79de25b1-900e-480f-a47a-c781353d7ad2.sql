-- =============================================
-- PHASE 2: Migration des tables métier vers Supabase
-- Tables: ADP, PDFCP, Activités, Conflits, Organisations
-- Version corrigée: opérateur ANY pour text vs text[]
-- =============================================

-- 1. Enum pour le workflow de validation standard
CREATE TYPE public.validation_status AS ENUM ('draft', 'submitted', 'validated', 'archived');

-- 2. Enum pour les types de conflits
CREATE TYPE public.conflict_type AS ENUM ('conflit', 'opposition');

-- 3. Enum pour la gravité des conflits
CREATE TYPE public.conflict_severity AS ENUM ('faible', 'moyenne', 'elevee', 'critique');

-- 4. Enum pour le statut des conflits
CREATE TYPE public.conflict_status AS ENUM ('ouvert', 'en_cours', 'resolu', 'escalade');

-- 5. Enum pour les types d'activités terrain
CREATE TYPE public.activity_type AS ENUM (
  'sensibilisation', 
  'formation', 
  'reunion', 
  'visite_terrain', 
  'distribution', 
  'suivi_projet', 
  'mediation'
);

-- 6. Enum pour les types d'organisations
CREATE TYPE public.organization_type AS ENUM ('ODF', 'cooperative', 'association', 'AGS');

-- 7. Enum pour le statut des organisations
CREATE TYPE public.organization_status AS ENUM ('active', 'inactive', 'en_creation', 'dissoute');

-- =============================================
-- TABLE: adp_agents (Agents de Développement Participatif)
-- =============================================
CREATE TABLE public.adp_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Identité
  matricule TEXT UNIQUE NOT NULL,
  cine TEXT,
  full_name TEXT NOT NULL,
  sex TEXT CHECK (sex IN ('M', 'F')),
  date_of_birth DATE,
  photo_url TEXT,
  
  -- Situation administrative
  recruitment_date DATE,
  grade TEXT,
  scale TEXT,
  corps TEXT CHECK (corps IN ('Forestier', 'Support')),
  
  -- Affectation territoriale
  dranef_id TEXT NOT NULL,
  dpanef_id TEXT NOT NULL,
  commune_ids TEXT[] DEFAULT '{}',
  
  -- Coordonnées
  phone TEXT,
  email TEXT,
  
  -- Workflow & Traçabilité
  status validation_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@anef\.ma$')
);

-- =============================================
-- TABLE: pdfcp_programs (Programmes de Développement Forestier)
-- =============================================
CREATE TABLE public.pdfcp_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Période
  start_year INTEGER NOT NULL CHECK (start_year >= 2020 AND start_year <= 2050),
  end_year INTEGER NOT NULL CHECK (end_year >= 2020 AND end_year <= 2050),
  
  -- Territoire
  dranef_id TEXT NOT NULL,
  dpanef_id TEXT NOT NULL,
  commune_id TEXT,
  
  -- Budget global
  total_budget_dh NUMERIC(15,2) DEFAULT 0,
  
  -- Workflow validation 3 niveaux
  validation_status TEXT DEFAULT 'DRAFT' CHECK (validation_status IN ('DRAFT', 'VALIDATED_ADP', 'VALIDATED_DPANEF', 'VISA_DRANEF')),
  locked BOOLEAN DEFAULT false,
  
  -- Traçabilité validation
  validated_adp_by UUID REFERENCES auth.users(id),
  validated_adp_at TIMESTAMPTZ,
  validated_dpanef_by UUID REFERENCES auth.users(id),
  validated_dpanef_at TIMESTAMPTZ,
  visa_dranef_by UUID REFERENCES auth.users(id),
  visa_dranef_at TIMESTAMPTZ,
  validation_note TEXT,
  
  -- Workflow & Traçabilité standard
  status validation_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_years CHECK (end_year >= start_year)
);

-- =============================================
-- TABLE: pdfcp_actions (Actions PDFCP avec géolocalisation)
-- =============================================
CREATE TABLE public.pdfcp_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdfcp_id UUID REFERENCES public.pdfcp_programs(id) ON DELETE CASCADE NOT NULL,
  
  -- Localisation
  commune_id TEXT,
  perimetre_id TEXT,
  site_id TEXT,
  
  -- Action
  action_key TEXT NOT NULL,
  action_label TEXT,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2050),
  
  -- État (PREVU, CP, EXECUTE)
  etat TEXT DEFAULT 'PREVU' CHECK (etat IN ('PREVU', 'CP', 'EXECUTE')),
  
  -- Quantités
  unite TEXT NOT NULL,
  physique NUMERIC(12,2) DEFAULT 0,
  financier NUMERIC(15,2) DEFAULT 0,
  
  -- Géolocalisation (WGS84)
  geometry_type TEXT CHECK (geometry_type IN ('Point', 'LineString', 'Polygon')),
  coordinates JSONB,
  
  -- Workflow & Traçabilité
  status validation_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- TABLE: field_activities (Activités terrain)
-- =============================================
CREATE TABLE public.field_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agent et territoire
  adp_user_id UUID REFERENCES auth.users(id) NOT NULL,
  dranef_id TEXT NOT NULL,
  dpanef_id TEXT NOT NULL,
  commune_id TEXT,
  
  -- Activité
  activity_type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Détails conditionnels
  occasion TEXT,
  object TEXT,
  beneficiaries_count INTEGER,
  participants_count INTEGER,
  
  -- Localisation
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Pièces jointes
  attachments JSONB DEFAULT '[]',
  
  -- Lien PDFCP optionnel
  pdfcp_id UUID REFERENCES public.pdfcp_programs(id) ON DELETE SET NULL,
  
  -- Workflow & Traçabilité
  status validation_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- TABLE: conflicts (Conflits & Oppositions)
-- =============================================
CREATE TABLE public.conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Agent et territoire
  adp_user_id UUID REFERENCES auth.users(id) NOT NULL,
  dranef_id TEXT NOT NULL,
  dpanef_id TEXT NOT NULL,
  commune_id TEXT,
  
  -- Type et classification
  conflict_type conflict_type NOT NULL,
  nature TEXT NOT NULL,
  severity conflict_severity DEFAULT 'moyenne',
  conflict_status conflict_status DEFAULT 'ouvert',
  
  -- Détails
  title TEXT NOT NULL,
  description TEXT,
  parties_involved TEXT[],
  
  -- Dates
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolution_date DATE,
  
  -- Spécifique Opposition
  superficie_opposee_ha NUMERIC(10,2),
  superficie_levee_ha NUMERIC(10,2),
  
  -- Localisation
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Pièces jointes
  attachments JSONB DEFAULT '[]',
  
  -- Lien PDFCP optionnel
  pdfcp_id UUID REFERENCES public.pdfcp_programs(id) ON DELETE SET NULL,
  
  -- Workflow & Traçabilité
  status validation_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- TABLE: organizations (Organisations structurelles)
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  name TEXT NOT NULL,
  organization_type organization_type NOT NULL,
  registration_number TEXT,
  
  -- Territoire
  dranef_id TEXT NOT NULL,
  dpanef_id TEXT NOT NULL,
  commune_id TEXT,
  
  -- Informations
  creation_date DATE,
  activity_domains TEXT[],
  members_count INTEGER,
  president_name TEXT,
  contact_phone TEXT,
  
  -- Statut organisation
  organization_status organization_status DEFAULT 'active',
  
  -- Agent référent
  adp_user_id UUID REFERENCES auth.users(id),
  
  -- Workflow & Traçabilité
  status validation_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- TABLE: sync_queue (File d'attente synchronisation offline)
-- =============================================
CREATE TABLE public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Opération
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,
  payload JSONB NOT NULL,
  
  -- Statut sync
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'conflict')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  queued_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  synced_at TIMESTAMPTZ,
  
  -- Client tracking
  client_id TEXT,
  offline_id TEXT UNIQUE
);

-- =============================================
-- TRIGGERS: updated_at automatique
-- =============================================
CREATE TRIGGER update_adp_agents_updated_at
  BEFORE UPDATE ON public.adp_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdfcp_programs_updated_at
  BEFORE UPDATE ON public.pdfcp_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pdfcp_actions_updated_at
  BEFORE UPDATE ON public.pdfcp_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_field_activities_updated_at
  BEFORE UPDATE ON public.field_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conflicts_updated_at
  BEFORE UPDATE ON public.conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS: Enable Row Level Security
-- =============================================
ALTER TABLE public.adp_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfcp_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfcp_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Helper function to get user commune_ids safely
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_commune_ids(_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(commune_ids, '{}')
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- RLS POLICIES: adp_agents
-- =============================================
CREATE POLICY "adp_agents_select" ON public.adp_agents FOR SELECT USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'NATIONAL') OR
  (has_role(auth.uid(), 'REGIONAL') AND dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'PROVINCIAL') AND dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'LOCAL') AND user_id = auth.uid())
);

CREATE POLICY "adp_agents_insert" ON public.adp_agents FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'PROVINCIAL'));

CREATE POLICY "adp_agents_update" ON public.adp_agents FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR 
  (has_role(auth.uid(), 'PROVINCIAL') AND dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1))
);

CREATE POLICY "adp_agents_delete" ON public.adp_agents FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN')
);

-- =============================================
-- RLS POLICIES: pdfcp_programs (FIXED: text vs text[] comparison)
-- =============================================
CREATE POLICY "pdfcp_programs_select" ON public.pdfcp_programs FOR SELECT USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'NATIONAL') OR
  (has_role(auth.uid(), 'REGIONAL') AND dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'PROVINCIAL') AND dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'LOCAL') AND commune_id = ANY(get_user_commune_ids(auth.uid())))
);

CREATE POLICY "pdfcp_programs_insert" ON public.pdfcp_programs FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'LOCAL')
);

CREATE POLICY "pdfcp_programs_update" ON public.pdfcp_programs FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (NOT locked AND (
    (has_role(auth.uid(), 'LOCAL') AND commune_id = ANY(get_user_commune_ids(auth.uid()))) OR
    (has_role(auth.uid(), 'PROVINCIAL') AND dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
    (has_role(auth.uid(), 'REGIONAL') AND dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1))
  ))
);

CREATE POLICY "pdfcp_programs_delete" ON public.pdfcp_programs FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN')
);

-- =============================================
-- RLS POLICIES: pdfcp_actions (FIXED)
-- =============================================
CREATE POLICY "pdfcp_actions_select" ON public.pdfcp_actions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdfcp_programs p WHERE p.id = pdfcp_id AND (
      has_role(auth.uid(), 'ADMIN') OR 
      has_role(auth.uid(), 'NATIONAL') OR
      (has_role(auth.uid(), 'REGIONAL') AND p.dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'PROVINCIAL') AND p.dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'LOCAL') AND p.commune_id = ANY(get_user_commune_ids(auth.uid())))
    )
  )
);

CREATE POLICY "pdfcp_actions_insert" ON public.pdfcp_actions FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'LOCAL'));

CREATE POLICY "pdfcp_actions_update" ON public.pdfcp_actions FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (created_by = auth.uid() AND status = 'draft')
);

CREATE POLICY "pdfcp_actions_delete" ON public.pdfcp_actions FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (created_by = auth.uid() AND status = 'draft')
);

-- =============================================
-- RLS POLICIES: field_activities
-- =============================================
CREATE POLICY "field_activities_select" ON public.field_activities FOR SELECT USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'NATIONAL') OR
  (has_role(auth.uid(), 'REGIONAL') AND dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'PROVINCIAL') AND dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'LOCAL') AND adp_user_id = auth.uid())
);

CREATE POLICY "field_activities_insert" ON public.field_activities FOR INSERT 
WITH CHECK (adp_user_id = auth.uid() OR has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "field_activities_update" ON public.field_activities FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft')
);

CREATE POLICY "field_activities_delete" ON public.field_activities FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft')
);

-- =============================================
-- RLS POLICIES: conflicts
-- =============================================
CREATE POLICY "conflicts_select" ON public.conflicts FOR SELECT USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'NATIONAL') OR
  (has_role(auth.uid(), 'REGIONAL') AND dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'PROVINCIAL') AND dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'LOCAL') AND adp_user_id = auth.uid())
);

CREATE POLICY "conflicts_insert" ON public.conflicts FOR INSERT 
WITH CHECK (adp_user_id = auth.uid() OR has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "conflicts_update" ON public.conflicts FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft')
);

CREATE POLICY "conflicts_delete" ON public.conflicts FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft')
);

-- =============================================
-- RLS POLICIES: organizations
-- =============================================
CREATE POLICY "organizations_select" ON public.organizations FOR SELECT USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'NATIONAL') OR
  (has_role(auth.uid(), 'REGIONAL') AND dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'PROVINCIAL') AND dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
  (has_role(auth.uid(), 'LOCAL') AND adp_user_id = auth.uid())
);

CREATE POLICY "organizations_insert" ON public.organizations FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'LOCAL'));

CREATE POLICY "organizations_update" ON public.organizations FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft')
);

CREATE POLICY "organizations_delete" ON public.organizations FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft')
);

-- =============================================
-- RLS POLICIES: sync_queue (User can only see own queue)
-- =============================================
CREATE POLICY "sync_queue_select" ON public.sync_queue FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sync_queue_insert" ON public.sync_queue FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sync_queue_update" ON public.sync_queue FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "sync_queue_delete" ON public.sync_queue FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- INDEXES: Performance
-- =============================================
CREATE INDEX idx_adp_agents_dranef ON public.adp_agents(dranef_id);
CREATE INDEX idx_adp_agents_dpanef ON public.adp_agents(dpanef_id);
CREATE INDEX idx_pdfcp_programs_dranef ON public.pdfcp_programs(dranef_id);
CREATE INDEX idx_pdfcp_programs_dpanef ON public.pdfcp_programs(dpanef_id);
CREATE INDEX idx_pdfcp_actions_pdfcp ON public.pdfcp_actions(pdfcp_id);
CREATE INDEX idx_field_activities_adp ON public.field_activities(adp_user_id);
CREATE INDEX idx_field_activities_date ON public.field_activities(activity_date);
CREATE INDEX idx_conflicts_adp ON public.conflicts(adp_user_id);
CREATE INDEX idx_conflicts_status ON public.conflicts(conflict_status);
CREATE INDEX idx_organizations_type ON public.organizations(organization_type);
CREATE INDEX idx_sync_queue_user ON public.sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON public.sync_queue(sync_status);

-- =============================================
-- COMMENTS: Documentation
-- =============================================
COMMENT ON TABLE public.adp_agents IS 'Agents de Développement Participatif - Gestion RH et territoriale';
COMMENT ON TABLE public.pdfcp_programs IS 'Programmes de Développement Forestier avec workflow validation 3 niveaux';
COMMENT ON TABLE public.pdfcp_actions IS 'Actions PDFCP géolocalisées (Prévu/CP/Exécuté)';
COMMENT ON TABLE public.field_activities IS 'Activités terrain des ADP avec traçabilité complète';
COMMENT ON TABLE public.conflicts IS 'Conflits et Oppositions forestières avec suivi résolution';
COMMENT ON TABLE public.organizations IS 'Organisations structurelles (ODF, Coopératives, Associations, AGS)';
COMMENT ON TABLE public.sync_queue IS 'File d''attente pour synchronisation offline-first';