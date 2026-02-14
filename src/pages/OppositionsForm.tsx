import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Camera, MapPin, AlertTriangle, 
  FileText, Clock, CheckCircle2, Filter, Search,
  ChevronDown, X, Loader2, HandHelping
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase, Conflict, CONFLICT_NATURES, CONFLICT_NATURE_MIGRATION } from '@/contexts/DatabaseContext';
import { useDraft } from '@/hooks/useDraft';
import { useSync } from '@/contexts/SyncContext';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import EmptyState from '@/components/EmptyState';

// Types d'opposition - using the official list
const typesOpposition = CONFLICT_NATURES.map(nature => ({
  value: nature,
  label: nature,
}));

// Niveaux de gravité
const niveauxGravite: { value: Conflict['severity']; label: string; color: string }[] = [
  { value: 'Faible', label: 'Faible', color: 'bg-emerald-500' },
  { value: 'Moyenne', label: 'Moyenne', color: 'bg-amber-500' },
  { value: 'Élevée', label: 'Élevée', color: 'bg-destructive' },
];

// Statuts
const statutsOpposition: { value: Conflict['status']; label: string }[] = [
  { value: 'En cours', label: 'Ouvert' },
  { value: 'Résolu', label: 'Clôturé' },
  { value: 'Escaladé', label: 'Escaladé' },
];

// Actions menées possibles
const actionsPossibles = [
  { value: 'dialogue', label: 'Dialogue avec les parties' },
  { value: 'mediation', label: 'Médiation communautaire' },
  { value: 'reunion', label: 'Réunion de concertation' },
  { value: 'sensibilisation', label: 'Sensibilisation' },
  { value: 'escalade', label: 'Escalade hiérarchique' },
  { value: 'juridique', label: 'Voie juridique' },
];

interface OppositionFormData {
  date: string;
  regionId: string;
  dranefId: string;
  dpanefId: string;
  communeId: string;
  foret_secteur: string;
  gps_lat: string;
  gps_lng: string;
  type: string;
  type_other: string; // When 'Autre' is selected
  description: string;
  severity: Conflict['severity'];
  photos: string[];
  actions: string[];
  actions_notes: string;
  besoin_appui: boolean;
  status: Conflict['status'];
  resolution_notes: string;
  // New KPI fields
  superficie_opposee_ha: string; // String to handle decimal input (comma/dot)
  perimetre: string;
  site: string;
  resolution_date: string;
}

const emptyFormData: OppositionFormData = {
  date: new Date().toISOString().split('T')[0],
  regionId: '',
  dranefId: '',
  dpanefId: '',
  communeId: '',
  foret_secteur: '',
  gps_lat: '',
  gps_lng: '',
  type: '',
  type_other: '',
  description: '',
  severity: 'Moyenne',
  photos: [],
  actions: [],
  actions_notes: '',
  besoin_appui: false,
  status: 'En cours',
  resolution_notes: '',
  // New KPI fields
  superficie_opposee_ha: '',
  perimetre: '',
  site: '',
  resolution_date: '',
};

const OppositionsForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    getConflicts, addConflict, 
    getRegions, getDranefsByRegion, getDpanefsByDranef, getCommunesByDpanef,
    getDranefName, getDpanefName, getCommuneName,
    getAdpName
  } = useDatabase();
  const { addPendingEntry, isOnline } = useSync();

  // Draft hook
  const { value: formData, setValue: setFormData, hasDraft, clearDraft, resetToInitial } = useDraft<OppositionFormData>({
    key: 'opposition_form',
    initialValue: emptyFormData,
    debounceMs: 500,
  });

  const [activeTab, setActiveTab] = useState('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Auto-fill user location data - note: user has dranef/dpanef/commune as strings, not IDs
  // We skip auto-fill for now as user data uses display names, not IDs
  useEffect(() => {
    // Location data needs to be selected manually via cascading dropdowns
  }, [user, hasDraft, setFormData]);

  // Cascading data
  const regions = getRegions();
  const dranefs = formData.regionId ? getDranefsByRegion(formData.regionId) : [];
  const dpanefs = formData.dranefId ? getDpanefsByDranef(formData.dranefId) : [];
  const communes = formData.dpanefId ? getCommunesByDpanef(formData.dpanefId) : [];

  // Get conflicts for history - only show Oppositions (not Conflits)
  const allConflicts = getConflicts();
  const userOppositions = user 
    ? allConflicts.filter(c => c.type === 'Opposition' && (c.handled_by === user.id || c.handled_by === ''))
    : allConflicts.filter(c => c.type === 'Opposition');

  // Filtered conflicts
  const filteredConflicts = userOppositions.filter(conflict => {
    const matchesStatus = filterStatus === 'all' || conflict.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      conflict.nature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conflict.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCommuneName(conflict.commune_id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS non disponible",
        description: "Votre appareil ne supporte pas la géolocalisation",
        variant: "destructive",
      });
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          gps_lat: position.coords.latitude.toFixed(6),
          gps_lng: position.coords.longitude.toFixed(6),
        }));
        setGpsLoading(false);
        toast({
          title: "Position obtenue",
          description: "Coordonnées GPS enregistrées",
        });
      },
      (error) => {
        setGpsLoading(false);
        toast({
          title: "Erreur GPS",
          description: error.message || "Impossible d'obtenir la position",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleAction = (value: string) => {
    const actions = formData.actions.includes(value)
      ? formData.actions.filter(a => a !== value)
      : [...formData.actions, value];
    setFormData(prev => ({ ...prev, actions }));
  };

  // Helper to parse decimal input (supports both comma and dot)
  const parseDecimal = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const validateForm = (): boolean => {
    if (!formData.communeId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une commune", variant: "destructive" });
      return false;
    }
    if (!formData.type) {
      toast({ title: "Erreur", description: "Veuillez sélectionner le type d'opposition", variant: "destructive" });
      return false;
    }
    // Validate type_other if 'Autre' is selected
    if (formData.type === 'Autre' && !formData.type_other?.trim()) {
      toast({ title: "Erreur", description: "Veuillez préciser la nature du conflit", variant: "destructive" });
      return false;
    }
    if (!formData.description.trim()) {
      toast({ title: "Erreur", description: "Veuillez ajouter une description", variant: "destructive" });
      return false;
    }
    // Validate superficie_opposee_ha is required and > 0 for oppositions
    const superficie = parseDecimal(formData.superficie_opposee_ha);
    if (superficie <= 0) {
      toast({ title: "Erreur", description: "La superficie opposée (ha) est obligatoire et doit être supérieure à 0", variant: "destructive" });
      return false;
    }
    // Validate resolution_date if status is 'Résolu'
    if (formData.status === 'Résolu' && !formData.resolution_date) {
      toast({ title: "Erreur", description: "La date de levée est obligatoire pour un statut résolu", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveDraft = () => {
    toast({
      title: "Brouillon sauvegardé",
      description: "Vos données sont conservées localement",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const conflictData: Omit<Conflict, 'id'> = {
        commune_id: formData.communeId,
        type: 'Opposition', // Explicitly mark as Opposition for stats
        nature: formData.type, // Now using the label directly since value = label
        nature_other: formData.type === 'Autre' ? formData.type_other : undefined,
        description: formData.description,
        status: formData.status,
        severity: formData.severity,
        handled_by: user?.id || '',
        date_reported: formData.date,
        resolution_notes: formData.resolution_notes || 
          `Actions: ${formData.actions.map(a => actionsPossibles.find(ap => ap.value === a)?.label).join(', ')}. ${formData.actions_notes}`,
        // New KPI fields
        superficie_opposee_ha: parseDecimal(formData.superficie_opposee_ha),
        perimetre_id: formData.perimetre || undefined,
        site_id: formData.site || undefined,
        resolution_date: formData.status === 'Résolu' ? formData.resolution_date : undefined,
      };

      if (isOnline) {
        addConflict(conflictData);
        toast({
          title: "Opposition enregistrée",
          description: "Les données ont été sauvegardées",
        });
      } else {
        addPendingEntry('conflict', conflictData);
        toast({
          title: "Sauvegardé localement",
          description: "Sera synchronisé une fois connecté",
        });
      }

      clearDraft();
      setTimeout(() => navigate('/oppositions'), 800);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Faible': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Faible</Badge>;
      case 'Moyenne': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">Moyenne</Badge>;
      case 'Élevée': return <Badge variant="destructive">Élevée</Badge>;
      default: return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'En cours': return <Badge variant="secondary">Ouvert</Badge>;
      case 'Résolu': return <Badge variant="default" className="bg-emerald-600">Clôturé</Badge>;
      case 'Escaladé': return <Badge variant="destructive">Escaladé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader 
        title="Oppositions" 
        subtitle={activeTab === 'form' ? "Signaler un conflit" : "Historique"}
        showBack
        backPath="/menu"
      />

      {/* Draft notification */}
      {hasDraft && activeTab === 'form' && (
        <div className="mx-4 mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Brouillon restauré</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetToInitial}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 h-7 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 mt-4">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="form" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Formulaire
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            Historique ({userOppositions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="mt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-auto"
                />
              </div>
            </div>

            {/* Localisation auto-remplie */}
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Localisation
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">DRANEF</Label>
                  <Select 
                    value={formData.dranefId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, dranefId: v, dpanefId: '', communeId: '' }))}
                  >
                    <SelectTrigger className="h-10 bg-muted/50">
                      <SelectValue placeholder="DRANEF" />
                    </SelectTrigger>
                    <SelectContent>
                      {dranefs.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">DPANEF</Label>
                  <Select 
                    value={formData.dpanefId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, dpanefId: v, communeId: '' }))}
                    disabled={!formData.dranefId}
                  >
                    <SelectTrigger className="h-10 bg-muted/50">
                      <SelectValue placeholder="DPANEF" />
                    </SelectTrigger>
                    <SelectContent>
                      {dpanefs.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Commune *</Label>
                <Select 
                  value={formData.communeId} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, communeId: v }))}
                  disabled={!formData.dpanefId}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sélectionner la commune" />
                  </SelectTrigger>
                  <SelectContent>
                    {communes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Forêt / Secteur</Label>
                <Input
                  value={formData.foret_secteur}
                  onChange={(e) => setFormData(prev => ({ ...prev, foret_secteur: e.target.value }))}
                  placeholder="Nom de la forêt ou du secteur"
                  className="h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Coordonnées GPS (optionnel)</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetLocation}
                  disabled={gpsLoading}
                  className="w-full justify-start gap-2 h-10"
                >
                  {gpsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  {formData.gps_lat 
                    ? `${formData.gps_lat}, ${formData.gps_lng}` 
                    : 'Obtenir position GPS'}
                </Button>
              </div>
            </div>

            {/* Type et Description */}
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3">
              <h3 className="font-semibold text-foreground">Détails de l'opposition</h3>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nature du conflit *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v, type_other: v !== 'Autre' ? '' : prev.type_other }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sélectionner la nature" />
                  </SelectTrigger>
                  <SelectContent>
                    {typesOpposition.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show "Préciser" field when 'Autre' is selected */}
              {formData.type === 'Autre' && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Préciser la nature du conflit *</Label>
                  <Input
                    value={formData.type_other}
                    onChange={(e) => setFormData(prev => ({ ...prev, type_other: e.target.value }))}
                    placeholder="Précisez la nature du conflit..."
                    className="h-10"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description courte *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez brièvement la situation..."
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{formData.description.length}/500</p>
              </div>
            </div>

            {/* Section KPI Opposition */}
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 shadow-soft border border-amber-200/50 dark:border-amber-800/50 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Données d'opposition (KPI)
              </h3>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Superficie opposée (ha) *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.superficie_opposee_ha}
                  onChange={(e) => setFormData(prev => ({ ...prev, superficie_opposee_ha: e.target.value }))}
                  placeholder="Ex: 12,5"
                  className="h-10 bg-white dark:bg-background"
                />
                <p className="text-xs text-muted-foreground">Format : chiffre décimal (virgule ou point acceptés)</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Périmètre (optionnel)</Label>
                  <Input
                    value={formData.perimetre}
                    onChange={(e) => setFormData(prev => ({ ...prev, perimetre: e.target.value }))}
                    placeholder="Nom du périmètre"
                    className="h-10 bg-white dark:bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Site (optionnel)</Label>
                  <Input
                    value={formData.site}
                    onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
                    placeholder="Nom du site"
                    className="h-10 bg-white dark:bg-background"
                  />
                </div>
              </div>

              {formData.status === 'Résolu' && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date de levée *</Label>
                  <Input
                    type="date"
                    value={formData.resolution_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, resolution_date: e.target.value }))}
                    className="h-10 bg-white dark:bg-background"
                  />
                  <p className="text-xs text-amber-600">Obligatoire pour un statut "Résolu"</p>
                </div>
              )}
            </div>

            {/* Gravité */}
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3">
              <h3 className="font-semibold text-foreground">Niveau de gravité *</h3>
              <div className="grid grid-cols-3 gap-2">
                {niveauxGravite.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, severity: g.value }))}
                    className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-2 border-2 ${
                      formData.severity === g.value
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${g.color}`} />
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3">
              <h3 className="font-semibold text-foreground">Photos (optionnel)</h3>
              <button
                type="button"
                className="w-full h-24 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Camera className="h-6 w-6" />
                <span className="text-sm">Ajouter des photos</span>
              </button>
            </div>

            {/* Actions menées */}
            <Collapsible className="bg-card rounded-xl shadow-soft border border-border/50">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Actions menées</h3>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {actionsPossibles.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => toggleAction(a.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        formData.actions.includes(a.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={formData.actions_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, actions_notes: e.target.value }))}
                  placeholder="Notes supplémentaires sur les actions..."
                  className="min-h-[60px] resize-none"
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Besoin d'appui */}
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, besoin_appui: !prev.besoin_appui }))}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  formData.besoin_appui 
                    ? 'bg-amber-500/10 border-2 border-amber-500' 
                    : 'bg-muted/50 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <HandHelping className={`h-5 w-5 ${formData.besoin_appui ? 'text-amber-600' : 'text-muted-foreground'}`} />
                  <span className={`font-medium ${formData.besoin_appui ? 'text-amber-700' : 'text-foreground'}`}>
                    Besoin d'appui hiérarchique
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  formData.besoin_appui ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground'
                }`}>
                  {formData.besoin_appui && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
              </button>
            </div>

            {/* Statut */}
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3">
              <Label className="text-sm font-medium">Statut</Label>
              <div className="grid grid-cols-3 gap-2">
                {statutsOpposition.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: s.value }))}
                    className={`p-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                      formData.status === s.value
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution notes */}
            {formData.status === 'Résolu' && (
              <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50 space-y-3">
                <Label className="text-sm font-medium">Notes de résolution</Label>
                <Textarea
                  value={formData.resolution_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, resolution_notes: e.target.value }))}
                  placeholder="Décrivez comment le conflit a été résolu..."
                  className="min-h-[80px] resize-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 text-base gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                Enregistrer l'opposition
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                onClick={handleSaveDraft}
                className="w-full h-10 gap-2"
              >
                <FileText className="h-4 w-4" />
                Sauvegarder brouillon
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 h-10"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filtres
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                >
                  Tous
                </Button>
                {statutsOpposition.map(s => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={filterStatus === s.value ? 'default' : 'outline'}
                    onClick={() => setFilterStatus(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Conflicts list */}
          {filteredConflicts.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Aucune opposition"
              description={searchQuery || filterStatus !== 'all' 
                ? "Aucun résultat pour ces critères" 
                : "Vous n'avez pas encore signalé d'opposition"}
              actionLabel="Signaler une opposition"
              onAction={() => setActiveTab('form')}
            />
          ) : (
            <div className="space-y-3">
              {filteredConflicts.map(conflict => (
                <div
                  key={conflict.id}
                  className="bg-card rounded-xl p-4 border border-border/50 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex gap-2 flex-wrap">
                      {getStatusBadge(conflict.status)}
                      {getSeverityBadge(conflict.severity)}
                      {/* Missing data badge */}
                      {(!conflict.superficie_opposee_ha || conflict.superficie_opposee_ha <= 0) && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">
                          Superficie manquante
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(conflict.date_reported).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <h4 className="font-medium text-foreground mb-1">{conflict.nature}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {conflict.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {getCommuneName(conflict.commune_id)}
                    </div>
                    {conflict.superficie_opposee_ha && conflict.superficie_opposee_ha > 0 && (
                      <span className="font-medium text-amber-600">
                        {conflict.superficie_opposee_ha.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ha
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AppFooter />
      <BottomNav />
    </div>
  );
};

export default OppositionsForm;
