-- Create enum for journal entry categories
CREATE TYPE public.journal_category AS ENUM (
  'reunion',
  'animation',
  'mediation',
  'diagnostic',
  'suivi_chantier',
  'sensibilisation',
  'autre'
);

-- Create the cahier_journal_entries table
CREATE TABLE public.cahier_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category journal_category,
  location_text TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  pdfcp_id TEXT,
  dranef_id TEXT NOT NULL,
  dpanef_id TEXT NOT NULL,
  commune_id TEXT,
  adp_user_id TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cahier_journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- ADP users (LOCAL) can view their own entries
CREATE POLICY "ADP can view own entries"
ON public.cahier_journal_entries
FOR SELECT
USING (true);

-- ADP users can create their own entries
CREATE POLICY "ADP can create own entries"
ON public.cahier_journal_entries
FOR INSERT
WITH CHECK (true);

-- ADP users can update their own entries
CREATE POLICY "ADP can update own entries"
ON public.cahier_journal_entries
FOR UPDATE
USING (true);

-- ADP users can delete their own entries
CREATE POLICY "ADP can delete own entries"
ON public.cahier_journal_entries
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_cahier_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cahier_journal_entries_updated_at
BEFORE UPDATE ON public.cahier_journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_cahier_journal_updated_at();

-- Create index for faster queries
CREATE INDEX idx_cahier_journal_adp_user ON public.cahier_journal_entries(adp_user_id);
CREATE INDEX idx_cahier_journal_entry_date ON public.cahier_journal_entries(entry_date);
CREATE INDEX idx_cahier_journal_dranef ON public.cahier_journal_entries(dranef_id);
CREATE INDEX idx_cahier_journal_dpanef ON public.cahier_journal_entries(dpanef_id);

-- Create storage bucket for journal attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-attachments', 'journal-attachments', true);

-- Create storage policies for journal attachments
CREATE POLICY "Anyone can view journal attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'journal-attachments');

CREATE POLICY "Authenticated users can upload journal attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'journal-attachments');

CREATE POLICY "Users can update their own journal attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'journal-attachments');

CREATE POLICY "Users can delete their own journal attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'journal-attachments');