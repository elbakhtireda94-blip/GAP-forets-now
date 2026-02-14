
-- Drop existing storage policies and recreate them properly
DROP POLICY IF EXISTS "Authenticated users can upload journal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view journal attachments in scope" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own journal attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload activity attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view activity attachments in scope" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own activity attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pdfcp attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view pdfcp attachments in scope" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own pdfcp attachments" ON storage.objects;

-- journal-attachments
CREATE POLICY "Authenticated users can upload journal attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'journal-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view journal attachments in scope"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'journal-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'ADMIN')
    OR public.has_role(auth.uid(), 'NATIONAL')
    OR public.has_role(auth.uid(), 'REGIONAL')
    OR public.has_role(auth.uid(), 'PROVINCIAL')
  )
);

CREATE POLICY "Users can delete own journal attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'journal-attachments'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'ADMIN'))
);

-- activity-attachments
CREATE POLICY "Authenticated users can upload activity attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'activity-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view activity attachments in scope"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'activity-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'ADMIN')
    OR public.has_role(auth.uid(), 'NATIONAL')
    OR public.has_role(auth.uid(), 'REGIONAL')
    OR public.has_role(auth.uid(), 'PROVINCIAL')
  )
);

CREATE POLICY "Users can delete own activity attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'activity-attachments'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'ADMIN'))
);

-- pdfcp-attachments
CREATE POLICY "Authenticated users can upload pdfcp attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pdfcp-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view pdfcp attachments in scope"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pdfcp-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'ADMIN')
    OR public.has_role(auth.uid(), 'NATIONAL')
    OR public.has_role(auth.uid(), 'REGIONAL')
    OR public.has_role(auth.uid(), 'PROVINCIAL')
  )
);

CREATE POLICY "Users can delete own pdfcp attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pdfcp-attachments'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'ADMIN'))
);
