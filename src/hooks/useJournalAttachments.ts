import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JournalAttachment } from '@/data/cahierJournalTypes';
import { useToast } from '@/hooks/use-toast';

const BUCKET_NAME = 'journal-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PDF_TYPES = ['application/pdf'];

export function useJournalAttachments() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  // Upload a single file
  const uploadFile = useCallback(async (
    file: File,
    userId: string
  ): Promise<JournalAttachment | null> => {
    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isPdf = ALLOWED_PDF_TYPES.includes(file.type);

    if (!isImage && !isPdf) {
      toast({
        title: 'Type de fichier non supporté',
        description: 'Seuls les formats JPG, PNG, WebP et PDF sont acceptés.',
        variant: 'destructive',
      });
      return null;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 10 Mo.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || '';
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 50);
      const filePath = `${userId}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get signed URL (bucket is private for security)
      const { data: urlData, error: urlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(data.path, 3600); // 1 hour expiry

      if (urlError) throw urlError;

      const attachment: JournalAttachment = {
        type: isImage ? 'image' : 'pdf',
        url: urlData.signedUrl,
        filename: file.name,
        uploaded_at: new Date().toISOString(),
        // Store path for refreshing signed URL later
        storagePath: data.path,
      };

      return attachment;
    } catch (err) {
      console.error('Error uploading file:', err);
      toast({
        title: 'Erreur d\'upload',
        description: err instanceof Error ? err.message : 'Erreur lors du téléchargement',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  // Upload multiple files
  const uploadFiles = useCallback(async (
    files: File[],
    userId: string
  ): Promise<JournalAttachment[]> => {
    setUploading(true);
    setUploadProgress(0);

    const attachments: JournalAttachment[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const attachment = await uploadFile(files[i], userId);
      if (attachment) {
        attachments.push(attachment);
      }
      setUploadProgress(Math.round(((i + 1) / total) * 100));
    }

    setUploading(false);
    setUploadProgress(0);

    if (attachments.length > 0) {
      toast({
        title: 'Upload terminé',
        description: `${attachments.length} fichier(s) téléchargé(s).`,
      });
    }

    return attachments;
  }, [uploadFile, toast]);

  // Delete a file from storage
  const deleteFile = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Extract path from URL
      const urlParts = url.split(`${BUCKET_NAME}/`);
      if (urlParts.length < 2) return false;

      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      return false;
    }
  }, []);

  return {
    uploadFile,
    uploadFiles,
    deleteFile,
    uploading,
    uploadProgress,
  };
}
