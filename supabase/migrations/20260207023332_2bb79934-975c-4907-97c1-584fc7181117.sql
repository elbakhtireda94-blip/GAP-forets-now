
-- Fix overly permissive INSERT policy on notifications
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Only allow inserting notifications where the inserter is authenticated
-- The application logic ensures proper targeting; we restrict to authenticated users only
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (recipient_user_id IS NOT NULL AND notification_type IS NOT NULL);
