
-- =============================================
-- Migration: New PDFCP Validation Workflow
-- States: BROUILLON → CONCERTE_ADP → VALIDE_DPANEF → VALIDE_CENTRAL → VERROUILLE
-- =============================================

-- 0. Drop the old CHECK constraint that blocks new values
ALTER TABLE public.pdfcp_programs DROP CONSTRAINT IF EXISTS pdfcp_programs_validation_status_check;

-- 1. Add unlock tracking columns (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pdfcp_programs' AND column_name = 'unlock_motif') THEN
    ALTER TABLE public.pdfcp_programs ADD COLUMN unlock_motif text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pdfcp_programs' AND column_name = 'unlock_by') THEN
    ALTER TABLE public.pdfcp_programs ADD COLUMN unlock_by text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pdfcp_programs' AND column_name = 'unlock_at') THEN
    ALTER TABLE public.pdfcp_programs ADD COLUMN unlock_at timestamptz;
  END IF;
END $$;

-- 2. Migrate existing validation_status values to new naming
UPDATE public.pdfcp_programs SET validation_status = 'BROUILLON' WHERE validation_status IN ('DRAFT', 'draft');
UPDATE public.pdfcp_programs SET validation_status = 'CONCERTE_ADP' WHERE validation_status = 'VALIDATED_ADP';
UPDATE public.pdfcp_programs SET validation_status = 'VALIDE_DPANEF' WHERE validation_status = 'VALIDATED_DPANEF';
UPDATE public.pdfcp_programs SET validation_status = 'VALIDE_CENTRAL' WHERE validation_status = 'VISA_DRANEF';

-- 3. Add new CHECK constraint with the new values
ALTER TABLE public.pdfcp_programs ADD CONSTRAINT pdfcp_programs_validation_status_check
  CHECK (validation_status IN ('BROUILLON', 'CONCERTE_ADP', 'VALIDE_DPANEF', 'VALIDE_CENTRAL', 'VERROUILLE'));

-- 4. Set default for new rows
ALTER TABLE public.pdfcp_programs ALTER COLUMN validation_status SET DEFAULT 'BROUILLON';

-- 5. Update trigger for annulation fields to use new status names
CREATE OR REPLACE FUNCTION public.trg_pdfcp_annulation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- When annulation_motif is being set and status moves to BROUILLON
  IF NEW.annulation_motif IS NOT NULL 
     AND NEW.annulation_motif <> ''
     AND NEW.validation_status = 'BROUILLON'
     AND OLD.validation_status <> 'BROUILLON'
  THEN
    NEW.annulation_par := COALESCE(auth.uid()::text, 'system');
    NEW.annulation_date := now();
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- 6. Create trigger for unlock tracking
CREATE OR REPLACE FUNCTION public.trg_pdfcp_unlock_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- When unlock_motif is set and status moves from VERROUILLE to VALIDE_CENTRAL
  IF NEW.unlock_motif IS NOT NULL 
     AND NEW.unlock_motif <> ''
     AND OLD.validation_status = 'VERROUILLE'
     AND NEW.validation_status = 'VALIDE_CENTRAL'
  THEN
    NEW.unlock_by := COALESCE(auth.uid()::text, 'system');
    NEW.unlock_at := now();
    NEW.locked := false;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_pdfcp_unlock ON public.pdfcp_programs;
CREATE TRIGGER trg_pdfcp_unlock
  BEFORE UPDATE ON public.pdfcp_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_pdfcp_unlock_fields();

-- 7. Drop and recreate UPDATE policy with new workflow rules
DROP POLICY IF EXISTS "pdfcp_programs_update" ON public.pdfcp_programs;

CREATE POLICY "pdfcp_programs_update" ON public.pdfcp_programs
FOR UPDATE
USING (
  -- ADMIN: can always update (full control including unlock/lock/force transitions)
  has_role(auth.uid(), 'ADMIN'::app_role)
  
  OR (
    -- Non-VERROUILLE: normal editing by role/scope
    COALESCE(validation_status, 'BROUILLON') <> 'VERROUILLE'
    AND (
      (has_role(auth.uid(), 'LOCAL'::app_role) 
       AND commune_id = ANY(get_user_commune_ids(auth.uid())))
      OR (has_role(auth.uid(), 'PROVINCIAL'::app_role) 
          AND dpanef_id = (SELECT p.dpanef_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
      OR (has_role(auth.uid(), 'REGIONAL'::app_role) 
          AND dranef_id = (SELECT p.dranef_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
      OR has_role(auth.uid(), 'NATIONAL'::app_role)
    )
  )
);
