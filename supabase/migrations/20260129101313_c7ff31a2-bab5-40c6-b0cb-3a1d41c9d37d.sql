-- Fix RLS policies for demo environment with localStorage auth
-- The app uses localStorage auth, so auth.uid() returns NULL
-- Revert to permissive policies until Supabase Auth is implemented

-- Drop current restrictive policies that require auth.uid()
DROP POLICY IF EXISTS "Users can view own entries" ON cahier_journal_entries;
DROP POLICY IF EXISTS "Users can create own entries" ON cahier_journal_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON cahier_journal_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON cahier_journal_entries;

-- Create permissive policies for authenticated users (demo mode)
CREATE POLICY "Demo: authenticated users can view entries"
ON cahier_journal_entries FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Demo: authenticated users can create entries"
ON cahier_journal_entries FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Demo: authenticated users can update entries"
ON cahier_journal_entries FOR UPDATE
TO authenticated USING (true);

CREATE POLICY "Demo: authenticated users can delete entries"
ON cahier_journal_entries FOR DELETE
TO authenticated USING (true);

COMMENT ON TABLE cahier_journal_entries IS 
  'RLS is permissive for demo with localStorage auth. Implement Supabase Auth before production.';