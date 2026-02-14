
-- ============================================================
-- 1) BEFORE UPDATE trigger: auto-fill annulation_par & annulation_date
--    Only fires when annulation_motif is being set (non-null)
--    and validation_status is being reverted to DRAFT
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_pdfcp_annulation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When annulation_motif is being set and status moves to DRAFT
  IF NEW.annulation_motif IS NOT NULL 
     AND NEW.annulation_motif <> ''
     AND NEW.validation_status = 'DRAFT'
     AND OLD.validation_status <> 'DRAFT'
  THEN
    NEW.annulation_par := COALESCE(auth.uid()::text, 'system');
    NEW.annulation_date := now();
  END IF;
  
  -- Always update updated_at
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pdfcp_annulation ON public.pdfcp_programs;

CREATE TRIGGER trg_pdfcp_annulation
  BEFORE UPDATE ON public.pdfcp_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_pdfcp_annulation_fields();

-- ============================================================
-- 2) Recreate UPDATE policy with strict annulation_motif check
-- ============================================================

DROP POLICY IF EXISTS "pdfcp_programs_update" ON public.pdfcp_programs;

CREATE POLICY "pdfcp_programs_update"
  ON public.pdfcp_programs
  FOR UPDATE
  USING (
    -- ADMIN: full access
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR (
      -- Normal edits on unlocked, non-validated programs
      (NOT COALESCE(locked, false))
      AND (
        (has_role(auth.uid(), 'LOCAL'::app_role) AND commune_id = ANY (get_user_commune_ids(auth.uid())))
        OR (has_role(auth.uid(), 'PROVINCIAL'::app_role) AND dpanef_id = (SELECT p.dpanef_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
        OR (has_role(auth.uid(), 'REGIONAL'::app_role) AND dranef_id = (SELECT p.dranef_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
      )
    )
    OR (
      -- Cancellation of validated programs: requires validated state
      COALESCE(validation_status, 'DRAFT') <> 'DRAFT'
      AND (
        -- LOCAL can cancel CONCERTE (VALIDATED_ADP)
        (has_role(auth.uid(), 'LOCAL'::app_role)
          AND validation_status = 'VALIDATED_ADP'
          AND commune_id = ANY (get_user_commune_ids(auth.uid())))
        -- PROVINCIAL can cancel CP and EXECUTE
        OR (has_role(auth.uid(), 'PROVINCIAL'::app_role)
          AND validation_status IN ('VALIDATED_DPANEF', 'VISA_DRANEF')
          AND dpanef_id = (SELECT p.dpanef_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
        -- REGIONAL can cancel CP and EXECUTE
        OR (has_role(auth.uid(), 'REGIONAL'::app_role)
          AND validation_status IN ('VALIDATED_DPANEF', 'VISA_DRANEF')
          AND dranef_id = (SELECT p.dranef_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
      )
    )
  );
