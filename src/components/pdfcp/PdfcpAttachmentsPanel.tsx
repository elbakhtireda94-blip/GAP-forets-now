import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Upload, File, Image, FileText, Trash2, Download, 
  FolderOpen, Loader2, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_bytes?: number;
  description?: string;
  category: string;
  uploaded_by?: string;
  created_at: string;
}

interface PdfcpAttachmentsPanelProps {
  attachments: Attachment[];
  onUpload: (file: File, category: string, description?: string) => void;
  onDelete: (attachmentId: string) => void;
  isUploading?: boolean;
  canEdit?: boolean;
  className?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'carte', label: 'Carte/Plan', icon: Image },
  { value: 'pv', label: 'PV/Compte-rendu', icon: FileText },
  { value: 'decision', label: 'Décision officielle', icon: File },
  { value: 'photo', label: 'Photo terrain', icon: Image },
  { value: 'general', label: 'Document général', icon: FolderOpen },
];

const getCategoryConfig = (category: string) => {
  return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[4];
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'd MMM yyyy', { locale: fr });
  } catch {
    return dateString;
  }
};

const PdfcpAttachmentsPanel: React.FC<PdfcpAttachmentsPanelProps> = ({
  attachments,
  onUpload,
  onDelete,
  isUploading = false,
  canEdit = true,
  className,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('general');
  const [description, setDescription] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, selectedCategory, description || undefined);
      setDescription('');
      setIsDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const groupedAttachments = CATEGORY_OPTIONS.map(cat => ({
    ...cat,
    attachments: attachments.filter(a => a.category === cat.value),
  })).filter(g => g.attachments.length > 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with upload button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Pièces jointes ({attachments.length})
        </h4>
        
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une pièce jointe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brève description du document..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fichier</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90
                      cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés: PDF, Word, Excel, Images (max 10MB)
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Attachments list grouped by category */}
      {attachments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune pièce jointe</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-4">
            {groupedAttachments.map(group => (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-2">
                  <group.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {group.label}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {group.attachments.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {group.attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.file_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(attachment.file_size_bytes)}</span>
                          <span>•</span>
                          <span>{formatDate(attachment.created_at)}</span>
                        </div>
                        {attachment.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {attachment.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(attachment.file_url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a href={attachment.file_url} download={attachment.file_name}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(attachment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default PdfcpAttachmentsPanel;
