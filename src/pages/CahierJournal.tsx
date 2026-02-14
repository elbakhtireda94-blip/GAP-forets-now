import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, BookOpen, Calendar, Filter, Search, 
  LayoutDashboard, List, SlidersHorizontal, Download, AlertTriangle
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCahierJournal, JournalFormData } from '@/hooks/useCahierJournal';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { JournalEntryCard } from '@/components/journal/JournalEntryCard';
import { JournalEntryForm } from '@/components/journal/JournalEntryForm';
import { JournalDetailsSheet } from '@/components/journal/JournalDetailsSheet';
import { JournalDashboard } from '@/components/journal/JournalDashboard';
import { 
  CahierJournalEntry, 
  journalCategoryLabels, 
  JournalCategory, 
  ValidationStatus, 
  Priority 
} from '@/data/cahierJournalTypes';
import BottomNav from '@/components/BottomNav';
import DemoBadge from '@/components/DemoBadge';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const CahierJournal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data } = useDatabase();
  const { 
    entries, loading, createEntry, updateEntry, deleteEntry, 
    duplicateEntry, canCreate, canEdit 
  } = useCahierJournal();

  // UI State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CahierJournalEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<CahierJournalEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAppui, setFilterAppui] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'temps'>('date');

  // Removed unused dranefsMap - data is directly from entries

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(query) || 
        e.description.toLowerCase().includes(query) ||
        e.location_text?.toLowerCase().includes(query)
      );
    }

    // Period filter
    if (filterPeriod !== 'all') {
      const today = new Date();
      result = result.filter(e => {
        const entryDate = new Date(e.entry_date);
        if (filterPeriod === 'today') return e.entry_date === format(today, 'yyyy-MM-dd');
        if (filterPeriod === 'week') {
          return entryDate >= startOfWeek(today, { locale: fr }) && entryDate <= endOfWeek(today, { locale: fr });
        }
        if (filterPeriod === 'month') {
          return entryDate >= startOfMonth(today) && entryDate <= endOfMonth(today);
        }
        if (filterPeriod === '7days') {
          return entryDate >= subDays(today, 7);
        }
        return true;
      });
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter(e => e.category === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(e => e.statut_validation === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      result = result.filter(e => e.priorite === filterPriority);
    }

    // Appui filter
    if (filterAppui === 'oui') {
      result = result.filter(e => e.besoin_appui_hierarchique);
    } else if (filterAppui === 'non') {
      result = result.filter(e => !e.besoin_appui_hierarchique);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
      }
      if (sortBy === 'priority') {
        const priorityOrder = { 'Élevée': 0, 'Moyenne': 1, 'Faible': 2 };
        return priorityOrder[a.priorite] - priorityOrder[b.priorite];
      }
      if (sortBy === 'temps') {
        return (b.temps_passe_min || 0) - (a.temps_passe_min || 0);
      }
      return 0;
    });

    return result;
  }, [entries, searchQuery, filterPeriod, filterCategory, filterStatus, filterPriority, filterAppui, sortBy]);

  // Entries needing attention
  const entriesNeedingAppui = useMemo(() => {
    return entries.filter(e => e.besoin_appui_hierarchique);
  }, [entries]);

  const handleCreate = () => {
    setEditingEntry(null);
    setFormOpen(true);
  };

  const handleView = (entry: CahierJournalEntry) => {
    setViewingEntry(entry);
  };

  const handleEdit = (entry: CahierJournalEntry) => {
    setViewingEntry(null);
    setEditingEntry(entry);
    setFormOpen(true);
  };

  const handleDuplicate = async (entryId: string) => {
    setViewingEntry(null);
    await duplicateEntry(entryId);
  };

  const handleSubmit = async (formData: JournalFormData): Promise<boolean> => {
    if (editingEntry) {
      return await updateEntry(editingEntry.id, formData);
    }
    const result = await createEntry(formData);
    return result !== null;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterPeriod('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterAppui('all');
  };

  const hasActiveFilters = searchQuery || filterPeriod !== 'all' || filterCategory !== 'all' || 
    filterStatus !== 'all' || filterPriority !== 'all' || filterAppui !== 'all';

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
            <h1 className="text-xl font-bold">Cahier Journal</h1>
            <p className="text-primary-foreground/80 text-sm">Traçabilité des activités terrain</p>
          </div>
          {canCreate && (
            <Button 
              onClick={handleCreate} 
              size="sm"
              className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" /> Nouvelle
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher titre, description, lieu..."
            className="pl-10 bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-border/50">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dashboard' | 'list')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Liste ({filteredEntries.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters Row */}
      <div className="px-4 py-2 flex flex-wrap gap-2 items-center border-b border-border/30">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-primary/10' : ''}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filtres
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
              !
            </Badge>
          )}
        </Button>

        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">Toutes dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="7days">7 derniers jours</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-[200px]">
            <SelectItem value="all">Toutes</SelectItem>
            {Object.entries(journalCategoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
            Effacer filtres
          </Button>
        )}
      </div>

      {/* Extended Filters Panel */}
      {showFilters && (
        <div className="px-4 py-3 bg-muted/30 border-b border-border/30 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="Brouillon">Brouillon</SelectItem>
              <SelectItem value="Validé ADP">Validé ADP</SelectItem>
              <SelectItem value="Transmis hiérarchie">Transmis</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Toutes priorités</SelectItem>
              <SelectItem value="Élevée">Élevée</SelectItem>
              <SelectItem value="Moyenne">Moyenne</SelectItem>
              <SelectItem value="Faible">Faible</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAppui} onValueChange={setFilterAppui}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Besoin appui" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="oui">Besoin d'appui</SelectItem>
              <SelectItem value="non">Sans besoin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'priority' | 'temps')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="date">Par date</SelectItem>
              <SelectItem value="priority">Par priorité</SelectItem>
              <SelectItem value="temps">Par durée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSkeleton count={3} />
        ) : activeTab === 'dashboard' ? (
          <>
            {/* Dashboard */}
            <JournalDashboard entries={filteredEntries} />

            {/* Alerts: Entries needing support */}
            {entriesNeedingAppui.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Activités nécessitant un appui ({entriesNeedingAppui.length})
                </h3>
                <div className="space-y-2">
                  {entriesNeedingAppui.slice(0, 3).map(entry => (
                    <div 
                      key={entry.id}
                      onClick={() => handleView(entry)}
                      className="p-3 bg-amber-50 rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                    >
                      <p className="text-sm font-medium text-amber-900">{entry.title}</p>
                      <p className="text-xs text-amber-700 mt-1">
                        {format(new Date(entry.entry_date), 'd MMM yyyy', { locale: fr })}
                        {entry.justification_appui && ` — ${entry.justification_appui.slice(0, 60)}...`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent entries preview */}
            {filteredEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Dernières entrées
                </h3>
                <div className="space-y-3">
                  {filteredEntries.slice(0, 5).map(entry => (
                    <JournalEntryCard key={entry.id} entry={entry} onClick={() => handleView(entry)} />
                  ))}
                </div>
                {filteredEntries.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-3"
                    onClick={() => setActiveTab('list')}
                  >
                    Voir toutes les entrées ({filteredEntries.length})
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{entries.length > 0 ? 'Aucun résultat pour ces filtres' : 'Aucune entrée'}</p>
                {canCreate && entries.length === 0 && (
                  <Button onClick={handleCreate} variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" /> Ajouter ma première entrée
                  </Button>
                )}
              </div>
            ) : (
              filteredEntries.map(entry => (
                <JournalEntryCard key={entry.id} entry={entry} onClick={() => handleView(entry)} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Entry Details Sheet */}
      <JournalDetailsSheet
        entry={viewingEntry}
        open={!!viewingEntry}
        onClose={() => setViewingEntry(null)}
        onEdit={() => viewingEntry && handleEdit(viewingEntry)}
        onDuplicate={() => viewingEntry && handleDuplicate(viewingEntry.id)}
        canEdit={viewingEntry ? canEdit(viewingEntry) : false}
      />

      {/* Form Sheet */}
      <JournalEntryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingEntry}
      />

      <DemoBadge />
      <BottomNav />
    </div>
  );
};

export default CahierJournal;
