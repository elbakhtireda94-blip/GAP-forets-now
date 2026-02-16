import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrganisationDocument } from '@/contexts/DatabaseContext';

const MAX_FILES = 10;
const MAX_SIZE_PER_FILE_MB = 3;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx';

function getDocType(mime: string, name: string): 'image' | 'pdf' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'document';
}

function fileToDocument(file: File): Promise<OrganisationDocument> {
  return new Promise((resolve, reject) => {
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = getDocType(file.type, file.name);
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id,
        name: file.name,
        type,
        size: file.size,
        dataUrl: reader.result as string,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface OrganisationDocumentsUploaderProps {
  documents: OrganisationDocument[];
  onChange: (documents: OrganisationDocument[]) => void;
  disabled?: boolean;
}

export const OrganisationDocumentsUploader: React.FC<OrganisationDocumentsUploaderProps> = ({
  documents,
  onChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    if (documents.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} fichiers par organisation.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const maxBytes = MAX_SIZE_PER_FILE_MB * 1024 * 1024;
    const toAdd: OrganisationDocument[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxBytes) {
        setError(`« ${file.name } » dépasse ${MAX_SIZE_PER_FILE_MB} Mo.`);
        continue;
      }
      try {
        const doc = await fileToDocument(file);
        toAdd.push(doc);
      } catch {
        setError(`Impossible de lire « ${file.name } ».`);
      }
    }
    if (toAdd.length > 0) {
      onChange([...documents, ...toAdd]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(false);
  };

  const handleRemove = (id: string) => {
    onChange(documents.filter(d => d.id !== id));
  };

  const openFile = (doc: OrganisationDocument) => {
    const w = window.open('', '_blank');
    if (w) w.document.write(`<iframe src="${doc.dataUrl}" style="width:100%;height:100%;border:0" title="${doc.name}"></iframe>`);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">Documents (images, PDF, documents)</label>
        {!disabled && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                setUploading(true);
                handleFileSelect(e);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || documents.length >= MAX_FILES}
            >
              <Upload className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Images, PDF, Word, Excel. Max {MAX_FILES} fichiers, {MAX_SIZE_PER_FILE_MB} Mo par fichier.
      </p>
      {documents.length > 0 && (
        <ul className="space-y-2 border rounded-md divide-y p-2 bg-muted/30">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              {doc.type === 'image' ? (
                <button
                  type="button"
                  onClick={() => openFile(doc)}
                  className="flex-shrink-0 w-10 h-10 rounded border overflow-hidden bg-background"
                >
                  <img src={doc.dataUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ) : doc.type === 'pdf' ? (
                <FileText className="h-10 w-10 flex-shrink-0 text-red-600" />
              ) : (
                <FileSpreadsheet className="h-10 w-10 flex-shrink-0 text-green-600" />
              )}
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => openFile(doc)}
                  className="text-sm font-medium truncate block text-left hover:underline"
                >
                  {doc.name}
                </button>
                <span className="text-xs text-muted-foreground">{formatSize(doc.size)}</span>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemove(doc.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
