import React, { useState, useMemo, useCallback } from 'react';
import { Filter, RotateCcw, Download, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { ACTION_CATALOG, getActionLabel, getActionUnite } from '@/data/pdfcp_actions_catalog';
import actionsData from '@/data/pdfcp_actions_prevues.json';
import zonesData from '@/data/zones.json';

interface ActionPrevue {
  id: string;
  pdfcpId: string;
  commune_code: string;
  perimetre_id: string;
  site_id: string;
  action_type: string;
  annee: number;
  unite: string;
  physique_prevu: number;
  financier_prevu: number;
}

interface PdfcpActionsPrevuesTableProps {
  pdfcpId: string;
  yearStart: number;
  yearEnd: number;
  communeCode: string;
}

const PdfcpActionsPrevuesTable: React.FC<PdfcpActionsPrevuesTableProps> = ({
  pdfcpId,
  yearStart,
  yearEnd,
  communeCode,
}) => {
  // State for filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterYears, setFilterYears] = useState<number[]>([]);
  const [filterActions, setFilterActions] = useState<string[]>([]);
  const [filterPerimetre, setFilterPerimetre] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');

  // State for editable data (local copy)
  const [localData, setLocalData] = useState<ActionPrevue[]>(
    (actionsData as ActionPrevue[]).filter(a => a.pdfcpId === pdfcpId)
  );

  // Generate year range
  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = yearStart; y <= yearEnd; y++) {
      result.push(y);
    }
    return result;
  }, [yearStart, yearEnd]);

  // Get unique perimetres and sites from data
  const perimetres = useMemo(() => {
    const uniquePerimetres = [...new Set(localData.map(a => a.perimetre_id))];
    return uniquePerimetres;
  }, [localData]);

  const sites = useMemo(() => {
    let filteredData = localData;
    if (filterPerimetre !== 'all') {
      filteredData = localData.filter(a => a.perimetre_id === filterPerimetre);
    }
    return [...new Set(filteredData.map(a => a.site_id))];
  }, [localData, filterPerimetre]);

  // Get perimetre and site labels from zones data
  const getPerimetreLabel = (perimetreId: string): string => {
    for (const zone of zonesData as any[]) {
      for (const perimetre of zone.perimetres || []) {
        if (perimetre.id === perimetreId) return perimetre.nom;
      }
    }
    return perimetreId;
  };

  const getSiteLabel = (siteId: string): string => {
    for (const zone of zonesData as any[]) {
      for (const perimetre of zone.perimetres || []) {
        for (const site of perimetre.sites || []) {
          if (site.id === siteId) return site.nom;
        }
      }
    }
    return siteId;
  };

  // Filter data
  const filteredData = useMemo(() => {
    let data = localData;

    if (filterYears.length > 0) {
      data = data.filter(a => filterYears.includes(a.annee));
    }

    if (filterActions.length > 0) {
      data = data.filter(a => filterActions.includes(a.action_type));
    }

    if (filterPerimetre !== 'all') {
      data = data.filter(a => a.perimetre_id === filterPerimetre);
    }

    if (filterSite !== 'all') {
      data = data.filter(a => a.site_id === filterSite);
    }

    return data;
  }, [localData, filterYears, filterActions, filterPerimetre, filterSite]);

  // Build pivot table structure: action -> year -> {physique, financier}
  const pivotData = useMemo(() => {
    const pivot: Record<string, Record<number, { physique: number; financier: number; id?: string }>> = {};

    // Initialize with all actions from catalog
    ACTION_CATALOG.forEach(action => {
      pivot[action.key] = {};
      years.forEach(year => {
        pivot[action.key][year] = { physique: 0, financier: 0 };
      });
    });

    // Fill with actual data
    filteredData.forEach(item => {
      if (!pivot[item.action_type]) {
        pivot[item.action_type] = {};
      }
      pivot[item.action_type][item.annee] = {
        physique: item.physique_prevu,
        financier: item.financier_prevu,
        id: item.id,
      };
    });

    return pivot;
  }, [filteredData, years]);

  // Calculate totals
  const totals = useMemo(() => {
    const result: Record<number, { physique: number; financier: number }> = {};
    years.forEach(year => {
      result[year] = { physique: 0, financier: 0 };
    });

    Object.values(pivotData).forEach(yearData => {
      Object.entries(yearData).forEach(([year, values]) => {
        const y = parseInt(year);
        if (result[y]) {
          result[y].physique += values.physique;
          result[y].financier += values.financier;
        }
      });
    });

    return result;
  }, [pivotData, years]);

  // Grand total
  const grandTotal = useMemo(() => {
    return Object.values(totals).reduce(
      (acc, curr) => ({
        physique: acc.physique + curr.physique,
        financier: acc.financier + curr.financier,
      }),
      { physique: 0, financier: 0 }
    );
  }, [totals]);

  // Handle cell edit
  const handleCellEdit = useCallback(
    (actionKey: string, year: number, field: 'physique' | 'financier', value: string) => {
      const numValue = parseFloat(value) || 0;
      if (numValue < 0) {
        toast({
          title: 'Erreur',
          description: 'La valeur ne peut pas être négative',
          variant: 'destructive',
        });
        return;
      }

      setLocalData(prev => {
        const existing = prev.find(
          a => a.action_type === actionKey && a.annee === year && a.pdfcpId === pdfcpId
        );

        if (existing) {
          return prev.map(a =>
            a.id === existing.id
              ? {
                  ...a,
                  [field === 'physique' ? 'physique_prevu' : 'financier_prevu']: numValue,
                }
              : a
          );
        } else {
          // Create new entry
          const newId = `AP-${Date.now()}`;
          const action = ACTION_CATALOG.find(a => a.key === actionKey);
          return [
            ...prev,
            {
              id: newId,
              pdfcpId,
              commune_code: communeCode,
              perimetre_id: filterPerimetre !== 'all' ? filterPerimetre : perimetres[0] || 'PER-NEW',
              site_id: filterSite !== 'all' ? filterSite : sites[0] || 'S-NEW',
              action_type: actionKey,
              annee: year,
              unite: action?.uniteDefault || 'unité',
              physique_prevu: field === 'physique' ? numValue : 0,
              financier_prevu: field === 'financier' ? numValue : 0,
            },
          ];
        }
      });

      toast({
        title: 'Enregistré',
        description: `${getActionLabel(actionKey)} ${year} mis à jour`,
      });
    },
    [pdfcpId, communeCode, filterPerimetre, filterSite, perimetres, sites]
  );

  // Reset filters
  const resetFilters = () => {
    setFilterYears([]);
    setFilterActions([]);
    setFilterPerimetre('all');
    setFilterSite('all');
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Action', 'Unité', ...years.flatMap(y => [`${y} Physique`, `${y} Financier`])];
    const rows = ACTION_CATALOG.filter(action => 
      Object.values(pivotData[action.key] || {}).some(v => v.physique > 0 || v.financier > 0)
    ).map(action => {
      const row = [getActionLabel(action.key), action.uniteDefault];
      years.forEach(year => {
        const data = pivotData[action.key]?.[year] || { physique: 0, financier: 0 };
        row.push(data.physique.toString(), data.financier.toString());
      });
      return row;
    });

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `actions_prevues_${pdfcpId}.csv`;
    link.click();

    toast({
      title: 'Export réussi',
      description: 'Le fichier CSV a été téléchargé',
    });
  };

  // Filtered years for display
  const displayYears = filterYears.length > 0 ? years.filter(y => filterYears.includes(y)) : years;

  // Check if any action has data
  const hasData = Object.values(pivotData).some(yearData =>
    Object.values(yearData).some(v => v.physique > 0 || v.financier > 0)
  );

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Actions Prévues PDFCP
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Exporter
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres
                {(filterYears.length > 0 || filterActions.length > 0 || filterPerimetre !== 'all' || filterSite !== 'all') && (
                  <Badge variant="secondary" className="ml-2">Actifs</Badge>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Year filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Années
                </label>
                <Select
                  value={filterYears.length === 1 ? filterYears[0].toString() : 'all'}
                  onValueChange={(v) => setFilterYears(v === 'all' ? [] : [parseInt(v)])}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Toutes les années" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les années</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Actions
                </label>
                <Select
                  value={filterActions.length === 1 ? filterActions[0] : 'all'}
                  onValueChange={(v) => setFilterActions(v === 'all' ? [] : [v])}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Toutes les actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    {ACTION_CATALOG.map(action => (
                      <SelectItem key={action.key} value={action.key}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Perimetre filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Périmètre
                </label>
                <Select value={filterPerimetre} onValueChange={setFilterPerimetre}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les périmètres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les périmètres</SelectItem>
                    {perimetres.map(p => (
                      <SelectItem key={p} value={p}>
                        {getPerimetreLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Site filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Site
                </label>
                <Select value={filterSite} onValueChange={setFilterSite}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Tous les sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les sites</SelectItem>
                    {sites.map(s => (
                      <SelectItem key={s} value={s}>
                        {getSiteLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Table */}
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead rowSpan={2} className="min-w-[180px] border-r bg-muted font-semibold">
                  Action
                </TableHead>
                <TableHead rowSpan={2} className="w-[60px] text-center border-r bg-muted font-semibold">
                  Unité
                </TableHead>
                {displayYears.map(year => (
                  <TableHead key={year} colSpan={2} className="text-center border-r bg-muted font-semibold">
                    {year}
                  </TableHead>
                ))}
                <TableHead colSpan={2} className="text-center bg-primary/10 font-semibold">
                  Total
                </TableHead>
              </TableRow>
              <TableRow>
                {displayYears.map(year => (
                  <React.Fragment key={`sub-${year}`}>
                    <TableHead className="text-center text-xs w-[90px] border-r bg-muted/60">
                      Physique
                    </TableHead>
                    <TableHead className="text-center text-xs w-[100px] border-r bg-muted/60">
                      Financier (DH)
                    </TableHead>
                  </React.Fragment>
                ))}
                <TableHead className="text-center text-xs w-[90px] bg-primary/5">
                  Physique
                </TableHead>
                <TableHead className="text-center text-xs w-[100px] bg-primary/5">
                  Financier (DH)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTION_CATALOG.map((action, idx) => {
                const actionData = pivotData[action.key] || {};
                const rowTotal = displayYears.reduce(
                  (acc, year) => ({
                    physique: acc.physique + (actionData[year]?.physique || 0),
                    financier: acc.financier + (actionData[year]?.financier || 0),
                  }),
                  { physique: 0, financier: 0 }
                );

                // Skip empty rows if filtering
                if (filterActions.length > 0 && !filterActions.includes(action.key)) {
                  return null;
                }

                return (
                  <TableRow key={action.key} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <TableCell className="font-medium border-r">
                      {action.label}
                    </TableCell>
                    <TableCell className="text-center border-r">
                      <Badge variant="outline" className="text-xs">
                        {action.uniteDefault}
                      </Badge>
                    </TableCell>
                    {displayYears.map(year => {
                      const yearData = actionData[year] || { physique: 0, financier: 0 };
                      return (
                        <React.Fragment key={`${action.key}-${year}`}>
                          <TableCell className="p-1 border-r">
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              className="h-8 text-center text-sm"
                              defaultValue={yearData.physique || ''}
                              placeholder="0"
                              onBlur={(e) => handleCellEdit(action.key, year, 'physique', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="p-1 border-r">
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              className="h-8 text-center text-sm"
                              defaultValue={yearData.financier || ''}
                              placeholder="0"
                              onBlur={(e) => handleCellEdit(action.key, year, 'financier', e.target.value)}
                            />
                          </TableCell>
                        </React.Fragment>
                      );
                    })}
                    <TableCell className="text-center font-medium bg-primary/5">
                      {rowTotal.physique > 0 ? rowTotal.physique.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-center font-medium bg-primary/5">
                      {rowTotal.financier > 0 ? rowTotal.financier.toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Total row */}
              <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/30">
                <TableCell colSpan={2} className="text-right border-r">
                  TOTAL
                </TableCell>
                {displayYears.map(year => (
                  <React.Fragment key={`total-${year}`}>
                    <TableCell className="text-center border-r">
                      {totals[year]?.physique > 0 ? totals[year].physique.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-center border-r">
                      {totals[year]?.financier > 0 ? totals[year].financier.toLocaleString() : '-'}
                    </TableCell>
                  </React.Fragment>
                ))}
                <TableCell className="text-center bg-primary/20">
                  {grandTotal.physique > 0 ? grandTotal.physique.toLocaleString() : '-'}
                </TableCell>
                <TableCell className="text-center bg-primary/20">
                  {grandTotal.financier > 0 ? grandTotal.financier.toLocaleString() : '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {!hasData && (
          <p className="text-center text-muted-foreground text-sm py-4">
            Aucune donnée saisie. Commencez par remplir les valeurs physiques et financières.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfcpActionsPrevuesTable;
