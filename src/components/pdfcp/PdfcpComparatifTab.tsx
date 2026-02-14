/**
 * PdfcpComparatifTab — Comparaison automatique Plan concerté vs CP vs Exécution
 * 
 * Affiche les écarts (Δ quantité, Δ budget) et statuts par ligne (accepté/ajusté/reporté/rejeté)
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
import { PdfcpLignePrevue, PdfcpLigneCP, PdfcpActionExec, StatutLigneCp } from '@/contexts/DatabaseContext';
import { actionTypeConfig, ActionType } from '@/data/comparatifTypes';
import { formatDh } from '@/lib/formatters';

interface PdfcpComparatifTabProps {
  lignesPrevues: PdfcpLignePrevue[];
  lignesCp: PdfcpLigneCP[];
  lignesExec: PdfcpActionExec[];
  yearStart: number;
  yearEnd: number;
}

interface ComparatifRow {
  id: string;
  annee: number;
  action_type: string;
  unite: string;
  perimetre: string;
  site: string;
  // Plan
  plan_quantite: number;
  plan_budget: number;
  // CP
  cp_quantite: number | null;
  cp_budget: number | null;
  cp_statut: StatutLigneCp | undefined;
  cp_motif: string | undefined;
  // Exécution
  exec_quantite: number;
  exec_budget: number;
  // Écarts
  delta_plan_cp_qty: number | null;
  delta_plan_cp_budget: number | null;
  delta_cp_exec_qty: number | null;
  delta_cp_exec_budget: number | null;
  taux_exec_plan: number | null;
  taux_exec_cp: number | null;
}

const STATUT_CONFIG: Record<StatutLigneCp, { label: string; className: string }> = {
  accepte: { label: 'Accepté', className: 'bg-green-100 text-green-800 border-green-200' },
  ajuste: { label: 'Ajusté', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  reporte: { label: 'Reporté', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  rejete: { label: 'Rejeté', className: 'bg-red-100 text-red-800 border-red-200' },
};

const PdfcpComparatifTab: React.FC<PdfcpComparatifTabProps> = ({
  lignesPrevues,
  lignesCp,
  lignesExec,
  yearStart,
  yearEnd,
}) => {
  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);

  // Build comparatif rows from Plan lines as base
  const rows = useMemo((): ComparatifRow[] => {
    return lignesPrevues.map(plan => {
      // Find linked CP line
      const cp = lignesCp.find(c => c.source_plan_line_id === plan.id)
        || lignesCp.find(c =>
          c.annee === plan.annee &&
          c.action_type === plan.action_type &&
          c.perimetre_label === plan.perimetre_label &&
          c.site_label === plan.site_label
        );

      // Find linked Exec lines
      const execs = cp
        ? lignesExec.filter(e => e.source_cp_line_id === cp.id)
        : [];
      // Fallback match
      const execsFallback = execs.length > 0 ? execs : lignesExec.filter(e =>
        e.annee === plan.annee &&
        e.action_type === plan.action_type &&
        e.perimetre_label === plan.perimetre_label &&
        e.site_label === plan.site_label
      );

      const execQty = execsFallback.reduce((s, e) => s + e.quantite_realisee, 0);
      const execBudget = execsFallback.reduce((s, e) => s + e.cout_reel_dh, 0);

      const cpQty = cp?.quantite_programmee ?? null;
      const cpBudget = cp?.budget_programme_dh ?? null;

      return {
        id: plan.id,
        annee: plan.annee,
        action_type: plan.action_type,
        unite: plan.unite,
        perimetre: plan.perimetre_label || '-',
        site: plan.site_label || '-',
        plan_quantite: plan.quantite_physique,
        plan_budget: plan.budget_prevu_dh,
        cp_quantite: cpQty,
        cp_budget: cpBudget,
        cp_statut: cp?.statut_ligne,
        cp_motif: cp?.motif_ajustement,
        exec_quantite: execQty,
        exec_budget: execBudget,
        delta_plan_cp_qty: cpQty !== null ? cpQty - plan.quantite_physique : null,
        delta_plan_cp_budget: cpBudget !== null ? cpBudget - plan.budget_prevu_dh : null,
        delta_cp_exec_qty: cpQty !== null ? execQty - cpQty : null,
        delta_cp_exec_budget: cpBudget !== null ? execBudget - cpBudget : null,
        taux_exec_plan: plan.quantite_physique > 0
          ? Math.round((execQty / plan.quantite_physique) * 100) : null,
        taux_exec_cp: cpQty && cpQty > 0
          ? Math.round((execQty / cpQty) * 100) : null,
      };
    }).sort((a, b) => a.annee - b.annee || a.action_type.localeCompare(b.action_type));
  }, [lignesPrevues, lignesCp, lignesExec]);

  // Summary totals
  const totals = useMemo(() => {
    const totalPlanBudget = rows.reduce((s, r) => s + r.plan_budget, 0);
    const totalCpBudget = rows.reduce((s, r) => s + (r.cp_budget ?? 0), 0);
    const totalExecBudget = rows.reduce((s, r) => s + r.exec_budget, 0);
    const nbAccepte = rows.filter(r => r.cp_statut === 'accepte').length;
    const nbAjuste = rows.filter(r => r.cp_statut === 'ajuste').length;
    const nbReporte = rows.filter(r => r.cp_statut === 'reporte').length;
    const nbRejete = rows.filter(r => r.cp_statut === 'rejete').length;
    const tauxExecGlobal = totalPlanBudget > 0
      ? Math.round((totalExecBudget / totalPlanBudget) * 100) : 0;
    return { totalPlanBudget, totalCpBudget, totalExecBudget, nbAccepte, nbAjuste, nbReporte, nbRejete, tauxExecGlobal };
  }, [rows]);

  const renderDelta = (delta: number | null) => {
    if (delta === null) return <span className="text-muted-foreground">—</span>;
    if (delta === 0) return <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" /> 0</span>;
    if (delta > 0) return <span className="flex items-center gap-1 text-green-700"><TrendingUp className="h-3 w-3" /> +{delta.toLocaleString()}</span>;
    return <span className="flex items-center gap-1 text-red-700"><TrendingDown className="h-3 w-3" /> {delta.toLocaleString()}</span>;
  };

  const renderTaux = (taux: number | null) => {
    if (taux === null) return <span className="text-muted-foreground">—</span>;
    let color = 'text-red-700';
    if (taux >= 100) color = 'text-green-700';
    else if (taux >= 75) color = 'text-blue-700';
    else if (taux >= 50) color = 'text-amber-700';
    return <span className={`font-semibold ${color}`}>{taux}%</span>;
  };

  if (lignesPrevues.length === 0) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Aucune ligne Plan concerté saisie.</p>
          <p className="text-xs mt-1">Commencez par saisir les lignes du Plan dans l'onglet "Plan concerté".</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Budget Plan</div>
            <div className="font-semibold text-primary">{formatDh(totals.totalPlanBudget)}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Budget CP</div>
            <div className="font-semibold text-blue-700">{formatDh(totals.totalCpBudget)}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Budget Exécuté</div>
            <div className="font-semibold text-green-700">{formatDh(totals.totalExecBudget)}</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">% Exec / Plan</div>
            <div className={`font-bold text-lg ${totals.tauxExecGlobal >= 75 ? 'text-green-700' : totals.tauxExecGlobal >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
              {totals.tauxExecGlobal}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statut arbitrage summary */}
      {(totals.nbAccepte + totals.nbAjuste + totals.nbReporte + totals.nbRejete > 0) && (
        <div className="flex flex-wrap gap-2">
          {totals.nbAccepte > 0 && <Badge className="bg-green-100 text-green-800 border-green-200">{totals.nbAccepte} Accepté(s)</Badge>}
          {totals.nbAjuste > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200">{totals.nbAjuste} Ajusté(s)</Badge>}
          {totals.nbReporte > 0 && <Badge className="bg-blue-100 text-blue-800 border-blue-200">{totals.nbReporte} Reporté(s)</Badge>}
          {totals.nbRejete > 0 && <Badge className="bg-red-100 text-red-800 border-red-200">{totals.nbRejete} Rejeté(s)</Badge>}
        </div>
      )}

      {/* Comparatif table */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Comparatif Plan / CP / Exécution ({rows.length} lignes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Année</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Localisation</TableHead>
                  <TableHead className="text-xs text-right">Plan (Qty)</TableHead>
                  <TableHead className="text-xs text-right">CP (Qty)</TableHead>
                  <TableHead className="text-xs text-right">Exec (Qty)</TableHead>
                  <TableHead className="text-xs text-center">Δ Plan→CP</TableHead>
                  <TableHead className="text-xs text-center">Δ CP→Exec</TableHead>
                  <TableHead className="text-xs text-center">% Exec</TableHead>
                  <TableHead className="text-xs text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.id} className={row.cp_statut === 'rejete' ? 'opacity-50' : ''}>
                    <TableCell className="font-medium text-xs">{row.annee}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {actionTypeConfig[row.action_type as ActionType]?.label || row.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {row.perimetre} / {row.site}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {row.plan_quantite.toLocaleString()} {row.unite}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {row.cp_quantite !== null
                        ? <span className="font-medium text-blue-700">{row.cp_quantite.toLocaleString()} {row.unite}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {row.exec_quantite > 0
                        ? <span className="font-medium text-green-700">{row.exec_quantite.toLocaleString()} {row.unite}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-center text-xs">{renderDelta(row.delta_plan_cp_qty)}</TableCell>
                    <TableCell className="text-center text-xs">{renderDelta(row.delta_cp_exec_qty)}</TableCell>
                    <TableCell className="text-center text-xs">{renderTaux(row.taux_exec_cp ?? row.taux_exec_plan)}</TableCell>
                    <TableCell className="text-center">
                      {row.cp_statut ? (
                        <div className="space-y-1">
                          <Badge className={`text-[10px] ${STATUT_CONFIG[row.cp_statut].className}`}>
                            {STATUT_CONFIG[row.cp_statut].label}
                          </Badge>
                          {row.cp_motif && (
                            <p className="text-[9px] text-muted-foreground max-w-[100px] truncate" title={row.cp_motif}>
                              {row.cp_motif}
                            </p>
                          )}
                        </div>
                      ) : (
                        row.cp_quantite !== null
                          ? <Badge variant="outline" className="text-[10px]">En attente</Badge>
                          : <span className="text-muted-foreground text-[10px]">Non programmé</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Budget comparison summary per year */}
          <div className="mt-4 border-t pt-3">
            <h4 className="text-xs font-medium mb-2">Résumé budgétaire par année</h4>
            <div className="flex flex-wrap gap-2">
              {years.map(year => {
                const yearRows = rows.filter(r => r.annee === year);
                if (yearRows.length === 0) return null;
                const planB = yearRows.reduce((s, r) => s + r.plan_budget, 0);
                const cpB = yearRows.reduce((s, r) => s + (r.cp_budget ?? 0), 0);
                const execB = yearRows.reduce((s, r) => s + r.exec_budget, 0);
                return (
                  <div key={year} className="bg-muted/50 rounded-lg px-3 py-2 text-xs">
                    <div className="font-medium mb-1">{year}</div>
                    <div>Plan: {formatDh(planB)}</div>
                    <div className="text-blue-700">CP: {formatDh(cpB)}</div>
                    <div className="text-green-700">Exec: {formatDh(execB)}</div>
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

export default PdfcpComparatifTab;
