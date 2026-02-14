
-- 1) Add cancellation traceability columns to pdfcp_programs
ALTER TABLE public.pdfcp_programs
  ADD COLUMN IF NOT EXISTS annulation_motif text,
  ADD COLUMN IF NOT EXISTS annulation_par text,
  ADD COLUMN IF NOT EXISTS annulation_date timestamptz;

-- 2) Drop existing UPDATE policy
DROP POLICY IF EXISTS "pdfcp_programs_update" ON public.pdfcp_programs;

-- 3) Recreate UPDATE policy with cancellation support
CREATE POLICY "pdfcp_programs_update"
  ON public.pdfcp_programs
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR (
      -- Normal edits on unlocked programs
      (NOT COALESCE(locked, false))
      AND (
        (has_role(auth.uid(), 'LOCAL'::app_role) AND (commune_id = ANY (get_user_commune_ids(auth.uid()))))
        OR (has_role(auth.uid(), 'PROVINCIAL'::app_role) AND (dpanef_id = (SELECT profiles.dpanef_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1)))
        OR (has_role(auth.uid(), 'REGIONAL'::app_role) AND (dranef_id = (SELECT profiles.dranef_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1)))
      )
    )
    OR (
      -- Cancellation: program is in a validated state (not DRAFT)
      COALESCE(validation_status, 'DRAFT') <> 'DRAFT'
      AND (
        -- LOCAL can cancel CONCERTE (VALIDATED_ADP)
        (has_role(auth.uid(), 'LOCAL'::app_role) 
          AND validation_status = 'VALIDATED_ADP'
          AND commune_id = ANY (get_user_commune_ids(auth.uid())))
        -- PROVINCIAL can cancel CP and EXECUTE
        OR (has_role(auth.uid(), 'PROVINCIAL'::app_role) 
          AND validation_status IN ('VALIDATED_DPANEF', 'VISA_DRANEF')
          AND dpanef_id = (SELECT profiles.dpanef_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1))
        -- REGIONAL can cancel CP and EXECUTE  
        OR (has_role(auth.uid(), 'REGIONAL'::app_role) 
          AND validation_status IN ('VALIDATED_DPANEF', 'VISA_DRANEF')
          AND dranef_id = (SELECT profiles.dranef_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1))
      )
    )
  );
