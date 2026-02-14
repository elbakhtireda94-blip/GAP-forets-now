import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Types from Supabase schema
export type ConflictType = 'conflit' | 'opposition';
export type ConflictSeverity = 'faible' | 'moyenne' | 'elevee' | 'critique';
export type ConflictStatus = 'ouvert' | 'en_cours' | 'resolu' | 'escalade';
export type ValidationStatus = 'draft' | 'submitted' | 'validated' | 'archived';

export interface ConflictAttachment {
  type: 'image' | 'pdf';
  url: string;
  filename: string;
  uploaded_at: string;
  storagePath?: string;
}

export interface ConflictEvent {
  id: string;
  date: string;
  type: 'creation' | 'update' | 'status_change' | 'note' | 'attachment' | 'escalation' | 'resolution';
  description: string;
  user_name?: string;
  old_status?: ConflictStatus;
  new_status?: ConflictStatus;
}

export interface ConflictRecord {
  id: string;
  title: string;
  nature: string;
  description: string | null;
  conflict_type: ConflictType;
  severity: ConflictSeverity | null;
  conflict_status: ConflictStatus | null;
  reported_date: string;
  resolution_date: string | null;
  
  // Location
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  commune_id: string | null;
  dpanef_id: string;
  dranef_id: string;
  
  // Opposition specific
  superficie_opposee_ha: number | null;
  superficie_levee_ha: number | null;
  pdfcp_id: string | null;
  
  // Parties
  parties_involved: string[] | null;
  
  // Ownership
  adp_user_id: string;
  
  // Attachments & timeline
  attachments: ConflictAttachment[];
  
  // Workflow
  status: ValidationStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  validated_at: string | null;
  validated_by: string | null;
}

// Labels
export const conflictTypeLabels: Record<ConflictType, string> = {
  conflit: 'Conflit',
  opposition: 'Opposition',
};

export const severityLabels: Record<ConflictSeverity, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  elevee: 'Élevée',
  critique: 'Critique',
};

export const severityColors: Record<ConflictSeverity, string> = {
  faible: 'bg-green-100 text-green-700 border-green-200',
  moyenne: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  elevee: 'bg-orange-100 text-orange-700 border-orange-200',
  critique: 'bg-red-100 text-red-700 border-red-200',
};

export const conflictStatusLabels: Record<ConflictStatus, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  escalade: 'Escaladé',
};

export const conflictStatusColors: Record<ConflictStatus, string> = {
  ouvert: 'bg-blue-100 text-blue-700 border-blue-200',
  en_cours: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  resolu: 'bg-green-100 text-green-700 border-green-200',
  escalade: 'bg-red-100 text-red-700 border-red-200',
};

// Helper to parse attachments
function parseAttachments(data: Json | undefined | null): ConflictAttachment[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as ConflictAttachment[];
}

// Map database row
function mapRowToConflict(row: Record<string, unknown>): ConflictRecord {
  return {
    id: row.id as string,
    title: row.title as string,
    nature: row.nature as string,
    description: row.description as string | null,
    conflict_type: row.conflict_type as ConflictType,
    severity: row.severity as ConflictSeverity | null,
    conflict_status: row.conflict_status as ConflictStatus | null,
    reported_date: row.reported_date as string,
    resolution_date: row.resolution_date as string | null,
    location_text: row.location_text as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    commune_id: row.commune_id as string | null,
    dpanef_id: row.dpanef_id as string,
    dranef_id: row.dranef_id as string,
    superficie_opposee_ha: row.superficie_opposee_ha as number | null,
    superficie_levee_ha: row.superficie_levee_ha as number | null,
    pdfcp_id: row.pdfcp_id as string | null,
    parties_involved: row.parties_involved as string[] | null,
    adp_user_id: row.adp_user_id as string,
    attachments: parseAttachments(row.attachments as Json),
    status: (row.status as ValidationStatus) || 'draft',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
    validated_at: row.validated_at as string | null,
    validated_by: row.validated_by as string | null,
  };
}

export type ConflictFormData = Omit<ConflictRecord, 
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'validated_at' | 'validated_by' | 'dranef_id' | 'dpanef_id' | 'adp_user_id'
>;

export interface ConflictMetrics {
  total: number;
  conflicts: number;
  oppositions: number;
  
  // By status
  ouvert: number;
  en_cours: number;
  resolu: number;
  escalade: number;
  
