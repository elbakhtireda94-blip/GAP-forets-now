/**
 * Résumé automatique des composantes calculé à partir des lignes prévues
 * Group by action_type → somme quantite_physique + somme budget_prevu_dh
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PdfcpLignePrevue } from '@/contexts/DatabaseContext';
import { actionTypeConfig, ActionType } from '@/data/comparatifTypes';
import { getUnitLabel } from '@/data/programComponentsRef';
import { formatDh } from '@/lib/formatters';
import { BarChart3 } from 'lucide-react';

interface PdfcpComponentsSummaryProps {
  lignesPrevues: PdfcpLignePrevue[];
}

interface ComponentSummary {
  action_type: string;
  label: string;
  unite: string;
  totalQuantite: number;
  totalBudget: number;
  yearCount: number;
}

const PdfcpComponentsSummary: React.FC<PdfcpComponentsSummaryProps> = ({ lignesPrevues }) => {
  if (lignesPrevues.length === 0) return null;

  const summaryMap = new Map<string, ComponentSummary>();

  for (const ligne of lignesPrevues) {
    const existing = summaryMap.get(ligne.action_type);
    if (existing) {
      existing.totalQuantite += ligne.quantite_physique;
      existing.totalBudget += ligne.budget_prevu_dh;
      existing.yearCount += 1;
    } else {
      summaryMap.set(ligne.action_type, {
        action_type: ligne.action_type,
        label: actionTypeConfig[ligne.action_type as ActionType]?.label || ligne.action_type,
        unite: ligne.unite,
        totalQuantite: ligne.quantite_physique,
        totalBudget: ligne.budget_prevu_dh,
        yearCount: 1,
      });
    }
  }

  const summaries = Array.from(summaryMap.values()).sort((a, b) => b.totalBudget - a.totalBudget);
  const grandTotalBudget = summaries.reduce((s, c) => s + c.totalBudget, 0);

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Résumé automatique des composantes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map((s) => {
            const pct = grandTotalBudget > 0 ? Math.round((s.totalBudget / grandTotalBudget) * 100) : 0;
            return (
              <div
                key={s.action_type}
                className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/50 bg-muted/20"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-medium">
                    {s.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {s.yearCount} ligne(s)
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">
                    {s.totalQuantite.toLocaleString('fr-MA')} {s.unite}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({getUnitLabel(s.unite)})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">
                    {formatDh(s.totalBudget)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{pct}% du total</span>
                </div>
                {/* Mini progress bar */}
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-2 border-t flex justify-end">
          <span className="text-xs font-medium">
            Budget total : <span className="text-primary">{formatDh(grandTotalBudget)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PdfcpComponentsSummary;
