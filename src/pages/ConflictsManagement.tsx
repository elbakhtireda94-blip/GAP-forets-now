import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  User, 
  Eye, 
  Filter, 
  X,
  LayoutDashboard,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useDatabase, Conflict, CONFLICT_NATURES, CONFLICT_NATURE_MIGRATION } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import CascadingDropdowns from '@/components/CascadingDropdowns';
import BottomNav from '@/components/BottomNav';
import ConflictDetailsSheet from '@/components/conflicts/ConflictDetailsSheet';
import ConflictsDashboard from '@/components/conflicts/ConflictsDashboard';

const statusOptions: Conflict['status'][] = ['En cours', 'Résolu', 'Escaladé'];
const severityOptions: Conflict['severity'][] = ['Faible', 'Moyenne', 'Élevée', 'Critique'];
const serviceOptions = ['ADP', 'DPANEF', 'DRANEF', 'Commune', 'Autorités', 'ODF'];

const emptyConflict: Omit<Conflict, 'id'> = {
  commune_id: '',
  nature: CONFLICT_NATURES[0],
  nature_other: '',
  description: '',
  status: 'En cours',
  severity: 'Moyenne',
  handled_by: '',
  date_reported: new Date().toISOString().split('T')[0],
  resolution_notes: '',
  mesures_adp: '',
  mesures_services: '',
  services_concernes: [],
  prochaine_action: '',
  resolution_date: '',
  // KPI fields
  type: 'Conflit',
  superficie_opposee_ha: undefined,
  perimetre_id: '',
  site_id: '',
};

const ConflictsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { applyScopeFilter } = useAuth();
  const {
    getConflicts,
    addConflict,
    updateConflict,
    deleteConflict,
    getAdps,
    getCommuneName,
    getAdpName,
    data,
  } = useDatabase();

  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Conflict, 'id'>>(emptyConflict);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // View state: 'dashboard' or 'list'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  
  // Filters for list view
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCommune, setFilterCommune] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const [regionId, setRegionId] = useState('');
  const [dranefId, setDranefId] = useState('');
  const [dpanefId, setDpanefId] = useState('');

  // Apply RBAC scope filter to conflicts list
  const conflicts = useMemo(() => {
    const allConflicts = getConflicts();
    return applyScopeFilter(allConflicts, 'conflict');
  }, [getConflicts, applyScopeFilter]);

  const adps = getAdps();

  // Get unique communes from conflicts
  const uniqueCommunes = useMemo(() => {
    const communeIds = [...new Set(conflicts.map(c => c.commune_id))];
    return communeIds.map(id => ({ id, name: getCommuneName(id) })).filter(c => c.name);
  }, [conflicts, getCommuneName]);

  // Get unique months from conflicts
  const uniqueMonths = useMemo(() => {
    const months = [...new Set(conflicts.map(c => c.date_reported.substring(0, 7)))];
    return months.sort().reverse();
  }, [conflicts]);

  // Filter conflicts for list view
  const filteredConflicts = useMemo(() => {
    return conflicts.filter(conflict => {
      if (filterStatus !== 'all' && conflict.status !== filterStatus) return false;
      if (filterSeverity !== 'all' && conflict.severity !== filterSeverity) return false;
      if (filterCommune !== 'all' && conflict.commune_id !== filterCommune) return false;
      if (filterMonth !== 'all' && !conflict.date_reported.startsWith(filterMonth)) return false;
      return true;
    });
  }, [conflicts, filterStatus, filterSeverity, filterCommune, filterMonth]);

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyConflict);
    setRegionId('');
    setDranefId('');
    setDpanefId('');
    setDialogOpen(true);
  };

  const handleEdit = (conflict: Conflict) => {
    setEditingId(conflict.id);
    
    // Migrate old nature values to new ones
    let migratedNature = conflict.nature;
    let natureOther = conflict.nature_other || '';
    
    // Check if the nature needs migration
    if (!CONFLICT_NATURES.includes(conflict.nature as any)) {
      const migrated = CONFLICT_NATURE_MIGRATION[conflict.nature];
      if (migrated) {
        migratedNature = migrated;
        // If migrated to 'Autre', store original in nature_other
        if (migrated === 'Autre' && !natureOther) {
          natureOther = conflict.nature;
        }
      } else {
        // Unknown nature, set to 'Autre' and preserve original
        migratedNature = 'Autre';
        natureOther = conflict.nature;
      }
    }
    
    setFormData({
      commune_id: conflict.commune_id,
      nature: migratedNature,
      nature_other: natureOther,
      description: conflict.description,
      status: conflict.status,
      severity: conflict.severity,
      handled_by: conflict.handled_by,
      date_reported: conflict.date_reported,
      resolution_notes: conflict.resolution_notes,
      mesures_adp: conflict.mesures_adp || '',
      mesures_services: conflict.mesures_services || '',
      services_concernes: conflict.services_concernes || [],
      prochaine_action: conflict.prochaine_action || '',
      resolution_date: conflict.resolution_date || '',
      // KPI fields
      type: conflict.type || 'Conflit',
      superficie_opposee_ha: conflict.superficie_opposee_ha,
      perimetre_id: conflict.perimetre_id || '',
      site_id: conflict.site_id || '',
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
      deleteConflict(deleteId);
      toast({ title: 'Conflit supprimé', description: 'Le conflit a été supprimé.' });
    }
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const handleSubmit = () => {
    if (!formData.description.trim()) {
      toast({ title: 'Erreur', description: 'La description est obligatoire.', variant: 'destructive' });
      return;
    }
    if (!formData.commune_id) {
      toast({ title: 'Erreur', description: 'La commune est obligatoire.', variant: 'destructive' });
      return;
    }
    if (!formData.nature) {
      toast({ title: 'Erreur', description: 'La nature du conflit est obligatoire.', variant: 'destructive' });
      return;
    }
    // Validate nature_other if 'Autre' is selected
    if (formData.nature === 'Autre' && !formData.nature_other?.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez préciser la nature du conflit.', variant: 'destructive' });
      return;
    }
    // Validate superficie for Opposition type
    if (formData.type === 'Opposition' && (!formData.superficie_opposee_ha || formData.superficie_opposee_ha <= 0)) {
      toast({ title: 'Erreur', description: 'La superficie opposée (ha) est obligatoire pour une opposition.', variant: 'destructive' });
      return;
    }
    // Validate resolution_date if status is Résolu
    if (formData.status === 'Résolu' && !formData.resolution_date) {
      toast({ title: 'Erreur', description: 'La date de résolution est obligatoire pour un statut résolu.', variant: 'destructive' });
      return;
    }

    const dataWithTimestamp = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      updateConflict(editingId, dataWithTimestamp);
      toast({ title: 'Conflit modifié', description: 'Les informations ont été mises à jour.' });
    } else {
      addConflict(dataWithTimestamp);
      toast({ title: 'Conflit signalé', description: 'Le nouveau conflit a été enregistré.' });
    }
    setDialogOpen(false);
  };

  const handleToggleStatus = (conflict: Conflict) => {
    const newStatus = conflict.status === 'Résolu' ? 'En cours' : 'Résolu';
    updateConflict(conflict.id, { 
      status: newStatus,
      updated_at: new Date().toISOString(),
    });
    toast({ 
      title: newStatus === 'Résolu' ? 'Conflit résolu' : 'Conflit réouvert',
      description: `Le statut a été mis à jour.`
    });
  };

  const handleCardClick = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setDetailsOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Faible':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Moyenne':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Élevée':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Critique':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // For resolved conflicts without resolution_date, show reminder
  const needsResolutionDate = (conflict: Conflict) => {
    return conflict.status === 'Résolu' && !conflict.resolution_date;
  };

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterSeverity('all');
    setFilterCommune('all');
    setFilterMonth('all');
  };

  const hasActiveFilters = filterStatus !== 'all' || filterSeverity !== 'all' || filterCommune !== 'all' || filterMonth !== 'all';

  // Handle viewing a conflict from dashboard priority cases
  const handleViewFromDashboard = (conflictId: string) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (conflict) {
      setSelectedConflict(conflict);
      setDetailsOpen(true);
    }
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
            <h1 className="text-xl font-bold">Conflits & Oppositions</h1>
            <p className="text-primary-foreground/80 text-sm">Gestion des conflits terrain</p>
          </div>
          <Button onClick={handleAdd} className="gap-2" variant="anefOutline" size="sm">
            <Plus className="h-4 w-4" />
            Signaler
          </Button>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'bg-white/20 text-white hover:bg-white/30' : 'text-white/70 hover:text-white hover:bg-white/10'}
          >
            <LayoutDashboard className="h-4 w-4 mr-1" />
            Tableau de bord
          </Button>
          <Button
            variant={activeTab === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('list')}
            className={activeTab === 'list' ? 'bg-white/20 text-white hover:bg-white/30' : 'text-white/70 hover:text-white hover:bg-white/10'}
          >
            <List className="h-4 w-4 mr-1" />
            Liste ({conflicts.length})
          </Button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="px-4 py-4">
          <ConflictsDashboard onViewConflict={handleViewFromDashboard} />
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <>
          {/* Filter Bar */}
          <div className="px-4 py-4">
        <div className="flex gap-2 mb-3">
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {[filterStatus, filterSeverity, filterCommune, filterMonth].filter(f => f !== 'all').length}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
              <X className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {showFilters && (
          <Card className="p-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              {/* Status Filter - Chips */}
              <div className="col-span-2">
                <Label className="text-xs mb-2 block">Statut</Label>
                <div className="flex flex-wrap gap-2">
                  {['all', ...statusOptions].map(status => (
                    <Badge
                      key={status}
                      variant={filterStatus === status ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setFilterStatus(status)}
                    >
                      {status === 'all' ? 'Tous' : status}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Severity Filter */}
              <div>
                <Label className="text-xs mb-1 block">Gravité</Label>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {severityOptions.map(sev => (
                      <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Commune Filter */}
              <div>
                <Label className="text-xs mb-1 block">Commune</Label>
                <Select value={filterCommune} onValueChange={setFilterCommune}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes</SelectItem>
                    {uniqueCommunes.map(commune => (
                      <SelectItem key={commune.id} value={commune.id}>{commune.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Filter */}
              <div className="col-span-2">
                <Label className="text-xs mb-1 block">Période</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes les périodes</SelectItem>
                    {uniqueMonths.map(month => (
                      <SelectItem key={month} value={month}>
                        {new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Conflicts List */}
      <div className="px-4 space-y-3">
        {filteredConflicts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{hasActiveFilters ? 'Aucun conflit ne correspond aux filtres' : 'Aucun conflit signalé'}</p>
          </div>
        ) : (
          filteredConflicts.map(conflict => (
            <div
              key={conflict.id}
              className="bg-card rounded-xl p-4 border border-border/50 shadow-soft cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              onClick={() => handleCardClick(conflict)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Status + Severity Badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={`${getStatusColor(conflict.status)} border text-xs`}>
                      {conflict.status}
                    </Badge>
                    <Badge className={`${getSeverityColor(conflict.severity)} border text-xs`}>
                      {conflict.severity}
                    </Badge>
                    {needsResolutionDate(conflict) && (
                      <Badge className="bg-amber-500 text-white text-xs">
                        Date de résolution manquante
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-foreground text-sm mb-1">{conflict.nature}</h3>
                  
                  {/* Description truncated */}
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{conflict.description}</p>
                  
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{getCommuneName(conflict.commune_id)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(conflict.date_reported)}</span>
                    </div>
                    {conflict.handled_by && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{getAdpName(conflict.handled_by)}</span>
                      </div>
                    )}
                  </div>

                  {/* Updated at */}
                  {conflict.updated_at && (
                    <div className="mt-2 text-xs text-muted-foreground/70">
                      Mis à jour: {formatDate(conflict.updated_at)}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(conflict);
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
                      handleEdit(conflict);
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
                      handleDelete(conflict.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}

      {/* Details Sheet */}
      <ConflictDetailsSheet
        conflict={selectedConflict}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier conflit' : 'Signaler un conflit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nature du conflit *</Label>
              <Select
                value={formData.nature}
                onValueChange={v => setFormData({ ...formData, nature: v, nature_other: v !== 'Autre' ? '' : formData.nature_other })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {CONFLICT_NATURES.map(nature => (
                    <SelectItem key={nature} value={nature}>{nature}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show "Préciser" field when 'Autre' is selected */}
            {formData.nature === 'Autre' && (
              <div className="space-y-2">
                <Label>Préciser la nature du conflit *</Label>
                <Input
                  value={formData.nature_other || ''}
                  onChange={e => setFormData({ ...formData, nature_other: e.target.value })}
                  placeholder="Précisez la nature du conflit..."
                />
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
                <Label>Gravité</Label>
                <Select
                  value={formData.severity}
                  onValueChange={v => setFormData({ ...formData, severity: v as Conflict['severity'] })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {severityOptions.map(sev => (
                      <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={v => setFormData({ ...formData, status: v as Conflict['status'] })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date de signalement</Label>
                <Input
                  type="date"
                  value={formData.date_reported}
                  onChange={e => setFormData({ ...formData, date_reported: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ADP en charge</Label>
                <Select
                  value={formData.handled_by}
                  onValueChange={v => setFormData({ ...formData, handled_by: v })}
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
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrire le conflit..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Mesures prises par l'ADP</Label>
              <Textarea
                value={formData.mesures_adp || ''}
                onChange={e => setFormData({ ...formData, mesures_adp: e.target.value })}
                placeholder="Actions entreprises par l'ADP..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Mesures prises par les services</Label>
              <Textarea
                value={formData.mesures_services || ''}
                onChange={e => setFormData({ ...formData, mesures_services: e.target.value })}
                placeholder="Actions entreprises par DPANEF, DRANEF, etc..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Services concernés</Label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map(service => (
                  <Badge
                    key={service}
                    variant={formData.services_concernes?.includes(service) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = formData.services_concernes || [];
                      const updated = current.includes(service)
                        ? current.filter(s => s !== service)
                        : [...current, service];
                      setFormData({ ...formData, services_concernes: updated });
                    }}
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prochaine action</Label>
                <Input
                  value={formData.prochaine_action || ''}
                  onChange={e => setFormData({ ...formData, prochaine_action: e.target.value })}
                  placeholder="Action prévue..."
                />
              </div>
              <div className="space-y-2">
                <Label>Date de résolution {formData.status === 'Résolu' && '*'}</Label>
                <Input
                  type="date"
                  value={formData.resolution_date || ''}
                  onChange={e => setFormData({ ...formData, resolution_date: e.target.value })}
                />
              </div>
            </div>

            {/* Type selection (Conflit vs Opposition) */}
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                value={formData.type || 'Conflit'}
                onValueChange={v => setFormData({ ...formData, type: v as 'Conflit' | 'Opposition' })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="Conflit">Conflit</SelectItem>
                  <SelectItem value="Opposition">Opposition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Superficie (visible for Opposition type) */}
            {formData.type === 'Opposition' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 space-y-3 border border-amber-200/50">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Données d'opposition (KPI)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Superficie opposée (ha) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.superficie_opposee_ha || ''}
                      onChange={e => setFormData({ ...formData, superficie_opposee_ha: parseFloat(e.target.value) || undefined })}
                      placeholder="Ex: 12.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Périmètre</Label>
                    <Input
                      value={formData.perimetre_id || ''}
                      onChange={e => setFormData({ ...formData, perimetre_id: e.target.value })}
                      placeholder="Nom du périmètre"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Site</Label>
                  <Input
                    value={formData.site_id || ''}
                    onChange={e => setFormData({ ...formData, site_id: e.target.value })}
                    placeholder="Nom du site"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes de résolution</Label>
              <Textarea
                value={formData.resolution_notes}
                onChange={e => setFormData({ ...formData, resolution_notes: e.target.value })}
                placeholder="Notes de résolution, suivi..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} variant="anef">
              {editingId ? 'Mettre à jour' : 'Signaler'}
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
              Êtes-vous sûr de vouloir supprimer ce conflit ?
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

export default ConflictsManagement;