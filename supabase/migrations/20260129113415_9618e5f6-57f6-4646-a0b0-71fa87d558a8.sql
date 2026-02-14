-- Fix cahier_journal_entries RLS to use proper auth.uid() checks
-- Drop permissive demo policies
DROP POLICY IF EXISTS "Demo: authenticated users can view entries" ON cahier_journal_entries;
DROP POLICY IF EXISTS "Demo: authenticated users can create entries" ON cahier_journal_entries;
DROP POLICY IF EXISTS "Demo: authenticated users can update entries" ON cahier_journal_entries;
DROP POLICY IF EXISTS "Demo: authenticated users can delete entries" ON cahier_journal_entries;

-- Add user_id column linking to auth.users
ALTER TABLE cahier_journal_entries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create proper RLS policies using auth.uid() and territorial scope

-- SELECT: Users see entries based on their scope level
CREATE POLICY "Users can view entries in their scope"
ON cahier_journal_entries FOR SELECT
TO authenticated
USING (
  -- Admins and National see all
  public.has_role(auth.uid(), 'ADMIN') OR
  public.has_role(auth.uid(), 'NATIONAL') OR
  -- Regional users see their dranef
  (public.has_role(auth.uid(), 'REGIONAL') AND 
   dranef_id = (SELECT dranef_id FROM public.profiles WHERE user_id = auth.uid())) OR
  -- Provincial users see their dpanef  
  (public.has_role(auth.uid(), 'PROVINCIAL') AND 
   dpanef_id = (SELECT dpanef_id FROM public.profiles WHERE user_id = auth.uid())) OR
  -- Local users see only their own entries
  (public.has_role(auth.uid(), 'LOCAL') AND user_id = auth.uid())
);

-- INSERT: Only authenticated users with LOCAL role can create (ADP agents)
CREATE POLICY "ADPs can create journal entries"
ON cahier_journal_entries FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  (public.has_role(auth.uid(), 'LOCAL') OR public.has_role(auth.uid(), 'ADMIN'))
);

-- UPDATE: Users can update their own entries if still in draft
CREATE POLICY "Users can update own draft entries"
ON cahier_journal_entries FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() AND 
  (statut_validation = 'Brouillon' OR public.has_role(auth.uid(), 'ADMIN'))
)
WITH CHECK (
  user_id = auth.uid()
);

-- DELETE: Users can delete their own draft entries, admins can delete any
CREATE POLICY "Users can delete own draft entries"
ON cahier_journal_entries FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid() AND statut_validation = 'Brouillon') OR
  public.has_role(auth.uid(), 'ADMIN')
);

-- Remove old comment and add new one
COMMENT ON TABLE cahier_journal_entries IS 
  'Journal entries with proper RBAC and territorial filtering via Supabase Auth';