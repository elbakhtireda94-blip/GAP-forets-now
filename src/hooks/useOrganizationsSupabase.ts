import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types from Supabase schema
export type OrganizationType = 'ODF' | 'cooperative' | 'association' | 'AGS';
export type OrganizationStatus = 'active' | 'inactive' | 'en_creation' | 'dissoute';
export type ValidationStatus = 'draft' | 'submitted' | 'validated' | 'archived';

export interface OrganizationRecord {
  id: string;
  name: string;
  organization_type: OrganizationType;
  organization_status: OrganizationStatus | null;
  creation_date: string | null;
  registration_number: string | null;
  president_name: string | null;
  contact_phone: string | null;
  members_count: number | null;
  activity_domains: string[] | null;
  
  // Location
  commune_id: string | null;
  dpanef_id: string;
  dranef_id: string;
  
  // Ownership
  adp_user_id: string | null;
  
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
export const organizationTypeLabels: Record<OrganizationType, string> = {
  ODF: 'ODF',
  cooperative: 'Coopérative forestière',
  association: 'Association',
  AGS: 'AGS',
};

export const organizationStatusLabels: Record<OrganizationStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  en_creation: 'En création',
  dissoute: 'Dissoute',
};

export const organizationStatusColors: Record<OrganizationStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  en_creation: 'bg-blue-100 text-blue-700',
  dissoute: 'bg-red-100 text-red-700',
};

// Map database row
function mapRowToOrganization(row: Record<string, unknown>): OrganizationRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    organization_type: row.organization_type as OrganizationType,
    organization_status: row.organization_status as OrganizationStatus | null,
    creation_date: row.creation_date as string | null,
    registration_number: row.registration_number as string | null,
    president_name: row.president_name as string | null,
    contact_phone: row.contact_phone as string | null,
    members_count: row.members_count as number | null,
    activity_domains: row.activity_domains as string[] | null,
    commune_id: row.commune_id as string | null,
    dpanef_id: row.dpanef_id as string,
    dranef_id: row.dranef_id as string,
    adp_user_id: row.adp_user_id as string | null,
    status: (row.status as ValidationStatus) || 'draft',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
    validated_at: row.validated_at as string | null,
    validated_by: row.validated_by as string | null,
  };
}

export type OrganizationFormData = Omit<OrganizationRecord, 
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'validated_at' | 'validated_by' | 'dranef_id' | 'dpanef_id' | 'adp_user_id'
>;

export interface OrganizationMetrics {
  total: number;
  byType: Record<OrganizationType, number>;
  byStatus: Record<OrganizationStatus, number>;
  totalMembers: number;
  avgMembers: number;
  activeRate: number;
}

export function useOrganizationsSupabase() {
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch organizations with RBAC
  const fetchOrganizations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      } else if (user.scope_level === 'PROVINCIAL' && user.dpanef_id) {
        query = query.eq('dpanef_id', user.dpanef_id);
      } else if (user.scope_level === 'REGIONAL' && user.dranef_id) {
        query = query.eq('dranef_id', user.dranef_id);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mapped = (data || []).map(row => mapRowToOrganization(row as Record<string, unknown>));
      setOrganizations(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
      console.error('Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Create organization
  const createOrganization = useCallback(async (data: OrganizationFormData): Promise<OrganizationRecord | null> => {
    if (!user) {
      toast({ title: 'Accès refusé', variant: 'destructive' });
      return null;
    }

    try {
      const insertData = {
        name: data.name,
        organization_type: data.organization_type,
        organization_status: data.organization_status || 'active',
        creation_date: data.creation_date,
        registration_number: data.registration_number,
        president_name: data.president_name,
        contact_phone: data.contact_phone,
        members_count: data.members_count,
        activity_domains: data.activity_domains,
        commune_id: data.commune_id,
        dranef_id: user.dranef_id || '',
        dpanef_id: user.dpanef_id || '',
        adp_user_id: user.id,
        status: data.status || 'draft',
      };

      const { data: newOrg, error: insertError } = await supabase
        .from('organizations')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      const mapped = mapRowToOrganization(newOrg as Record<string, unknown>);
      setOrganizations(prev => [mapped, ...prev]);
      
      toast({ title: 'Organisation créée' });
      return mapped;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return null;
    }
  }, [user, toast]);

  // Update organization
  const updateOrganization = useCallback(async (id: string, data: Partial<OrganizationFormData>): Promise<boolean> => {
    if (!user) return false;

    try {
      let query = supabase.from('organizations').update(data).eq('id', id);
      
      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      }

      const { data: updated, error: updateError } = await query.select().single();
      if (updateError) throw updateError;

      const mapped = mapRowToOrganization(updated as Record<string, unknown>);
      setOrganizations(prev => prev.map(o => o.id === id ? mapped : o));
      
      toast({ title: 'Organisation modifiée' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return false;
    }
  }, [user, toast]);

  // Delete organization
  const deleteOrganization = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      let query = supabase.from('organizations').delete().eq('id', id);
      if (user.scope_level === 'LOCAL') {
        query = query.eq('adp_user_id', user.id);
      }

      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;

      setOrganizations(prev => prev.filter(o => o.id !== id));
      toast({ title: 'Organisation supprimée' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
      return false;
    }
  }, [user, toast]);

  // Metrics
  const metrics = useMemo((): OrganizationMetrics => {
    const total = organizations.length;
    
    const byType: Record<OrganizationType, number> = {
      ODF: 0,
      cooperative: 0,
      association: 0,
      AGS: 0,
    };
    organizations.forEach(o => {
      byType[o.organization_type]++;
    });
    
    const byStatus: Record<OrganizationStatus, number> = {
      active: 0,
      inactive: 0,
      en_creation: 0,
      dissoute: 0,
    };
    organizations.forEach(o => {
      if (o.organization_status) byStatus[o.organization_status]++;
    });
    
    const totalMembers = organizations.reduce((sum, o) => sum + (o.members_count || 0), 0);
    const avgMembers = total > 0 ? Math.round(totalMembers / total) : 0;
    
    const activeRate = total > 0 ? Math.round((byStatus.active / total) * 100) : 0;

    return {
      total,
      byType,
      byStatus,
      totalMembers,
      avgMembers,
      activeRate,
    };
  }, [organizations]);

  // Permissions
  const canCreate = useMemo(() => {
    return user?.scope_level === 'LOCAL' || user?.scope_level === 'ADMIN';
  }, [user]);

  const canEdit = useCallback((org: OrganizationRecord): boolean => {
    if (!user) return false;
    if (user.scope_level === 'ADMIN') return true;
    return user.scope_level === 'LOCAL' && org.adp_user_id === user.id && org.status === 'draft';
  }, [user]);

  return {
    organizations,
    loading,
    error,
    metrics,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    canCreate,
    canEdit,
  };
}
