/**
 * Hook pour les actions cartographiques PDFCP
 * Lie obligatoirement chaque action carto à une action prévue (planned_action_id)
 * - Actions prévues: MySQL API (base centrale)
 * - Actions géo: Supabase (pdfcp_actions_geo)
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mysqlApi, getMySQLApiUrl } from '@/integrations/mysql-api/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// =====================================================
// Types
// =====================================================

export interface PdfcpActionGeoRow {
  id: string;
  pdfcp_id: string;
  planned_action_id: string;
  action_type: string;
  titre: string;
  description: string | null;
  surface_realisee_ha: number | null;
  longueur_realisee_km: number | null;
  coords_text_lambert: string;
  lambert_zone: string;
  geom_type: string;
  geometry: GeoJSON.Geometry | null;
  centroid_lat: number;
  centroid_lng: number;
  date_realisation: string | null;
  statut: string;
  observations: string | null;
  preuves: any;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PlannedAction {
  id: string;
  pdfcp_id: string;
  action_key: string;
  action_label: string | null;
  year: number;
  etat: string | null;
  unite: string;
  physique: number | null;
  financier: number | null;
  commune_id: string | null;
  perimetre_id: string | null;
  site_id: string | null;
}

export interface PlannedActionWithProgress extends PlannedAction {
  cumul_realise: number;
  reste: number;
  taux_realisation: number;
  geo_actions_count: number;
}

// =====================================================
// Action Type → Geo Config mapping
// =====================================================

export interface GeoConfig {
  suggestedGeom: 'Point' | 'Polygon' | 'LineString';
  icon: string;
  color: string;
  label: string;
}

export const ACTION_GEO_CONFIG: Record<string, GeoConfig> = {
  'REBOISEMENT': { suggestedGeom: 'Polygon', icon: '🌲', color: '#22c55e', label: 'Reboisement' },
  'DRS': { suggestedGeom: 'Polygon', icon: '⛰️', color: '#f97316', label: 'DRS' },
  'PISTE': { suggestedGeom: 'LineString', icon: '🛤️', color: '#a855f7', label: 'Piste' },
  'CMD': { suggestedGeom: 'Polygon', icon: '🛡️', color: '#3b82f6', label: 'CMD' },
  'REGENERATION': { suggestedGeom: 'Polygon', icon: '🌿', color: '#84cc16', label: 'Régénération' },
  'POINTS_EAU': { suggestedGeom: 'Point', icon: '💧', color: '#06b6d4', label: "Points d'eau" },
  'SENSIBILISATION': { suggestedGeom: 'Point', icon: '📢', color: '#eab308', label: 'Sensibilisation' },
  'PFNL': { suggestedGeom: 'Polygon', icon: '🌳', color: '#10b981', label: 'PFNL' },
  'SYLVOPASTORALISME': { suggestedGeom: 'Polygon', icon: '🐑', color: '#78716c', label: 'Sylvopastoralisme' },
  'APICULTURE': { suggestedGeom: 'Point', icon: '🐝', color: '#fbbf24', label: 'Apiculture' },
  'ARBORICULTURE': { suggestedGeom: 'Polygon', icon: '🌳', color: '#65a30d', label: 'Arboriculture' },
  'EQUIPEMENT': { suggestedGeom: 'Point', icon: '🔧', color: '#6366f1', label: 'Équipement' },
};

const DEFAULT_GEO_CONFIG: GeoConfig = { suggestedGeom: 'Point', icon: '📍', color: '#6b7280', label: 'Autre' };

export function getGeoConfig(actionKey: string): GeoConfig {
  if (!actionKey) return DEFAULT_GEO_CONFIG;
  return ACTION_GEO_CONFIG[actionKey.toUpperCase()] || DEFAULT_GEO_CONFIG;
}

export const LAMBERT_ZONE_LABELS: Record<string, string> = {
  '26191': 'Lambert Nord Maroc (EPSG:26191)',
  '26192': 'Lambert Sud Maroc (EPSG:26192)',
};

// Tolerance for overshoot (percentage)
const OVERSHOOT_TOLERANCE_PCT = 10;

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Untyped query helper (table not yet in generated types)
function queryGeoTable() {
  return (supabase as any).from('pdfcp_actions_geo');
}

// =====================================================
// Main Hook
// =====================================================

export function usePdfcpActionsGeo(pdfcpId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isUUID = !!pdfcpId && isValidUUID(pdfcpId);

  // Fetch geo actions for this PDFCP
  const geoActionsQuery = useQuery({
    queryKey: ['pdfcp-actions-geo', pdfcpId],
    queryFn: async (): Promise<PdfcpActionGeoRow[]> => {
      if (!pdfcpId || !isUUID) return [];
      const { data, error } = await queryGeoTable()
        .select('*')
        .eq('pdfcp_id', pdfcpId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PdfcpActionGeoRow[];
    },
    enabled: !!pdfcpId && isUUID,
  });

  // Fetch planned actions (CONCERTE) for this PDFCP - MySQL API
  const plannedActionsQuery = useQuery({
    queryKey: ['pdfcp-planned-actions', pdfcpId],
    queryFn: async (): Promise<PlannedAction[]> => {
      if (!pdfcpId || !isUUID) return [];
      const baseUrl = getMySQLApiUrl();
      const apiUrl = `${baseUrl}/api/pdfcp/programs/${pdfcpId}/actions`;
      
      const { data, error } = await mysqlApi.getPdfcpActions(pdfcpId);
      if (error) {
        console.error('[PDFCP actions] source=mysql error:', { baseUrl, url: apiUrl, pdfcpId, error: error.message });
        // Improve error message with helpful hints
        const enhancedError = error.message.includes('HTML') || error.message.includes('non-JSON')
          ? `${error.message}\n\n💡 Vérifiez:\n- Le serveur MySQL API est démarré (port ${baseUrl.split(':').pop() || '3002'})\n- L'URL de base est correcte: ${baseUrl}\n- CORS est configuré correctement`
          : error.message;
        throw new Error(enhancedError);
      }
      
      // Filter for CONCERTE actions (Plan concerté) and map to PlannedAction format
      // Note: PREVU was migrated to CONCERTE in MySQL schema
      const allActions = Array.isArray(data) ? data : [];
      const plannedActions = allActions
        .filter((d: any) => d.etat === 'CONCERTE')
        .sort((a: any, b: any) => (a.year || 0) - (b.year || 0))
        .map((d: any) => ({
          id: d.id,
          pdfcp_id: d.pdfcp_id,
          action_key: d.action_key,
          action_label: d.action_label,
          year: d.year,
          etat: d.etat,
          unite: d.unite,
          physique: d.physique,
          financier: d.financier,
          commune_id: d.commune_id,
          perimetre_id: d.perimetre_id,
          site_id: d.site_id,
        })) as PlannedAction[];
      
      console.log('[PDFCP actions] source=mysql', { 
        baseUrl, 
        url: apiUrl, 
        pdfcpId, 
        receivedCount: allActions.length, 
        concerteCount: plannedActions.length 
      });
      return plannedActions;
    },
    enabled: !!pdfcpId && isUUID,
  });

  // Compute: planned actions with progress
  const plannedActionsWithProgress: PlannedActionWithProgress[] = useMemo(() => {
    const geoActions = geoActionsQuery.data || [];
    const planned = plannedActionsQuery.data || [];

    return planned.map(pa => {
      const linkedGeos = geoActions.filter(g => g.planned_action_id === pa.id);
      const cumul = linkedGeos.reduce((sum, g) => {
        if (pa.unite?.toLowerCase() === 'km') return sum + (g.longueur_realisee_km || 0);
        return sum + (g.surface_realisee_ha || 0);
      }, 0);
      const physique = pa.physique || 0;
      const reste = Math.max(0, physique - cumul);
      const taux = physique > 0 ? Math.round((cumul / physique) * 100) : 0;

      return {
        ...pa,
        cumul_realise: cumul,
        reste,
        taux_realisation: taux,
        geo_actions_count: linkedGeos.length,
      };
    });
  }, [geoActionsQuery.data, plannedActionsQuery.data]);

  // Available planned actions (reste > 0)
  const availablePlannedActions = useMemo(() => {
    return plannedActionsWithProgress.filter(pa => pa.reste > 0);
  }, [plannedActionsWithProgress]);

  // Check overshoot
  const checkOvershoot = (
    plannedActionId: string,
    additionalValue: number,
    excludeGeoId?: string
  ): { exceeds: boolean; warning: boolean; message: string } => {
    const pa = plannedActionsWithProgress.find(p => p.id === plannedActionId);
    if (!pa) return { exceeds: false, warning: false, message: '' };

    let currentCumul = pa.cumul_realise;
    if (excludeGeoId) {
      const existing = (geoActionsQuery.data || []).find(g => g.id === excludeGeoId);
      if (existing) {
        if (pa.unite?.toLowerCase() === 'km') {
          currentCumul -= (existing.longueur_realisee_km || 0);
        } else {
          currentCumul -= (existing.surface_realisee_ha || 0);
        }
      }
    }

    const newCumul = currentCumul + additionalValue;
    const physique = pa.physique || 0;
    const threshold = physique * (1 + OVERSHOOT_TOLERANCE_PCT / 100);

    if (newCumul > threshold) {
      return {
        exceeds: true,
        warning: true,
        message: `Cumul (${newCumul.toFixed(2)} ${pa.unite}) dépasse le prévu (${physique} ${pa.unite}) + tolérance ${OVERSHOOT_TOLERANCE_PCT}%`,
      };
    }
    if (newCumul > physique) {
      return {
        exceeds: false,
        warning: true,
        message: `Cumul (${newCumul.toFixed(2)} ${pa.unite}) dépasse légèrement le prévu (${physique} ${pa.unite})`,
      };
    }
    return { exceeds: false, warning: false, message: '' };
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Omit<PdfcpActionGeoRow, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
      const { data: result, error } = await queryGeoTable().insert(data).select().single();
      if (error) throw error;
      return result as PdfcpActionGeoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-geo', pdfcpId] });
      toast.success('Action cartographique créée');
    },
    onError: (err: Error) => toast.error('Erreur: ' + err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PdfcpActionGeoRow> & { id: string }) => {
      const { data: result, error } = await queryGeoTable().update(updates).eq('id', id).select().single();
      if (error) throw error;
      return result as PdfcpActionGeoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-geo', pdfcpId] });
      toast.success('Action cartographique modifiée');
    },
    onError: (err: Error) => toast.error('Erreur: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await queryGeoTable().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-geo', pdfcpId] });
      toast.success('Action cartographique supprimée');
    },
    onError: (err: Error) => toast.error('Erreur: ' + err.message),
  });

  // Group geo actions by planned action
  const geoActionsByPlannedAction = useMemo(() => {
    const groups = new Map<string, PdfcpActionGeoRow[]>();
    (geoActionsQuery.data || []).forEach(ga => {
      const key = ga.planned_action_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ga);
    });
    return groups;
  }, [geoActionsQuery.data]);

  return {
    geoActions: geoActionsQuery.data || [],
    plannedActions: plannedActionsQuery.data || [],
    plannedActionsWithProgress,
    availablePlannedActions,
    geoActionsByPlannedAction,
    isLoading: geoActionsQuery.isLoading || plannedActionsQuery.isLoading,
    isSupabaseReady: isUUID,
    checkOvershoot,
    createGeoAction: createMutation.mutateAsync,
    updateGeoAction: updateMutation.mutateAsync,
    deleteGeoAction: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
