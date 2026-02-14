/**
 * Hook MySQL pour la gestion des actions PDFCP à 3 couches
 * Table unique: pdfcp_actions avec etat = CONCERTE | CP | EXECUTE
 * Utilise MySQL API (fallback Supabase si VITE_USE_MYSQL_BACKEND=false)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMySQLBackend, mysqlApi } from '@/integrations/mysql-api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { toast } from 'sonner';
import type { EtatType, PdfcpActionLine, StatutExecution } from '@/data/pdfcp_entry_types';

// Map DB row to typed PdfcpActionLine
function mapRow(row: any): PdfcpActionLine {
  return {
    id: row.id,
    pdfcp_id: row.pdfcp_id,
    commune_id: row.commune_id,
    perimetre_id: row.perimetre_id,
    site_id: row.site_id,
    action_key: row.action_key,
    action_label: row.action_label,
    year: row.year,
    etat: row.etat as EtatType,
    unite: row.unite,
    physique: row.physique ?? 0,
    financier: row.financier ?? 0,
    source_plan_line_id: row.source_plan_line_id,
    source_cp_line_id: row.source_cp_line_id,
    justification_ecart: row.justification_ecart,
    date_realisation: row.date_realisation,
    statut_execution: row.statut_execution as StatutExecution | undefined,
    preuves: row.preuves ?? [],
    notes: row.notes,
    locked: row.locked ?? false,
    geometry_type: row.geometry_type,
    coordinates: row.coordinates,
    status: row.status,
    created_at: row.created_at,
    created_by: row.created_by,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  };
}

export interface AddActionParams {
  pdfcp_id: string;
  commune_id?: string;
  perimetre_id?: string;
  site_id?: string;
  action_key: string;
  action_label?: string;
  year: number;
  etat: EtatType;
  unite: string;
  physique: number;
  financier: number;
  source_plan_line_id?: string;
  source_cp_line_id?: string;
  justification_ecart?: string;
  date_realisation?: string;
  statut_execution?: StatutExecution;
  preuves?: unknown[];
  notes?: string;
}

export interface UsePdfcpActionsOptions {
  /** Appelé après l'ajout d'une ligne (id de la ligne créée) pour proposer la carto */
  onActionAdded?: (createdActionId: string) => void;
}

