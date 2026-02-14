-- =============================================
-- PHASE PDFCP: Tables de support avancées
-- =============================================

-- Table des pièces jointes PDFCP
CREATE TABLE IF NOT EXISTS public.pdfcp_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdfcp_id UUID NOT NULL REFERENCES public.pdfcp_programs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'image', 'doc', 'other'
  file_size_bytes INTEGER,
  description TEXT,
  category TEXT DEFAULT 'general', -- 'carte', 'pv', 'decision', 'photo', 'general'
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table historique de validation PDFCP (timeline)
CREATE TABLE IF NOT EXISTS public.pdfcp_validation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdfcp_id UUID NOT NULL REFERENCES public.pdfcp_programs(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'submitted', 'validated_adp', 'validated_dpanef', 'visa_dranef', 'rejected', 'unlocked'
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  performed_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdfcp_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfcp_validation_history ENABLE ROW LEVEL SECURITY;

-- RLS: Attachments - même visibilité que pdfcp_programs
CREATE POLICY "pdfcp_attachments_select" ON public.pdfcp_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdfcp_programs p
    WHERE p.id = pdfcp_attachments.pdfcp_id
    AND (
      has_role(auth.uid(), 'ADMIN') OR
      has_role(auth.uid(), 'NATIONAL') OR
      (has_role(auth.uid(), 'REGIONAL') AND p.dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'PROVINCIAL') AND p.dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'LOCAL') AND p.commune_id = ANY(get_user_commune_ids(auth.uid())))
    )
  )
);

CREATE POLICY "pdfcp_attachments_insert" ON public.pdfcp_attachments
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'LOCAL')
);

CREATE POLICY "pdfcp_attachments_delete" ON public.pdfcp_attachments
FOR DELETE USING (
  has_role(auth.uid(), 'ADMIN') OR uploaded_by = auth.uid()
);

-- RLS: Validation history - même visibilité que pdfcp_programs
CREATE POLICY "pdfcp_validation_history_select" ON public.pdfcp_validation_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdfcp_programs p
    WHERE p.id = pdfcp_validation_history.pdfcp_id
    AND (
      has_role(auth.uid(), 'ADMIN') OR
      has_role(auth.uid(), 'NATIONAL') OR
      (has_role(auth.uid(), 'REGIONAL') AND p.dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'PROVINCIAL') AND p.dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)) OR
      (has_role(auth.uid(), 'LOCAL') AND p.commune_id = ANY(get_user_commune_ids(auth.uid())))
    )
  )
);

CREATE POLICY "pdfcp_validation_history_insert" ON public.pdfcp_validation_history
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'ADMIN') OR
  has_role(auth.uid(), 'REGIONAL') OR
  has_role(auth.uid(), 'PROVINCIAL') OR
  has_role(auth.uid(), 'LOCAL')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_pdfcp_attachments_pdfcp_id ON public.pdfcp_attachments(pdfcp_id);
CREATE INDEX IF NOT EXISTS idx_pdfcp_validation_history_pdfcp_id ON public.pdfcp_validation_history(pdfcp_id);
CREATE INDEX IF NOT EXISTS idx_pdfcp_validation_history_created_at ON public.pdfcp_validation_history(created_at DESC);

-- Trigger updated_at
CREATE TRIGGER update_pdfcp_attachments_updated_at BEFORE UPDATE ON public.pdfcp_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Storage bucket pour pièces jointes PDFCP
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdfcp-attachments', 'pdfcp-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "pdfcp_attachments_storage_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pdfcp-attachments' AND auth.role() = 'authenticated'
);

CREATE POLICY "pdfcp_attachments_storage_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pdfcp-attachments' AND auth.role() = 'authenticated'
);

CREATE POLICY "pdfcp_attachments_storage_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'pdfcp-attachments' AND (
    has_role(auth.uid(), 'ADMIN') OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);