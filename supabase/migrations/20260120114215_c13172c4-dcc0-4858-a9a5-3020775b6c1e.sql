-- Fix RLS policies on cahier_journal_entries
-- Note: This application uses localStorage-based demo auth, so we can't use auth.uid()
-- We make the policies permissive for authenticated users but add basic protection

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "ADP can view own entries" ON public.cahier_journal_entries;
DROP POLICY IF EXISTS "ADP can create own entries" ON public.cahier_journal_entries;
DROP POLICY IF EXISTS "ADP can update own entries" ON public.cahier_journal_entries;
DROP POLICY IF EXISTS "ADP can delete own entries" ON public.cahier_journal_entries;

-- Create new policies that require authentication
-- SELECT: All authenticated users can view (hierarchical filtering is done client-side due to localStorage auth)
CREATE POLICY "Authenticated users can view entries"
ON public.cahier_journal_entries FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only authenticated users can create entries
CREATE POLICY "Authenticated users can create entries"
ON public.cahier_journal_entries FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Only authenticated users can update entries
CREATE POLICY "Authenticated users can update entries"
ON public.cahier_journal_entries FOR UPDATE
TO authenticated
USING (true);

-- DELETE: Only authenticated users can delete entries
CREATE POLICY "Authenticated users can delete entries"
ON public.cahier_journal_entries FOR DELETE
TO authenticated
USING (true);

-- Fix storage bucket - make it private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'journal-attachments';

-- Drop existing storage policies
DROP POLICY IF EXISTS "Anyone can view journal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload journal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own journal attachments" ON storage.objects;

-- Create new storage policies that require authentication
CREATE POLICY "Authenticated users can view journal attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'journal-attachments');

CREATE POLICY "Authenticated users can upload journal attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'journal-attachments');

CREATE POLICY "Authenticated users can delete journal attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'journal-attachments');