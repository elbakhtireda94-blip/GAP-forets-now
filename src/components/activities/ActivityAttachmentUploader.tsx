import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, FileText, Image, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useActivityAttachments, ActivityAttachment } from '@/hooks/useActivityAttachments';

interface ActivityAttachmentUploaderProps {
  userId: string;
  attachments: ActivityAttachment[];
  onChange: (attachments: ActivityAttachment[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ActivityAttachmentUploader: React.FC<ActivityAttachmentUploaderProps> = ({
  userId,
  attachments,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, deleteFile, refreshSignedUrl, uploading, uploadProgress } = useActivityAttachments();
  const [dragOver, setDragOver] = useState(false);
  const [refreshedUrls, setRefreshedUrls] = useState<Record<string, string>>({});

  // Refresh signed URLs on mount and when attachments change
  useEffect(() => {
    const refreshUrls = async () => {
      const needsRefresh = attachments.filter(a => a.storagePath && !refreshedUrls[a.storagePath]);
      
      for (const attachment of needsRefresh) {
        if (attachment.storagePath) {
          const newUrl = await refreshSignedUrl(attachment.storagePath);
          if (newUrl) {
            setRefreshedUrls(prev => ({
              ...prev,
              [attachment.storagePath!]: newUrl,
            }));
          }
        }
      }
    };

    if (attachments.length > 0) {
      refreshUrls();
    }
  }, [attachments, refreshSignedUrl, refreshedUrls]);

  const getDisplayUrl = (attachment: ActivityAttachment): string => {
    if (attachment.storagePath && refreshedUrls[attachment.storagePath]) {
      return refreshedUrls[attachment.storagePath];
    }
    return attachment.url;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newAttachments = await uploadFiles(fileArray, userId);
    
    if (newAttachments.length > 0) {
      onChange([...attachments, ...newAttachments]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = async (index: number) => {
    const attachment = attachments[index];
    if (attachment.storagePath) {
      await deleteFile(attachment.storagePath);
    }
    const newAttachments = attachments.filter((_, i) => i !== index);
    onChange(newAttachments);
  };

  const images = attachments.filter(a => a.type === 'image');
  const pdfs = attachments.filter(a => a.type === 'pdf');

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact Upload Button */}
        {!disabled && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleInputChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Ajouter photos/documents
            </Button>
            {uploading && (
              <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
            )}
          </div>
        )}

        {/* Compact Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.slice(0, 4).map((attachment, index) => (
              <div key={attachment.storagePath || attachment.url} className="relative group">
                <img
                  src={getDisplayUrl(attachment)}
                  alt={attachment.filename}
                  className="w-16 h-16 object-cover rounded-lg border border-border/50"
                />
                {!disabled && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(attachments.findIndex(a => 
                      (a.storagePath || a.url) === (attachment.storagePath || attachment.url)
                    ))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {images.length > 4 && (
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                +{images.length - 4}
              </div>
            )}
            {pdfs.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {pdfs.length} PDF
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!disabled && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer
            ${dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">
            Ajouter des photos ou documents
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP, PDF - Max 10 Mo
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <Progress value={uploadProgress} className="flex-1" />
          <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Image className="h-4 w-4" />
            Photos ({images.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {images.map((attachment) => (
              <div key={attachment.storagePath || attachment.url} className="relative group aspect-square">
                <img
                  src={getDisplayUrl(attachment)}
                  alt={attachment.filename}
                  className="w-full h-full object-cover rounded-lg border border-border/50"
                />
                {!disabled && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(attachments.findIndex(a => 
                        (a.storagePath || a.url) === (attachment.storagePath || attachment.url)
                      ));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDFs List */}
      {pdfs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({pdfs.length})
          </p>
          <div className="space-y-2">
            {pdfs.map((attachment) => (
              <div
                key={attachment.storagePath || attachment.url}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <FileText className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.filename}</p>
                  <a
                    href={getDisplayUrl(attachment)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ouvrir le document
                  </a>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(attachments.findIndex(a => 
                      (a.storagePath || a.url) === (attachment.storagePath || attachment.url)
                    ))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {attachments.length === 0 && disabled && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune pièce jointe
        </p>
      )}
    </div>
  );
};

export default ActivityAttachmentUploader;
