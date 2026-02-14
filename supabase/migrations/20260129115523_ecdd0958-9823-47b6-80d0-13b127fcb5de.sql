-- =============================================
-- PHASE 3F: RLS Workflow Validation Renforcé
-- =============================================

-- Fonction helper pour vérifier si l'utilisateur peut valider dans un périmètre
CREATE OR REPLACE FUNCTION public.can_validate_in_scope(_user_id UUID, _dranef_id TEXT, _dpanef_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(_user_id, 'ADMIN') OR
    has_role(_user_id, 'NATIONAL') OR
    (has_role(_user_id, 'REGIONAL') AND _dranef_id = (SELECT dranef_id FROM profiles WHERE user_id = _user_id LIMIT 1)) OR
    (has_role(_user_id, 'PROVINCIAL') AND _dpanef_id = (SELECT dpanef_id FROM profiles WHERE user_id = _user_id LIMIT 1))
$$;

-- Fonction pour obtenir le niveau de scope d'un utilisateur (pour tri)
CREATE OR REPLACE FUNCTION public.get_scope_priority(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE get_user_scope(_user_id)
    WHEN 'ADMIN' THEN 1
    WHEN 'NATIONAL' THEN 2
    WHEN 'REGIONAL' THEN 3
    WHEN 'PROVINCIAL' THEN 4
    WHEN 'LOCAL' THEN 5
    ELSE 6
  END
$$;

-- =============================================
-- Mise à jour des policies pour field_activities
-- =============================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "field_activities_update" ON public.field_activities;

-- Nouvelle policy: ADP peut modifier ses brouillons, DPANEF+ peut valider dans son périmètre
CREATE POLICY "field_activities_update" ON public.field_activities
FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  -- L'ADP peut modifier ses propres brouillons
  (adp_user_id = auth.uid() AND status = 'draft') OR
  -- DPANEF+ peut valider dans son périmètre
  can_validate_in_scope(auth.uid(), dranef_id, dpanef_id)
);

-- =============================================
-- Mise à jour des policies pour conflicts
-- =============================================

DROP POLICY IF EXISTS "conflicts_update" ON public.conflicts;

CREATE POLICY "conflicts_update" ON public.conflicts
FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft') OR
  can_validate_in_scope(auth.uid(), dranef_id, dpanef_id)
);

-- =============================================
-- Mise à jour des policies pour organizations
-- =============================================

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;

CREATE POLICY "organizations_update" ON public.organizations
FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (adp_user_id = auth.uid() AND status = 'draft') OR
  can_validate_in_scope(auth.uid(), dranef_id, dpanef_id)
);

-- =============================================
-- Mise à jour des policies pour cahier_journal_entries
-- =============================================

DROP POLICY IF EXISTS "Users can update own draft entries" ON public.cahier_journal_entries;

CREATE POLICY "Users can update own draft entries" ON public.cahier_journal_entries
FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN') OR
  (user_id = auth.uid() AND (statut_validation = 'Brouillon' OR status = 'draft')) OR
  can_validate_in_scope(auth.uid(), dranef_id, dpanef_id)
)
WITH CHECK (
  user_id = auth.uid() OR can_validate_in_scope(auth.uid(), dranef_id, dpanef_id)
);

-- =============================================
-- Contrainte: validation doit enregistrer validated_by + validated_at
-- =============================================

-- Trigger pour auto-remplir validated_by/validated_at lors d'une validation
CREATE OR REPLACE FUNCTION public.set_validation_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le statut passe à 'validated' ou 'submitted'
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated')) THEN
      NEW.validated_by := auth.uid();
      NEW.validated_at := now();
    END IF;
    -- Toujours mettre à jour updated_by
    NEW.updated_by := auth.uid();
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur les tables métier
DROP TRIGGER IF EXISTS set_validation_audit_field_activities ON public.field_activities;
CREATE TRIGGER set_validation_audit_field_activities
  BEFORE UPDATE ON public.field_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_validation_audit();

DROP TRIGGER IF EXISTS set_validation_audit_conflicts ON public.conflicts;
CREATE TRIGGER set_validation_audit_conflicts
  BEFORE UPDATE ON public.conflicts
  FOR EACH ROW EXECUTE FUNCTION public.set_validation_audit();

DROP TRIGGER IF EXISTS set_validation_audit_organizations ON public.organizations;
CREATE TRIGGER set_validation_audit_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_validation_audit();

-- Trigger pour auto-remplir created_by sur INSERT
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Appliquer sur les tables métier
DROP TRIGGER IF EXISTS set_created_by_field_activities ON public.field_activities;
CREATE TRIGGER set_created_by_field_activities
  BEFORE INSERT ON public.field_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

DROP TRIGGER IF EXISTS set_created_by_conflicts ON public.conflicts;
CREATE TRIGGER set_created_by_conflicts
  BEFORE INSERT ON public.conflicts
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

DROP TRIGGER IF EXISTS set_created_by_organizations ON public.organizations;
CREATE TRIGGER set_created_by_organizations
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

DROP TRIGGER IF EXISTS set_created_by_pdfcp_programs ON public.pdfcp_programs;
CREATE TRIGGER set_created_by_pdfcp_programs
  BEFORE INSERT ON public.pdfcp_programs
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

DROP TRIGGER IF EXISTS set_created_by_pdfcp_actions ON public.pdfcp_actions;
CREATE TRIGGER set_created_by_pdfcp_actions
  BEFORE INSERT ON public.pdfcp_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();