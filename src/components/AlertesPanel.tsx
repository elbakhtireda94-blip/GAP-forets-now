import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertTriangle, 
  Plus, 
  Clock, 
  MapPin, 
  Calendar,
  ChevronRight,
  Bell,
} from 'lucide-react';
import {
  AlerteTerrain,
  TypeAlerte,
  GraviteAlerte,
  StatutAlerte,
  typeAlerteConfig,
  allTypeAlerteConfig,
  graviteConfig,
  statutAlerteConfig,
  servicesConcernesOptions,
  loadAlertes,
  getAlerteLocationLabel,
  sortAlertesByPriority,
  filterAlertesOuvertes,
  isDateLimiteDepassee,
  isAlerteCritique,
  filterAlertesByFilters,
  shouldShowCriticalBanner,
} from '@/data/alertesTypes';
import { 
  actionTypeConfig, 
  ActionType,
  getUniqueCommunes,
  getPerimetresByCommune,
  getSitesByPerimetre,
  getUniqueActionTypes,
  getUniqueAnnees,
  LigneComparatif,
} from '@/data/comparatifTypes';
import { useToast } from '@/hooks/use-toast';

interface AlertesPanelProps {
  communeFilter?: string;
  perimetreFilter?: string;
  siteFilter?: string;
  actionTypeFilter?: string;
  anneeFilter?: number;
  lignesComparatif?: LigneComparatif[];
  onAlertesChange?: (alertes: AlerteTerrain[]) => void;
}

