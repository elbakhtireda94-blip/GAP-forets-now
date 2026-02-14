-- Extend cahier_journal_entries with all professional fields

-- Add new columns to the existing table
ALTER TABLE public.cahier_journal_entries
ADD COLUMN IF NOT EXISTS statut_validation text DEFAULT 'Brouillon' CHECK (statut_validation IN ('Brouillon', 'Validé ADP', 'Transmis hiérarchie')),
ADD COLUMN IF NOT EXISTS participants_count integer,
ADD COLUMN IF NOT EXISTS organisations_concernees text[],
ADD COLUMN IF NOT EXISTS temps_passe_min integer,
ADD COLUMN IF NOT EXISTS priorite text DEFAULT 'Moyenne' CHECK (priorite IN ('Faible', 'Moyenne', 'Élevée')),
ADD COLUMN IF NOT EXISTS resultats_obtenus text,
ADD COLUMN IF NOT EXISTS decisions_prises text,
ADD COLUMN IF NOT EXISTS prochaines_etapes text,
ADD COLUMN IF NOT EXISTS contraintes_rencontrees text,
ADD COLUMN IF NOT EXISTS besoin_appui_hierarchique boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS justification_appui text,
ADD COLUMN IF NOT EXISTS perimetre_label text,
ADD COLUMN IF NOT EXISTS site_label text;

-- Update the enum for category with new ANEF standard values
-- First, add the new values if they don't exist
DO $$
BEGIN
    -- Add new enum values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'animation_territoriale' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'journal_category')) THEN
        ALTER TYPE journal_category ADD VALUE 'animation_territoriale';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'suivi_pdfcp' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'journal_category')) THEN
        ALTER TYPE journal_category ADD VALUE 'suivi_pdfcp';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'organisation_usagers' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'journal_category')) THEN
        ALTER TYPE journal_category ADD VALUE 'organisation_usagers';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'partenariats' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'journal_category')) THEN
        ALTER TYPE journal_category ADD VALUE 'partenariats';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'activite_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'journal_category')) THEN
        ALTER TYPE journal_category ADD VALUE 'activite_admin';
    END IF;
END$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.cahier_journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_category ON public.cahier_journal_entries(category);
CREATE INDEX IF NOT EXISTS idx_journal_entries_statut ON public.cahier_journal_entries(statut_validation);
CREATE INDEX IF NOT EXISTS idx_journal_entries_priorite ON public.cahier_journal_entries(priorite);
CREATE INDEX IF NOT EXISTS idx_journal_entries_besoin_appui ON public.cahier_journal_entries(besoin_appui_hierarchique) WHERE besoin_appui_hierarchique = true;