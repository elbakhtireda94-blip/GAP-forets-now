import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  X, Calendar, MapPin, Clock, Users, Link2, AlertTriangle,
  Building2, Target, FileText, Image, Flag, CheckCircle2, Mic, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { 
  CahierJournalEntry, 
  journalCategoryLabels, 
  journalCategoryColors, 
  JournalCategory,
  priorityColors,
  statusColors,
  organisationLabels,
  OrganisationType,
} from '@/data/cahierJournalTypes';

interface JournalDetailsSheetProps {
  entry: CahierJournalEntry | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  canEdit?: boolean;
}

export const JournalDetailsSheet: React.FC<JournalDetailsSheetProps> = ({
  entry,
  open,
  onClose,
  onEdit,
  onDuplicate,
  canEdit = false,
}) => {
  if (!entry) return null;

  const categoryColor = entry.category 
    ? journalCategoryColors[entry.category as JournalCategory] 
    : 'bg-gray-500/20 text-gray-700 border-gray-300';

  const categoryLabel = entry.category 
    ? journalCategoryLabels[entry.category as JournalCategory]
    : 'Non catégorisé';

  const images = entry.attachments.filter(a => a.type === 'image');
  const pdfs = entry.attachments.filter(a => a.type === 'pdf');
  const audios = entry.attachments.filter(a => a.type === 'audio');
  const isVoiceEntry = audios.some(a => a.filename.includes('enregistrement-vocal'));

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h4>
      {children}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <SheetTitle className="text-lg font-semibold line-clamp-2">
                {entry.title}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(entry.entry_date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Status & Badges Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={`${statusColors[entry.statut_validation]}`}>
            {entry.statut_validation}
          </Badge>
          <Badge variant="outline" className={categoryColor}>
            {categoryLabel}
          </Badge>
          <Badge className={priorityColors[entry.priorite]}>
            <Flag className="h-3 w-3 mr-1" />
            {entry.priorite}
          </Badge>
          {entry.besoin_appui_hierarchique && (
            <Badge className="bg-amber-100 text-amber-700">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Appui requis
            </Badge>
          )}
          {isVoiceEntry && (
            <Badge className="bg-indigo-100 text-indigo-700">
              <Mic className="h-3 w-3 mr-1" />
              Saisie vocale
            </Badge>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {entry.temps_passe_min && entry.temps_passe_min > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-semibold">
                {entry.temps_passe_min >= 60 
                  ? `${Math.floor(entry.temps_passe_min / 60)}h${entry.temps_passe_min % 60 > 0 ? entry.temps_passe_min % 60 : ''}`
                  : `${entry.temps_passe_min} min`
                }
              </p>
              <p className="text-xs text-muted-foreground">Durée</p>
            </div>
          )}
          {entry.participants_count && entry.participants_count > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm font-semibold">{entry.participants_count}</p>
              <p className="text-xs text-muted-foreground">Participants</p>
            </div>
          )}
          {entry.pdfcp_id && (
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <Link2 className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-xs font-medium text-primary truncate">{entry.pdfcp_id}</p>
              <p className="text-xs text-muted-foreground">PDFCP lié</p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Description */}
        <Section title="Description" icon={FileText}>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {entry.description}
          </p>
        </Section>

        {/* Location */}
        {(entry.location_text || entry.perimetre_label || entry.site_label) && (
          <>
            <Separator className="my-4" />
            <Section title="Localisation" icon={MapPin}>
              <div className="space-y-1 text-sm">
                {entry.location_text && (
                  <p><span className="text-muted-foreground">Lieu:</span> {entry.location_text}</p>
                )}
                {entry.perimetre_label && (
                  <p><span className="text-muted-foreground">Périmètre:</span> {entry.perimetre_label}</p>
                )}
                {entry.site_label && (
                  <p><span className="text-muted-foreground">Site:</span> {entry.site_label}</p>
                )}
              </div>
            </Section>
          </>
        )}

        {/* Organisations */}
        {entry.organisations_concernees.length > 0 && (
          <>
            <Separator className="my-4" />
            <Section title="Organisations concernées" icon={Building2}>
              <div className="flex flex-wrap gap-2">
                {entry.organisations_concernees.map((org) => (
                  <Badge key={org} variant="outline">
                    {org}
                  </Badge>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* Results */}
        {(entry.resultats_obtenus || entry.decisions_prises || entry.prochaines_etapes) && (
          <>
            <Separator className="my-4" />
            <Section title="Résultats & suivi" icon={Target}>
              <div className="space-y-3 text-sm">
                {entry.resultats_obtenus && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Résultats obtenus</p>
                    <p className="whitespace-pre-wrap">{entry.resultats_obtenus}</p>
                  </div>
                )}
                {entry.decisions_prises && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Décisions prises</p>
                    <p className="whitespace-pre-wrap">{entry.decisions_prises}</p>
                  </div>
                )}
                {entry.prochaines_etapes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Prochaines étapes</p>
                    <p className="whitespace-pre-wrap">{entry.prochaines_etapes}</p>
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* Constraints & Support */}
        {(entry.contraintes_rencontrees || entry.besoin_appui_hierarchique) && (
          <>
            <Separator className="my-4" />
            <Section title="Contraintes & appui" icon={AlertTriangle}>
              <div className="space-y-3 text-sm">
                {entry.contraintes_rencontrees && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Contraintes</p>
                    <p className="whitespace-pre-wrap">{entry.contraintes_rencontrees}</p>
                  </div>
                )}
                {entry.besoin_appui_hierarchique && entry.justification_appui && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-medium text-amber-700 mb-1">Justification du besoin d'appui</p>
                    <p className="whitespace-pre-wrap text-amber-900">{entry.justification_appui}</p>
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* Attachments */}
        {entry.attachments.length > 0 && (
          <>
            <Separator className="my-4" />
            <Section title="Pièces jointes" icon={FileText}>
              {/* Audio recordings */}
              {audios.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    Enregistrements vocaux ({audios.length})
                  </p>
                  <div className="space-y-2">
                    {audios.map((audio, idx) => (
                      <div key={idx} className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-primary" />
                          <span className="text-sm truncate flex-1">{audio.filename}</span>
                        </div>
                        <audio controls src={audio.url} className="w-full h-8" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    Photos ({images.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, idx) => (
                      <a 
                        key={idx} 
                        href={img.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={img.url}
                          alt={img.filename}
                          className="w-full aspect-square object-cover rounded-lg border border-border/50"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {pdfs.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Documents ({pdfs.length})
                  </p>
                  <div className="space-y-1">
                    {pdfs.map((pdf, idx) => (
                      <a
                        key={idx}
                        href={pdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <FileText className="h-4 w-4 text-destructive" />
                        <span className="text-sm truncate">{pdf.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 sticky bottom-0 bg-background pb-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fermer
          </Button>
          {onDuplicate && (
            <Button variant="outline" onClick={onDuplicate} className="flex-1">
              Dupliquer
            </Button>
          )}
          {canEdit && onEdit && (
            <Button variant="anef" onClick={onEdit} className="flex-1">
              Modifier
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default JournalDetailsSheet;