const AlertesPanel: React.FC<AlertesPanelProps> = ({ 
  communeFilter,
  perimetreFilter,
  siteFilter,
  actionTypeFilter,
  anneeFilter,
  lignesComparatif = [],
  onAlertesChange,
}) => {
  const { toast } = useToast();
  const [alertes, setAlertes] = useState<AlerteTerrain[]>(loadAlertes());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAlerte, setSelectedAlerte] = useState<AlerteTerrain | null>(null);
  const [mesuresDialogOpen, setMesuresDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<AlerteTerrain>>({
    type: 'opposition',
    gravite: 'moyenne',
    statut: 'ouverte',
    services_concernes: [],
    pieces_jointes_url: [],
  });

  // Form cascading filters
  const [formCommune, setFormCommune] = useState<string>('');
  const [formPerimetre, setFormPerimetre] = useState<string>('');

  // Filter and sort alertes
  let displayAlertes = filterAlertesOuvertes(alertes);
  displayAlertes = filterAlertesByFilters(displayAlertes, {
    commune_code: communeFilter,
    perimetre_id: perimetreFilter,
    site_id: siteFilter,
    action_type: actionTypeFilter,
    annee: anneeFilter,
  });
  displayAlertes = sortAlertesByPriority(displayAlertes);

  // Check for critical alerts
  const criticalAlertes = displayAlertes.filter(a => isAlerteCritique(a) || isDateLimiteDepassee(a));
  const showCriticalBanner = shouldShowCriticalBanner(displayAlertes, lignesComparatif);

  const communes = getUniqueCommunes();
  const perimetres = formCommune ? getPerimetresByCommune(formCommune) : [];
  const sites = formCommune && formPerimetre ? getSitesByPerimetre(formCommune, formPerimetre) : [];
  const actionTypes = getUniqueActionTypes();
  const annees = getUniqueAnnees();

  const handleAddAlerte = () => {
    setFormData({
      type: 'empietement',
      gravite: 'moyenne',
      statut: 'ouverte',
      services_concernes: [],
      pieces_jointes_url: [],
      autre_precision: '',
    });
    setFormCommune('');
    setFormPerimetre('');
    setDialogOpen(true);
  };

  const handleOpenDetails = (alerte: AlerteTerrain) => {
    setSelectedAlerte(alerte);
    setDrawerOpen(true);
  };

  const handleOpenMesures = (alerte: AlerteTerrain) => {
    setSelectedAlerte(alerte);
    setFormData({
      mesures_prises: alerte.mesures_prises || '',
      services_concernes: alerte.services_concernes || [],
      statut: alerte.statut,
      resultat: alerte.resultat || '',
    });
    setMesuresDialogOpen(true);
  };

  const handleSubmitAlerte = () => {
    if (!formCommune || !formData.description) {
      toast({ 
        title: 'Erreur', 
        description: 'Veuillez remplir les champs obligatoires.',
        variant: 'destructive' 
      });
      return;
    }

    // Validation: si type = "autre", le champ précision est obligatoire
    if (formData.type === 'autre' && !formData.autre_precision?.trim()) {
      toast({ 
        title: 'Erreur', 
        description: 'Veuillez préciser le type d\'alerte pour "Autre".',
        variant: 'destructive' 
      });
      return;
    }

    const newAlerte: AlerteTerrain = {
      id: `alerte-${Date.now()}`,
      commune_code: formCommune,
      perimetre_id: formPerimetre || undefined,
      site_id: formData.site_id,
      date_signalement: new Date().toISOString().split('T')[0],
      type: formData.type as TypeAlerte,
      gravite: formData.gravite as GraviteAlerte,
      description: formData.description!,
      autre_precision: formData.type === 'autre' ? formData.autre_precision : undefined,
      action_type: formData.action_type as ActionType | undefined,
      annee: formData.annee,
      statut: 'ouverte',
      services_concernes: formData.services_concernes || [],
      date_limite: formData.date_limite,
      responsable_suivi: formData.responsable_suivi,
      pieces_jointes_url: formData.pieces_jointes_url || [],
      updated_at: new Date().toISOString(),
    };

    const newAlertes = [...alertes, newAlerte];
    setAlertes(newAlertes);
    onAlertesChange?.(newAlertes);
    setDialogOpen(false);
    toast({ title: 'Alerte ajoutée', description: 'L\'alerte a été enregistrée.' });
  };

  const handleSubmitMesures = () => {
    if (!selectedAlerte) return;

    const updatedAlertes = alertes.map(a => 
      a.id === selectedAlerte.id 
        ? { 
            ...a, 
            mesures_prises: formData.mesures_prises,
            services_concernes: formData.services_concernes || [],
            statut: formData.statut as StatutAlerte,
            resultat: formData.resultat,
            updated_at: new Date().toISOString(),
          }
        : a
    );
    setAlertes(updatedAlertes);
    onAlertesChange?.(updatedAlertes);
    setMesuresDialogOpen(false);
    toast({ title: 'Mesures enregistrées', description: 'Les mesures ont été mises à jour.' });
  };

  const toggleService = (service: string) => {
    const current = formData.services_concernes || [];
    if (current.includes(service)) {
      setFormData({ ...formData, services_concernes: current.filter(s => s !== service) });
    } else {
      setFormData({ ...formData, services_concernes: [...current, service] });
    }
  };

  return (
    <div className="space-y-4">
      {/* Critical Alert Banner */}
      {showCriticalBanner && criticalAlertes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <Bell className="h-5 w-5" />
            <span className="font-semibold">Alertes critiques ({criticalAlertes.length})</span>
          </div>
          <div className="space-y-2">
            {criticalAlertes.slice(0, 3).map(alerte => (
              <div 
                key={alerte.id} 
                className="flex items-center justify-between bg-white rounded-lg p-2 cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => handleOpenDetails(alerte)}
              >
                <div className="flex items-center gap-2">
                  <Badge className={graviteConfig[alerte.gravite].color}>
                    {graviteConfig[alerte.gravite].label}
                  </Badge>
                  <span className="text-sm font-medium">{getAlerteLocationLabel(alerte)}</span>
                  {isDateLimiteDepassee(alerte) && (
                    <Badge variant="destructive" className="text-xs">Délai dépassé</Badge>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertes Terrain
          <Badge variant="outline">{displayAlertes.length}</Badge>
        </h3>
        <Button onClick={handleAddAlerte} size="sm" variant="anef">
          <Plus className="h-4 w-4 mr-1" />
          Signaler
        </Button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {displayAlertes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune alerte ouverte</p>
          </div>
        ) : (
          displayAlertes.map(alerte => (
            <div 
              key={alerte.id}
              className={`bg-card rounded-xl p-4 border cursor-pointer hover:shadow-md transition-shadow ${
                isAlerteCritique(alerte) ? 'border-red-300 bg-red-50/30' : 'border-border/50'
              }`}
              onClick={() => handleOpenDetails(alerte)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={allTypeAlerteConfig[alerte.type]?.color || 'bg-gray-100 text-gray-800'}>
                        {alerte.type === 'autre' && alerte.autre_precision 
                          ? `Autre: ${alerte.autre_precision}` 
                          : allTypeAlerteConfig[alerte.type]?.label || alerte.type}
                      </Badge>
                      <Badge className={graviteConfig[alerte.gravite].color}>
                        {graviteConfig[alerte.gravite].label}
                      </Badge>
                      <Badge className={statutAlerteConfig[alerte.statut].color}>
                        {statutAlerteConfig[alerte.statut].label}
                      </Badge>
                    </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{getAlerteLocationLabel(alerte)}</span>
                  </div>
                  <p className="text-sm line-clamp-2">{alerte.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(alerte.date_signalement).toLocaleDateString('fr-FR')}
                    </span>
                    {alerte.date_limite && (
                      <span className={`flex items-center gap-1 ${isDateLimiteDepassee(alerte) ? 'text-red-600 font-medium' : ''}`}>
                        <Clock className="h-3 w-3" />
                        Échéance: {new Date(alerte.date_limite).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Signaler une alerte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type d'alerte *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={v => setFormData({ ...formData, type: v as TypeAlerte, autre_precision: v !== 'autre' ? '' : formData.autre_precision })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {Object.entries(typeAlerteConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gravité *</Label>
                <Select 
                  value={formData.gravite} 
                  onValueChange={v => setFormData({ ...formData, gravite: v as GraviteAlerte })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {Object.entries(graviteConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Champ Préciser pour "Autre" */}
            {formData.type === 'autre' && (
              <div className="space-y-2">
                <Label>Préciser (Autre) *</Label>
                <Input
                  value={formData.autre_precision || ''}
                  onChange={e => setFormData({ ...formData, autre_precision: e.target.value })}
                  placeholder="Précisez le type d'alerte..."
                  className="bg-background"
                />
              </div>
            )}

            {/* Cascading location selects */}
            <div className="space-y-2">
              <Label>Commune *</Label>
              <Select 
                value={formCommune} 
                onValueChange={v => {
                  setFormCommune(v);
                  setFormPerimetre('');
                  setFormData({ ...formData, site_id: undefined });
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionner une commune" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {communes.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Périmètre</Label>
                <Select 
                  value={formPerimetre} 
                  onValueChange={v => {
                    setFormPerimetre(v);
                    setFormData({ ...formData, site_id: undefined });
                  }}
                  disabled={!formCommune}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {perimetres.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Select 
                  value={formData.site_id || ''} 
                  onValueChange={v => setFormData({ ...formData, site_id: v })}
                  disabled={!formPerimetre}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {sites.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type d'action concernée</Label>
                <Select 
                  value={formData.action_type || ''} 
                  onValueChange={v => setFormData({ ...formData, action_type: v as ActionType })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {actionTypes.map(t => (
                      <SelectItem key={t} value={t}>{actionTypeConfig[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Select 
                  value={formData.annee?.toString() || ''} 
                  onValueChange={v => setFormData({ ...formData, annee: parseInt(v) })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {annees.map(a => (
                      <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez l'alerte en détail..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Responsable suivi</Label>
                <Input
                  value={formData.responsable_suivi || ''}
                  onChange={e => setFormData({ ...formData, responsable_suivi: e.target.value })}
                  placeholder="Nom du responsable"
                />
              </div>
              <div className="space-y-2">
                <Label>Date limite</Label>
                <Input
                  type="date"
                  value={formData.date_limite || ''}
                  onChange={e => setFormData({ ...formData, date_limite: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Services concernés</Label>
              <div className="grid grid-cols-2 gap-2">
                {servicesConcernesOptions.map(service => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={service}
                      checked={(formData.services_concernes || []).includes(service)}
                      onCheckedChange={() => toggleService(service)}
                    />
                    <label htmlFor={service} className="text-sm">{service}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitAlerte} variant="anef">Signaler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mesures Dialog */}
      <Dialog open={mesuresDialogOpen} onOpenChange={setMesuresDialogOpen}>
        <DialogContent className="max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle>Mesures prises</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select 
                value={formData.statut} 
                onValueChange={v => setFormData({ ...formData, statut: v as StatutAlerte })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {Object.entries(statutAlerteConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mesures prises</Label>
              <Textarea
                value={formData.mesures_prises || ''}
                onChange={e => setFormData({ ...formData, mesures_prises: e.target.value })}
                placeholder="Décrivez les mesures prises..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Résultat / Observations</Label>
              <Textarea
                value={formData.resultat || ''}
                onChange={e => setFormData({ ...formData, resultat: e.target.value })}
                placeholder="Résultat des mesures..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Services concernés</Label>
              <div className="grid grid-cols-2 gap-2">
                {servicesConcernesOptions.map(service => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={`mesures-${service}`}
                      checked={(formData.services_concernes || []).includes(service)}
                      onCheckedChange={() => toggleService(service)}
                    />
                    <label htmlFor={`mesures-${service}`} className="text-sm">{service}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMesuresDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitMesures} variant="anef">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Détails de l'alerte</DrawerTitle>
            <DrawerDescription>
              {selectedAlerte && getAlerteLocationLabel(selectedAlerte)}
            </DrawerDescription>
          </DrawerHeader>
          
          {selectedAlerte && (
            <div className="px-4 pb-4 space-y-4 overflow-y-auto">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={allTypeAlerteConfig[selectedAlerte.type]?.color || 'bg-gray-100 text-gray-800'}>
                  {selectedAlerte.type === 'autre' && selectedAlerte.autre_precision 
                    ? `Autre: ${selectedAlerte.autre_precision}` 
                    : allTypeAlerteConfig[selectedAlerte.type]?.label || selectedAlerte.type}
                </Badge>
                <Badge className={graviteConfig[selectedAlerte.gravite].color}>
                  {graviteConfig[selectedAlerte.gravite].label}
                </Badge>
                <Badge className={statutAlerteConfig[selectedAlerte.statut].color}>
                  {statutAlerteConfig[selectedAlerte.statut].label}
                </Badge>
                {selectedAlerte.action_type && (
                  <Badge variant="outline">
                    {actionTypeConfig[selectedAlerte.action_type].label}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm">{selectedAlerte.description}</p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Date signalement</div>
                  <div className="font-medium">{new Date(selectedAlerte.date_signalement).toLocaleDateString('fr-FR')}</div>
                </div>
                {selectedAlerte.date_limite && (
                  <div className={`rounded-lg p-3 ${isDateLimiteDepassee(selectedAlerte) ? 'bg-red-100' : 'bg-muted/30'}`}>
                    <div className="text-xs text-muted-foreground">Date limite</div>
                    <div className={`font-medium ${isDateLimiteDepassee(selectedAlerte) ? 'text-red-700' : ''}`}>
                      {new Date(selectedAlerte.date_limite).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                )}
              </div>

              {/* Responsable */}
              {selectedAlerte.responsable_suivi && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Responsable suivi</div>
                  <div className="font-medium">{selectedAlerte.responsable_suivi}</div>
                </div>
              )}

              {/* Services */}
              {selectedAlerte.services_concernes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Services concernés</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedAlerte.services_concernes.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Mesures prises */}
              {selectedAlerte.mesures_prises && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <h4 className="text-sm font-medium mb-1 text-blue-800">Mesures prises</h4>
                  <p className="text-sm text-blue-700">{selectedAlerte.mesures_prises}</p>
                </div>
              )}

              {/* Résultat */}
              {selectedAlerte.resultat && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <h4 className="text-sm font-medium mb-1 text-green-800">Résultat</h4>
                  <p className="text-sm text-green-700">{selectedAlerte.resultat}</p>
                </div>
              )}

              {/* Action button */}
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenMesures(selectedAlerte);
                  setDrawerOpen(false);
                }} 
                variant="anef" 
                className="w-full"
              >
                Ajouter/Modifier les mesures
              </Button>
            </div>
          )}
          
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Fermer</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AlertesPanel;
