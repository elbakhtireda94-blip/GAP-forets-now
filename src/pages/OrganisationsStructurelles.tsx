import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Users, TreePine, Briefcase, Plus, Pencil, Trash2, Search, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDatabase, OrganisationStruct, OrganisationStatut, OrganisationDocument } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import KPICard from '@/components/KPICard';
import { OrganisationDocumentsUploader } from '@/components/organisations/OrganisationDocumentsUploader';
import { toast } from '@/hooks/use-toast';

const STATUTS: OrganisationStatut[] = ['ODF', 'Cooperative', 'Association', 'AGS'];

const statutLabels: Record<OrganisationStatut, string> = {
  ODF: 'ODF',
  Cooperative: 'Coopérative forestière',
  Association: 'Association',
  AGS: 'AGS',
};

const statutIcons: Record<OrganisationStatut, React.ElementType> = {
  ODF: TreePine,
  Cooperative: Users,
  Association: Briefcase,
  AGS: Building2,
};

const statutColors: Record<OrganisationStatut, string> = {
  ODF: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Cooperative: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Association: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  AGS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const OrganisationsStructurelles: React.FC = () => {
  const navigate = useNavigate();
  const { user, applyScopeFilter } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const { 
    getOrganisations, 
    addOrganisation, 
    updateOrganisation, 
    deleteOrganisation,
    getRegions,
    getDpanefsByDranef,
    getAdps,
    getAdpById,
    getDranefName,
    getDpanefName,
    getAdpName,
  } = useDatabase();

  // Cascade filters state
  const [filterDranef, setFilterDranef] = useState<string>('all');
  const [filterDpanef, setFilterDpanef] = useState<string>('all');
  const [filterAdp, setFilterAdp] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganisationStruct | null>(null);

  // Form state
  const [formNom, setFormNom] = useState('');
  const [formStatut, setFormStatut] = useState<OrganisationStatut>('ODF');
  const [formDateCreation, setFormDateCreation] = useState('');
  const [formDomaines, setFormDomaines] = useState('');
  const [formAdpId, setFormAdpId] = useState('');
  const [formDocuments, setFormDocuments] = useState<OrganisationDocument[]>([]);

  const allOrganisations = getOrganisations();
  const regions = getRegions();
  const allAdps = getAdps();

  // Apply RBAC scope filter to organisations
  const organisations = useMemo(() => {
    return applyScopeFilter(allOrganisations, 'organisation');
  }, [allOrganisations, applyScopeFilter]);

  // Get unique DRANEFs from regions
  const allDranefs = useMemo(() => {
    const dranefs: { id: string; name: string; regionId: string }[] = [];
    regions.forEach(region => {
      region.dranef.forEach(d => {
        dranefs.push({ id: d.id, name: d.name, regionId: region.id });
      });
    });
    return dranefs;
  }, [regions]);

  // DPANEFs based on selected DRANEF
  const availableDpanefs = useMemo(() => {
    if (filterDranef === 'all') return [];
    return getDpanefsByDranef(filterDranef);
  }, [filterDranef, getDpanefsByDranef]);

  // ADPs based on selected DPANEF (or all if no DPANEF)
  const availableAdps = useMemo(() => {
    if (filterDpanef === 'all') {
      if (filterDranef === 'all') return allAdps;
      return allAdps.filter(adp => adp.dranef_id === filterDranef);
    }
    return allAdps.filter(adp => adp.dpanef_id === filterDpanef);
  }, [filterDranef, filterDpanef, allAdps]);

  // Form ADPs (for admin form)
  const formAvailableAdps = useMemo(() => {
    return allAdps;
  }, [allAdps]);

  // Filtered organisations based on cascade filters + search
  const filteredOrgs = useMemo(() => {
    let result = organisations;

    if (filterDranef !== 'all') {
      result = result.filter(o => o.dranef_id === filterDranef);
    }
    if (filterDpanef !== 'all') {
      result = result.filter(o => o.dpanef_id === filterDpanef);
    }
    if (filterAdp !== 'all') {
      result = result.filter(o => o.adp_id === filterAdp);
    }
    if (filterStatut !== 'all') {
      result = result.filter(o => o.statut === filterStatut);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        o.nom.toLowerCase().includes(query) ||
        o.domaines_activites.some(d => d.toLowerCase().includes(query))
      );
    }

    return result;
  }, [organisations, filterDranef, filterDpanef, filterAdp, filterStatut, searchQuery]);

  // KPI counts based on FILTERED data (dynamic)
  const counts = useMemo(() => ({
    ODF: filteredOrgs.filter(o => o.statut === 'ODF').length,
    Cooperative: filteredOrgs.filter(o => o.statut === 'Cooperative').length,
    Association: filteredOrgs.filter(o => o.statut === 'Association').length,
    AGS: filteredOrgs.filter(o => o.statut === 'AGS').length,
    total: filteredOrgs.length,
  }), [filteredOrgs]);

  // Reset cascade filters when parent changes
  const handleDranefChange = (value: string) => {
    setFilterDranef(value);
    setFilterDpanef('all');
    setFilterAdp('all');
  };

  const handleDpanefChange = (value: string) => {
    setFilterDpanef(value);
    setFilterAdp('all');
  };

  const resetForm = () => {
    setFormNom('');
    setFormStatut('ODF');
    setFormDateCreation('');
    setFormDomaines('');
    setFormAdpId('');
    setFormDocuments([]);
    setEditingOrg(null);
  };

  const openAddDialog = () => {
    resetForm();
    // For ADP users, auto-fill their ID
    if (!isAdmin && user?.id) {
      setFormAdpId(user.id);
    }
    setIsDialogOpen(true);
  };

  const openEditDialog = (org: OrganisationStruct) => {
    setEditingOrg(org);
    setFormNom(org.nom);
    setFormStatut(org.statut);
    setFormDateCreation(org.date_creation || '');
    setFormDomaines(org.domaines_activites.join(', '));
    setFormAdpId(org.adp_id || '');
    setFormDocuments(org.documents || []);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formNom.trim()) {
      toast({ title: 'Erreur', description: 'Le nom est obligatoire', variant: 'destructive' });
      return;
    }

    // Parse domaines as array
    const domainesArray = formDomaines
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    // Get ADP info to auto-populate geographic fields
    const selectedAdpId = isAdmin ? formAdpId : user?.id;
    const selectedAdp = selectedAdpId ? getAdpById(selectedAdpId) : undefined;

    const now = new Date().toISOString();

    if (editingOrg) {
      updateOrganisation(editingOrg.id, {
        nom: formNom.trim(),
        statut: formStatut,
        date_creation: formDateCreation || undefined,
        domaines_activites: domainesArray,
        documents: formDocuments,
        adp_id: selectedAdpId || undefined,
        dranef_id: selectedAdp?.dranef_id || editingOrg.dranef_id,
        dpanef_id: selectedAdp?.dpanef_id || editingOrg.dpanef_id,
        commune_id: selectedAdp?.commune_id || editingOrg.commune_id,
        region_id: selectedAdp?.region_id || editingOrg.region_id,
        updated_at: now,
      });
      toast({ title: 'Succès', description: 'Organisation modifiée' });
    } else {
      addOrganisation({
        nom: formNom.trim(),
        statut: formStatut,
        date_creation: formDateCreation || new Date().toISOString().slice(0, 10),
        domaines_activites: domainesArray,
        documents: formDocuments,
        adp_id: selectedAdpId || undefined,
        dranef_id: selectedAdp?.dranef_id,
        dpanef_id: selectedAdp?.dpanef_id,
        commune_id: selectedAdp?.commune_id,
        region_id: selectedAdp?.region_id,
        created_at: now,
        updated_at: now,
      });
      toast({ title: 'Succès', description: 'Organisation ajoutée' });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette organisation ?')) {
      deleteOrganisation(id);
      toast({ title: 'Supprimé', description: 'Organisation supprimée' });
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary pt-8 pb-6 px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/menu')}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">
              Organisations structurelles
            </h1>
            <p className="text-primary-foreground/70 text-sm">
              Suivi des organisations encadrées/structurées par l'ADP
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 -mt-3 space-y-4">
        {/* KPI Cards - DYNAMIC based on filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
          <KPICard title="ODF" value={counts.ODF} icon={TreePine} trend="neutral" />
          <KPICard title="Coopératives" value={counts.Cooperative} icon={Users} trend="neutral" />
          <KPICard title="Associations" value={counts.Association} icon={Briefcase} trend="neutral" />
          <KPICard title="AGS" value={counts.AGS} icon={Building2} trend="neutral" />
        </div>

        {/* Cascade Filters */}
        <Card className="border-border/50 shadow-soft animate-slide-up" style={{ animationDelay: '50ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filtres</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou domaine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* DRANEF - Only for Admin */}
              {isAdmin && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">DRANEF</Label>
                  <Select value={filterDranef} onValueChange={handleDranefChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {allDranefs.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* DPANEF - Only for Admin */}
              {isAdmin && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">DPANEF</Label>
                  <Select 
                    value={filterDpanef} 
                    onValueChange={handleDpanefChange}
                    disabled={filterDranef === 'all'}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {availableDpanefs.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ADP concerné - Only for Admin */}
              {isAdmin && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ADP concerné</Label>
                  <Select 
                    value={filterAdp} 
                    onValueChange={setFilterAdp}
                    disabled={filterDranef === 'all' && filterDpanef === 'all'}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {availableAdps.map(adp => (
                        <SelectItem key={adp.id} value={adp.id}>{adp.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Statut */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Statut</Label>
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {STATUTS.map(s => (
                      <SelectItem key={s} value={s}>{statutLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50 shadow-soft animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Liste des organisations
                <Badge variant="secondary" className="ml-2">{filteredOrgs.length}</Badge>
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingOrg ? 'Modifier' : 'Nouvelle'} organisation</DialogTitle>
                    <DialogDescription>
                      {editingOrg ? 'Modifiez les informations' : 'Renseignez les informations de la nouvelle organisation'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={formNom}
                        onChange={(e) => setFormNom(e.target.value)}
                        placeholder="Nom de l'organisation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="statut">Statut *</Label>
                      <Select value={formStatut} onValueChange={(v) => setFormStatut(v as OrganisationStatut)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUTS.map(s => (
                            <SelectItem key={s} value={s}>{statutLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date de création</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formDateCreation}
                        onChange={(e) => setFormDateCreation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="domaines">Domaines d'activités</Label>
                      <Input
                        id="domaines"
                        value={formDomaines}
                        onChange={(e) => setFormDomaines(e.target.value)}
                        placeholder="Ex: PFNL, apiculture, écotourisme (séparés par virgules)"
                      />
                      <p className="text-xs text-muted-foreground">Séparez les domaines par des virgules</p>
                    </div>

                    <OrganisationDocumentsUploader
                      documents={formDocuments}
                      onChange={setFormDocuments}
                    />

                    {/* ADP Selection - Only for Admin */}
                    {isAdmin && (
                      <div className="space-y-2">
                        <Label htmlFor="adp">ADP concerné *</Label>
                        <Select 
                          value={formAdpId || '__none__'} 
                          onValueChange={(v) => setFormAdpId(v === '__none__' ? '' : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un ADP" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Aucun</SelectItem>
                            {formAvailableAdps.map(adp => (
                              <SelectItem key={adp.id} value={adp.id}>{adp.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Les informations géographiques (DRANEF, DPANEF, Commune) seront automatiquement remplies à partir de l'ADP sélectionné.
                        </p>
                      </div>
                    )}

                    {/* Show current user info for ADP role */}
                    {!isAdmin && user && (
                      <div className="p-3 bg-muted rounded-md text-sm">
                        <p className="font-medium">ADP: {user.name}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          L'organisation sera automatiquement rattachée à votre profil.
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                    <Button onClick={handleSubmit}>{editingOrg ? 'Enregistrer' : 'Ajouter'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredOrgs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Aucune organisation trouvée</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Essayez de modifier votre recherche' : 'Cliquez sur "Ajouter" pour créer une organisation'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date création</TableHead>
                      <TableHead>Domaines d'activités</TableHead>
                      <TableHead className="w-[80px]">Documents</TableHead>
                      {isAdmin && <TableHead>ADP</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.map(org => {
                      const IconComp = statutIcons[org.statut] || Building2;
                      return (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">{org.nom}</TableCell>
                          <TableCell>
                            <Badge className={`gap-1 ${statutColors[org.statut]}`}>
                              <IconComp className="h-3 w-3" />
                              {statutLabels[org.statut]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(org.date_creation)}</TableCell>
                          <TableCell className="max-w-[200px]">
                            {org.domaines_activites.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {org.domaines_activites.slice(0, 3).map((d, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {d}
                                  </Badge>
                                ))}
                                {org.domaines_activites.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{org.domaines_activites.length - 3}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(org.documents && org.documents.length > 0) ? (
                              <Badge variant="secondary" className="gap-1">
                                <Paperclip className="h-3 w-3" />
                                {org.documents.length}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-sm text-muted-foreground">
                              {org.adp_id ? getAdpName(org.adp_id) : '-'}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(org)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(org.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default OrganisationsStructurelles;
