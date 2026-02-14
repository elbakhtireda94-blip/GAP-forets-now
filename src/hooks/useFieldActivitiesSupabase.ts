import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

// Types for field activities from Supabase
export type ActivityType = 
  | 'sensibilisation'
  | 'formation'
  | 'reunion'
  | 'visite_terrain'
  | 'distribution'
  | 'suivi_projet'
  | 'mediation';

export type ValidationStatus = 'draft' | 'submitted' | 'validated' | 'archived';

export interface ActivityAttachment {
  type: 'image' | 'pdf';
  url: string;
  filename: string;
  uploaded_at: string;
  storagePath?: string;
}

export interface FieldActivity {
  id: string;
  title: string;
  activity_type: ActivityType;
  activity_date: string;
  description: string | null;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  commune_id: string | null;
  dpanef_id: string;
  dranef_id: string;
  adp_user_id: string;
  pdfcp_id: string | null;
  participants_count: number | null;
  beneficiaries_count: number | null;
  object: string | null;
  occasion: string | null;
  attachments: ActivityAttachment[];
  status: ValidationStatus;
  created_at: string;
  updated_at: string;
  validated_at: string | null;
  validated_by: string | null;
}

// Labels for activity types
export const activityTypeLabels: Record<ActivityType, string> = {
  sensibilisation: 'Sensibilisation',
  formation: 'Formation',
  reunion: 'Réunion',
  visite_terrain: 'Visite terrain',
  distribution: 'Distribution',
  suivi_projet: 'Suivi projet',
  mediation: 'Médiation',
};

// Colors for activity types
export const activityTypeColors: Record<ActivityType, string> = {
  sensibilisation: 'bg-blue-500/20 text-blue-700 border-blue-300',
  formation: 'bg-purple-500/20 text-purple-700 border-purple-300',
  reunion: 'bg-amber-500/20 text-amber-700 border-amber-300',
  visite_terrain: 'bg-emerald-500/20 text-emerald-700 border-emerald-300',
  distribution: 'bg-green-500/20 text-green-700 border-green-300',
  suivi_projet: 'bg-cyan-500/20 text-cyan-700 border-cyan-300',
  mediation: 'bg-rose-500/20 text-rose-700 border-rose-300',
};

// Status labels
export const statusLabels: Record<ValidationStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  validated: 'Validé',
  archived: 'Archivé',
};

// Status colors
export const statusColors: Record<ValidationStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  validated: 'bg-green-100 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
};

// Helper to parse attachments from JSON
function parseAttachments(data: Json | undefined | null): ActivityAttachment[] {
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as ActivityAttachment[];
}

// Map database row to FieldActivity
function mapRowToActivity(row: Record<string, unknown>): FieldActivity {
  return {
    id: row.id as string,
    title: row.title as string,
    activity_type: row.activity_type as ActivityType,
    activity_date: row.activity_date as string,
    description: row.description as string | null,
    location_text: row.location_text as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    commune_id: row.commune_id as string | null,
    dpanef_id: row.dpanef_id as string,
    dranef_id: row.dranef_id as string,
    adp_user_id: row.adp_user_id as string,
    pdfcp_id: row.pdfcp_id as string | null,
    participants_count: row.participants_count as number | null,
    beneficiaries_count: row.beneficiaries_count as number | null,
    object: row.object as string | null,
    occasion: row.occasion as string | null,
    attachments: parseAttachments(row.attachments as Json),
    status: (row.status as ValidationStatus) || 'draft',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    validated_at: row.validated_at as string | null,
    validated_by: row.validated_by as string | null,
  };
}

export type ActivityFormData = Omit<FieldActivity, 'id' | 'created_at' | 'updated_at' | 'validated_at' | 'validated_by' | 'dranef_id' | 'dpanef_id' | 'adp_user_id'>;

