-- =============================================
-- Migration: Fix RLS policies for pdfcp_programs
-- Objectif: Corriger l'erreur "new row violates row-level security policy"
-- Date: 2026-02-12
-- =============================================

-- 1. Créer la fonction helper is_admin() si elle n'existe pas
-- Utilise la fonction has_role() existante pour vérifier le rôle ADMIN
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'ADMIN'::app_role)
$$;

-- 2. Vérifier et ajouter les colonnes created_by et created_at si absentes
DO $$
BEGIN
  -- Ajouter created_by si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pdfcp_programs' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.pdfcp_programs 
    ADD COLUMN created_by UUID REFERENCES auth.users(id);
    
    COMMENT ON COLUMN public.pdfcp_programs.created_by IS 
      'UUID de l''utilisateur qui a créé le PDFCP (auth.uid() au moment de la création)';
  END IF;

  -- Ajouter created_at si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pdfcp_programs' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.pdfcp_programs 
    ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    
    COMMENT ON COLUMN public.pdfcp_programs.created_at IS 
      'Date et heure de création du PDFCP';
  END IF;
END $$;

-- 3. Activer RLS sur pdfcp_programs (idempotent)
ALTER TABLE public.pdfcp_programs ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes policies conflictuelles (idempotent)
DROP POLICY IF EXISTS "pdfcp_programs_select" ON public.pdfcp_programs;
DROP POLICY IF EXISTS "pdfcp_programs_insert" ON public.pdfcp_programs;
DROP POLICY IF EXISTS "pdfcp_programs_update" ON public.pdfcp_programs;
DROP POLICY IF EXISTS "pdfcp_programs_delete" ON public.pdfcp_programs;
DROP POLICY IF EXISTS "PDFCP read access" ON public.pdfcp_programs;
DROP POLICY IF EXISTS "PDFCP insert own" ON public.pdfcp_programs;
DROP POLICY IF EXISTS "PDFCP update own" ON public.pdfcp_programs;
DROP POLICY IF EXISTS "PDFCP delete own" ON public.pdfcp_programs;

-- 5. Créer les nouvelles policies RLS

-- 🔐 Policy SELECT: Autoriser la lecture pour tous les utilisateurs authentifiés
-- NOTE: Pour le moment, tous les authentifiés peuvent lire tous les PDFCP.
-- Pour restreindre par scope territorial (DRANEF/DPANEF/Commune) plus tard, 
-- remplacer USING (true) par :
--   USING (
--     public.is_admin(auth.uid()) OR
--     public.has_role(auth.uid(), 'NATIONAL'::app_role) OR
--     (public.has_role(auth.uid(), 'REGIONAL'::app_role) AND 
--      dranef_id = (SELECT dranef_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)) OR
--     (public.has_role(auth.uid(), 'PROVINCIAL'::app_role) AND 
--      dpanef_id = (SELECT dpanef_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)) OR
--     (public.has_role(auth.uid(), 'LOCAL'::app_role) AND 
--      commune_id = ANY((SELECT commune_ids FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)))
--   )
CREATE POLICY "pdfcp_programs_select"
ON public.pdfcp_programs
FOR SELECT
TO authenticated
USING (true);

-- 🔐 Policy INSERT: Autoriser l'insertion uniquement si created_by = auth.uid()
-- L'utilisateur doit passer created_by = auth.uid() dans l'INSERT pour que la policy passe
CREATE POLICY "pdfcp_programs_insert"
ON public.pdfcp_programs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 🔐 Policy UPDATE: Autoriser la modification par le créateur OU par un ADMIN
-- USING: vérifie les lignes existantes (lecture)
-- WITH CHECK: vérifie les nouvelles valeurs (écriture)
CREATE POLICY "pdfcp_programs_update"
ON public.pdfcp_programs
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by OR 
  public.is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = created_by OR 
  public.is_admin(auth.uid())
);

-- 🔐 Policy DELETE: Autoriser la suppression par le créateur OU par un ADMIN
CREATE POLICY "pdfcp_programs_delete"
ON public.pdfcp_programs
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by OR 
  public.is_admin(auth.uid())
);

-- 6. Commentaires pour documentation
COMMENT ON POLICY "pdfcp_programs_select" ON public.pdfcp_programs IS 
  'Autorise la lecture de tous les PDFCP pour les utilisateurs authentifiés. 
   Pour restreindre par scope territorial (DRANEF/DPANEF/Commune), modifier USING dans la migration.';

COMMENT ON POLICY "pdfcp_programs_insert" ON public.pdfcp_programs IS 
  'Autorise l''insertion uniquement si created_by = auth.uid(). 
   Le frontend DOIT passer created_by dans l''INSERT.';

COMMENT ON POLICY "pdfcp_programs_update" ON public.pdfcp_programs IS 
  'Autorise la modification uniquement par le créateur (created_by = auth.uid()) ou par un ADMIN.';

COMMENT ON POLICY "pdfcp_programs_delete" ON public.pdfcp_programs IS 
  'Autorise la suppression uniquement par le créateur (created_by = auth.uid()) ou par un ADMIN.';

-- 7. Index pour améliorer les performances des queries avec created_by
CREATE INDEX IF NOT EXISTS idx_pdfcp_programs_created_by 
ON public.pdfcp_programs(created_by);

-- 8. Note finale pour les développeurs
DO $$
BEGIN
  RAISE NOTICE 'Migration RLS pdfcp_programs appliquée avec succès.';
  RAISE NOTICE 'Vérifiez que le frontend passe created_by = auth.uid() lors de l''INSERT.';
  RAISE NOTICE 'Pour tester: login -> créer PDFCP -> vérifier que l''erreur RLS disparaît.';
END $$;
