import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScopeLevel } from '@/lib/rbac';

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role_label: string | null;
  dranef_id: string | null;
  dpanef_id: string | null;
  commune_ids: string[];
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  scope_level: ScopeLevel;
  is_active: boolean;
  dranef_name?: string;
  dpanef_name?: string;
}

export const useUsersManagement = () => {
  return useQuery({
    queryKey: ['users-management'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Fetch DRANEF names
      const { data: dranefs, error: dranefsError } = await supabase
        .from('dranef')
        .select('id, name');
      
      if (dranefsError) throw dranefsError;

      // Fetch DPANEF names
      const { data: dpanefs, error: dpanefsError } = await supabase
        .from('dpanef')
        .select('id, name');
      
      if (dpanefsError) throw dpanefsError;

      // Create lookup maps
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role as ScopeLevel]) || []);
      const dranefsMap = new Map(dranefs?.map(d => [d.id, d.name]) || []);
      const dpanefsMap = new Map(dpanefs?.map(d => [d.id, d.name]) || []);

      // Combine data
      return (profiles || []).map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role_label: profile.role_label,
        dranef_id: profile.dranef_id,
        dpanef_id: profile.dpanef_id,
        commune_ids: profile.commune_ids || [],
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        scope_level: rolesMap.get(profile.user_id) || 'LOCAL',
        is_active: true, // Default to active since we don't have this field yet
        dranef_name: profile.dranef_id ? dranefsMap.get(profile.dranef_id) : undefined,
        dpanef_name: profile.dpanef_id ? dpanefsMap.get(profile.dpanef_id) : undefined,
      }));
    },
  });
};