export function usePdfcpActions(pdfcpId?: string, options?: UsePdfcpActionsOptions) {
  const { user } = useAuth();
  const { isDemoReadonly } = useDemo();
  const queryClient = useQueryClient();
  const onActionAdded = options?.onActionAdded;
  const isMySQL = useMySQLBackend();

  // Fetch all actions for a PDFCP
  const actionsQuery = useQuery({
    queryKey: ['pdfcp-actions-3layer', pdfcpId],
    queryFn: async () => {
      if (!pdfcpId) return [];
      if (isMySQL) {
        const { data, error } = await mysqlApi.getPdfcpActions(pdfcpId);
        if (error) throw new Error(error.message);
        return (Array.isArray(data) ? data : []).map(mapRow);
      }
      const { data, error } = await supabase
        .from('pdfcp_actions')
        .select('*')
        .eq('pdfcp_id', pdfcpId)
        .order('year', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    enabled: !!pdfcpId,
  });

  // Split by état
  const allActions = actionsQuery.data || [];
  const concerteLines = allActions.filter(a => a.etat === 'CONCERTE');
  const cpLines = allActions.filter(a => a.etat === 'CP');
  const executeLines = allActions.filter(a => a.etat === 'EXECUTE');

  // Totals per layer
  const totals = {
    concerte: {
      physique: concerteLines.reduce((s, a) => s + a.physique, 0),
      financier: concerteLines.reduce((s, a) => s + a.financier, 0),
      count: concerteLines.length,
    },
    cp: {
      physique: cpLines.reduce((s, a) => s + a.physique, 0),
      financier: cpLines.reduce((s, a) => s + a.financier, 0),
      count: cpLines.length,
    },
    execute: {
      physique: executeLines.reduce((s, a) => s + a.physique, 0),
      financier: executeLines.reduce((s, a) => s + a.financier, 0),
      count: executeLines.length,
    },
  };

  const tauxExecution = totals.concerte.financier > 0
    ? Math.round((totals.execute.financier / totals.concerte.financier) * 100)
    : 0;

  // Add action line — retourne l'id créé pour proposer la carto
  const addAction = useMutation({
    mutationFn: async (params: AddActionParams): Promise<string> => {
      if (isDemoReadonly) throw new Error('Mode démonstration — modification impossible');
      if (!user) throw new Error('Non authentifié');
      
      if (isMySQL) {
        const { data, error } = await mysqlApi.postPdfcpAction(params.pdfcp_id, {
          commune_id: params.commune_id,
          perimetre_id: params.perimetre_id,
          site_id: params.site_id,
          action_key: params.action_key,
          action_label: params.action_label,
          year: params.year,
          etat: params.etat,
          unite: params.unite,
          physique: params.physique,
          financier: params.financier,
          source_plan_line_id: params.source_plan_line_id,
          source_cp_line_id: params.source_cp_line_id,
          justification_ecart: params.justification_ecart,
          date_realisation: params.date_realisation,
          statut_execution: params.statut_execution,
          preuves: params.preuves,
          notes: params.notes,
          status: 'draft',
        });
        if (error) throw new Error(error.message);
        if (!data || !(data as any).id) throw new Error('Création échouée');
        return (data as any).id as string;
      }

      const { data, error } = await supabase
        .from('pdfcp_actions')
        .insert({
          pdfcp_id: params.pdfcp_id,
          commune_id: params.commune_id,
          perimetre_id: params.perimetre_id,
          site_id: params.site_id,
          action_key: params.action_key,
          action_label: params.action_label,
          year: params.year,
          etat: params.etat,
          unite: params.unite,
          physique: params.physique,
          financier: params.financier,
          source_plan_line_id: params.source_plan_line_id,
          source_cp_line_id: params.source_cp_line_id,
          justification_ecart: params.justification_ecart,
          date_realisation: params.date_realisation,
          statut_execution: params.statut_execution,
          preuves: params.preuves ? JSON.stringify(params.preuves) : '[]',
          notes: params.notes,
          created_by: user.auth_user_id,
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return data?.id ?? '';
    },
    onSuccess: (createdId) => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-3layer', pdfcpId] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-planned-actions', pdfcpId] });
      toast.success('Ligne ajoutée');
      if (createdId && onActionAdded) onActionAdded(createdId);
    },
    onError: (err) => toast.error('Erreur: ' + (err as Error).message),
  });

  // Update action line
  const updateAction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AddActionParams> & { id: string }) => {
      if (isDemoReadonly) throw new Error('Mode démonstration — modification impossible');
      if (!user || !pdfcpId) throw new Error('Non authentifié ou pdfcpId manquant');
      
      if (isMySQL) {
        const payload: any = { ...updates };
        // MySQL handles JSON automatically via normalizeRow
        const { error } = await mysqlApi.patchPdfcpAction(pdfcpId, id, payload);
        if (error) throw new Error(error.message);
        return;
      }

      const payload: any = { ...updates, updated_by: user.auth_user_id };
      if (payload.preuves) payload.preuves = JSON.stringify(payload.preuves);
      const { error } = await supabase
        .from('pdfcp_actions')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-3layer', pdfcpId] });
      toast.success('Ligne mise à jour');
    },
    onError: (err) => toast.error('Erreur: ' + (err as Error).message),
  });

  // Delete action line
  const deleteAction = useMutation({
    mutationFn: async (id: string) => {
      if (!pdfcpId) throw new Error('pdfcpId manquant');
      if (isMySQL) {
        const { error } = await mysqlApi.deletePdfcpAction(pdfcpId, id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase
        .from('pdfcp_actions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-3layer', pdfcpId] });
      toast.success('Ligne supprimée');
    },
    onError: (err) => toast.error('Erreur: ' + (err as Error).message),
  });

  // Lock concerté lines after validation
  const lockConcerteLines = useMutation({
    mutationFn: async () => {
      if (!pdfcpId) throw new Error('Missing pdfcpId');
      
      if (isMySQL) {
        // For MySQL, we need to update each CONCERTE line individually
        // Get all CONCERTE lines first
        const { data: actions, error: fetchError } = await mysqlApi.getPdfcpActions(pdfcpId);
        if (fetchError) throw new Error(fetchError.message);
        const concerteActions = (Array.isArray(actions) ? actions : []).filter((a: any) => a.etat === 'CONCERTE');
        // Update each one
        for (const action of concerteActions) {
          const { error } = await mysqlApi.patchPdfcpAction(pdfcpId, action.id, { locked: true });
          if (error) throw new Error(error.message);
        }
        return;
      }

      const { error } = await supabase
        .from('pdfcp_actions')
        .update({ locked: true } as any)
        .eq('pdfcp_id', pdfcpId)
        .eq('etat', 'CONCERTE');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-3layer', pdfcpId] });
      toast.success('Lignes Concerté verrouillées');
    },
  });

  return {
    // Data
    allActions,
    concerteLines,
    cpLines,
    executeLines,
    totals,
    tauxExecution,
    // States
    isLoading: actionsQuery.isLoading,
    // Mutations
    addAction: addAction.mutate,
    updateAction: updateAction.mutate,
    deleteAction: deleteAction.mutate,
    lockConcerteLines: lockConcerteLines.mutate,
    isAdding: addAction.isPending,
    isUpdating: updateAction.isPending,
  };
}
