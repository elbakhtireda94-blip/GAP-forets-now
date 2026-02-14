import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, MapPin, FileText, Image, Paperclip, Eye, Clock, 
  AlertTriangle, Link2, Users, Flag 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  CahierJournalEntry, 
  journalCategoryLabels, 
  journalCategoryColors, 
  JournalCategory,
  priorityColors,
  statusColors,
} from '@/data/cahierJournalTypes';

interface JournalEntryCardProps {
  entry: CahierJournalEntry;
  onClick: () => void;
  showOwner?: boolean;
}

export const JournalEntryCard: React.FC<JournalEntryCardProps> = ({
  entry,
  onClick,
  showOwner = false,
}) => {
  const imageCount = entry.attachments.filter(a => a.type === 'image').length;
  const pdfCount = entry.attachments.filter(a => a.type === 'pdf').length;
  const totalAttachments = entry.attachments.length;

  const categoryColor = entry.category 
    ? journalCategoryColors[entry.category as JournalCategory] 
    : 'bg-gray-500/20 text-gray-700 border-gray-300';

  const categoryLabel = entry.category 
    ? journalCategoryLabels[entry.category as JournalCategory]
    : null;

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl p-4 border border-border/50 shadow-soft cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 active:scale-[0.99]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-1">{entry.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(entry.entry_date), 'd MMMM yyyy', { locale: fr })}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {categoryLabel && (
            <Badge variant="outline" className={`${categoryColor} text-xs shrink-0`}>
              {categoryLabel}
            </Badge>
          )}
          {entry.priorite === 'Élevée' && (
            <Badge className={`${priorityColors['Élevée']} text-xs`}>
              <Flag className="h-3 w-3 mr-1" />
              Priorité
            </Badge>
          )}
        </div>
      </div>

      {/* Description Preview */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {entry.description}
      </p>

      {/* Status & Priority Row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge className={`${statusColors[entry.statut_validation]} text-xs`}>
          {entry.statut_validation}
        </Badge>
        {entry.temps_passe_min && entry.temps_passe_min > 0 && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {entry.temps_passe_min >= 60 
              ? `${Math.floor(entry.temps_passe_min / 60)}h${entry.temps_passe_min % 60 > 0 ? entry.temps_passe_min % 60 : ''}`
              : `${entry.temps_passe_min} min`
            }
          </Badge>
        )}
        {entry.participants_count && entry.participants_count > 0 && (
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {entry.participants_count}
          </Badge>
        )}
        {entry.pdfcp_id && (
          <Badge variant="outline" className="text-xs text-primary">
            <Link2 className="h-3 w-3 mr-1" />
            PDFCP
          </Badge>
        )}
        {entry.besoin_appui_hierarchique && (
          <Badge className="bg-amber-100 text-amber-700 text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Appui
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {entry.location_text && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{entry.location_text}</span>
            </div>
          )}
          {totalAttachments > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{totalAttachments}</span>
              {imageCount > 0 && <Image className="h-3 w-3 ml-1" />}
              {pdfCount > 0 && <FileText className="h-3 w-3 ml-1" />}
            </div>
          )}
        </div>
        <Eye className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default JournalEntryCard;