  // Rates
  resolutionRate: number;
  avgResolutionDays: number;
  
  // Opposition specific
  superficieOpposee: number;
  superficieLevee: number;
  
  // By severity
  bySeverity: Record<ConflictSeverity, number>;
  
  // By month (last 12)
  byMonth: { month: string; conflicts: number; oppositions: number }[];
  
  // Top communes
  topCommunes: { commune_id: string; count: number }[];
  
  // Top natures
  topNatures: { nature: string; count: number }[];
}

export function useConflictsSupabase() {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all conflicts with RBAC
  const fetchConflicts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('conflicts')
        .select('*')
        .order('reported_date', { ascending: false });

      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      } else if (user.scope_level === 'PROVINCIAL' && user.dpanef_id) {
        query = query.eq('dpanef_id', user.dpanef_id);
      } else if (user.scope_level === 'REGIONAL' && user.dranef_id) {
        query = query.eq('dranef_id', user.dranef_id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mapped = (data || []).map(row => mapRowToConflict(row as Record<string, unknown>));
      setConflicts(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('Error fetching conflicts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  // Create conflict
  const createConflict = useCallback(async (data: ConflictFormData): Promise<ConflictRecord | null> => {
    if (!user) {
      toast({ title: 'Accès refusé', description: 'Vous devez être connecté.', variant: 'destructive' });
      return null;
    }

    try {
      const insertData = {
        title: data.title,
        nature: data.nature,
        description: data.description,
        conflict_type: data.conflict_type,
        severity: data.severity,
        conflict_status: data.conflict_status || 'ouvert',
        reported_date: data.reported_date,
        resolution_date: data.resolution_date,
        location_text: data.location_text,
        latitude: data.latitude,
        longitude: data.longitude,
        commune_id: data.commune_id,
        dranef_id: user.dranef_id || '',
        dpanef_id: user.dpanef_id || '',
        superficie_opposee_ha: data.superficie_opposee_ha,
        superficie_levee_ha: data.superficie_levee_ha,
        pdfcp_id: data.pdfcp_id,
        parties_involved: data.parties_involved,
        adp_user_id: user.id,
        attachments: JSON.parse(JSON.stringify(data.attachments || [])),
        status: data.status || 'draft',
      };

      const { data: newConflict, error: insertError } = await supabase
        .from('conflicts')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      const mapped = mapRowToConflict(newConflict as Record<string, unknown>);
      setConflicts(prev => [mapped, ...prev]);
      
      toast({ title: 'Conflit signalé', description: 'Le conflit a été enregistré.' });
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  // Update conflict
  const updateConflict = useCallback(async (id: string, data: Partial<ConflictFormData>): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Accès refusé', variant: 'destructive' });
      return false;
    }

    try {
      const updateData: Record<string, unknown> = { ...data };
      if (data.attachments) {
        updateData.attachments = JSON.parse(JSON.stringify(data.attachments));
      }

      let query = supabase.from('conflicts').update(updateData).eq('id', id);
      
      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      }

      const { data: updated, error: updateError } = await query.select().single();
      if (updateError) throw updateError;

      const mapped = mapRowToConflict(updated as Record<string, unknown>);
      setConflicts(prev => prev.map(c => c.id === id ? mapped : c));
      
      toast({ title: 'Conflit modifié' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return false;
    }
  }, [user, toast]);

  // Resolve conflict
  const resolveConflict = useCallback(async (id: string, resolutionDate: string, superficieLevee?: number): Promise<boolean> => {
    const updateData: Partial<ConflictFormData> = {
      conflict_status: 'resolu',
      resolution_date: resolutionDate,
    };
    if (superficieLevee !== undefined) {
      updateData.superficie_levee_ha = superficieLevee;
    }
    return updateConflict(id, updateData);
  }, [updateConflict]);

  // Escalate conflict
  const escalateConflict = useCallback(async (id: string): Promise<boolean> => {
    return updateConflict(id, { conflict_status: 'escalade' });
  }, [updateConflict]);

  // Delete conflict
  const deleteConflict = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      let query = supabase.from('conflicts').delete().eq('id', id);
      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      }

      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;

      setConflicts(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Conflit supprimé' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return false;
    }
  }, [user, toast]);

  // Metrics
  const metrics = useMemo((): ConflictMetrics => {
    const total = conflicts.length;
    const conflictsCount = conflicts.filter(c => c.conflict_type === 'conflit').length;
    const oppositions = conflicts.filter(c => c.conflict_type === 'opposition').length;
    
    const ouvert = conflicts.filter(c => c.conflict_status === 'ouvert').length;
    const en_cours = conflicts.filter(c => c.conflict_status === 'en_cours').length;
    const resolu = conflicts.filter(c => c.conflict_status === 'resolu').length;
    const escalade = conflicts.filter(c => c.conflict_status === 'escalade').length;
    
    const resolutionRate = total > 0 ? Math.round((resolu / total) * 100) : 0;
    
    // Average resolution time
    const resolvedWithDates = conflicts.filter(c => c.conflict_status === 'resolu' && c.resolution_date);
    let avgResolutionDays = 0;
    if (resolvedWithDates.length > 0) {
      const totalDays = resolvedWithDates.reduce((sum, c) => {
        const start = new Date(c.reported_date);
        const end = new Date(c.resolution_date!);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgResolutionDays = Math.round(totalDays / resolvedWithDates.length);
    }
    
    // Opposition superficies
    const oppositionsList = conflicts.filter(c => c.conflict_type === 'opposition');
    const superficieOpposee = oppositionsList.reduce((sum, c) => sum + (c.superficie_opposee_ha || 0), 0);
    const superficieLevee = oppositionsList
      .filter(c => c.conflict_status === 'resolu')
      .reduce((sum, c) => sum + (c.superficie_levee_ha || c.superficie_opposee_ha || 0), 0);
    
    // By severity
    const bySeverity: Record<ConflictSeverity, number> = {
      faible: 0,
      moyenne: 0,
      elevee: 0,
      critique: 0,
    };
    conflicts.forEach(c => {
      if (c.severity) bySeverity[c.severity]++;
    });
    
    // By month (last 12)
    const monthMap = new Map<string, { conflicts: number; oppositions: number }>();
    conflicts.forEach(c => {
      const month = c.reported_date.substring(0, 7);
      const existing = monthMap.get(month) || { conflicts: 0, oppositions: 0 };
      if (c.conflict_type === 'conflit') {
        existing.conflicts++;
      } else {
        existing.oppositions++;
      }
      monthMap.set(month, existing);
    });
    const byMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
    
    // Top communes
    const communeMap = new Map<string, number>();
    conflicts.forEach(c => {
      if (c.commune_id) {
        communeMap.set(c.commune_id, (communeMap.get(c.commune_id) || 0) + 1);
      }
    });
    const topCommunes = Array.from(communeMap.entries())
      .map(([commune_id, count]) => ({ commune_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Top natures
    const natureMap = new Map<string, number>();
    conflicts.forEach(c => {
      natureMap.set(c.nature, (natureMap.get(c.nature) || 0) + 1);
    });
    const topNatures = Array.from(natureMap.entries())
      .map(([nature, count]) => ({ nature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      conflicts: conflictsCount,
      oppositions,
      ouvert,
      en_cours,
      resolu,
      escalade,
      resolutionRate,
      avgResolutionDays,
      superficieOpposee,
      superficieLevee,
      bySeverity,
      byMonth,
      topCommunes,
      topNatures,
    };
  }, [conflicts]);

  // Permissions
  const canCreate = useMemo(() => {
    return user?.scope_level === 'LOCAL' || user?.scope_level === 'ADMIN';
  }, [user]);

  const canEdit = useCallback((conflict: ConflictRecord): boolean => {
    if (!user) return false;
    if (user.scope_level === 'ADMIN') return true;
    return user.scope_level === 'LOCAL' && conflict.adp_user_id === user.id && conflict.status === 'draft';
  }, [user]);

  // Priority cases (high severity, open)
  const priorityCases = useMemo(() => {
    return conflicts
      .filter(c => 
        (c.severity === 'critique' || c.severity === 'elevee') && 
        (c.conflict_status === 'ouvert' || c.conflict_status === 'en_cours')
      )
      .slice(0, 5);
  }, [conflicts]);

  return {
    conflicts,
    loading,
    error,
    metrics,
    priorityCases,
    fetchConflicts,
    createConflict,
    updateConflict,
    resolveConflict,
    escalateConflict,
    deleteConflict,
    canCreate,
    canEdit,
  };
}
