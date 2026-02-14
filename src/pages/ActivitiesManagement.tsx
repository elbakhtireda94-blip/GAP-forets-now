import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Pencil, Trash2, Activity, Calendar, Users, MapPin, 
  Eye, Filter, BarChart3, CalendarDays, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useDatabase, Activity as ActivityType } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import CascadingDropdowns from '@/components/CascadingDropdowns';
import BottomNav from '@/components/BottomNav';
import ActivityDetailsSheet from '@/components/activities/ActivityDetailsSheet';
import ActivityAttachmentUploader from '@/components/activities/ActivityAttachmentUploader';
import { ActivityAttachment } from '@/hooks/useActivityAttachments';
import { SENSIBILISATION_OCCASIONS, SensibilisationOccasion, ActivityAttachmentData } from '@/contexts/DatabaseContext';

// DEBUG: new taxonomy enabled
console.log('DEBUG: new taxonomy enabled');

// Taxonomie des axes
const activityAxes = [
  { value: 'PDFCP', label: 'PDFCP', icon: '📘' },
  { value: 'ODF', label: 'ODF', icon: '🌿' },
  { value: 'ANIMATION_TERRITORIALE', label: 'Animation territoriale', icon: '🤝' },
] as const;

// Types par axe
const activityTypesByAxis = {
  PDFCP: [
    { value: 'DIAGNOSTIC_PARTICIPATIF', label: 'Diagnostic participatif', icon: '🔍' },
    { value: 'CONCERTATION_VALIDATION', label: 'Concertation / validation', icon: '✅' },
    { value: 'PLANIFICATION_PROGRAMMATION', label: 'Planification / programmation', icon: '🗓️' },
    { value: 'SUIVI_EXECUTION_ACTIONS', label: 'Suivi exécution actions', icon: '🧩' },
    { value: 'SUIVI_CONTRAT_CONVENTION', label: 'Suivi contrat / convention', icon: '📄' },
    { value: 'SUIVI_INDICATEURS_REPORTING', label: 'Indicateurs / reporting', icon: '📊' },
    { value: 'GESTION_BLOCAGE', label: 'Blocage / retard', icon: '⛔' },
    { value: 'GESTION_CONFLIT_OPPOSITION', label: 'Conflit / opposition', icon: '⚠️' },
  ],
  ODF: [
    { value: 'CREATION_STRUCTURATION', label: 'Création / structuration', icon: '🏗️' },
    { value: 'RENFORCEMENT_CAPACITES', label: 'Renforcement capacités', icon: '🎓' },
    { value: 'APPUI_PROJET', label: 'Appui projet', icon: '🧠' },
    { value: 'SUIVI_CONVENTION_PARTENARIAT', label: 'Convention / partenariat', icon: '🤝' },
    { value: 'MOBILISATION_COMMUNICATION', label: 'Mobilisation / communication', icon: '📣' },
    { value: 'SUIVI_ACTIVITE_ECONOMIQUE', label: 'Activité économique', icon: '💼' },
    { value: 'GESTION_CONFLITS_INTERNES', label: 'Conflits internes', icon: '🧯' },
    { value: 'APPUI_ADMINISTRATIF', label: 'Appui administratif', icon: '🗂️' },
  ],
  ANIMATION_TERRITORIALE: [
    { value: 'REUNION_COMMUNAUTAIRE', label: 'Réunion communautaire', icon: '👥' },
    { value: 'REUNION_INSTITUTIONNELLE', label: 'Réunion institutionnelle', icon: '🏛️' },
    { value: 'SENSIBILISATION_COMMUNICATION', label: 'Sensibilisation', icon: '📢' },
    { value: 'MEDIATION_NEGOCIATION', label: 'Médiation / négociation', icon: '🤝' },
    { value: 'MISSION_VISITE_TERRAIN', label: 'Mission / visite terrain', icon: '🚶' },
    { value: 'ACCOMPAGNEMENT_USAGERS', label: 'Accompagnement usagers', icon: '🧑‍🌾' },
    { value: 'COORDINATION_PARTENAIRES', label: 'Coordination partenaires', icon: '🧩' },
    { value: 'ALERTE_TERRAIN', label: 'Alerte terrain', icon: '🚨' },
  ],
} as const;

