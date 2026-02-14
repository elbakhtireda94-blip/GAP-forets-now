/**
 * PdfcpSyntheseTable — Tableau de synthèse Physique & Financière
 * 
 * Vue institutionnelle non éditable, structurée par composante et par année.
 * Couvre les 3 états : PDFCP (Plan concerté), CP, Exécution + Écarts.
 * Mise à jour automatique depuis les lignes programmées.
 */

import React, { useMemo } from 'react';
import { AlertTriangle, Table2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { PdfcpLignePrevue, PdfcpLigneCP, PdfcpActionExec } from '@/contexts/DatabaseContext';
import { actionTypeConfig, ActionType } from '@/data/comparatifTypes';
import { formatDh, formatNumber } from '@/lib/formatters';

interface PdfcpSyntheseTableProps {
  lignesPrevues: PdfcpLignePrevue[];
  lignesCp: PdfcpLigneCP[];
  lignesExec: PdfcpActionExec[];
  yearStart: number;
  yearEnd: number;
}

// One cell of aggregated data for a (composante, year, layer) combination
interface LayerData {
  qty: number;
  budget: number;
}

// A row in the synthesis table: one composante across all years
interface SyntheseRow {
  actionType: string;
  label: string;
  unite: string;
  byYear: Record<number, {
    plan: LayerData;
    cp: LayerData;
    exec: LayerData;
  }>;
  total: {
    plan: LayerData;
    cp: LayerData;
    exec: LayerData;
  };
}

const EMPTY_LAYER: LayerData = { qty: 0, budget: 0 };

const PdfcpSyntheseTable: React.FC<PdfcpSyntheseTableProps> = ({
  lignesPrevues,
  lignesCp,
  lignesExec,
  yearStart,
  yearEnd,
}) => {
  const years = useMemo(
    () => Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i),
    [yearStart, yearEnd]
  );

  // Build synthesis rows grouped by action_type
  const { rows, grandTotal } = useMemo(() => {
    // Collect all action types from all 3 layers
    const actionTypes = new Set<string>();
    lignesPrevues.forEach(l => actionTypes.add(l.action_type));
    lignesCp.forEach(l => actionTypes.add(l.action_type));
    lignesExec.forEach(l => actionTypes.add(l.action_type));

    // Determine unite per action type from any available line
    const uniteMap = new Map<string, string>();
    [...lignesPrevues, ...lignesCp, ...lignesExec].forEach((l: any) => {
      if (l.action_type && l.unite && !uniteMap.has(l.action_type)) {
        uniteMap.set(l.action_type, l.unite);
      }
    });

    const builtRows: SyntheseRow[] = Array.from(actionTypes).sort().map(actionType => {
      const byYear: SyntheseRow['byYear'] = {};
      const total = {
        plan: { qty: 0, budget: 0 },
        cp: { qty: 0, budget: 0 },
        exec: { qty: 0, budget: 0 },
      };

      years.forEach(year => {
        // Plan lines for this action_type + year
        const planLines = lignesPrevues.filter(l => l.action_type === actionType && l.annee === year);
        const planQty = planLines.reduce((s, l) => s + l.quantite_physique, 0);
        const planBudget = planLines.reduce((s, l) => s + l.budget_prevu_dh, 0);

        // CP lines for this action_type + year
        const cpLines = lignesCp.filter(l => l.action_type === actionType && l.annee === year);
        const cpQty = cpLines.reduce((s, l) => s + l.quantite_programmee, 0);
        const cpBudget = cpLines.reduce((s, l) => s + l.budget_programme_dh, 0);

        // Exec lines for this action_type + year
        const execLines = lignesExec.filter(l => l.action_type === actionType && l.annee === year);
        const execQty = execLines.reduce((s, l) => s + l.quantite_realisee, 0);
        const execBudget = execLines.reduce((s, l) => s + l.cout_reel_dh, 0);

        byYear[year] = {
          plan: { qty: planQty, budget: planBudget },
          cp: { qty: cpQty, budget: cpBudget },
          exec: { qty: execQty, budget: execBudget },
        };

        total.plan.qty += planQty;
        total.plan.budget += planBudget;
        total.cp.qty += cpQty;
        total.cp.budget += cpBudget;
        total.exec.qty += execQty;
        total.exec.budget += execBudget;
      });

      return {
        actionType,
        label: actionTypeConfig[actionType as ActionType]?.label || actionType,
        unite: uniteMap.get(actionType) || 'u',
        byYear,
        total,
      };
    });

    // Grand total across all composantes
    const grandTotal = {
      byYear: {} as Record<number, { plan: LayerData; cp: LayerData; exec: LayerData }>,
      total: {
        plan: { qty: 0, budget: 0 },
        cp: { qty: 0, budget: 0 },
        exec: { qty: 0, budget: 0 },
      },
    };

    years.forEach(year => {
      const yearData = {
        plan: { qty: 0, budget: 0 },
        cp: { qty: 0, budget: 0 },
        exec: { qty: 0, budget: 0 },
      };
      builtRows.forEach(row => {
        const yd = row.byYear[year];
        if (yd) {
          yearData.plan.qty += yd.plan.qty;
          yearData.plan.budget += yd.plan.budget;
          yearData.cp.qty += yd.cp.qty;
          yearData.cp.budget += yd.cp.budget;
          yearData.exec.qty += yd.exec.qty;
          yearData.exec.budget += yd.exec.budget;
        }
      });
      grandTotal.byYear[year] = yearData;
    });

    builtRows.forEach(row => {
      grandTotal.total.plan.qty += row.total.plan.qty;
      grandTotal.total.plan.budget += row.total.plan.budget;
      grandTotal.total.cp.qty += row.total.cp.qty;
      grandTotal.total.cp.budget += row.total.cp.budget;
      grandTotal.total.exec.qty += row.total.exec.qty;
      grandTotal.total.exec.budget += row.total.exec.budget;
    });

    return { rows: builtRows, grandTotal };
  }, [lignesPrevues, lignesCp, lignesExec, years]);

  // Render helpers
  const renderDelta = (val: number) => {
    if (val === 0) return <span className="text-muted-foreground">—</span>;
    const color = val > 0 ? 'text-green-700' : 'text-red-700';
    const sign = val > 0 ? '+' : '';
    return <span className={`font-medium ${color}`}>{sign}{formatNumber(val)}</span>;
  };

  const renderDeltaDh = (val: number) => {
    if (val === 0) return <span className="text-muted-foreground">—</span>;
    const color = val > 0 ? 'text-green-700' : 'text-red-700';
    const sign = val > 0 ? '+' : '';
    return <span className={`font-medium ${color}`}>{sign}{formatDh(val)}</span>;
  };

  const renderTaux = (realise: number, reference: number) => {
    if (reference === 0) return <span className="text-muted-foreground">—</span>;
    const taux = Math.round((realise / reference) * 100);
    let color = 'text-red-700';
    if (taux >= 100) color = 'text-green-700';
    else if (taux >= 75) color = 'text-blue-700';
    else if (taux >= 50) color = 'text-amber-700';
    return <span className={`font-bold ${color}`}>{taux}%</span>;
  };

  if (lignesPrevues.length === 0 && lignesCp.length === 0 && lignesExec.length === 0) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Aucune donnée disponible.</p>
          <p className="text-xs mt-1">Saisissez des lignes dans les onglets Plan, CP ou Exécution.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with KPI badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className="text-xs gap-1">
          {rows.length} composante{rows.length > 1 ? 's' : ''}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
          Plan: {formatDh(grandTotal.total.plan.budget)}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700">
          CP: {formatDh(grandTotal.total.cp.budget)}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1 border-green-300 text-green-700">
          Exécuté: {formatDh(grandTotal.total.exec.budget)}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1">
          Taux Exec: {renderTaux(grandTotal.total.exec.budget, grandTotal.total.plan.budget)}
        </Badge>
      </div>

      {/* Main synthesis table */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" />
            Synthèse Physique & Financière — PDFCP / CP / Exécution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Level 1: Year groups */}
                <TableRow className="bg-muted/30">
                  <TableHead rowSpan={2} className="text-xs font-bold border-r sticky left-0 bg-muted/30 min-w-[140px]">
                    Composante
                  </TableHead>
                  {years.map(year => (
                    <TableHead
                      key={year}
                      colSpan={8}
                      className="text-center text-xs font-bold border-x bg-muted/50"
                    >
                      {year}
                    </TableHead>
                  ))}
                  <TableHead colSpan={8} className="text-center text-xs font-bold border-x bg-primary/10">
                    TOTAL
                  </TableHead>
                </TableRow>
                {/* Level 2: Sub-columns per year */}
                <TableRow className="bg-muted/20">
                  {[...years, 'TOTAL'].map((yearKey) => (
                    <React.Fragment key={`sub-${yearKey}`}>
                      <TableHead className="text-[10px] text-center px-1 min-w-[50px] bg-primary/5">P. Qty</TableHead>
                      <TableHead className="text-[10px] text-center px-1 min-w-[70px] bg-primary/5">P. Budget</TableHead>
                      <TableHead className="text-[10px] text-center px-1 min-w-[50px] bg-blue-50 dark:bg-blue-900/10">CP Qty</TableHead>
                      <TableHead className="text-[10px] text-center px-1 min-w-[70px] bg-blue-50 dark:bg-blue-900/10">CP Budget</TableHead>
                      <TableHead className="text-[10px] text-center px-1 min-w-[50px] bg-green-50 dark:bg-green-900/10">Ex. Qty</TableHead>
                      <TableHead className="text-[10px] text-center px-1 min-w-[70px] bg-green-50 dark:bg-green-900/10">Ex. Budget</TableHead>
                      <TableHead className="text-[10px] text-center px-1 min-w-[55px] bg-amber-50/50 dark:bg-amber-900/10">Δ CP–P</TableHead>
                      <TableHead className="text-[10px] text-center px-1 min-w-[55px] bg-orange-50/50 dark:bg-orange-900/10 border-r">Δ Ex–CP</TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.actionType} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium border-r sticky left-0 bg-background">
                      <div className="flex flex-col">
                        <span>{row.label}</span>
                        <span className="text-[10px] text-muted-foreground">({row.unite})</span>
                      </div>
                    </TableCell>
                    {years.map(year => {
                      const yd = row.byYear[year] || { plan: EMPTY_LAYER, cp: EMPTY_LAYER, exec: EMPTY_LAYER };
                      const deltaCpPlan = yd.cp.budget - yd.plan.budget;
                      const deltaExecCp = yd.exec.budget - yd.cp.budget;
                      return (
                        <React.Fragment key={year}>
                          <TableCell className="text-center text-xs px-1 bg-primary/[0.02]">
                            {yd.plan.qty > 0 ? formatNumber(yd.plan.qty) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-[10px] px-1 bg-primary/[0.02]">
                            {yd.plan.budget > 0 ? formatDh(yd.plan.budget) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-xs px-1 bg-blue-50/30 dark:bg-blue-900/5">
                            {yd.cp.qty > 0 ? <span className="text-blue-700">{formatNumber(yd.cp.qty)}</span> : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-[10px] px-1 bg-blue-50/30 dark:bg-blue-900/5">
                            {yd.cp.budget > 0 ? <span className="text-blue-700">{formatDh(yd.cp.budget)}</span> : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-xs px-1 bg-green-50/30 dark:bg-green-900/5">
                            {yd.exec.qty > 0 ? <span className="text-green-700">{formatNumber(yd.exec.qty)}</span> : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-[10px] px-1 bg-green-50/30 dark:bg-green-900/5">
                            {yd.exec.budget > 0 ? <span className="text-green-700">{formatDh(yd.exec.budget)}</span> : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-[10px] px-1 bg-amber-50/20 dark:bg-amber-900/5">
                            {(yd.plan.budget > 0 || yd.cp.budget > 0) ? renderDeltaDh(deltaCpPlan) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-[10px] px-1 bg-orange-50/20 dark:bg-orange-900/5 border-r">
                            {(yd.cp.budget > 0 || yd.exec.budget > 0) ? renderDeltaDh(deltaExecCp) : <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}
                    {/* TOTAL column for this composante */}
                    {(() => {
                      const t = row.total;
                      return (
                        <React.Fragment>
                          <TableCell className="text-center text-xs px-1 font-semibold bg-primary/5">{formatNumber(t.plan.qty)}</TableCell>
                          <TableCell className="text-center text-[10px] px-1 font-semibold bg-primary/5">{formatDh(t.plan.budget)}</TableCell>
                          <TableCell className="text-center text-xs px-1 font-semibold text-blue-700 bg-blue-50/40">{formatNumber(t.cp.qty)}</TableCell>
                          <TableCell className="text-center text-[10px] px-1 font-semibold text-blue-700 bg-blue-50/40">{formatDh(t.cp.budget)}</TableCell>
                          <TableCell className="text-center text-xs px-1 font-semibold text-green-700 bg-green-50/40">{formatNumber(t.exec.qty)}</TableCell>
                          <TableCell className="text-center text-[10px] px-1 font-semibold text-green-700 bg-green-50/40">{formatDh(t.exec.budget)}</TableCell>
                          <TableCell className="text-center text-[10px] px-1 bg-amber-50/30">{renderDeltaDh(t.cp.budget - t.plan.budget)}</TableCell>
                          <TableCell className="text-center text-[10px] px-1 bg-orange-50/30 border-r">{renderDeltaDh(t.exec.budget - t.cp.budget)}</TableCell>
                        </React.Fragment>
                      );
                    })()}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                {/* Grand total row */}
                <TableRow className="bg-muted/60 font-bold">
                  <TableCell className="text-xs font-bold border-r sticky left-0 bg-muted/60">
                    TOTAL GÉNÉRAL
                  </TableCell>
                  {years.map(year => {
                    const yd = grandTotal.byYear[year] || { plan: EMPTY_LAYER, cp: EMPTY_LAYER, exec: EMPTY_LAYER };
                    return (
                      <React.Fragment key={`total-${year}`}>
                        <TableCell className="text-center text-xs px-1 font-bold">{formatNumber(yd.plan.qty)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 font-bold">{formatDh(yd.plan.budget)}</TableCell>
                        <TableCell className="text-center text-xs px-1 font-bold text-blue-700">{formatNumber(yd.cp.qty)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 font-bold text-blue-700">{formatDh(yd.cp.budget)}</TableCell>
                        <TableCell className="text-center text-xs px-1 font-bold text-green-700">{formatNumber(yd.exec.qty)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 font-bold text-green-700">{formatDh(yd.exec.budget)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1">{renderDeltaDh(yd.cp.budget - yd.plan.budget)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 border-r">{renderDeltaDh(yd.exec.budget - yd.cp.budget)}</TableCell>
                      </React.Fragment>
                    );
                  })}
                  {/* Grand total - TOTAL column */}
                  {(() => {
                    const gt = grandTotal.total;
                    return (
                      <React.Fragment>
                        <TableCell className="text-center text-xs px-1 font-bold">{formatNumber(gt.plan.qty)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 font-bold">{formatDh(gt.plan.budget)}</TableCell>
                        <TableCell className="text-center text-xs px-1 font-bold text-blue-700">{formatNumber(gt.cp.qty)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 font-bold text-blue-700">{formatDh(gt.cp.budget)}</TableCell>
                        <TableCell className="text-center text-xs px-1 font-bold text-green-700">{formatNumber(gt.exec.qty)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 font-bold text-green-700">{formatDh(gt.exec.budget)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1">{renderDeltaDh(gt.cp.budget - gt.plan.budget)}</TableCell>
                        <TableCell className="text-center text-[10px] px-1 border-r">{renderDeltaDh(gt.exec.budget - gt.cp.budget)}</TableCell>
                      </React.Fragment>
                    );
                  })()}
                </TableRow>
                {/* Taux d'exécution row */}
                <TableRow className="bg-muted/40">
                  <TableCell className="text-xs font-medium border-r sticky left-0 bg-muted/40">
                    Taux d'exécution
                  </TableCell>
                  {years.map(year => {
                    const yd = grandTotal.byYear[year] || { plan: EMPTY_LAYER, cp: EMPTY_LAYER, exec: EMPTY_LAYER };
                    return (
                      <React.Fragment key={`taux-${year}`}>
                        <TableCell colSpan={2} className="text-center text-xs px-1">
                          {renderTaux(yd.exec.budget, yd.plan.budget)}
                          <span className="text-[9px] text-muted-foreground ml-1">vs Plan</span>
                        </TableCell>
                        <TableCell colSpan={2} className="text-center text-xs px-1">
                          {renderTaux(yd.exec.budget, yd.cp.budget)}
                          <span className="text-[9px] text-muted-foreground ml-1">vs CP</span>
                        </TableCell>
                        <TableCell colSpan={4} className="border-r" />
                      </React.Fragment>
                    );
                  })}
                  {/* Grand total taux */}
                  <TableCell colSpan={2} className="text-center text-xs px-1">
                    {renderTaux(grandTotal.total.exec.budget, grandTotal.total.plan.budget)}
                    <span className="text-[9px] text-muted-foreground ml-1">vs Plan</span>
                  </TableCell>
                  <TableCell colSpan={2} className="text-center text-xs px-1">
                    {renderTaux(grandTotal.total.exec.budget, grandTotal.total.cp.budget)}
                    <span className="text-[9px] text-muted-foreground ml-1">vs CP</span>
                  </TableCell>
                  <TableCell colSpan={4} className="border-r" />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfcpSyntheseTable;
