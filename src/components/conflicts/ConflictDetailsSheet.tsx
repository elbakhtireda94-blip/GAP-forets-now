import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  MapPin,
  Calendar,
  User,
  FileText,
  Clock,
  Shield,
  Users,
  Paperclip,
  CheckCircle,
  XCircle,
  Pencil,
  X,
  Target,
  AlertCircle,
} from 'lucide-react';
import { Conflict, useDatabase } from '@/contexts/DatabaseContext';

interface ConflictDetailsSheetProps {
  conflict: Conflict | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (conflict: Conflict) => void;
  onToggleStatus: (conflict: Conflict) => void;
}

const ConflictDetailsSheet: React.FC<ConflictDetailsSheetProps> = ({
  conflict,
  open,
  onOpenChange,
  onEdit,
  onToggleStatus,
}) => {
  const { getCommuneName, getAdpName } = useDatabase();

  if (!conflict) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En cours':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Résolu':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Escaladé':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'Faible':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: Shield };
      case 'Moyenne':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle };
      case 'Élevée':
        return { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle };
      case 'Critique':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Shield };
    }
  };

  // Check if resolved conflict is missing resolution date
  const needsResolutionDate = () => {
    return conflict.status === 'Résolu' && !conflict.resolution_date;
  };

  const severityConfig = getSeverityConfig(conflict.severity);
  const SeverityIcon = severityConfig.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 bg-primary/5 border-b">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold text-foreground mb-2">
                {conflict.nature}
                {conflict.nature === 'Autre' && conflict.nature_other && (
                  <span className="text-muted-foreground font-normal"> - {conflict.nature_other}</span>
                )}
              </SheetTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={`${getStatusColor(conflict.status)} border`}>
                  {conflict.status}
                </Badge>
                <Badge className={`${severityConfig.color} border flex items-center gap-1`}>
                  <SeverityIcon className="h-3 w-3" />
                  {conflict.severity}
                </Badge>
                {needsResolutionDate() && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    Date de résolution manquante
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Info de base */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{getCommuneName(conflict.commune_id) || 'Non spécifiée'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(conflict.date_reported)}</span>
              </div>
              {conflict.handled_by && (
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <User className="h-4 w-4" />
                  <span>ADP: {getAdpName(conflict.handled_by)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Description
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                {conflict.description || 'Aucune description fournie.'}
              </p>
            </div>

            {/* Type & Superficie (for Opposition type) */}
            {conflict.type === 'Opposition' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Données d'opposition
                  </h4>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Superficie opposée</p>
                        <p className="text-lg font-bold text-amber-700">
                          {conflict.superficie_opposee_ha 
                            ? `${conflict.superficie_opposee_ha.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha`
                            : <span className="text-destructive text-sm">Non renseignée</span>
                          }
                        </p>
                      </div>
                      {conflict.status === 'Résolu' && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Superficie levée</p>
                          <p className="text-lg font-bold text-green-600">
                            {conflict.superficie_opposee_ha 
                              ? `${conflict.superficie_opposee_ha.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha`
                              : '-'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Contexte - Action type, périmètre, site */}
            {(conflict.action_type || conflict.perimetre_id || conflict.site_id) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    Contexte
                  </h4>
                  <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                    {conflict.action_type && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Action:</span>
                        <span className="font-medium">{conflict.action_type}</span>
                      </div>
                    )}
                    {conflict.perimetre_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Périmètre:</span>
                        <span className="font-medium">{conflict.perimetre_id}</span>
                      </div>
                    )}
                    {conflict.site_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Site:</span>
                        <span className="font-medium">{conflict.site_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Mesures prises */}
            {(conflict.mesures_adp || conflict.mesures_services || conflict.resolution_notes) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    Mesures prises
                  </h4>
                  <div className="space-y-3">
                    {conflict.mesures_adp && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <p className="text-xs font-medium text-green-700 mb-1">Mesures ADP</p>
                        <p className="text-sm text-green-900">{conflict.mesures_adp}</p>
                      </div>
                    )}
                    {conflict.mesures_services && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <p className="text-xs font-medium text-blue-700 mb-1">Mesures Services</p>
                        <p className="text-sm text-blue-900">{conflict.mesures_services}</p>
                      </div>
                    )}
                    {conflict.resolution_notes && !conflict.mesures_adp && !conflict.mesures_services && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">{conflict.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Services concernés */}
            {conflict.services_concernes && conflict.services_concernes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    Services concernés
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {conflict.services_concernes.map((service, index) => (
                      <Badge key={index} variant="outline" className="bg-background">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Plan d'action & Date de résolution */}
            {(conflict.prochaine_action || conflict.resolution_date || conflict.status === 'Résolu') && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Plan d'action & Résolution
                  </h4>
                  <div className={`p-3 rounded-lg border ${needsResolutionDate() ? 'bg-amber-50 border-amber-200' : 'bg-muted/50 border-border'}`}>
                    {conflict.prochaine_action && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-1">Prochaine action</p>
                        <p className="text-sm font-medium">{conflict.prochaine_action}</p>
                      </div>
                    )}
                    {conflict.resolution_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Date de résolution</span>
                        <span className="text-sm font-medium text-green-600">
                          {formatDate(conflict.resolution_date)}
                        </span>
                      </div>
                    )}
                    {needsResolutionDate() && (
                      <div className="text-xs text-amber-700 mt-2">
                        ⚠️ Conflit résolu sans date de résolution renseignée
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Pièces jointes */}
            {conflict.attachments && conflict.attachments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-foreground">
                    <Paperclip className="h-4 w-4 text-primary" />
                    Pièces jointes
                  </h4>
                  <div className="space-y-2">
                    {conflict.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-primary hover:underline">{attachment.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Dernière mise à jour */}
            {conflict.updated_at && (
              <div className="pt-2 text-xs text-muted-foreground text-center">
                Dernière mise à jour: {formatDate(conflict.updated_at)}
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Fermer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                onEdit(conflict);
                onOpenChange(false);
              }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Modifier
            </Button>
            <Button
              variant={conflict.status === 'Résolu' ? 'secondary' : 'anef'}
              size="sm"
              className="flex-1"
              onClick={() => {
                onToggleStatus(conflict);
                onOpenChange(false);
              }}
            >
              {conflict.status === 'Résolu' ? (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Réouvrir
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Résolu
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ConflictDetailsSheet;