// Types d'activités - LCI supprimé (géré via "Occasion de la sensibilisation")
// CONSERVÉ POUR COMPATIBILITÉ avec les anciennes données
const activityTypes = [
  'Atelier',
  'Formation',
  'Sensibilisation',
  'Réunion',
  'Accompagnement et/ou encadrement des organisations structurelles',
  'Distribution',
  'Visite terrain',
  'Réunion communautaire',
  'Suivi projet',
  'Médiation',
  'Autre',
];

// Types requiring 'objet' field (LCI supprimé)
const typesRequiringObjet = [
  'Atelier',
  'Formation',
  'Sensibilisation',
  'Réunion',
];

const activityTypeColors: Record<string, string> = {
  'Atelier': 'bg-indigo-500/20 text-indigo-700 border-indigo-300',
  'Sensibilisation': 'bg-blue-500/20 text-blue-700 border-blue-300',
  'Formation': 'bg-purple-500/20 text-purple-700 border-purple-300',
  'Réunion': 'bg-amber-500/20 text-amber-700 border-amber-300',
  'Accompagnement et/ou encadrement des organisations structurelles': 'bg-teal-500/20 text-teal-700 border-teal-300',
  'Distribution': 'bg-green-500/20 text-green-700 border-green-300',
  'Visite terrain': 'bg-emerald-500/20 text-emerald-700 border-emerald-300',
  'Réunion communautaire': 'bg-yellow-500/20 text-yellow-700 border-yellow-300',
  'Suivi projet': 'bg-cyan-500/20 text-cyan-700 border-cyan-300',
  'Médiation': 'bg-rose-500/20 text-rose-700 border-rose-300',
  'Autre': 'bg-gray-500/20 text-gray-700 border-gray-300',
};

const emptyActivity: Omit<ActivityType, 'id'> & {
  axis?: '' | 'PDFCP' | 'ODF' | 'ANIMATION_TERRITORIALE';
  summary?: string;
  resultats?: string;
  // Détails avancés - PDFCP
  pdfcpId?: string;
  phasePdfcp?: string;
  progressPercent?: number;
  isBlocked?: boolean;
  riskLevel?: string;
  // Détails avancés - ODF
  odfId?: string;
  maturityLevel?: string;
  mainNeed?: string;
  engagementLevel?: string;
  // Détails avancés - ANIMATION_TERRITORIALE
  theme?: string;
  tensionLevel?: number;
  projectRisk?: string;
  lienPdfcpId?: string;
  lienOdfId?: string;
} = {
  type: 'Sensibilisation',
  date: new Date().toISOString().split('T')[0],
  adp_id: '',
  commune_id: '',
  description: '',
  participants: 0,
  issues: '',
  resolution: '',
  objet: '',
  nb_beneficiaires: undefined,
  distribution: undefined,
  sensibilisation_occasion: undefined,
  sensibilisation_occasion_other: undefined,
  beneficiaries_count: undefined,
  attachments: [],
  // Nouveaux champs taxonomie
  axis: '',
  summary: '',
  resultats: '',
  // PDFCP
  pdfcpId: '',
  phasePdfcp: '',
  progressPercent: undefined,
  isBlocked: false,
  riskLevel: '',
  // ODF
  odfId: '',
  maturityLevel: '',
  mainNeed: '',
  engagementLevel: '',
  // ANIMATION_TERRITORIALE
  theme: '',
  tensionLevel: undefined,
  projectRisk: '',
  lienPdfcpId: '',
  lienOdfId: '',
};

const ActivitiesManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { applyScopeFilter } = useAuth();
  const {
    getActivities,
    addActivity,
    updateActivity,
    deleteActivity,
    getAdps,
    getCommuneName,
    getAdpName,
    getRegions,
  } = useDatabase();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof emptyActivity>(emptyActivity);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Detail sheet state
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Filter states - Sans filtre statut/opposition (géré dans Conflits & Oppositions)
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCommune, setFilterCommune] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Cascading dropdown states for form
  const [regionId, setRegionId] = useState('');
  const [dranefId, setDranefId] = useState('');
  const [dpanefId, setDpanefId] = useState('');

  // Apply RBAC scope filter to activities list
  const activities = useMemo(() => {
    const allActivities = getActivities();
    return applyScopeFilter(allActivities, 'activity');
  }, [getActivities, applyScopeFilter]);

  const adps = getAdps();
  const regions = getRegions();

  // Get unique communes from activities
  const communes = useMemo(() => {
    const uniqueCommunes = new Set(activities.map(a => a.commune_id));
    return Array.from(uniqueCommunes).map(id => ({
      id,
      name: getCommuneName(id)
    })).filter(c => c.name);
  }, [activities, getCommuneName]);

  // Get unique months from activities
  const months = useMemo(() => {
    const uniqueMonths = new Set(activities.map(a => a.date.substring(0, 7)));
    return Array.from(uniqueMonths).sort().reverse();
  }, [activities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (filterType !== 'all' && activity.type !== filterType) return false;
      if (filterCommune !== 'all' && activity.commune_id !== filterCommune) return false;
      if (filterMonth !== 'all' && !activity.date.startsWith(filterMonth)) return false;
      return true;
    });
  }, [activities, filterType, filterCommune, filterMonth]);

  // Statistics - Sans les oppositions (gérées dans Conflits & Oppositions)
  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const activitiesThisMonth = activities.filter(a => a.date.startsWith(currentMonth)).length;
    
    return {
      total: activities.length,
      thisMonth: activitiesThisMonth,
    };
  }, [activities]);

  // Types disponibles selon l'axe sélectionné
  const availableTypes = formData.axis ? activityTypesByAxis[formData.axis] : [];

  const handleAxisChange = (axis: typeof formData.axis) => {
    setFormData({
      ...formData,
      axis,
      type: '', // Reset type quand l'axe change
      // Reset les champs spécifiques à l'axe précédent
      pdfcpId: '',
      phasePdfcp: '',
      progressPercent: undefined,
      isBlocked: false,
      riskLevel: '',
      odfId: '',
      maturityLevel: '',
      mainNeed: '',
      engagementLevel: '',
      theme: '',
      tensionLevel: undefined,
      projectRisk: '',
      lienPdfcpId: '',
      lienOdfId: '',
    });
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyActivity);
    setRegionId('');
    setDranefId('');
    setDpanefId('');
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleEdit = (activity: ActivityType) => {
    // Migration automatique des anciennes données "Sensibilisation à la journée de la LCI"
    let migratedType = activity.type;
    let migratedOccasion = activity.sensibilisation_occasion;
    
    if (activity.type === 'Sensibilisation à la journée de la LCI') {
      migratedType = 'Sensibilisation';
      migratedOccasion = 'Journée nationale / campagne de lutte contre les incendies de forêts (LCI)';
    }
    
    setEditingId(activity.id);
    setFormData({
      type: migratedType,
      date: activity.date,
      adp_id: activity.adp_id,
      commune_id: activity.commune_id,
      description: activity.description,
      participants: activity.participants,
      issues: activity.issues,
      resolution: activity.resolution,
      objet: activity.objet || '',
      nb_beneficiaires: activity.nb_beneficiaires,
      distribution: activity.distribution || undefined,
      sensibilisation_occasion: migratedOccasion,
      sensibilisation_occasion_other: activity.sensibilisation_occasion_other,
      beneficiaries_count: activity.beneficiaries_count,
      attachments: activity.attachments || [],
    });
    setRegionId('');
    setDranefId('');
    setDpanefId('');
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteActivity(deleteId);
      toast({ title: 'Activité supprimée', description: 'L\'activité a été supprimée.' });
    }
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const handleSubmit = () => {
    // Validation nouvelle taxonomie
    if (formData.axis) {
      // Validation de base nouvelle taxonomie
      if (!formData.axis || !formData.type || !formData.commune_id || !formData.date || !formData.summary?.trim()) {
        toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires (axe, type, commune, date, résumé).', variant: 'destructive' });
        return;
      }

      // Validation selon l'axe
      if (formData.axis === 'PDFCP' && !formData.pdfcpId) {
        toast({ title: 'Erreur', description: 'Le champ PDFCP est obligatoire pour les activités PDFCP.', variant: 'destructive' });
        return;
      }

      if (formData.axis === 'ODF' && !formData.odfId) {
        toast({ title: 'Erreur', description: 'Le champ ODF est obligatoire pour les activités ODF.', variant: 'destructive' });
        return;
      }

      // Sauvegarde avec nouvelle taxonomie
      if (editingId) {
        updateActivity(editingId, formData);
        toast({ title: 'Activité modifiée', description: 'Les informations ont été mises à jour.' });
      } else {
        addActivity(formData);
        toast({ title: 'Activité ajoutée', description: 'La nouvelle activité a été enregistrée.' });
      }
      setDialogOpen(false);
      return;
    }

    // Validation ancienne taxonomie (compatibilité)
    if (!formData.description.trim()) {
      toast({ title: 'Erreur', description: 'La description est obligatoire.', variant: 'destructive' });
      return;
    }
    if (!formData.commune_id) {
      toast({ title: 'Erreur', description: 'La commune est obligatoire.', variant: 'destructive' });
      return;
    }
    
    // Validation conditionnelle selon le type
    if (typesRequiringObjet.includes(formData.type) && !formData.objet?.trim()) {
      toast({ title: 'Erreur', description: 'L\'objet est obligatoire pour ce type d\'activité.', variant: 'destructive' });
      return;
    }
    
    // Validation Sensibilisation: occasion obligatoire
    if (formData.type === 'Sensibilisation' && !formData.sensibilisation_occasion) {
      toast({ title: 'Erreur', description: 'L\'occasion de la sensibilisation est obligatoire.', variant: 'destructive' });
      return;
    }
    
    // Validation Sensibilisation "Autre": précision obligatoire
    if (formData.type === 'Sensibilisation' && 
        formData.sensibilisation_occasion === 'Autre (à préciser)' && 
        !formData.sensibilisation_occasion_other?.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez préciser l\'occasion de la sensibilisation.', variant: 'destructive' });
      return;
    }
    
    if (formData.type === 'Accompagnement et/ou encadrement des organisations structurelles' && 
        (formData.nb_beneficiaires === undefined || formData.nb_beneficiaires < 0)) {
      toast({ title: 'Erreur', description: 'Le nombre de bénéficiaires est obligatoire et doit être >= 0.', variant: 'destructive' });
      return;
    }
    
    // Validation Distribution: nombre de bénéficiaires obligatoire
    if (formData.type === 'Distribution' && 
        (formData.beneficiaries_count === undefined || formData.beneficiaries_count < 0)) {
      toast({ title: 'Erreur', description: 'Le nombre de bénéficiaires est obligatoire et doit être >= 0.', variant: 'destructive' });
      return;
    }
    
    if (formData.type === 'Distribution' && 
        (formData.distribution?.nombre_distribue === undefined || formData.distribution.nombre_distribue < 0)) {
      toast({ title: 'Erreur', description: 'Le nombre distribué doit être >= 0.', variant: 'destructive' });
      return;
    }

    if (editingId) {
      updateActivity(editingId, formData);
      toast({ title: 'Activité modifiée', description: 'Les informations ont été mises à jour.' });
    } else {
      addActivity(formData);
      toast({ title: 'Activité ajoutée', description: 'La nouvelle activité a été enregistrée.' });
    }
    setDialogOpen(false);
  };

  const handleCardClick = (activity: ActivityType) => {
    setSelectedActivity(activity);
    setDetailSheetOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate('/menu')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Activités Terrain</h1>
            <p className="text-primary-foreground/80 text-sm">Gestion des activités ADP</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards - Sans oppositions (gérées dans Conflits & Oppositions) */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-3 border border-border/50 shadow-soft text-center">
          <div className="flex justify-center mb-1">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border/50 shadow-soft text-center">
          <div className="flex justify-center mb-1">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.thisMonth}</p>
          <p className="text-xs text-muted-foreground">Ce mois</p>
        </div>
      </div>

      {/* Dashboard & Filter Toggle & Add Button */}
      <div className="px-4 pb-3 flex gap-2">
        <Button 
          onClick={() => navigate('/activites/dashboard')} 
          variant="outline" 
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </Button>
        <Button 
          onClick={() => setShowFilters(!showFilters)} 
          variant="outline" 
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtres
          {(filterType !== 'all' || filterCommune !== 'all' || filterMonth !== 'all') && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
        <Button onClick={handleAdd} className="flex-1 gap-2" variant="anef">
          <Plus className="h-4 w-4" />
          Nouvelle activité
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 pb-4 space-y-3 bg-muted/30 mx-4 rounded-lg p-3 border border-border/50">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-background h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Tous les types</SelectItem>
                  {activityTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Commune</Label>
              <Select value={filterCommune} onValueChange={setFilterCommune}>
                <SelectTrigger className="bg-background h-9">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Toutes les communes</SelectItem>
                  {communes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Période</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="bg-background h-9">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  {months.map(month => (
                    <SelectItem key={month} value={month}>{formatMonth(month)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(filterType !== 'all' || filterCommune !== 'all' || filterMonth !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-muted-foreground"
              onClick={() => {
                setFilterType('all');
                setFilterCommune('all');
                setFilterMonth('all');
              }}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}

      {/* Results count */}
      {filteredActivities.length !== activities.length && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground">
            {filteredActivities.length} résultat{filteredActivities.length > 1 ? 's' : ''} sur {activities.length}
          </p>
        </div>
      )}

      {/* Activities List */}
      <div className="px-4 space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune activité {activities.length > 0 ? 'correspondant aux filtres' : 'enregistrée'}</p>
          </div>
        ) : (
          filteredActivities.map(activity => {
            const typeColor = activityTypeColors[activity.type] || activityTypeColors['Autre'];
            
            return (
              <div
                key={activity.id}
                onClick={() => handleCardClick(activity)}
                className="bg-card rounded-xl p-4 border border-border/50 shadow-soft cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={`${typeColor} border text-xs`}>
                        {activity.type.length > 25 ? activity.type.substring(0, 25) + '…' : activity.type}
                      </Badge>
                      {/* Badge LCI pour les sensibilisations liées à LCI (via occasion) */}
                      {(activity.type === 'Sensibilisation à la journée de la LCI' || 
                        activity.sensibilisation_occasion === 'Journée nationale / campagne de lutte contre les incendies de forêts (LCI)') && (
                        <Badge variant="outline" className="bg-orange-500/20 text-orange-700 border-orange-300 text-xs">
                          LCI
                        </Badge>
                      )}
                      {/* Afficher occasion de sensibilisation si différente de LCI */}
                      {activity.type === 'Sensibilisation' && 
                       activity.sensibilisation_occasion && 
                       activity.sensibilisation_occasion !== 'Journée nationale / campagne de lutte contre les incendies de forêts (LCI)' && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200 text-xs truncate max-w-[150px]">
                          {activity.sensibilisation_occasion === 'Autre (à préciser)' 
                            ? activity.sensibilisation_occasion_other 
                            : activity.sensibilisation_occasion.length > 20 
                              ? activity.sensibilisation_occasion.substring(0, 20) + '…'
                              : activity.sensibilisation_occasion}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.date)}
                      </span>
                    </div>
                    
                    {/* Title: objet if exists, otherwise description */}
                    <p className="text-sm text-foreground mb-2 line-clamp-1 font-medium">
                      {activity.objet || activity.description}
                    </p>
                    
                    {/* Extra info for Distribution */}
                    {activity.type === 'Distribution' && activity.beneficiaries_count !== undefined && (
                      <p className="text-xs text-green-700 mb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Bénéficiaires: {activity.beneficiaries_count}
                      </p>
                    )}
                    {activity.distribution && activity.distribution.nombre_distribue !== undefined && (
                      <p className="text-xs text-green-700 mb-1 flex items-center gap-1">
                        <span>📦</span>
                        Distribution: {activity.distribution.nombre_distribue} - {activity.distribution.espece || 'N/A'}
                      </p>
                    )}
                    {activity.nb_beneficiaires !== undefined && activity.type === 'Accompagnement et/ou encadrement des organisations structurelles' && (
                      <p className="text-xs text-teal-700 mb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Bénéficiaires: {activity.nb_beneficiaires}
                      </p>
                    )}
                    
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{getCommuneName(activity.commune_id) || 'Non renseignée'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{activity.participants} participants</span>
                      </div>
                      {/* Indicateur pièces jointes */}
                      {activity.attachments && activity.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-primary">
                          <span>📷</span>
                          <span>{activity.attachments.length} fichier{activity.attachments.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(activity);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(activity);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(activity.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Activity Details Sheet */}
      <ActivityDetailsSheet
        activity={selectedActivity}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getCommuneName={getCommuneName}
        getAdpName={getAdpName}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier activité' : 'Nouvelle activité'}</DialogTitle>
            {/* DEBUG: new taxonomy enabled */}
            <div className="text-xs text-orange-600 font-semibold mt-1">DEBUG: new taxonomy enabled</div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Sélection AXE */}
            <div className="space-y-2">
              <Label>Axe *</Label>
              <div className="grid grid-cols-3 gap-2">
                {activityAxes.map(axis => (
                  <Button
                    key={axis.value}
                    type="button"
                    variant={formData.axis === axis.value ? 'default' : 'outline'}
                    className={`h-auto py-3 flex flex-col items-center gap-1 ${
                      formData.axis === axis.value 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background hover:bg-accent'
                    }`}
                    onClick={() => handleAxisChange(axis.value as typeof formData.axis)}
                  >
                    <span className="text-xl">{axis.icon}</span>
                    <span className="text-xs font-medium">{axis.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Sélection TYPE (filtré par axe) */}
            {formData.axis && (
              <div className="space-y-2">
                <Label>Type d'activité *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTypes.map(type => (
                    <Button
                      key={type.value}
                      type="button"
                      variant={formData.type === type.value ? 'default' : 'outline'}
                      className={`h-auto py-2.5 flex items-center gap-2 justify-start ${
                        formData.type === type.value 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-background hover:bg-accent'
                      }`}
                      onClick={() => setFormData({ ...formData, type: type.value })}
                    >
                      <span>{type.icon}</span>
                      <span className="text-sm font-medium text-left">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date.includes('T') ? formData.date.split('T')[0] : formData.date}
                  onChange={e => {
                    const timePart = formData.date.includes('T') ? formData.date.split('T')[1] : '';
                    setFormData({ ...formData, date: timePart ? `${e.target.value}T${timePart}` : e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={formData.date.includes('T') ? formData.date.split('T')[1]?.substring(0, 5) : ''}
                  onChange={e => {
                    const dateOnly = formData.date.includes('T') ? formData.date.split('T')[0] : formData.date;
                    setFormData({ ...formData, date: e.target.value ? `${dateOnly}T${e.target.value}:00` : dateOnly });
                  }}
                />
              </div>
            </div>

            {/* Résumé obligatoire */}
            <div className="space-y-2">
              <Label>Résumé (2 lignes) *</Label>
              <Textarea
                value={formData.summary || ''}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Résumé de l'activité en 2 lignes maximum..."
                rows={2}
                maxLength={200}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {(formData.summary || '').length} / 200
              </div>
            </div>

            {/* Résultats (optionnel) */}
            <div className="space-y-2">
              <Label>Résultats (optionnel)</Label>
              <Textarea
                value={formData.resultats || ''}
                onChange={e => setFormData({ ...formData, resultats: e.target.value })}
                placeholder="Résultats obtenus..."
                rows={2}
              />
            </div>

            {/* Détails avancés (Collapsible) */}
            {formData.axis && (
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto"
                  >
                    <span className="font-medium">Détails avancés</span>
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {/* Champs spécifiques PDFCP */}
                  {formData.axis === 'PDFCP' && (
                    <>
                      <div className="space-y-2">
                        <Label>PDFCP *</Label>
                        <Select
                          value={formData.pdfcpId || ''}
                          onValueChange={v => setFormData({ ...formData, pdfcpId: v })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sélectionner un PDFCP" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {/* TODO: Charger la liste des PDFCP depuis le contexte/hook */}
                            <SelectItem value="pdfcp-1">PDFCP Exemple 1</SelectItem>
                            <SelectItem value="pdfcp-2">PDFCP Exemple 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Phase PDFCP</Label>
                        <Select
                          value={formData.phasePdfcp || ''}
                          onValueChange={v => setFormData({ ...formData, phasePdfcp: v })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                            <SelectItem value="PLANIFICATION">Planification</SelectItem>
                            <SelectItem value="EXECUTION">Exécution</SelectItem>
                            <SelectItem value="SUIVI">Suivi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Avancement (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={formData.progressPercent ?? ''}
                            onChange={e => setFormData({ ...formData, progressPercent: parseInt(e.target.value) || undefined })}
                            placeholder="0-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Niveau de risque</Label>
                          <Select
                            value={formData.riskLevel || ''}
                            onValueChange={v => setFormData({ ...formData, riskLevel: v })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="FAIBLE">Faible</SelectItem>
                              <SelectItem value="MOYEN">Moyen</SelectItem>
                              <SelectItem value="ELEVE">Élevé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isBlocked"
                          checked={formData.isBlocked || false}
                          onCheckedChange={checked => setFormData({ ...formData, isBlocked: checked })}
                        />
                        <Label htmlFor="isBlocked" className="cursor-pointer">
                          Activité bloquée / en retard
                        </Label>
                      </div>
                    </>
                  )}

                  {/* Champs spécifiques ODF */}
                  {formData.axis === 'ODF' && (
                    <>
                      <div className="space-y-2">
                        <Label>ODF *</Label>
                        <Select
                          value={formData.odfId || ''}
                          onValueChange={v => setFormData({ ...formData, odfId: v })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sélectionner un ODF" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {/* TODO: Charger la liste des ODF depuis le contexte/hook */}
                            <SelectItem value="odf-1">ODF Exemple 1</SelectItem>
                            <SelectItem value="odf-2">ODF Exemple 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Niveau de maturité</Label>
                        <Select
                          value={formData.maturityLevel || ''}
                          onValueChange={v => setFormData({ ...formData, maturityLevel: v })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="EMERGENT">Émergent</SelectItem>
                            <SelectItem value="EN_DEVELOPPEMENT">En développement</SelectItem>
                            <SelectItem value="MATURE">Mature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Besoins principaux</Label>
                        <Input
                          value={formData.mainNeed || ''}
                          onChange={e => setFormData({ ...formData, mainNeed: e.target.value })}
                          placeholder="Ex: Formation, financement, appui technique..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Niveau d'engagement</Label>
                        <Select
                          value={formData.engagementLevel || ''}
                          onValueChange={v => setFormData({ ...formData, engagementLevel: v })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="FAIBLE">Faible</SelectItem>
                            <SelectItem value="MOYEN">Moyen</SelectItem>
                            <SelectItem value="FORT">Fort</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Champs spécifiques ANIMATION_TERRITORIALE */}
                  {formData.axis === 'ANIMATION_TERRITORIALE' && (
                    <>
                      <div className="space-y-2">
                        <Label>Thème</Label>
                        <Input
                          value={formData.theme || ''}
                          onChange={e => setFormData({ ...formData, theme: e.target.value })}
                          placeholder="Ex: Gestion des conflits, aménagement forestier..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Niveau de tension (1-5)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={formData.tensionLevel ?? ''}
                            onChange={e => setFormData({ ...formData, tensionLevel: parseInt(e.target.value) || undefined })}
                            placeholder="1-5"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Risque projet</Label>
                          <Select
                            value={formData.projectRisk || ''}
                            onValueChange={v => setFormData({ ...formData, projectRisk: v })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="FAIBLE">Faible</SelectItem>
                              <SelectItem value="MOYEN">Moyen</SelectItem>
                              <SelectItem value="ELEVE">Élevé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Lien PDFCP (optionnel)</Label>
                          <Select
                            value={formData.lienPdfcpId || ''}
                            onValueChange={v => setFormData({ ...formData, lienPdfcpId: v })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Aucun" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="">Aucun</SelectItem>
                              {/* TODO: Charger la liste des PDFCP */}
                              <SelectItem value="pdfcp-1">PDFCP Exemple 1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Lien ODF (optionnel)</Label>
                          <Select
                            value={formData.lienOdfId || ''}
                            onValueChange={v => setFormData({ ...formData, lienOdfId: v })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Aucun" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value="">Aucun</SelectItem>
                              {/* TODO: Charger la liste des ODF */}
                              <SelectItem value="odf-1">ODF Exemple 1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Conditional: Objet field for certain types (ancienne taxonomie - seulement si pas de nouvel axe) */}
            {!formData.axis && typesRequiringObjet.includes(formData.type) && (
              <div className="space-y-2">
                <Label>Objet (intitulé) *</Label>
                <Input
                  value={formData.objet || ''}
                  onChange={e => setFormData({ ...formData, objet: e.target.value })}
                  placeholder="Ex: Formation des éleveurs sur les techniques de sylvopastoralisme..."
                />
              </div>
            )}

            {/* Conditional: Occasion de sensibilisation (ancienne taxonomie - seulement si pas de nouvel axe) */}
            {!formData.axis && formData.type === 'Sensibilisation' && (
              <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-200/50">
                <div className="space-y-2">
                  <Label>Occasion de la sensibilisation *</Label>
                  <Select
                    value={formData.sensibilisation_occasion || ''}
                    onValueChange={v => setFormData({ 
                      ...formData, 
                      sensibilisation_occasion: v as SensibilisationOccasion,
                      sensibilisation_occasion_other: v !== 'Autre (à préciser)' ? undefined : formData.sensibilisation_occasion_other
                    })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Sélectionner l'occasion" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {SENSIBILISATION_OCCASIONS.map(occasion => (
                        <SelectItem key={occasion} value={occasion}>{occasion}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Champ texte si "Autre (à préciser)" */}
                {formData.sensibilisation_occasion === 'Autre (à préciser)' && (
                  <div className="space-y-2">
                    <Label>Préciser l'occasion *</Label>
                    <Input
                      value={formData.sensibilisation_occasion_other || ''}
                      onChange={e => setFormData({ ...formData, sensibilisation_occasion_other: e.target.value })}
                      placeholder="Décrivez l'occasion de la sensibilisation..."
                    />
                  </div>
                )}
              </div>
            )}

            {/* Conditional: Bénéficiaires for Accompagnement (ancienne taxonomie - seulement si pas de nouvel axe) */}
            {!formData.axis && formData.type === 'Accompagnement et/ou encadrement des organisations structurelles' && (
              <div className="space-y-2">
                <Label>Nombre de bénéficiaires *</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.nb_beneficiaires ?? ''}
                  onChange={e => setFormData({ ...formData, nb_beneficiaires: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            )}

            {/* Conditional: Distribution block (ancienne taxonomie - seulement si pas de nouvel axe) */}
            {!formData.axis && formData.type === 'Distribution' && (
              <div className="space-y-3 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                <Label className="font-medium flex items-center gap-2">
                  <span className="text-green-600">📦</span>
                  Détails de la distribution
                </Label>
                
                {/* Nombre de bénéficiaires pour Distribution */}
                <div className="space-y-1">
                  <Label className="text-xs">Nombre de bénéficiaires *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.beneficiaries_count ?? ''}
                    onChange={e => setFormData({ ...formData, beneficiaries_count: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date de distribution</Label>
                    <Input
                      type="date"
                      value={formData.distribution?.date_distribution || formData.date}
                      onChange={e => setFormData({ 
                        ...formData, 
                        distribution: { 
                          ...formData.distribution, 
                          date_distribution: e.target.value 
                        } 
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre distribué *</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.distribution?.nombre_distribue ?? ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        distribution: { 
                          ...formData.distribution, 
                          nombre_distribue: parseInt(e.target.value) || 0 
                        } 
                      })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Espèce / Nature</Label>
                  <Input
                    value={formData.distribution?.espece || ''}
                    onChange={e => setFormData({ 
                      ...formData, 
                      distribution: { 
                        ...formData.distribution, 
                        espece: e.target.value 
                      } 
                    })}
                    placeholder="Ex: plants fruitiers, ruches, fours améliorés..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Détails supplémentaires</Label>
                  <Textarea
                    value={formData.distribution?.details || ''}
                    onChange={e => setFormData({ 
                      ...formData, 
                      distribution: { 
                        ...formData.distribution, 
                        details: e.target.value 
                      } 
                    })}
                    placeholder="Description libre de la distribution..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            <CascadingDropdowns
              regionId={regionId}
              dranefId={dranefId}
              dpanefId={dpanefId}
              communeId={formData.commune_id}
              onRegionChange={setRegionId}
              onDranefChange={setDranefId}
              onDpanefChange={setDpanefId}
              onCommuneChange={v => setFormData({ ...formData, commune_id: v })}
              compact
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ADP Responsable</Label>
                <Select
                  value={formData.adp_id}
                  onValueChange={v => setFormData({ ...formData, adp_id: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {adps.map(adp => (
                      <SelectItem key={adp.id} value={adp.id}>{adp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Participants</Label>
                <Input
                  type="number"
                  value={formData.participants}
                  onChange={e => setFormData({ ...formData, participants: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Description (obligatoire pour ancienne taxonomie, optionnel pour nouvelle) */}
            {!formData.axis && (
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrire l'activité réalisée..."
                  rows={3}
                />
              </div>
            )}
            {formData.axis && (
              <div className="space-y-2">
                <Label>Description détaillée (optionnel)</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description détaillée de l'activité..."
                  rows={3}
                />
              </div>
            )}


            {/* Pièces jointes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                📷 Photos et documents
              </Label>
              <ActivityAttachmentUploader
                userId={formData.adp_id || 'anonymous'}
                attachments={(formData.attachments || []) as ActivityAttachment[]}
                onChange={(attachments) => setFormData({ 
                  ...formData, 
                  attachments: attachments as ActivityAttachmentData[] 
                })}
                compact
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} variant="anef">
              {editingId ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette activité ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default ActivitiesManagement;
