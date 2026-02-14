/**
 * Hook: usePdfcpAlerts
 * Generates automatic PDFCP alerts from comparative data (CONCERTE vs CP vs EXECUTE)
 * with role-based visibility filtering.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

// --- Alert Types ---

export type PdfcpAlertType = 'retard_execution' | 'ecart_cp_concerte' | 'depassement_budget' | 'faible_taux';
export type AlertSeverity = 'info' | 'warning' | 'critique';

export interface PdfcpAlert {
  id: string;
  type: PdfcpAlertType;
  severity: AlertSeverity;
  pdfcp_id: string;
  pdfcp_title: string;
  year: number;
  action_key: string;
  action_label: string;
  commune_id?: string;
  dpanef_id: string;
  dranef_id: string;
  reference_value: number;
  observed_value: number;
  taux?: number;
  message: string;
}

const ALERT_TYPE_LABELS: Record<PdfcpAlertType, string> = {
  retard_execution: 'Retard d\'exécution',
  ecart_cp_concerte: 'Écart CP / Concerté',
  depassement_budget: 'Dépassement budgétaire',
  faible_taux: 'Faible taux d\'exécution',
};

const ALERT_TYPE_ICONS: Record<PdfcpAlertType, string> = {
  retard_execution: '⏱️',
  ecart_cp_concerte: '↕️',
  depassement_budget: '💰',
  faible_taux: '📉',
};

export { ALERT_TYPE_LABELS, ALERT_TYPE_ICONS };

// --- Data types ---

interface PdfcpProgram {
  id: string;
  title: string;
  code: string;
  commune_id: string | null;
  dpanef_id: string;
  dranef_id: string;
}

interface PdfcpAction {
  id: string;
  pdfcp_id: string;
  action_key: string;
  action_label: string | null;
  year: number;
  etat: string;
  unite: string;
  physique: number | null;
  financier: number | null;
  commune_id: string | null;
}

// --- Aggregation key ---

function makeKey(pdfcpId: string, year: number, actionKey: string, communeId?: string): string {
  return `${pdfcpId}|${year}|${actionKey}|${communeId || ''}`;
}

interface AggregatedLine {
  pdfcp_id: string;
  year: number;
  action_key: string;
  action_label: string;
  commune_id?: string;
  concerte_physique: number;
  concerte_financier: number;
  cp_physique: number;
  cp_financier: number;
  execute_physique: number;
  execute_financier: number;
}

// --- Hook ---

export function usePdfcpAlerts(filters?: {
  pdfcpId?: string;
  dranefId?: string;
  dpanefId?: string;
  communeId?: string;
}) {
  const { user } = useAuth();

  // Fetch all PDFCP programs (for context)
  const programsQuery = useQuery({
    queryKey: ['pdfcp-programs-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdfcp_programs')
        .select('id, title, code, commune_id, dpanef_id, dranef_id');
      if (error) throw error;
      return (data || []) as PdfcpProgram[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all actions
  const actionsQuery = useQuery({
    queryKey: ['pdfcp-actions-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdfcp_actions')
        .select('id, pdfcp_id, action_key, action_label, year, etat, unite, physique, financier, commune_id');
      if (error) throw error;
      return (data || []) as PdfcpAction[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const programs = programsQuery.data || [];
  const actions = actionsQuery.data || [];

  // Build program lookup
  const programMap = useMemo(() => {
    const m = new Map<string, PdfcpProgram>();
    programs.forEach(p => m.set(p.id, p));
    return m;
  }, [programs]);

  // Aggregate actions by key
  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedLine>();

    actions.forEach(a => {
      const key = makeKey(a.pdfcp_id, a.year, a.action_key, a.commune_id || undefined);
      if (!map.has(key)) {
        map.set(key, {
          pdfcp_id: a.pdfcp_id,
          year: a.year,
          action_key: a.action_key,
          action_label: a.action_label || a.action_key,
          commune_id: a.commune_id || undefined,
          concerte_physique: 0,
          concerte_financier: 0,
          cp_physique: 0,
          cp_financier: 0,
          execute_physique: 0,
          execute_financier: 0,
        });
      }
      const line = map.get(key)!;
      const phys = a.physique ?? 0;
      const fin = a.financier ?? 0;

      if (a.etat === 'CONCERTE') {
        line.concerte_physique += phys;
        line.concerte_financier += fin;
      } else if (a.etat === 'CP') {
        line.cp_physique += phys;
        line.cp_financier += fin;
      } else if (a.etat === 'EXECUTE') {
        line.execute_physique += phys;
        line.execute_financier += fin;
      }
    });

    return Array.from(map.values());
  }, [actions]);

  // Generate alerts
  const allAlerts = useMemo<PdfcpAlert[]>(() => {
    const alerts: PdfcpAlert[] = [];
    let idCounter = 0;

    aggregated.forEach(line => {
      const program = programMap.get(line.pdfcp_id);
      if (!program) return;

      const base = {
        pdfcp_id: line.pdfcp_id,
        pdfcp_title: program.title,
        year: line.year,
        action_key: line.action_key,
        action_label: line.action_label,
        commune_id: line.commune_id || program.commune_id || undefined,
        dpanef_id: program.dpanef_id,
        dranef_id: program.dranef_id,
      };

      // 1. Retard d'exécution: quantité exécutée < quantité CP
      if (line.cp_physique > 0 && line.execute_physique < line.cp_physique) {
        const taux = Math.round((line.execute_physique / line.cp_physique) * 100);
        const severity: AlertSeverity = taux < 50 ? 'critique' : taux < 80 ? 'warning' : 'info';
        alerts.push({
          ...base,
          id: `alert-${++idCounter}`,
          type: 'retard_execution',
          severity,
          reference_value: line.cp_physique,
          observed_value: line.execute_physique,
          taux,
          message: `Exécution physique à ${taux}% (${line.execute_physique}/${line.cp_physique})`,
        });
      }

      // 2. Écart CP / Concerté
      if (line.concerte_physique > 0 && line.cp_physique !== line.concerte_physique) {
        const delta = line.cp_physique - line.concerte_physique;
        const pct = Math.abs(Math.round((delta / line.concerte_physique) * 100));
        const severity: AlertSeverity = pct > 30 ? 'critique' : pct > 15 ? 'warning' : 'info';
        alerts.push({
          ...base,
          id: `alert-${++idCounter}`,
          type: 'ecart_cp_concerte',
          severity,
          reference_value: line.concerte_physique,
          observed_value: line.cp_physique,
          taux: pct,
          message: `Écart CP/Concerté: ${delta > 0 ? '+' : ''}${delta} (${pct}%)`,
        });
      }

      // 3. Dépassement budgétaire: budget exécuté > budget CP
      if (line.cp_financier > 0 && line.execute_financier > line.cp_financier) {
        const depassement = line.execute_financier - line.cp_financier;
        const pct = Math.round((depassement / line.cp_financier) * 100);
        const severity: AlertSeverity = pct > 20 ? 'critique' : pct > 10 ? 'warning' : 'info';
        alerts.push({
          ...base,
          id: `alert-${++idCounter}`,
          type: 'depassement_budget',
          severity,
          reference_value: line.cp_financier,
          observed_value: line.execute_financier,
          taux: pct,
          message: `Dépassement: +${pct}% (+${depassement.toLocaleString('fr-MA')} DH)`,
        });
      }

      // 4. Faible taux d'exécution financière
      if (line.cp_financier > 0) {
        const taux = Math.round((line.execute_financier / line.cp_financier) * 100);
        if (taux < 80) {
          const severity: AlertSeverity = taux < 60 ? 'critique' : 'warning';
          alerts.push({
            ...base,
            id: `alert-${++idCounter}`,
            type: 'faible_taux',
            severity,
            reference_value: line.cp_financier,
            observed_value: line.execute_financier,
            taux,
            message: `Taux d'exécution financière: ${taux}%`,
          });
        }
      }
    });

    return alerts;
  }, [aggregated, programMap]);

  // Apply RBAC scope filtering
  const scopedAlerts = useMemo(() => {
    if (!user) return [];

    let filtered = allAlerts;

    // Role-based visibility
    switch (user.scope_level) {
      case 'LOCAL':
        filtered = filtered.filter(a =>
          a.commune_id && user.commune_ids.includes(a.commune_id)
        );
        break;
      case 'PROVINCIAL':
        filtered = filtered.filter(a => a.dpanef_id === user.dpanef_id);
        break;
      case 'REGIONAL':
        filtered = filtered.filter(a => a.dranef_id === user.dranef_id);
        break;
      // ADMIN / NATIONAL: all alerts
    }

    // Apply external filters
    if (filters?.pdfcpId) {
      filtered = filtered.filter(a => a.pdfcp_id === filters.pdfcpId);
    }
    if (filters?.dranefId) {
      filtered = filtered.filter(a => a.dranef_id === filters.dranefId);
    }
    if (filters?.dpanefId) {
      filtered = filtered.filter(a => a.dpanef_id === filters.dpanefId);
    }
    if (filters?.communeId) {
      filtered = filtered.filter(a => a.commune_id === filters.communeId);
    }

    return filtered;
  }, [allAlerts, user, filters]);

  // Summary stats
  const summary = useMemo(() => ({
    total: scopedAlerts.length,
    critique: scopedAlerts.filter(a => a.severity === 'critique').length,
    warning: scopedAlerts.filter(a => a.severity === 'warning').length,
    info: scopedAlerts.filter(a => a.severity === 'info').length,
    byType: {
      retard_execution: scopedAlerts.filter(a => a.type === 'retard_execution').length,
      ecart_cp_concerte: scopedAlerts.filter(a => a.type === 'ecart_cp_concerte').length,
      depassement_budget: scopedAlerts.filter(a => a.type === 'depassement_budget').length,
      faible_taux: scopedAlerts.filter(a => a.type === 'faible_taux').length,
    },
  }), [scopedAlerts]);

  // KPIs computed from all scoped actions (not just alerts)
  const kpis = useMemo(() => {
    // Filter programs by scope
    let scopedPrograms = programs;
    if (user) {
      switch (user.scope_level) {
        case 'LOCAL':
          scopedPrograms = programs.filter(p =>
            p.commune_id && user.commune_ids.includes(p.commune_id)
          );
          break;
        case 'PROVINCIAL':
          scopedPrograms = programs.filter(p => p.dpanef_id === user.dpanef_id);
          break;
        case 'REGIONAL':
          scopedPrograms = programs.filter(p => p.dranef_id === user.dranef_id);
          break;
      }
    }

    // Apply external filters
    if (filters?.dranefId) {
      scopedPrograms = scopedPrograms.filter(p => p.dranef_id === filters.dranefId);
    }
    if (filters?.dpanefId) {
      scopedPrograms = scopedPrograms.filter(p => p.dpanef_id === filters.dpanefId);
    }
    if (filters?.communeId) {
      scopedPrograms = scopedPrograms.filter(p => p.commune_id === filters.communeId);
    }

    const pdfcpIds = new Set(scopedPrograms.map(p => p.id));
    const scopedActions = actions.filter(a => pdfcpIds.has(a.pdfcp_id));

    const totalPdfcp = scopedPrograms.length;
    const budgetCp = scopedActions.filter(a => a.etat === 'CP').reduce((s, a) => s + (a.financier ?? 0), 0);
    const budgetExec = scopedActions.filter(a => a.etat === 'EXECUTE').reduce((s, a) => s + (a.financier ?? 0), 0);
    const tauxExecution = budgetCp > 0 ? Math.round((budgetExec / budgetCp) * 100) : 0;

    return {
      totalPdfcp,
      budgetCp,
      budgetExec,
      tauxExecution,
    };
  }, [programs, actions, user, filters]);

  return {
    alerts: scopedAlerts,
    summary,
    kpis,
    isLoading: programsQuery.isLoading || actionsQuery.isLoading,
    isError: programsQuery.isError || actionsQuery.isError,
  };
}