export function useFieldActivitiesSupabase() {
  const [activities, setActivities] = useState<FieldActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all activities with RBAC filtering
  const fetchActivities = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('field_activities')
        .select('*')
        .order('activity_date', { ascending: false });

      // Apply RBAC filtering based on scope_level
      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      } else if (user.scope_level === 'PROVINCIAL' && user.dpanef_id) {
        query = query.eq('dpanef_id', user.dpanef_id);
      } else if (user.scope_level === 'REGIONAL' && user.dranef_id) {
        query = query.eq('dranef_id', user.dranef_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped = (data || []).map(row => mapRowToActivity(row as Record<string, unknown>));
      setActivities(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('Error fetching field activities:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Create new activity
  const createActivity = useCallback(async (data: ActivityFormData): Promise<FieldActivity | null> => {
    if (!user) {
      toast({ title: 'Accès refusé', description: 'Vous devez être connecté.', variant: 'destructive' });
      return null;
    }

    if (user.scope_level !== 'LOCAL' && user.scope_level !== 'ADMIN') {
      toast({ title: 'Accès refusé', description: 'Seuls les ADP peuvent créer des activités.', variant: 'destructive' });
      return null;
    }

    try {
      const insertData = {
        title: data.title,
        activity_type: data.activity_type,
        activity_date: data.activity_date,
        description: data.description,
        location_text: data.location_text,
        latitude: data.latitude,
        longitude: data.longitude,
        commune_id: data.commune_id,
        dranef_id: user.dranef_id || '',
        dpanef_id: user.dpanef_id || '',
        adp_user_id: user.id,
        pdfcp_id: data.pdfcp_id,
        participants_count: data.participants_count,
        beneficiaries_count: data.beneficiaries_count,
        object: data.object,
        occasion: data.occasion,
        attachments: JSON.parse(JSON.stringify(data.attachments || [])),
        status: data.status || 'draft',
      };

      const { data: newActivity, error: insertError } = await supabase
        .from('field_activities')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      const mapped = mapRowToActivity(newActivity as Record<string, unknown>);
      setActivities(prev => [mapped, ...prev]);
      
      toast({
        title: data.status === 'draft' ? 'Brouillon enregistré' : 'Activité créée',
        description: data.status === 'draft' 
          ? 'L\'activité est sauvegardée en brouillon.' 
          : 'Votre activité a été enregistrée.',
      });
      
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      console.error('Error creating field activity:', err);
      return null;
    }
  }, [user, toast]);

  // Update activity
  const updateActivity = useCallback(async (id: string, data: Partial<ActivityFormData>): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Accès refusé', description: 'Vous devez être connecté.', variant: 'destructive' });
      return false;
    }

    try {
      const updateData: Record<string, unknown> = { ...data };
      if (data.attachments) {
        updateData.attachments = JSON.parse(JSON.stringify(data.attachments));
      }

      let query = supabase
        .from('field_activities')
        .update(updateData)
        .eq('id', id);

      // Only allow editing own activities for LOCAL users
      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      }

      const { data: updated, error: updateError } = await query.select().single();

      if (updateError) throw updateError;

      const mapped = mapRowToActivity(updated as Record<string, unknown>);
      setActivities(prev => prev.map(a => a.id === id ? mapped : a));
      
      toast({ title: 'Activité modifiée', description: 'Les modifications ont été enregistrées.' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la modification';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      console.error('Error updating field activity:', err);
      return false;
    }
  }, [user, toast]);

  // Submit activity for validation
  const submitActivity = useCallback(async (id: string): Promise<boolean> => {
    return updateActivity(id, { status: 'submitted' });
  }, [updateActivity]);

  // Validate activity (PROVINCIAL or higher)
  const validateActivity = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    const canValidate = ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL'].includes(user.scope_level || '');
    if (!canValidate) {
      toast({ title: 'Accès refusé', description: 'Vous n\'avez pas les droits de validation.', variant: 'destructive' });
      return false;
    }

    try {
      const { data: updated, error: updateError } = await supabase
        .from('field_activities')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const mapped = mapRowToActivity(updated as Record<string, unknown>);
      setActivities(prev => prev.map(a => a.id === id ? mapped : a));
      
      toast({ title: 'Activité validée', description: 'L\'activité a été validée.' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la validation';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return false;
    }
  }, [user, toast]);

  // Delete activity
  const deleteActivity = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      toast({ title: 'Accès refusé', description: 'Vous devez être connecté.', variant: 'destructive' });
      return false;
    }

    try {
      let query = supabase
        .from('field_activities')
        .delete()
        .eq('id', id);

      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      }

      const { error: deleteError } = await query;

      if (deleteError) throw deleteError;

      setActivities(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Activité supprimée', description: 'L\'activité a été supprimée.' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return false;
    }
  }, [user, toast]);

  // Dashboard metrics
  const metrics = useMemo(() => {
    const total = activities.length;
    const drafts = activities.filter(a => a.status === 'draft').length;
    const submitted = activities.filter(a => a.status === 'submitted').length;
    const validated = activities.filter(a => a.status === 'validated').length;
    
    const thisMonth = activities.filter(a => {
      const actDate = new Date(a.activity_date);
      const now = new Date();
      return actDate.getMonth() === now.getMonth() && actDate.getFullYear() === now.getFullYear();
    }).length;
    
    const totalParticipants = activities.reduce((sum, a) => sum + (a.participants_count || 0), 0);
    const avgParticipants = total > 0 ? Math.round(totalParticipants / total) : 0;
    
    const uniqueCommunes = new Set(activities.map(a => a.commune_id).filter(Boolean)).size;
    
    const submissionRate = total > 0 ? Math.round(((submitted + validated) / total) * 100) : 0;
    const validationRate = (submitted + validated) > 0 ? Math.round((validated / (submitted + validated)) * 100) : 0;

    // By type
    const byType: Record<ActivityType, number> = {
      sensibilisation: 0,
      formation: 0,
      reunion: 0,
      visite_terrain: 0,
      distribution: 0,
      suivi_projet: 0,
      mediation: 0,
    };
    activities.forEach(a => {
      if (byType[a.activity_type] !== undefined) {
        byType[a.activity_type]++;
      }
    });

    return {
      total,
      drafts,
      submitted,
      validated,
      thisMonth,
      totalParticipants,
      avgParticipants,
      uniqueCommunes,
      submissionRate,
      validationRate,
      byType,
    };
  }, [activities]);

  // Permission checks
  const canCreate = useMemo(() => {
    return user?.scope_level === 'LOCAL' || user?.scope_level === 'ADMIN';
  }, [user]);

  const canEdit = useCallback((activity: FieldActivity): boolean => {
    if (!user) return false;
    if (user.scope_level === 'ADMIN') return true;
    return user.scope_level === 'LOCAL' && activity.adp_user_id === user.id && activity.status === 'draft';
  }, [user]);

  const canValidate = useMemo(() => {
    return ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL'].includes(user?.scope_level || '');
  }, [user]);

  return {
    activities,
    loading,
    error,
    metrics,
    fetchActivities,
    createActivity,
    updateActivity,
    submitActivity,
    validateActivity,
    deleteActivity,
    canCreate,
    canEdit,
    canValidate,
  };
}
