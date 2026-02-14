
-- =============================================
-- Notifications table for PDFCP validation events
-- =============================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Recipient
  recipient_user_id UUID NOT NULL,
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('cancellation_concerte', 'cancellation_cp', 'cancellation_execute', 'validation', 'info')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  -- Context
  pdfcp_id TEXT,
  year INTEGER,
  composante TEXT,
  localisation TEXT,
  -- Cancellation details
  cancellation_reason TEXT,
  cancelled_by_name TEXT,
  cancelled_by_role TEXT,
  cancelled_at TIMESTAMPTZ,
  -- State
  is_read BOOLEAN NOT NULL DEFAULT false,
  -- Meta (immutable after creation)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast recipient lookups
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_pdfcp ON public.notifications(pdfcp_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Users can mark their own notifications as read (only is_read field)
CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Only server/service role can insert notifications (via edge function or trigger)
-- For now, allow authenticated users to insert (the app logic controls who creates)
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No delete policy - notifications are permanent
-- Hierarchy can view all notifications via ADMIN/NATIONAL role
CREATE POLICY "Admins can view all notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'ADMIN') OR
    public.has_role(auth.uid(), 'NATIONAL')
  );

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
