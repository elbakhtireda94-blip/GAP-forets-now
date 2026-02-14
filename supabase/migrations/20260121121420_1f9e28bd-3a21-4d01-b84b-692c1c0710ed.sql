-- Create storage bucket for activity attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-attachments', 'activity-attachments', false);

-- Create storage policies for authenticated users
CREATE POLICY "Authenticated users can view activity attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'activity-attachments');

CREATE POLICY "Authenticated users can upload activity attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-attachments');

CREATE POLICY "Authenticated users can update activity attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'activity-attachments');

CREATE POLICY "Authenticated users can delete activity attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'activity-attachments');