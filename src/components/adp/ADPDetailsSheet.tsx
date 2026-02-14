import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Briefcase, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  IdCard,
  Hash,
  GraduationCap
} from 'lucide-react';
import { ADP, useDatabase } from '@/contexts/DatabaseContext';

interface ADPDetailsSheetProps {
  adp: ADP | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADPDetailsSheet: React.FC<ADPDetailsSheetProps> = ({ adp, open, onOpenChange }) => {
  const { getRegionName, getDranefName, getDpanefName, getCommuneName } = useDatabase();

  if (!adp) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value?: string | number; icon?: React.ElementType }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-background">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <IdCard className="h-5 w-5 text-primary" />
            Fiche Agent ADP
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* En-tête avec photo et infos principales */}
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
            <div className="w-20 h-20 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {adp.photo_url ? (
                <img src={adp.photo_url} alt={adp.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-foreground truncate">{adp.full_name}</h2>
              {adp.matricule && (
                <p className="text-sm text-muted-foreground">Matricule: {adp.matricule}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant={adp.status === 'Actif' ? 'default' : 'secondary'}
                  className={adp.status === 'Actif' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : ''}
                >
                  {adp.status}
                </Badge>
                {adp.corps_fonctionnel && (
                  <Badge variant="outline" className="gap-1">
                    {adp.corps_fonctionnel === 'forestier' ? '🌲' : '🏢'}
                    {adp.corps_fonctionnel === 'forestier' ? 'Personnel forestier' : 'Personnel support'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Section 1 - Identité */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Identité
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Nom complet" value={adp.full_name} />
                <InfoRow label="CINE" value={adp.cine} icon={IdCard} />
                <InfoRow label="Sexe" value={adp.sexe} />
                <InfoRow label="Date de naissance" value={formatDate(adp.date_naissance)} icon={Calendar} />
              </div>
            </CardContent>
          </Card>

          {/* Section 2 - Situation administrative */}
          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                Situation administrative
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Date de recrutement" value={formatDate(adp.date_recrutement)} icon={Calendar} />
                <InfoRow label="Ancienneté" value={adp.anciennete_admin} />
                <InfoRow label="Grade" value={adp.grade} icon={GraduationCap} />
                <InfoRow label="Échelle" value={adp.echelle} icon={Hash} />
              </div>
              
              {adp.corps_fonctionnel && (
                <>
                  <Separator className="my-3" />
                  <div className="py-2">
                    <p className="text-xs text-muted-foreground mb-2">Corps fonctionnel</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                      adp.corps_fonctionnel === 'forestier' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-secondary/10 text-secondary-foreground'
                    }`}>
                      <span className="text-lg">{adp.corps_fonctionnel === 'forestier' ? '🌲' : '🏢'}</span>
                      <span className="font-medium text-sm">
                        {adp.corps_fonctionnel === 'forestier' ? 'Personnel forestier' : 'Personnel de support'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 3 - Affectation territoriale */}
          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Building className="h-4 w-4" />
                Affectation territoriale
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <InfoRow label="Région" value={getRegionName(adp.region_id)} icon={MapPin} />
                <InfoRow label="DRANEF" value={getDranefName(adp.dranef_id)} />
                <InfoRow label="DPANEF" value={getDpanefName(adp.dpanef_id)} />
                <div className="py-2 px-3 bg-muted/50 rounded-lg mt-2">
                  <p className="text-xs text-muted-foreground">Commune d'affectation</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {getCommuneName(adp.commune_id)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4 - Coordonnées */}
          <Card className="border-l-4 border-l-muted-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                Coordonnées
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {adp.phone && (
                  <div className="flex items-center gap-3 py-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Téléphone</p>
                      <a href={`tel:${adp.phone}`} className="text-sm font-medium text-primary hover:underline">
                        {adp.phone}
                      </a>
                    </div>
                  </div>
                )}
                {adp.email && (
                  <div className="flex items-center gap-3 py-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email professionnel</p>
                      <a href={`mailto:${adp.email}`} className="text-sm font-medium text-primary hover:underline">
                        {adp.email}
                      </a>
                    </div>
                  </div>
                )}
                {adp.adresse && (
                  <InfoRow label="Adresse" value={adp.adresse} icon={MapPin} />
                )}
                {!adp.phone && !adp.email && !adp.adresse && (
                  <p className="text-sm text-muted-foreground italic py-2">Aucune coordonnée renseignée</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ADPDetailsSheet;
