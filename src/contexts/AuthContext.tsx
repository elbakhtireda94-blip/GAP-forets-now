import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useDatabase } from './DatabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useMySQLBackend, login as mysqlLogin, getProfile as mysqlGetProfile, logout as mysqlLogout, getToken } from '@/integrations/mysql-api/client';
import {
  ScopeLevel,
  MenuKey,
  EntityType,
  FilterableEntity,
  hasScope as rbacHasScope,
  canAccess as rbacCanAccess,
  applyScopeFilter as rbacApplyScopeFilter,
  RegionLookup,
} from '@/lib/rbac';

// User interface with RBAC fields
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'adp' | 'admin';
  // RBAC fields
  scope_level: ScopeLevel;
  role_label: string;
  dranef_id: string | null;
  dpanef_id: string | null;
  commune_ids: string[];
  // Auth user ID (Supabase)
  auth_user_id?: string;
  // Backward compatible fields (legacy)
  dranef?: string;
  dpanef?: string;
  commune?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean | 'profile_error' | { error: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  // RBAC methods
  hasScope: (requiredScopes: ScopeLevel[]) => boolean;
  canAccess: (menuKey: MenuKey) => boolean;
  applyScopeFilter: <T extends FilterableEntity>(items: T[], entityType: EntityType) => T[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map app_role enum to ScopeLevel
const mapRoleToScope = (role: string | null): ScopeLevel => {
  if (!role) return 'LOCAL';
  const map: Record<string, ScopeLevel> = {
    'ADMIN': 'ADMIN',
    'NATIONAL': 'NATIONAL',
    'REGIONAL': 'REGIONAL',
    'PROVINCIAL': 'PROVINCIAL',
    'LOCAL': 'LOCAL',
  };
  return map[role] || 'LOCAL';
};

// Determine 'admin' or 'adp' role from scope
const scopeToRole = (scope: ScopeLevel): 'admin' | 'adp' => {
  return scope === 'LOCAL' ? 'adp' : 'admin';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const database = useDatabase();

  // Build region lookup helper for scope filtering
  const regionLookup: RegionLookup = useMemo(() => {
    const regions = database.getRegions();

    const communeToDpanef: Record<string, string> = {};
    const communeToDranef: Record<string, string> = {};
    const dpanefToDranef: Record<string, string> = {};

    regions.forEach((region) => {
      region.dranef.forEach((dranef) => {
        dranef.dpanef.forEach((dpanef) => {
          dpanefToDranef[dpanef.id] = dranef.id;
          dpanef.communes.forEach((commune) => {
            communeToDpanef[commune.id] = dpanef.id;
            communeToDranef[commune.id] = dranef.id;
          });
        });
      });
    });

    return {
      getCommuneDpanefId: (communeId: string) => communeToDpanef[communeId],
      getCommuneDranefId: (communeId: string) => communeToDranef[communeId],
      getDpanefDranefId: (dpanefId: string) => dpanefToDranef[dpanefId],
    };
  }, [database]);

  // Fetch user profile from Supabase or MySQL backend
  const fetchUserProfile = useCallback(async (authUserId: string): Promise<User | null> => {
    try {
      if (useMySQLBackend()) {
        const profileData = await mysqlGetProfile();
        if (!profileData || profileData.length === 0) return null;
        const profile = profileData[0];
        const dranefId = profile.dranef_id || null;
        const dpanefId = profile.dpanef_id || null;
        const communeIds = profile.commune_ids || [];
        return {
          id: profile.id,
          name: profile.full_name || 'Utilisateur',
          email: profile.email || '',
          role: scopeToRole(profile.scope_level as ScopeLevel),
          scope_level: mapRoleToScope(profile.scope_level),
          role_label: profile.role_label || profile.scope_level || 'Utilisateur',
          dranef_id: dranefId,
          dpanef_id: dpanefId,
          commune_ids: communeIds,
          auth_user_id: authUserId,
          dranef: dranefId || '',
          dpanef: dpanefId || '',
          commune: communeIds[0] || '',
        };
      }
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_user_profile', { _user_id: authUserId });

      if (profileError || !profileData || profileData.length === 0) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      const profile = profileData[0];
      const dranefId = profile.dranef_id || null;
      const dpanefId = profile.dpanef_id || null;
      const communeIds = profile.commune_ids || [];
      
      return {
        id: profile.id,
        name: profile.full_name || 'Utilisateur',
        email: profile.email || '',
        role: scopeToRole(profile.scope_level),
        scope_level: mapRoleToScope(profile.scope_level),
        role_label: profile.role_label || profile.scope_level || 'Utilisateur',
        dranef_id: dranefId,
        dpanef_id: dpanefId,
        commune_ids: communeIds,
        auth_user_id: authUserId,
        // Backward compatible fields
        dranef: dranefId || '',
        dpanef: dpanefId || '',
        commune: communeIds[0] || '',
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  // Initialize auth state (Supabase or MySQL backend)
  useEffect(() => {
    if (useMySQLBackend()) {
      // Écouter les événements d'erreur 401 pour déconnecter automatiquement
      const handleUnauthorized = () => {
        console.log('[Auth] Unauthorized event received, logging out...');
        setUser(null);
        setSession(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      };
      window.addEventListener('auth:unauthorized', handleUnauthorized);
      
      const token = getToken();
      console.log('[Auth] Initializing MySQL auth, token present:', !!token);
      if (token) {
        mysqlGetProfile().then((profileData) => {
          if (profileData && profileData.length > 0) {
            const profile = profileData[0];
            const authUserId = (profile as { user_id?: string }).user_id || (profile as { id: string }).id;
            const dranefId = profile.dranef_id || null;
            const dpanefId = profile.dpanef_id || null;
            const communeIds = profile.commune_ids || [];
            const u: User = {
              id: profile.id,
              name: profile.full_name || 'Utilisateur',
              email: profile.email || '',
              role: scopeToRole(profile.scope_level as ScopeLevel),
              scope_level: mapRoleToScope(profile.scope_level),
              role_label: profile.role_label || profile.scope_level || 'Utilisateur',
              dranef_id: dranefId,
              dpanef_id: dpanefId,
              commune_ids: communeIds,
              auth_user_id: authUserId,
              dranef: dranefId || '',
              dpanef: dpanefId || '',
              commune: communeIds[0] || '',
            };
            setUser(u);
            setSession({ access_token: token, user: { id: authUserId, email: u.email } } as Session);
          }
        }).catch((err) => {
          console.error('[Auth] Failed to fetch profile:', err);
          // Si erreur 401, nettoyer le token
          if (err?.message?.includes('Unauthorized') || err?.message?.includes('401')) {
            console.log('[Auth] Profile fetch returned 401, clearing token');
            setUser(null);
            setSession(null);
          }
        }).finally(() => setIsLoading(false));
      } else {
        console.log('[Auth] No token found, user not authenticated');
        setIsLoading(false);
      }
      return () => {
        window.removeEventListener('auth:unauthorized', handleUnauthorized);
      };
    }
    // Set up auth state listener FIRST (Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      
      if (newSession?.user) {
        // Defer profile fetch to avoid deadlock
        setTimeout(() => {
          fetchUserProfile(newSession.user.id).then(setUser);
        }, 0);
      } else {
        setUser(null);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user.id).then((fetchedUser) => {
          setUser(fetchedUser);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const login = async (email: string, password: string): Promise<boolean | 'profile_error'> => {
    setIsLoading(true);
    console.log('[Auth] Login attempt for:', email, 'Backend:', useMySQLBackend() ? 'MySQL' : 'Supabase');

    if (useMySQLBackend()) {
      const result = await mysqlLogin(email, password);
      if ('error' in result) {
        console.error('[Auth] Login failed:', result.error);
        setIsLoading(false);
        return { error: result.error };
      }
      const data = result;
      console.log('[Auth] Login successful, fetching profile...');
      const tokenAfterLogin = getToken();
      if (!tokenAfterLogin) {
        console.error('[Auth] ⚠️ CRITICAL: Token not found after login!');
      } else {
        console.log('[Auth] ✓ Token confirmed in localStorage after login');
      }
      const fetchedUser = await fetchUserProfile(data.user.id);
      if (!fetchedUser) {
        console.error('[Auth] Failed to fetch user profile after login - run node server/seed.js');
        setIsLoading(false);
        return 'profile_error';
      }
      setUser(fetchedUser);
      setSession({ access_token: data.access_token, user: data.user } as Session);
      console.log('[Auth] ✓ Login complete, user set:', fetchedUser.email);
      setIsLoading(false);
      return true;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setIsLoading(false);
      return false;
    }

    // Session will be set by onAuthStateChange
    setIsLoading(false);
    return true;
  };

  const logout = async () => {
    if (useMySQLBackend()) await mysqlLogout();
    else await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // RBAC: Check if user has required scope
  const hasScope = useCallback(
    (requiredScopes: ScopeLevel[]): boolean => {
      if (!user) return false;
      return rbacHasScope(user.scope_level, requiredScopes);
    },
    [user]
  );

  // RBAC: Check if user can access a menu item
  const canAccess = useCallback(
    (menuKey: MenuKey): boolean => {
      if (!user) return false;
      return rbacCanAccess(user.scope_level, menuKey);
    },
    [user]
  );

  // RBAC: Apply scope filter to entity list
  const applyScopeFilter = useCallback(
    <T extends FilterableEntity>(items: T[], entityType: EntityType): T[] => {
      if (!user) return [];
      const rbacUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        scope_level: user.scope_level,
        role_label: user.role_label,
        dranef_id: user.dranef_id,
        dpanef_id: user.dpanef_id,
        commune_ids: user.commune_ids,
      };
      return rbacApplyScopeFilter(items, entityType, rbacUser, regionLookup);
    },
    [user, regionLookup]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user && !!session,
        login,
        logout,
        isLoading,
        hasScope,
        canAccess,
        applyScopeFilter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
