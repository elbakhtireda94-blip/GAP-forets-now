/**
 * Comparatif dynamique Plan concerté / CP / Exécuté
 * Affiche un tableau comparatif avec KPI cards pour chaque action du PDFCP.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
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
import { mysqlApi, getMySQLApiUrl, useMySQLBackend } from '@/integrations/mysql-api/client';

interface ComparatifAction {
  id: string;
  label: string;
  plan_surface: number;
  cp_surface: number;
  exec_surface: number;
  taux_exec_vs_plan: number;
  taux_exec_vs_cp: number;
  statut: 'non_demarre' | 'en_cours' | 'realise' | 'derive';
  unite: string;
}

interface ComparatifTotals {
  plan_total: number;
  cp_total: number;
  exec_total: number;
  taux_global: number;
}

interface ComparatifData {
  actions: ComparatifAction[];
  totals: ComparatifTotals;
}

interface PdfcpComparatifExecutionProps {
  pdfcpId: string;
}

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  non_demarre: {
    label: 'Non démarré',
    color: 'bg-muted text-muted-foreground',
    icon: <Clock className="h-3 w-3" />,
  },
  en_cours: {
    label: 'En cours',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  realise: {
    label: 'Réalisé',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  derive: {
    label: 'Dérive',
    color: 'bg-red-100 text-red-800',
    icon: <TrendingDown className="h-3 w-3" />,
  },
};

/**
 * Fonction backend pour calculer le comparatif (fallback si API non disponible)
 */
function computeComparatifLocal(actions: any[]): ComparatifData {
  const byAction = new Map<string, ComparatifAction>();

  for (const action of actions) {
    const key = action.action_label || action.action_key;
    if (!byAction.has(key)) {
      byAction.set(key, {
        id: action.id,
        label: key,
        plan_surface: 0,
        cp_surface: 0,
        exec_surface: 0,
        taux_exec_vs_plan: 0,
        taux_exec_vs_cp: 0,
        statut: 'non_demarre',
        unite: action.unite || 'ha',
      });
    }
    const group = byAction.get(key)!;

    if (action.etat === 'CONCERTE') {
      group.plan_surface += Number(action.physique) || 0;
    } else if (action.etat === 'CP') {
      group.cp_surface += Number(action.physique) || 0;
    } else if (action.etat === 'EXECUTE') {
      group.exec_surface += Number(action.physique) || 0;
    }
  }

  const comparatifActions: ComparatifAction[] = Array.from(byAction.values()).map((action) => {
    const plan = action.plan_surface || 0;
    const cp = action.cp_surface || 0;
    const exec = action.exec_surface || 0;

    const taux_exec_vs_plan = plan > 0 ? Math.round((exec / plan) * 100) : exec > 0 ? 100 : 0;
    const taux_exec_vs_cp = cp > 0 ? Math.round((exec / cp) * 100) : exec > 0 ? 100 : 0;

    let statut: ComparatifAction['statut'] = 'non_demarre';
    if (exec > 0) {
      if (exec >= plan * 0.95 && exec <= plan * 1.05) {
        statut = 'realise';
      } else if (exec < plan * 0.95) {
        statut = 'derive';
      } else {
        statut = 'en_cours';
      }
    } else if (plan > 0 || cp > 0) {
      statut = 'en_cours';
    }

    return {
      ...action,
      plan_surface: Math.round(plan * 100) / 100,
      cp_surface: Math.round(cp * 100) / 100,
      exec_surface: Math.round(exec * 100) / 100,
      taux_exec_vs_plan,
      taux_exec_vs_cp,
      statut,
    };
  });

  const totals = comparatifActions.reduce(
    (acc, a) => ({
      plan_total: acc.plan_total + a.plan_surface,
      cp_total: acc.cp_total + a.cp_surface,
      exec_total: acc.exec_total + a.exec_surface,
    }),
    { plan_total: 0, cp_total: 0, exec_total: 0 }
  );

  const taux_global = totals.plan_total > 0
    ? Math.round((totals.exec_total / totals.plan_total) * 100)
    : totals.exec_total > 0 ? 100 : 0;

  return {
    actions: comparatifActions,
    totals: {
      plan_total: Math.round(totals.plan_total * 100) / 100,
      cp_total: Math.round(totals.cp_total * 100) / 100,
      exec_total: Math.round(totals.exec_total * 100) / 100,
      taux_global,
    },
  };
}

const PdfcpComparatifExecution: React.FC<PdfcpComparatifExecutionProps> = ({ pdfcpId }) => {
  const isMySQL = useMySQLBackend();

  // Fetch comparatif data - FORCE MySQL API (Supabase bypassed)
  const comparatifQuery = useQuery<ComparatifData>({
    queryKey: ['pdfcp-comparatif', pdfcpId],
    queryFn: async () => {
      const apiUrl = `${getMySQLApiUrl()}/api/pdfcp/programs/${pdfcpId}/comparatif`;
      console.log('[PDFCP Comparatif] GET', apiUrl);
      
      const { data, error } = await mysqlApi.getPdfcpComparatif(pdfcpId);
      if (error) {
        console.error('[PDFCP Comparatif] Error:', error);
        throw new Error(error.message);
      }
      return data as ComparatifData;
    },
    enabled: !!pdfcpId,
  });

  const comparatif = comparatifQuery.data;
  const isLoading = comparatifQuery.isLoading;
  const error = comparatifQuery.error;

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Chargement du comparatif...</p>
      </div>
    );
  }

  if (error || !comparatif) {
    return (
      <div className="text-center py-8 text-red-600">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Erreur lors du chargement du comparatif</p>
      </div>
    );
  }

  const actions = comparatif?.actions ?? [];
  const totals = comparatif?.totals ?? {
    plan_total: 0,
    cp_total: 0,
    exec_total: 0,
    taux_global: 0,
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan concerté</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totals.plan_total ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CP annuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totals.cp_total ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exécuté</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{(totals.exec_total ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {totals.taux_global ?? 0}%
              {(totals.taux_global ?? 0) >= 95 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (totals.taux_global ?? 0) < 50 ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau comparatif */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparatif par action</CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucune action à comparer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Action</TableHead>
                    <TableHead className="text-right">Plan concerté</TableHead>
                    <TableHead className="text-right">CP annuelle</TableHead>
                    <TableHead className="text-right">Exécuté</TableHead>
                    <TableHead className="text-right">Taux vs Plan</TableHead>
                    <TableHead className="text-right">Taux vs CP</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => {
                    const statutConfig = STATUT_CONFIG[action.statut] || STATUT_CONFIG.non_demarre;
                    return (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">{action.label}</TableCell>
                        <TableCell className="text-right">
                          {action.plan_surface.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {action.unite}
                        </TableCell>
                        <TableCell className="text-right">
                          {action.cp_surface.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {action.unite}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {action.exec_surface.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {action.unite}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={action.taux_exec_vs_plan >= 95 ? 'text-green-700 font-medium' : action.taux_exec_vs_plan < 50 ? 'text-red-700 font-medium' : ''}>
                            {action.taux_exec_vs_plan}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={action.taux_exec_vs_cp >= 95 ? 'text-green-700 font-medium' : action.taux_exec_vs_cp < 50 ? 'text-red-700 font-medium' : ''}>
                            {action.taux_exec_vs_cp}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statutConfig.color} text-xs flex items-center gap-1 w-fit`}>
                            {statutConfig.icon}
                            {statutConfig.label}
                          </Badge>
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
  );
};

export default PdfcpComparatifExecution;
