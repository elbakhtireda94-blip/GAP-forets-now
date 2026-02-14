
-- =====================================================
-- Migration: PDFCP 3-layer model (CONCERTE / CP / EXECUTE)
-- =====================================================

-- 1. Add new columns to pdfcp_actions
ALTER TABLE public.pdfcp_actions 
  ADD COLUMN IF NOT EXISTS source_plan_line_id UUID REFERENCES public.pdfcp_actions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_cp_line_id UUID REFERENCES public.pdfcp_actions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS justification_ecart TEXT,
  ADD COLUMN IF NOT EXISTS preuves JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS date_realisation DATE,
  ADD COLUMN IF NOT EXISTS statut_execution TEXT DEFAULT 'planifie',
  ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

-- 2. Update existing PREVU values to CONCERTE
UPDATE public.pdfcp_actions SET etat = 'CONCERTE' WHERE etat = 'PREVU';

-- 3. Update default value for etat column
ALTER TABLE public.pdfcp_actions ALTER COLUMN etat SET DEFAULT 'CONCERTE';

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdfcp_actions_etat ON public.pdfcp_actions(etat);
CREATE INDEX IF NOT EXISTS idx_pdfcp_actions_source_plan ON public.pdfcp_actions(source_plan_line_id);
CREATE INDEX IF NOT EXISTS idx_pdfcp_actions_source_cp ON public.pdfcp_actions(source_cp_line_id);
CREATE INDEX IF NOT EXISTS idx_pdfcp_actions_pdfcp_year_etat ON public.pdfcp_actions(pdfcp_id, year, etat);

-- 5. Update RLS: allow PROVINCIAL and REGIONAL to insert CP lines
DROP POLICY IF EXISTS pdfcp_actions_insert ON public.pdfcp_actions;
CREATE POLICY pdfcp_actions_insert ON public.pdfcp_actions
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    has_role(auth.uid(), 'LOCAL'::app_role) OR
    has_role(auth.uid(), 'PROVINCIAL'::app_role) OR
    has_role(auth.uid(), 'REGIONAL'::app_role)
  );

-- 6. Update RLS: allow PROVINCIAL/REGIONAL to update (for CP management)
DROP POLICY IF EXISTS pdfcp_actions_update ON public.pdfcp_actions;
CREATE POLICY pdfcp_actions_update ON public.pdfcp_actions
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    (
      (created_by = auth.uid()) AND (status = 'draft'::validation_status)
    ) OR
    (
      -- PROVINCIAL/REGIONAL can update CP lines
      (etat IN ('CP')) AND
      (
        has_role(auth.uid(), 'PROVINCIAL'::app_role) OR
        has_role(auth.uid(), 'REGIONAL'::app_role)
      )
    )
  );
