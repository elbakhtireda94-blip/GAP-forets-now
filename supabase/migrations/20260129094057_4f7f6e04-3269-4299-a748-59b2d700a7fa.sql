-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Authenticated users can create entries" ON public.cahier_journal_entries;
DROP POLICY IF EXISTS "Authenticated users can delete entries" ON public.cahier_journal_entries;
DROP POLICY IF EXISTS "Authenticated users can update entries" ON public.cahier_journal_entries;
DROP POLICY IF EXISTS "Authenticated users can view entries" ON public.cahier_journal_entries;

-- Create secure RLS policies with ownership verification

-- SELECT: Users can view their own entries (based on adp_user_id = auth.uid()::text)
CREATE POLICY "Users can view own entries"
ON public.cahier_journal_entries
FOR SELECT
TO authenticated
USING (auth.uid()::text = adp_user_id);

-- INSERT: Users can only create entries with their own user ID
CREATE POLICY "Users can create own entries"
ON public.cahier_journal_entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = adp_user_id);

-- UPDATE: Users can only update their own entries
CREATE POLICY "Users can update own entries"
ON public.cahier_journal_entries
FOR UPDATE
TO authenticated
USING (auth.uid()::text = adp_user_id)
WITH CHECK (auth.uid()::text = adp_user_id);

-- DELETE: Users can only delete their own entries
CREATE POLICY "Users can delete own entries"
ON public.cahier_journal_entries
FOR DELETE
TO authenticated
USING (auth.uid()::text = adp_user_id);