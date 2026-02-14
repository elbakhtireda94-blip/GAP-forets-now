
-- =====================================================
-- Table: pdfcp_actions_geo
-- Actions cartographiques PDFCP, liées obligatoirement à une action prévue
-- =====================================================

CREATE TABLE public.pdfcp_actions_geo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdfcp_id uuid NOT NULL REFERENCES public.pdfcp_programs(id) ON DELETE CASCADE,
  planned_action_id uuid NOT NULL REFERENCES public.pdfcp_actions(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  titre text NOT NULL,
  description text,
  surface_realisee_ha numeric,
  longueur_realisee_km numeric,
  coords_text_lambert text NOT NULL,
  lambert_zone text NOT NULL,
  geom_type text NOT NULL,
  geometry jsonb,
  centroid_lat double precision NOT NULL,
  centroid_lng double precision NOT NULL,
  date_realisation date,
  statut text DEFAULT 'planifie',
  observations text,
  preuves jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.pdfcp_actions_geo ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_pdfcp_actions_geo_planned ON public.pdfcp_actions_geo(planned_action_id);
CREATE INDEX idx_pdfcp_actions_geo_pdfcp ON public.pdfcp_actions_geo(pdfcp_id);

-- RLS: SELECT - scope-based through pdfcp_programs (same pattern as pdfcp_actions)
CREATE POLICY "pdfcp_actions_geo_select" ON public.pdfcp_actions_geo
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdfcp_programs p
    WHERE p.id = pdfcp_actions_geo.pdfcp_id
    AND (
      has_role(auth.uid(), 'ADMIN'::app_role) OR
      has_role(auth.uid(), 'NATIONAL'::app_role) OR
      (has_role(auth.uid(), 'REGIONAL'::app_role) AND p.dranef_id = (SELECT profiles.dranef_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'PROVINCIAL'::app_role) AND p.dpanef_id = (SELECT profiles.dpanef_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'LOCAL'::app_role) AND p.commune_id = ANY(get_user_commune_ids(auth.uid())))
    )
  )
);

-- RLS: INSERT - scoped roles can insert
CREATE POLICY "pdfcp_actions_geo_insert" ON public.pdfcp_actions_geo
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'LOCAL'::app_role) OR
  has_role(auth.uid(), 'PROVINCIAL'::app_role) OR
  has_role(auth.uid(), 'REGIONAL'::app_role)
);

-- RLS: UPDATE - owner or admin
CREATE POLICY "pdfcp_actions_geo_update" ON public.pdfcp_actions_geo
FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  created_by = auth.uid()
);

-- RLS: DELETE - owner or admin
CREATE POLICY "pdfcp_actions_geo_delete" ON public.pdfcp_actions_geo
FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  created_by = auth.uid()
);

-- Triggers: auto-update timestamps and created_by
CREATE TRIGGER update_pdfcp_actions_geo_updated_at
BEFORE UPDATE ON public.pdfcp_actions_geo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_pdfcp_actions_geo_created_by
BEFORE INSERT ON public.pdfcp_actions_geo
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();
