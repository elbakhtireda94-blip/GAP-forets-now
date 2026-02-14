/**
 * Module Actions cartographiques PDFCP
 * Affiche les actions groupées par action prévue, avec progression et carte
 */

import React, { useState, useMemo, useCallback, useEffect, Suspense, lazy } from 'react';
import { MapPin, Plus, Eye, Pencil, Trash2, Map, List, Layers, Download, Loader2, Filter, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from 'sonner';
import {
  usePdfcpActionsGeo,
  PdfcpActionGeoRow,
  getGeoConfig,
} from '@/hooks/usePdfcpActionsGeo';
import PdfcpGeoActionForm from './PdfcpGeoActionForm';

const PdfcpMapViewer = lazy(() => import('./PdfcpMapViewer'));

const MapLoadingFallback = () => (
  <div className="h-[400px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
    <div className="text-center text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm">Chargement de la carte...</p>
    </div>
  </div>
);

interface PdfcpGeoActionsModuleProps {
  pdfcpId: string;
  /** Si défini, ouvre le formulaire carto avec cette action prévue présélectionnée (après saisie d'une ligne). */
  openFormWithPlannedId?: string | null;
  /** Appelé quand le formulaire a été ouvert avec openFormWithPlannedId (pour que le parent réinitialise). */
  onFormOpened?: () => void;
}

const PdfcpGeoActionsModule: React.FC<PdfcpGeoActionsModuleProps> = ({
  pdfcpId,
  openFormWithPlannedId,
  onFormOpened,
}) => {
  const {
    geoActions,
    plannedActionsWithProgress,
    availablePlannedActions,
    geoActionsByPlannedAction,
    isLoading,
    isSupabaseReady,
    checkOvershoot,
    createGeoAction,
    updateGeoAction,
    deleteGeoAction,
    isDeleting,
  } = usePdfcpActionsGeo(pdfcpId);

  const [showForm, setShowForm] = useState(false);
  const [editAction, setEditAction] = useState<PdfcpActionGeoRow | undefined>();
  const [preselectedPlannedId, setPreselectedPlannedId] = useState<string | undefined>();
  const [filterPlannedId, setFilterPlannedId] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>('split');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedGeoId, setSelectedGeoId] = useState<string | undefined>();

  // Ouvrir le formulaire carto avec une action prévue présélectionnée (après "Ajouter la localisation ?")
  useEffect(() => {
    if (!openFormWithPlannedId || !isSupabaseReady || isLoading) return;
    setPreselectedPlannedId(openFormWithPlannedId);
    setEditAction(undefined);
    setShowForm(true);
    onFormOpened?.();
  }, [openFormWithPlannedId, isSupabaseReady, isLoading, onFormOpened]);

  // Not a MySQL UUID (not in central database) — module unavailable
  if (!isSupabaseReady) {
    return (
      <Card id="actions-cartographiques" className="border-border/50 shadow-soft scroll-mt-24">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Actions cartographiques
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground space-y-3">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Actions cartographiques disponibles uniquement pour les PDFCP enregistrés dans la base centrale.</p>
          <p className="text-sm">Pour saisir des données géographiques, ouvrez un PDFCP depuis <strong>Programmes PDFCP</strong> (filtre « Base centrale » ou badge Base centrale) puis descendez jusqu’au bloc « Actions cartographiques » sur cette page.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card id="actions-cartographiques" className="border-border/50 shadow-soft scroll-mt-24">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  // Handlers
  const handleOpenForm = (plannedId?: string) => {
    setPreselectedPlannedId(plannedId);
    setEditAction(undefined);
    setShowForm(true);
  };

  const handleEdit = (action: PdfcpActionGeoRow) => {
    setEditAction(action);
    setPreselectedPlannedId(action.planned_action_id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteGeoAction(id);
    setDeleteConfirm(null);
    if (selectedGeoId === id) setSelectedGeoId(undefined);
  };

  const handleSave = async (data: Omit<PdfcpActionGeoRow, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
    if (editAction) {
      await updateGeoAction({ id: editAction.id, ...data });
    } else {
      await createGeoAction(data);
    }
  };

  const handleExportGeoJSON = () => {
    if (geoActions.length === 0) { toast.error('Aucune action à exporter'); return; }
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: geoActions.filter(a => a.geometry).map(a => ({
        type: 'Feature' as const,
        id: a.id,
        geometry: a.geometry!,
        properties: {
          id: a.id,
          planned_action_id: a.planned_action_id,
          action_type: a.action_type,
          titre: a.titre,
          surface_realisee_ha: a.surface_realisee_ha,
          longueur_realisee_km: a.longueur_realisee_km,
          geom_type: a.geom_type,
          date_realisation: a.date_realisation,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdfcp_${pdfcpId}_actions_geo.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${geoActions.length} action(s) exportée(s)`);
  };

  // Filtering
  const filteredPlanned = filterPlannedId === 'all'
    ? plannedActionsWithProgress
    : plannedActionsWithProgress.filter(pa => pa.id === filterPlannedId);

  const mapActions = filterPlannedId === 'all'
    ? geoActions
    : geoActions.filter(ga => ga.planned_action_id === filterPlannedId);

  return (
    <Card id="actions-cartographiques" className="border-border/50 shadow-soft scroll-mt-24">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Actions cartographiques
            {geoActions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{geoActions.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter */}
            {plannedActionsWithProgress.length > 1 && (
              <Select value={filterPlannedId} onValueChange={setFilterPlannedId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Filtrer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {plannedActionsWithProgress.map(pa => {
                    const cfg = getGeoConfig(pa.action_key);
                    return (
                      <SelectItem key={pa.id} value={pa.id}>
                        <span className="text-xs">{cfg.icon} [{pa.year}] {pa.action_label || pa.action_key}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {/* View mode */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-none h-8 px-2">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'split' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('split')} className="rounded-none border-x h-8 px-2">
                <Layers className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === 'map' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('map')} className="rounded-none h-8 px-2">
                <Map className="h-4 w-4" />
              </Button>
            </div>

            {geoActions.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExportGeoJSON} className="h-8">
                <Download className="h-4 w-4 mr-1" />GeoJSON
              </Button>
            )}

            <Button size="sm" onClick={() => handleOpenForm()} className="h-8" disabled={availablePlannedActions.length === 0}>
              <Plus className="h-4 w-4 mr-1" />Ajouter une localisation
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Où saisir les données géo ?</span>
          <span className="ml-1">Cliquez sur <strong>« Ajouter une localisation »</strong> ci-dessus, ou sur <strong>« Cartographier »</strong> à côté d’une action prévue ci-dessous. Remplissez ensuite le formulaire (coordonnées Lambert, surface ou longueur).</span>
        </div>
        {plannedActionsWithProgress.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune action prévue trouvée dans la base centrale.</p>
            <p className="text-sm mt-1">Ajoutez d'abord des actions dans le Plan concerté (Base centrale MySQL).</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'split' ? 'lg:grid-cols-2' : ''}`}>
            {/* Grouped list */}
            {(viewMode === 'list' || viewMode === 'split') && (
              <div className="space-y-4">
                {filteredPlanned.map(pa => {
                  const cfg = getGeoConfig(pa.action_key);
                  const linkedGeos = geoActionsByPlannedAction.get(pa.id) || [];
                  const progressColor = pa.taux_realisation >= 100 ? 'text-green-600' : pa.taux_realisation >= 50 ? 'text-yellow-600' : 'text-muted-foreground';

                  return (
                    <div key={pa.id} className="border rounded-lg overflow-hidden">
                      {/* Group header */}
                      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-lg">{cfg.icon}</span>
                            <span className="truncate">{pa.action_label || pa.action_key}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">{pa.year}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Prévu: {pa.physique} {pa.unite} | Réalisé: {pa.cumul_realise.toFixed(1)} | Reste: {pa.reste.toFixed(1)}
                            </span>
                            <span className={`text-xs font-semibold ${progressColor}`}>{pa.taux_realisation}%</span>
                          </div>
                          <Progress value={Math.min(pa.taux_realisation, 100)} className="h-1.5 mt-1" />
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => handleOpenForm(pa.id)} disabled={pa.reste <= 0}>
                          <MapPinned className="h-3 w-3 mr-1" />Cartographier
                        </Button>
                      </div>

                      {/* Linked geo actions */}
                      {linkedGeos.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                          Aucune action cartographique
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Géom</TableHead>
                              <TableHead className="text-xs">Titre</TableHead>
                              <TableHead className="text-xs text-right">Valeur</TableHead>
                              <TableHead className="text-xs text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {linkedGeos.map(ga => {
                              const isSelected = ga.id === selectedGeoId;
                              return (
                                <TableRow key={ga.id} className={isSelected ? 'bg-primary/5' : ''}>
                                  <TableCell className="text-xs">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                                      {ga.geom_type === 'Point' ? '📍' : ga.geom_type === 'Polygon' ? '🔷' : '📏'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">{ga.titre}</TableCell>
                                  <TableCell className="text-sm text-right">
                                    {ga.surface_realisee_ha ? `${ga.surface_realisee_ha} ha` : ga.longueur_realisee_km ? `${ga.longueur_realisee_km.toFixed(2)} km` : '—'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedGeoId(ga.id); if (viewMode === 'list') setViewMode('split'); }} title="Voir sur carte">
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(ga)} title="Modifier">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(ga.id)} title="Supprimer">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Map */}
            {(viewMode === 'map' || viewMode === 'split') && (
              <div>
                <Suspense fallback={<MapLoadingFallback />}>
                  <PdfcpMapViewer
                    actions={mapActions}
                    selectedActionId={selectedGeoId}
                    onActionClick={a => setSelectedGeoId(a.id)}
                    className="h-[400px]"
                  />
                </Suspense>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Form */}
      <PdfcpGeoActionForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditAction(undefined); setPreselectedPlannedId(undefined); }}
        onSave={handleSave}
        pdfcpId={pdfcpId}
        plannedActions={plannedActionsWithProgress}
        editAction={editAction}
        preselectedPlannedId={preselectedPlannedId}
        checkOvershoot={checkOvershoot}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette action ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action cartographique sera définitivement supprimée. Les cumuls seront recalculés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PdfcpGeoActionsModule;
