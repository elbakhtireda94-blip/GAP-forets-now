/**
 * Tableau Comparatif Institutionnel PDFCP
 * 
 * Tableau de pilotage central : Concerté vs CP vs Exécuté
 * Groupé par année avec sous-totaux par composante et totaux PDFCP
 * Codes couleur automatiques — utilisable en réunion de direction
 */

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatDh, formatNumber } from '@/lib/formatters';
import { PROGRAM_COMPONENTS_REF } from '@/data/programComponentsRef';
import { ETAT_LABELS, type PdfcpActionLine } from '@/data/pdfcp_entry_types';
import { usePdfcpActions } from '@/hooks/usePdfcpActions';
import { toast } from 'sonner';

interface PdfcpComparatifInstitutionnelProps {
  pdfcpId: string;
  yearStart: number;
  yearEnd: number;
  communeName?: string;
}

// ─── Aggregated row type ───
interface AggRow {
  action_key: string;
  action_label: string;
  unite: string;
  category: string;
  concerte_qty: number;
  concerte_budget: number;
  cp_qty: number;
  cp_budget: number;
  exec_qty: number;
  exec_budget: number;
}

// ─── Color helpers ───
function tauxColor(taux: number | null): string {
  if (taux === null) return 'text-muted-foreground';
  if (taux >= 95) return 'text-green-700 dark:text-green-400';
  if (taux >= 75) return 'text-amber-600 dark:text-amber-400';
  if (taux >= 50) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function ecartBg(ecart: number): string {
  if (ecart === 0) return '';
  if (ecart > 0) return 'bg-green-50 dark:bg-green-900/10';
  return 'bg-red-50 dark:bg-red-900/10';
}

function tauxBadge(taux: number | null): string {
  if (taux === null) return 'bg-muted text-muted-foreground';
  if (taux >= 95) return 'bg-green-100 text-green-800 border-green-200';
  if (taux >= 75) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (taux >= 50) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

const getComponentLabel = (key: string): string =>
  PROGRAM_COMPONENTS_REF.find(c => c.id === key)?.label || key;

const getComponentCategory = (key: string): string =>
  PROGRAM_COMPONENTS_REF.find(c => c.id === key)?.category || 'Autre';

const calcTaux = (exec: number, ref: number): number | null =>
  ref > 0 ? Math.round((exec / ref) * 100) : null;

// ─── Component ───
const PdfcpComparatifInstitutionnel: React.FC<PdfcpComparatifInstitutionnelProps> = ({
  pdfcpId,
  yearStart,
  yearEnd,
  communeName,
}) => {
  const { concerteLines, cpLines, executeLines, isLoading } = usePdfcpActions(pdfcpId);
  const years = useMemo(() => Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i), [yearStart, yearEnd]);

  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set(years));

  // ─── Aggregate data: year → action_key → { concerte, cp, execute } ───
  const aggregated = useMemo(() => {
    const map: Record<number, Record<string, AggRow>> = {};

    const addLine = (line: PdfcpActionLine) => {
      if (!map[line.year]) map[line.year] = {};
      if (!map[line.year][line.action_key]) {
        map[line.year][line.action_key] = {
          action_key: line.action_key,
          action_label: line.action_label || getComponentLabel(line.action_key),
          unite: line.unite,
          category: getComponentCategory(line.action_key),
          concerte_qty: 0, concerte_budget: 0,
          cp_qty: 0, cp_budget: 0,
          exec_qty: 0, exec_budget: 0,
        };
      }
      const row = map[line.year][line.action_key];
      if (line.etat === 'CONCERTE') {
        row.concerte_qty += line.physique;
        row.concerte_budget += line.financier;
      } else if (line.etat === 'CP') {
        row.cp_qty += line.physique;
        row.cp_budget += line.financier;
      } else if (line.etat === 'EXECUTE') {
        row.exec_qty += line.physique;
        row.exec_budget += line.financier;
      }
    };

    concerteLines.forEach(addLine);
    cpLines.forEach(addLine);
    executeLines.forEach(addLine);
    return map;
  }, [concerteLines, cpLines, executeLines]);

  // ─── Unique action keys ───
  const uniqueActions = useMemo(() => {
    const keys = new Set<string>();
    Object.values(aggregated).forEach(yearData =>
      Object.keys(yearData).forEach(k => keys.add(k))
    );
    return Array.from(keys).sort();
  }, [aggregated]);

  // ─── Filtered years ───
  const filteredYears = useMemo(() => {
    if (filterYear === 'all') return years;
    return years.filter(y => y === parseInt(filterYear));
  }, [years, filterYear]);

  // ─── Grand totals ───
  const grandTotals = useMemo(() => {
    const t = { concerte_budget: 0, cp_budget: 0, exec_budget: 0, concerte_qty: 0, cp_qty: 0, exec_qty: 0 };
    filteredYears.forEach(year => {
      const yearData = aggregated[year];
      if (!yearData) return;
      Object.values(yearData).forEach(row => {
        if (filterAction !== 'all' && row.action_key !== filterAction) return;
        t.concerte_budget += row.concerte_budget;
        t.cp_budget += row.cp_budget;
        t.exec_budget += row.exec_budget;
        t.concerte_qty += row.concerte_qty;
        t.cp_qty += row.cp_qty;
        t.exec_qty += row.exec_qty;
      });
    });
    return t;
  }, [aggregated, filteredYears, filterAction]);

  const tauxGlobalExec = calcTaux(grandTotals.exec_budget, grandTotals.cp_budget);
  const ecartGlobal = grandTotals.exec_budget - grandTotals.cp_budget;

  // ─── Toggle year expansion ───
  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  // ─── Export CSV ───
  const exportCSV = () => {
    const headers = ['Année', 'Composante', 'Unité', 'Conc. Qty', 'Conc. Budget', 'CP Qty', 'CP Budget', 'Exec Qty', 'Exec Budget', 'Δ CP-Conc', 'Δ Exec-CP', 'Taux Exec (%)'];
    const rows: string[][] = [];
    filteredYears.forEach(year => {
      const yearData = aggregated[year];
      if (!yearData) return;
      Object.values(yearData)
        .filter(r => filterAction === 'all' || r.action_key === filterAction)
        .forEach(r => {
          const deltaCpConc = r.cp_budget - r.concerte_budget;
          const deltaExecCp = r.exec_budget - r.cp_budget;
          const taux = calcTaux(r.exec_budget, r.cp_budget);
          rows.push([
            String(year), r.action_label, r.unite,
            String(r.concerte_qty), String(r.concerte_budget),
            String(r.cp_qty), String(r.cp_budget),
            String(r.exec_qty), String(r.exec_budget),
            String(deltaCpConc), String(deltaExecCp),
            taux !== null ? String(taux) : '-',
          ]);
        });
    });
    // Grand total
    rows.push([
      'TOTAL', '', '',
      String(grandTotals.concerte_qty), String(grandTotals.concerte_budget),
      String(grandTotals.cp_qty), String(grandTotals.cp_budget),
      String(grandTotals.exec_qty), String(grandTotals.exec_budget),
      String(grandTotals.cp_budget - grandTotals.concerte_budget),
      String(ecartGlobal),
      tauxGlobalExec !== null ? String(tauxGlobalExec) : '-',
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comparatif_pdfcp_${pdfcpId}.csv`;
    link.click();
    toast.success('Fichier CSV exporté');
  };

  // ─── Empty / loading ───
  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="py-12 text-center text-muted-foreground animate-pulse">
          Chargement des données PDFCP...
        </CardContent>
      </Card>
    );
  }

  const totalLines = concerteLines.length + cpLines.length + executeLines.length;
  if (totalLines === 0) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Aucune donnée PDFCP disponible</p>
          <p className="text-xs mt-1">Le comparatif sera généré automatiquement dès qu'il y aura des lignes Concerté, CP ou Exécuté.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200/50">
          <CardContent className="p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-emerald-600 mb-1 font-medium">Concerté</div>
            <div className="font-bold text-emerald-800 dark:text-emerald-300">{formatDh(grandTotals.concerte_budget)}</div>
            <div className="text-[10px] text-muted-foreground">{concerteLines.length} lignes</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/50">
          <CardContent className="p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-amber-600 mb-1 font-medium">CP</div>
            <div className="font-bold text-amber-800 dark:text-amber-300">{formatDh(grandTotals.cp_budget)}</div>
            <div className="text-[10px] text-muted-foreground">{cpLines.length} lignes</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/60 dark:bg-blue-900/10 border-blue-200/50">
          <CardContent className="p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-blue-600 mb-1 font-medium">Exécuté</div>
            <div className="font-bold text-blue-800 dark:text-blue-300">{formatDh(grandTotals.exec_budget)}</div>
            <div className="text-[10px] text-muted-foreground">{executeLines.length} lignes</div>
          </CardContent>
        </Card>
        <Card className={`border ${ecartGlobal >= 0 ? 'border-green-200/50 bg-green-50/40 dark:bg-green-900/10' : 'border-red-200/50 bg-red-50/40 dark:bg-red-900/10'}`}>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Écart Exec-CP</div>
            <div className={`font-bold ${ecartGlobal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {ecartGlobal >= 0 ? '+' : ''}{formatDh(ecartGlobal)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Taux Exec</div>
            <div className={`font-bold text-xl ${tauxColor(tauxGlobalExec)}`}>
              {tauxGlobalExec !== null ? `${tauxGlobalExec}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Actions ─── */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Composante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {uniqueActions.map(a => (
                <SelectItem key={a} value={a}>{getComponentLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1 text-xs">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 text-xs print:hidden">
            <Printer className="h-3.5 w-3.5" /> Imprimer
          </Button>
        </div>
      </div>

      {/* ─── Main Comparison Table ─── */}
      <Card className="border-border/50 shadow-soft print:shadow-none">
        <CardHeader className="pb-2 print:pb-1">
          <CardTitle className="text-sm flex items-center gap-2 print:text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Comparatif Institutionnel — Concerté / CP / Exécuté
            {communeName && <span className="text-muted-foreground font-normal">• {communeName}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead className="min-w-[180px] font-semibold text-xs">Composante</TableHead>
                  <TableHead className="w-[50px] text-center text-xs">Unité</TableHead>
                  <TableHead className="text-right text-xs bg-emerald-50/50 dark:bg-emerald-900/10 min-w-[80px]">Conc. Qty</TableHead>
                  <TableHead className="text-right text-xs bg-emerald-50/50 dark:bg-emerald-900/10 min-w-[100px]">Conc. Budget</TableHead>
                  <TableHead className="text-right text-xs bg-amber-50/50 dark:bg-amber-900/10 min-w-[80px]">CP Qty</TableHead>
                  <TableHead className="text-right text-xs bg-amber-50/50 dark:bg-amber-900/10 min-w-[100px]">CP Budget</TableHead>
                  <TableHead className="text-right text-xs bg-blue-50/50 dark:bg-blue-900/10 min-w-[80px]">Exec Qty</TableHead>
                  <TableHead className="text-right text-xs bg-blue-50/50 dark:bg-blue-900/10 min-w-[100px]">Exec Budget</TableHead>
                  <TableHead className="text-center text-xs min-w-[90px]">Δ CP–Conc</TableHead>
                  <TableHead className="text-center text-xs min-w-[90px]">Δ Exec–CP</TableHead>
                  <TableHead className="text-center text-xs min-w-[70px]">% Exec</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredYears.map(year => {
                  const yearData = aggregated[year];
                  if (!yearData) return null;
                  const rows = Object.values(yearData)
                    .filter(r => filterAction === 'all' || r.action_key === filterAction)
                    .sort((a, b) => a.action_label.localeCompare(b.action_label));
                  if (rows.length === 0) return null;

                  // Year subtotals
                  const yt = rows.reduce((acc, r) => ({
                    concerte_budget: acc.concerte_budget + r.concerte_budget,
                    cp_budget: acc.cp_budget + r.cp_budget,
                    exec_budget: acc.exec_budget + r.exec_budget,
                    concerte_qty: acc.concerte_qty + r.concerte_qty,
                    cp_qty: acc.cp_qty + r.cp_qty,
                    exec_qty: acc.exec_qty + r.exec_qty,
                  }), { concerte_budget: 0, cp_budget: 0, exec_budget: 0, concerte_qty: 0, cp_qty: 0, exec_qty: 0 });

                  const yearTaux = calcTaux(yt.exec_budget, yt.cp_budget);
                  const isExpanded = expandedYears.has(year);

                  return (
                    <React.Fragment key={year}>
                      {/* Year header row */}
                      <TableRow
                        className="bg-muted/60 hover:bg-muted/80 cursor-pointer print:bg-muted/40"
                        onClick={() => toggleYear(year)}
                      >
                        <TableCell colSpan={2} className="font-bold text-sm py-2">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span>{year}</span>
                            <Badge variant="secondary" className="text-[10px] font-normal">{rows.length} composantes</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold bg-emerald-50/30">{formatNumber(yt.concerte_qty)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold bg-emerald-50/30">{formatDh(yt.concerte_budget)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold bg-amber-50/30">{formatNumber(yt.cp_qty)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold bg-amber-50/30">{formatDh(yt.cp_budget)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold bg-blue-50/30">{formatNumber(yt.exec_qty)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold bg-blue-50/30">{formatDh(yt.exec_budget)}</TableCell>
                        <TableCell className="text-center">
                          <DeltaCell value={yt.cp_budget - yt.concerte_budget} />
                        </TableCell>
                        <TableCell className="text-center">
                          <DeltaCell value={yt.exec_budget - yt.cp_budget} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[10px] ${tauxBadge(yearTaux)}`}>
                            {yearTaux !== null ? `${yearTaux}%` : '—'}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Detail rows per composante */}
                      {isExpanded && rows.map((row, idx) => {
                        const deltaCpConc = row.cp_budget - row.concerte_budget;
                        const deltaExecCp = row.exec_budget - row.cp_budget;
                        const taux = calcTaux(row.exec_budget, row.cp_budget);
                        return (
                          <TableRow
                            key={`${year}-${row.action_key}`}
                            className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-accent/50 transition-colors`}
                          >
                            <TableCell className="pl-8 text-xs font-medium">
                              {row.action_label}
                              <span className="ml-1 text-[10px] text-muted-foreground">({row.category})</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px]">{row.unite}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs bg-emerald-50/20">
                              {row.concerte_qty > 0 ? formatNumber(row.concerte_qty) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-xs bg-emerald-50/20 font-medium">
                              {row.concerte_budget > 0 ? formatDh(row.concerte_budget) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-xs bg-amber-50/20">
                              {row.cp_qty > 0 ? formatNumber(row.cp_qty) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-xs bg-amber-50/20 font-medium">
                              {row.cp_budget > 0 ? formatDh(row.cp_budget) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-xs bg-blue-50/20">
                              {row.exec_qty > 0 ? formatNumber(row.exec_qty) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-xs bg-blue-50/20 font-medium">
                              {row.exec_budget > 0 ? formatDh(row.exec_budget) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className={`text-center ${ecartBg(deltaCpConc)}`}>
                              <DeltaCell value={deltaCpConc} />
                            </TableCell>
                            <TableCell className={`text-center ${ecartBg(deltaExecCp)}`}>
                              <DeltaCell value={deltaExecCp} />
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-bold ${tauxColor(taux)}`}>
                                {taux !== null ? `${taux}%` : '—'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* ─── TOTAL GÉNÉRAL ─── */}
                <TableRow className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                  <TableCell colSpan={2} className="text-sm py-3">
                    TOTAL GÉNÉRAL PDFCP
                  </TableCell>
                  <TableCell className="text-right text-xs bg-emerald-100/30">{formatNumber(grandTotals.concerte_qty)}</TableCell>
                  <TableCell className="text-right text-sm bg-emerald-100/30 font-bold">{formatDh(grandTotals.concerte_budget)}</TableCell>
                  <TableCell className="text-right text-xs bg-amber-100/30">{formatNumber(grandTotals.cp_qty)}</TableCell>
                  <TableCell className="text-right text-sm bg-amber-100/30 font-bold">{formatDh(grandTotals.cp_budget)}</TableCell>
                  <TableCell className="text-right text-xs bg-blue-100/30">{formatNumber(grandTotals.exec_qty)}</TableCell>
                  <TableCell className="text-right text-sm bg-blue-100/30 font-bold">{formatDh(grandTotals.exec_budget)}</TableCell>
                  <TableCell className="text-center">
                    <DeltaCell value={grandTotals.cp_budget - grandTotals.concerte_budget} bold />
                  </TableCell>
                  <TableCell className="text-center">
                    <DeltaCell value={ecartGlobal} bold />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-xs ${tauxBadge(tauxGlobalExec)}`}>
                      {tauxGlobalExec !== null ? `${tauxGlobalExec}%` : '—'}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Legend ─── */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1 print:text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200" /> ≥ 95% Conforme</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> 75-94% Attention</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200" /> 50-74% Alerte</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> &lt; 50% Critique</span>
        <span className="ml-auto">Δ = Écart budgétaire (DH)</span>
      </div>
    </div>
  );
};

// ─── Delta cell sub-component ───
const DeltaCell: React.FC<{ value: number; bold?: boolean }> = ({ value, bold }) => {
  if (value === 0) return <span className="text-muted-foreground flex items-center justify-center gap-0.5"><Minus className="h-3 w-3" />0</span>;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400';
  return (
    <span className={`flex items-center justify-center gap-0.5 text-[11px] ${color} ${bold ? 'font-bold' : ''}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{formatDh(value)}
    </span>
  );
};

export default PdfcpComparatifInstitutionnel;
