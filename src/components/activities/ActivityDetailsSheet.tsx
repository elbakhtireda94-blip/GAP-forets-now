import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, FileText, Pencil, Trash2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Activity } from '@/contexts/DatabaseContext';

interface ActivityDetailsSheetProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  getCommuneName: (id: string) => string;
  getAdpName: (id: string) => string;
}

import { SENSIBILISATION_OCCASIONS } from '@/contexts/DatabaseContext';

const activityTypeColors: Record<string, string> = {
  'Sensibilisation': 'bg-blue-500/20 text-blue-700 border-blue-300',
  'Formation': 'bg-purple-500/20 text-purple-700 border-purple-300',
  'Visite terrain': 'bg-emerald-500/20 text-emerald-700 border-emerald-300',
  'Réunion communautaire': 'bg-amber-500/20 text-amber-700 border-amber-300',
  'Suivi projet': 'bg-cyan-500/20 text-cyan-700 border-cyan-300',
  'Médiation': 'bg-rose-500/20 text-rose-700 border-rose-300',
  'Atelier': 'bg-indigo-500/20 text-indigo-700 border-indigo-300',
  'Réunion': 'bg-amber-500/20 text-amber-700 border-amber-300',
  'Distribution': 'bg-green-500/20 text-green-700 border-green-300',
  'Accompagnement et/ou encadrement des organisations structurelles': 'bg-teal-500/20 text-teal-700 border-teal-300',
  'Autre': 'bg-gray-500/20 text-gray-700 border-gray-300',
};

// Les oppositions sont gérées exclusivement dans le module Conflits & Oppositions

const ActivityDetailsSheet: React.FC<ActivityDetailsSheetProps> = ({
  activity,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  getCommuneName,
  getAdpName,
}) => {
  if (!activity) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const typeColor = activityTypeColors[activity.type] || activityTypeColors['Autre'];

  // Status simplifié - les oppositions sont gérées dans le module Conflits & Oppositions
  const status = { label: 'Terminée', color: 'bg-emerald-500/20 text-emerald-700', icon: CheckCircle };
  const StatusIcon = status.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-background">
        <SheetHeader className="space-y-4 pb-4 border-b">
          {/* Header with badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${typeColor} border`}>
              {activity.type}
            </Badge>
            <Badge className={`${status.color} border`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          
          <SheetTitle className="text-xl font-bold text-foreground">
            {activity.description.length > 60 
              ? activity.description.substring(0, 60) + '...' 
              : activity.description}
          </SheetTitle>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(activity.date)}</span>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Description complète */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Description
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-3">
              {activity.description}
            </p>
          </div>

          {/* Localisation */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Localisation
            </h3>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Commune</span>
                <span className="font-medium">{getCommuneName(activity.commune_id) || 'Non renseignée'}</span>
              </div>
              {activity.adp_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ADP Responsable</span>
                  <span className="font-medium">{getAdpName(activity.adp_id)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Occasion de sensibilisation */}
          {activity.type === 'Sensibilisation' && activity.sensibilisation_occasion && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                📅 Occasion de la sensibilisation
              </h3>
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-200/50">
                <p className="text-sm text-foreground font-medium">
                  {activity.sensibilisation_occasion === 'Autre (à préciser)' 
                    ? activity.sensibilisation_occasion_other 
                    : activity.sensibilisation_occasion}
                </p>
              </div>
            </div>
          )}

          {/* Détails Distribution */}
          {activity.type === 'Distribution' && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                📦 Détails de la distribution
              </h3>
              <div className="bg-green-50/50 rounded-lg p-3 border border-green-200/50 space-y-2">
                {activity.beneficiaries_count !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nombre de bénéficiaires</span>
                    <span className="font-medium">{activity.beneficiaries_count}</span>
                  </div>
                )}
                {activity.distribution?.nombre_distribue !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantité distribuée</span>
                    <span className="font-medium">{activity.distribution.nombre_distribue}</span>
                  </div>
                )}
                {activity.distribution?.espece && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nature / Espèce</span>
                    <span className="font-medium">{activity.distribution.espece}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Participants
            </h3>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nombre de participants</span>
                <Badge variant="secondary" className="text-lg font-bold">
                  {activity.participants}
                </Badge>
              </div>
            </div>
          </div>

          {/* Résolution / Notes de suivi */}
          {activity.resolution && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Suivi / Résolution
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-3">
                {activity.resolution}
              </p>
            </div>
          )}

          {/* Pièces jointes */}
          {activity.attachments && activity.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                📷 Pièces jointes ({activity.attachments.length})
              </h3>
              <div className="space-y-3">
                {/* Photos */}
                {activity.attachments.filter(a => a.type === 'image').length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {activity.attachments
                      .filter(a => a.type === 'image')
                      .map((attachment, index) => (
                        <a
                          key={attachment.storagePath || index}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden border border-border/50 hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                  </div>
                )}
                {/* Documents PDF */}
                {activity.attachments
                  .filter(a => a.type === 'pdf')
                  .map((attachment, index) => (
                    <a
                      key={attachment.storagePath || index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-destructive flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.filename}</p>
                        <p className="text-xs text-primary">Ouvrir le document</p>
                      </div>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Fermer
          </Button>
          <Button
            variant="anef"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              onEdit(activity);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              onDelete(activity.id);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ActivityDetailsSheet;
