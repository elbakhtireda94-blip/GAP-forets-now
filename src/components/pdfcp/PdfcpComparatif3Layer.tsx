/**
 * Comparatif automatique Concerté vs CP vs Exécuté
 * Calcule les écarts et taux d'exécution en temps réel
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDh } from '@/lib/formatters';
import { PROGRAM_COMPONENTS_REF } from '@/data/programComponentsRef';
import { type PdfcpActionLine, calculateTaux } from '@/data/pdfcp_entry_types';
import { usePdfcpActions } from '@/hooks/usePdfcpActions';

interface PdfcpComparatif3LayerProps {
  pdfcpId: string;
  yearStart: number;
  yearEnd: number;
}

interface ComparatifRow {
  key: string;
  year: number;
  action_key: string;
  action_label: string;
  unite: string;
  perimetre: string;
  // Concerté
  concerte_qty: number;
  concerte_budget: number;
  // CP
  cp_qty: number | null;
  cp_budget: number | null;
  // Exécuté
  exec_qty: number;
  exec_budget: number;
  // Écarts
  delta_concerte_cp_budget: number | null;
  delta_cp_exec_budget: number | null;
  taux_exec: number | null;
  justification: string | null;
}

const PdfcpComparatif3Layer: React.FC<PdfcpComparatif3LayerProps> = ({
  pdfcpId,
  yearStart,
  yearEnd,
}) => {
  const { concerteLines, cpLines, executeLines } = usePdfcpActions(pdfcpId);
  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);

  const rows = useMemo((): ComparatifRow[] => {
    return concerteLines.map(cl => {
      // Match CP
      const cp = cpLines.find(c => c.source_plan_line_id === cl.id)
        || cpLines.find(c => c.action_key === cl.action_key && c.year === cl.year && c.perimetre_id === cl.perimetre_id);

      // Match Exec
      const execs = cp
        ? executeLines.filter(e => e.source_cp_line_id === cp.id)
        : [];
      const execsFallback = execs.length > 0 ? execs : executeLines.filter(e =>
        e.action_key === cl.action_key && e.year === cl.year && e.perimetre_id === cl.perimetre_id
      );

      const execQty = execsFallback.reduce((s, e) => s + e.physique, 0);
      const execBudget = execsFallback.reduce((s, e) => s + e.financier, 0);
      const cpQty = cp?.physique ?? null;
      const cpBudget = cp?.financier ?? null;

      const ref = cpBudget ?? cl.financier;

      return {
        key: cl.id,
        year: cl.year,
        action_key: cl.action_key,
        action_label: cl.action_label || cl.action_key,
        unite: cl.unite,
        perimetre: cl.perimetre_id || '-',
        concerte_qty: cl.physique,
        concerte_budget: cl.financier,
        cp_qty: cpQty,
        cp_budget: cpBudget,
        exec_qty: execQty,
        exec_budget: execBudget,
        delta_concerte_cp_budget: cpBudget !== null ? cpBudget - cl.financier : null,
        delta_cp_exec_budget: cpBudget !== null ? execBudget - cpBudget : null,
        taux_exec: ref > 0 ? Math.round((execBudget / ref) * 100) : null,
        justification: cp?.justification_ecart || null,
      };
    }).sort((a, b) => a.year - b.year || a.action_key.localeCompare(b.action_key));
  }, [concerteLines, cpLines, executeLines]);

  // Totals
  const totals = useMemo(() => ({
    concerte: rows.reduce((s, r) => s + r.concerte_budget, 0),
    cp: rows.reduce((s, r) => s + (r.cp_budget ?? 0), 0),
    exec: rows.reduce((s, r) => s + r.exec_budget, 0),
  }), [rows]);

  const tauxGlobal = totals.concerte > 0 ? Math.round((totals.exec / totals.concerte) * 100) : 0;

  const renderDelta = (delta: number | null) => {
    if (delta === null) return <span className="text-muted-foreground">—</span>;
    if (delta === 0) return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> 0</span>;
    if (delta > 0) return <span className="text-green-700 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> +{formatDh(delta)}</span>;
    return <span className="text-red-700 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {formatDh(delta)}</span>;
  };

  const renderTaux = (taux: number | null) => {
    if (taux === null) return <span className="text-muted-foreground">—</span>;
    const color = taux >= 100 ? 'text-green-700' : taux >= 75 ? 'text-blue-700' : taux >= 50 ? 'text-amber-700' : 'text-red-700';
    return <span className={`font-bold ${color}`}>{taux}%</span>;
  };

  if (concerteLines.length === 0) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Aucune ligne Concerté saisie.</p>
          <p className="text-xs mt-1">Le comparatif sera généré automatiquement.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Budget Concerté</div>
            <div className="font-semibold text-emerald-700">{formatDh(totals.concerte)}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Budget CP</div>
            <div className="font-semibold text-amber-700">{formatDh(totals.cp)}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Budget Exécuté</div>
            <div className="font-semibold text-blue-700">{formatDh(totals.exec)}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Taux Exécution</div>
            <div className={`font-bold text-lg ${tauxGlobal >= 75 ? 'text-green-700' : tauxGlobal >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
              {tauxGlobal}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Comparatif Concerté / CP / Exécuté ({rows.length} lignes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Année</TableHead>
                  <TableHead className="text-xs">Composante</TableHead>
                  <TableHead className="text-xs text-right">Concerté</TableHead>
                  <TableHead className="text-xs text-right">CP</TableHead>
                  <TableHead className="text-xs text-right">Exécuté</TableHead>
                  <TableHead className="text-xs text-center">Δ Conc→CP</TableHead>
                  <TableHead className="text-xs text-center">Δ CP→Exec</TableHead>
                  <TableHead className="text-xs text-center">% Exec</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-xs">{row.year}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{row.action_label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <div>{row.concerte_qty.toLocaleString()} {row.unite}</div>
                      <div className="text-muted-foreground">{formatDh(row.concerte_budget)}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {row.cp_qty !== null ? (
                        <div>
                          <div className="text-amber-700">{row.cp_qty.toLocaleString()} {row.unite}</div>
                          <div className="text-muted-foreground">{formatDh(row.cp_budget!)}</div>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {row.exec_qty > 0 ? (
                        <div>
                          <div className="text-blue-700">{row.exec_qty.toLocaleString()} {row.unite}</div>
                          <div className="text-muted-foreground">{formatDh(row.exec_budget)}</div>
                        </div>
                      ) : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-center text-xs">{renderDelta(row.delta_concerte_cp_budget)}</TableCell>
                    <TableCell className="text-center text-xs">{renderDelta(row.delta_cp_exec_budget)}</TableCell>
                    <TableCell className="text-center text-xs">{renderTaux(row.taux_exec)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Résumé par année */}
          <div className="mt-4 border-t pt-3">
            <h4 className="text-xs font-medium mb-2">Résumé budgétaire par année</h4>
            <div className="flex flex-wrap gap-2">
              {years.map(year => {
                const yearRows = rows.filter(r => r.year === year);
                if (yearRows.length === 0) return null;
                const cB = yearRows.reduce((s, r) => s + r.concerte_budget, 0);
                const cpB = yearRows.reduce((s, r) => s + (r.cp_budget ?? 0), 0);
                const eB = yearRows.reduce((s, r) => s + r.exec_budget, 0);
                return (
                  <div key={year} className="bg-muted/50 rounded-lg px-3 py-2 text-xs">
                    <div className="font-medium mb-1">{year}</div>
                    <div className="text-emerald-700">Concerté: {formatDh(cB)}</div>
                    <div className="text-amber-700">CP: {formatDh(cpB)}</div>
                    <div className="text-blue-700">Exec: {formatDh(eB)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfcpComparatif3Layer;
