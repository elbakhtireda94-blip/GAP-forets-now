import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Eye, AlertTriangle, TrendingUp, TrendingDown, Minus, Filter, X, Info } from 'lucide-react';
import {
  LigneComparatif,
  ActionType,
  actionTypeConfig,
  getExecutionBadgeColor,
  getExecutionsForLine,
  statutExecutionConfig,
  getUniqueAnneesFromLignes,
  getUniqueCommunesFromLignes,
  getUniquePerimetresFromLignes,
  getUniqueSitesFromLignes,
  getUniqueActionTypesFromLignes,
} from '@/data/comparatifTypes';
import { AlerteTerrain } from '@/data/alertesTypes';
import { formatDh, isYearInWindow } from '@/lib/formatters';
import { usePdfcpAggregates } from '@/hooks/usePdfcpAggregates';

interface ComparatifTableProps {
  pdfcpId: string;
  communeCode: string;
  allowedActionTypes?: string[];
  yearStart?: number;
  yearEnd?: number;
  onSelectZone?: (communeCode: string) => void;
  alertes?: AlerteTerrain[];
}

const ComparatifTable: React.FC<ComparatifTableProps> = ({ 
  pdfcpId,
  communeCode,
  allowedActionTypes,
  yearStart,
  yearEnd,
  onSelectZone, 
  alertes: externalAlertes 
}) => {
  const [selectedAnnee, setSelectedAnnee] = useState<string>('all');
  const [selectedCommune, setSelectedCommune] = useState<string>('all');
  const [selectedPerimetre, setSelectedPerimetre] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLigne, setSelectedLigne] = useState<LigneComparatif | null>(null);

  // Use centralized hook for data (SINGLE SOURCE OF TRUTH)
  const {
    allLignes: lignesBase,
    lignesComparatif: lignesInWindow,
    comparatifTotals,
    debug,
  } = usePdfcpAggregates(pdfcpId);

  // Helper to check if a line is within the PDFCP window
  const isInWindow = (ligne: LigneComparatif): boolean => {
    if (yearStart == null || yearEnd == null) return true;
    return isYearInWindow(ligne.annee, yearStart, yearEnd);
  };

  // Get unique values for filters - FROM FILTERED DATA
  const annees = useMemo(() => getUniqueAnneesFromLignes(lignesBase), [lignesBase]);
  const communes = useMemo(() => getUniqueCommunesFromLignes(lignesBase), [lignesBase]);
  
  // Filter perimetres based on selected commune (or show all from lignesBase)
  const perimetres = useMemo(() => {
    if (selectedCommune !== 'all') {
      const filtered = lignesBase.filter(l => l.commune_code === selectedCommune);
      return getUniquePerimetresFromLignes(filtered);
    }
    return getUniquePerimetresFromLignes(lignesBase);
  }, [lignesBase, selectedCommune]);
  
  // Filter sites based on selected perimetre (or show all from lignesBase)
  const sites = useMemo(() => {
    if (selectedPerimetre !== 'all') {
      const filtered = lignesBase.filter(l => l.perimetre_id === selectedPerimetre);
      return getUniqueSitesFromLignes(filtered);
    }
    return getUniqueSitesFromLignes(lignesBase);
  }, [lignesBase, selectedPerimetre]);
  
  const actionTypes = useMemo(() => getUniqueActionTypesFromLignes(lignesBase), [lignesBase]);

  // Reset dependent filters when parent changes
  const handleCommuneChange = (value: string) => {
    setSelectedCommune(value);
    setSelectedPerimetre('all');
    setSelectedSite('all');
  };

  const handlePerimetreChange = (value: string) => {
    setSelectedPerimetre(value);
    setSelectedSite('all');
  };

  // Apply UI filters on already-scoped data
  const filteredLignes = lignesBase.filter(l => {
    if (selectedAnnee !== 'all' && l.annee !== parseInt(selectedAnnee)) return false;
    if (selectedCommune !== 'all' && l.commune_code !== selectedCommune) return false;
    if (selectedPerimetre !== 'all' && l.perimetre_id !== selectedPerimetre) return false;
    if (selectedSite !== 'all' && l.site_id !== selectedSite) return false;
    if (selectedActionType !== 'all' && l.action_type !== selectedActionType) return false;
    if (selectedStatut === 'complete' && (l.taux_execution_pdfcp ?? 0) < 100) return false;
    if (selectedStatut === 'en_cours' && ((l.taux_execution_pdfcp ?? 0) >= 100 || (l.taux_execution_pdfcp ?? 0) === 0)) return false;
    if (selectedStatut === 'non_demarre' && (l.taux_execution_pdfcp ?? 0) > 0) return false;
    if (selectedStatut === 'avec_alerte' && !l.has_alerte) return false;
    return true;
  });

  // KPI Totals - use centralized comparatifTotals from hook (SINGLE SOURCE OF TRUTH)
  const kpiTotals = useMemo(() => {
    const nbHorsPeriode = lignesBase.length - lignesInWindow.length;
    
    return {
      totalPrevu: comparatifTotals.totalPrevu,
      totalCP: comparatifTotals.totalCP,
      totalExecute: comparatifTotals.totalExecute,
      tauxVsCp: comparatifTotals.totalCP > 0 ? comparatifTotals.tauxVsCp : null,
      tauxVsPdfcp: comparatifTotals.totalPrevu > 0 ? comparatifTotals.tauxVsPdfcp : null,
      nbHorsPeriode,
    };
  }, [comparatifTotals, lignesBase.length, lignesInWindow.length]);

  const handleOpenDetails = (ligne: LigneComparatif) => {
    setSelectedLigne(ligne);
    setDrawerOpen(true);
  };

  const formatCurrency = (value: number) => {
    return formatDh(value);
  };

  const renderTauxBadge = (taux: number | null, hasAlerte: boolean) => {
    if (taux === null) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">N/A</Badge>;
    }
    
    const colorClass = getExecutionBadgeColor(taux);
    
    return (
      <div className="flex items-center gap-1">
        <Badge className={colorClass}>{taux}%</Badge>
        {hasAlerte && (
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        )}
      </div>
    );
  };

  const renderEcartBadge = (ecart: number | null) => {
    if (ecart === null) {
      return <span className="text-muted-foreground">N/A</span>;
    }
    
    if (ecart > 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingUp className="h-4 w-4" />
          <span>+{formatCurrency(ecart)}</span>
        </div>
      );
    }
    if (ecart < 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingDown className="h-4 w-4" />
          <span>{formatCurrency(ecart)}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span>0 DH</span>
      </div>
    );
  };

  const clearFilters = () => {
    setSelectedAnnee('all');
    setSelectedCommune('all');
    setSelectedPerimetre('all');
    setSelectedSite('all');
    setSelectedActionType('all');
    setSelectedStatut('all');
  };

  const hasActiveFilters = selectedAnnee !== 'all' || selectedCommune !== 'all' || 
                          selectedPerimetre !== 'all' || selectedSite !== 'all' ||
                          selectedActionType !== 'all' || selectedStatut !== 'all';

  // Message for empty state
  const hasNoData = lignesBase.length === 0;

  return (
    <div className="space-y-4">
      {/* Empty state message */}
      {hasNoData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-yellow-800 font-medium">⚠️ Aucune ligne prévue opérationnelle</div>
          <div className="text-yellow-600 text-sm mt-1">
            Saisissez des lignes prévues dans le formulaire ci-dessus pour visualiser le comparatif.
          </div>
        </div>
      )}
      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtres</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select value={selectedAnnee} onValueChange={setSelectedAnnee}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Toutes les années</SelectItem>
              {annees.map(a => (
                <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCommune} onValueChange={handleCommuneChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Commune" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Toutes les communes</SelectItem>
              {communes.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPerimetre} onValueChange={handlePerimetreChange} disabled={selectedCommune === 'all'}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Périmètre" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Tous les périmètres</SelectItem>
              {perimetres.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSite} onValueChange={setSelectedSite} disabled={selectedPerimetre === 'all'}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Tous les sites</SelectItem>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedActionType} onValueChange={setSelectedActionType}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Type d'action" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Tous les types</SelectItem>
              {actionTypes.map(t => (
                <SelectItem key={t} value={t}>{actionTypeConfig[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatut} onValueChange={setSelectedStatut}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="complete">Terminé (100%)</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="non_demarre">Non démarré</SelectItem>
              <SelectItem value="avec_alerte">Avec alerte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Summary for PDFCP window */}
      {yearStart && yearEnd && (
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Totaux PDFCP ({yearStart}-{yearEnd})</span>
            {kpiTotals.nbHorsPeriode > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>{kpiTotals.nbHorsPeriode} ligne(s) hors période non comptabilisée(s)</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-xs text-muted-foreground">Total Prévu</div>
              <div className="font-semibold text-sm text-primary">{formatCurrency(kpiTotals.totalPrevu)}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-xs text-muted-foreground">Total CP</div>
              <div className="font-semibold text-sm">{formatCurrency(kpiTotals.totalCP)}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-xs text-muted-foreground">Total Exécuté</div>
              <div className="font-semibold text-sm">{formatCurrency(kpiTotals.totalExecute)}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-xs text-muted-foreground">% Exec PDFCP</div>
              <div className={`font-semibold text-sm ${(kpiTotals.tauxVsPdfcp ?? 0) >= 75 ? 'text-green-600' : (kpiTotals.tauxVsPdfcp ?? 0) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpiTotals.tauxVsPdfcp ?? 'N/A'}%
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <div className="text-xs text-muted-foreground">Taux vs CP</div>
              <div className={`font-semibold text-sm ${(kpiTotals.tauxVsCp ?? 0) >= 75 ? 'text-green-600' : (kpiTotals.tauxVsCp ?? 0) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {kpiTotals.tauxVsCp ?? 'N/A'}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Commune / Périmètre / Site</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="text-center font-semibold">Année</TableHead>
                <TableHead className="text-right font-semibold">Prévu PDFCP</TableHead>
                <TableHead className="text-right font-semibold">Programmé CP</TableHead>
                <TableHead className="text-right font-semibold">Réalisé</TableHead>
                <TableHead className="text-center font-semibold">% Exec CP</TableHead>
                <TableHead className="text-center font-semibold">% Exec PDFCP</TableHead>
                <TableHead className="text-right font-semibold">Écart Budget</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Aucune donnée correspondant aux filtres
                  </TableCell>
                </TableRow>
              ) : (
                filteredLignes.map((ligne, index) => {
                  const inWindow = isInWindow(ligne);
                  const rowClass = !inWindow 
                    ? 'bg-muted/30 opacity-60' 
                    : ligne.has_alerte 
                      ? 'bg-orange-50/50' 
                      : '';
                  
                  return (
                    <TableRow 
                      key={`${ligne.commune_code}-${ligne.perimetre_id}-${ligne.site_id}-${ligne.action_type}-${ligne.annee}-${index}`}
                      className={rowClass}
                    >
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-sm">{ligne.commune_label}</div>
                          <div className="text-xs text-muted-foreground">{ligne.perimetre_label}</div>
                          <div className="text-xs text-primary">{ligne.site_label}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {actionTypeConfig[ligne.action_type].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {ligne.annee}
                          {!inWindow && (
                            <span className="text-[10px] text-muted-foreground">(hors période)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">{ligne.quantite_prevue} {ligne.unite}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(ligne.budget_prevu)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {ligne.quantite_programmee !== null ? (
                          <>
                            <div className="text-sm">{ligne.quantite_programmee} {ligne.unite}</div>
                            <div className="text-xs text-muted-foreground">{formatCurrency(ligne.budget_programme!)}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm">{ligne.quantite_realisee} {ligne.unite}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(ligne.cout_reel)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {renderTauxBadge(ligne.taux_execution_cp, false)}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderTauxBadge(ligne.taux_execution_pdfcp, ligne.has_alerte)}
                      </TableCell>
                      <TableCell className="text-right">
                        {renderEcartBadge(ligne.ecart_budget)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDetails(ligne)}
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Details Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Détails de l'exécution</DrawerTitle>
            <DrawerDescription>
              {selectedLigne && (
                <>
                  {selectedLigne.commune_label} &gt; {selectedLigne.perimetre_label} &gt; {selectedLigne.site_label}
                  <br />
                  {actionTypeConfig[selectedLigne.action_type].label} ({selectedLigne.annee})
                </>
              )}
            </DrawerDescription>
          </DrawerHeader>
          
          {selectedLigne && (
            <div className="px-4 pb-4 space-y-4 overflow-y-auto">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Prévu PDFCP</div>
                  <div className="font-semibold">{selectedLigne.quantite_prevue} {selectedLigne.unite}</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(selectedLigne.budget_prevu)}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Programmé CP</div>
                  <div className="font-semibold">
                    {selectedLigne.quantite_programmee ?? 'N/A'} {selectedLigne.quantite_programmee ? selectedLigne.unite : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLigne.budget_programme ? formatCurrency(selectedLigne.budget_programme) : 'N/A'}
                  </div>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Réalisé</div>
                  <div className="font-semibold text-primary">{selectedLigne.quantite_realisee} {selectedLigne.unite}</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(selectedLigne.cout_reel)}</div>
                </div>
              </div>

              {/* Executions list */}
              <div>
                <h4 className="font-medium mb-2">Actions réalisées</h4>
                <div className="space-y-2">
                  {getExecutionsForLine(selectedLigne).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Aucune action réalisée</p>
                  ) : (
                    getExecutionsForLine(selectedLigne).map(exec => (
                      <div key={exec.id} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{new Date(exec.date_realisation).toLocaleDateString('fr-FR')}</span>
                          <Badge variant="outline" className={statutExecutionConfig[exec.statut].color}>
                            {statutExecutionConfig[exec.statut].label}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{exec.quantite_realisee} {selectedLigne.unite}</span>
                          <span className="text-muted-foreground"> • {formatCurrency(exec.cout_reel)}</span>
                        </div>
                        {exec.observations && (
                          <p className="text-xs text-muted-foreground mt-1">{exec.observations}</p>
                        )}
                        {exec.preuve_url && (
                          <a href={exec.preuve_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                            Voir la preuve
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Alert warning */}
              {selectedLigne.has_alerte && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium text-sm">Alerte(s) signalée(s)</span>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    {selectedLigne.alerte_ids.length} alerte(s) active(s) pour cette action.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Fermer</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {/* Close empty state wrapper */}
    </div>
  );
};

export default ComparatifTable;
