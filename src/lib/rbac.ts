// RBAC Types and Utilities
// Scope levels for territorial filtering
export type ScopeLevel = 'ADMIN' | 'NATIONAL' | 'REGIONAL' | 'PROVINCIAL' | 'LOCAL';

// Role labels mapping
export type RoleLabel =
  | 'DG'
  | 'Secrétaire général'
  | 'Directeur central'
  | 'Chef département central'
  | 'Chef service central'
  | 'DRANEF'
  | 'Chef service régional SAP'
  | 'DPANEF'
  | 'ADP';

// Menu item keys
export type MenuKey =
  | 'dashboard'
  | 'planning_intelligent'
  | 'gestion_adp'
  | 'pdfcp'
  | 'organisations'
  | 'activites'
  | 'conflits'
  | 'rapports'
  | 'cahier_journal'
  | 'admin_settings'
  | 'admin_unlock_requests'
  | 'admin_users'
  | 'admin_roles'
  | 'admin_access_codes'
  | 'admin_supabase_status'
  | 'debug_access';

// Menu access configuration
export const MENU_ACCESS: Record<MenuKey, ScopeLevel[]> = {
  dashboard: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  planning_intelligent: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  gestion_adp: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL'],
  pdfcp: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  organisations: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  activites: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  conflits: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  rapports: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  cahier_journal: ['ADMIN', 'NATIONAL', 'REGIONAL', 'PROVINCIAL', 'LOCAL'],
  admin_settings: ['ADMIN'],
  admin_unlock_requests: ['ADMIN'],
  admin_users: ['ADMIN', 'NATIONAL'],
  admin_roles: ['ADMIN'],
  admin_access_codes: ['ADMIN'],
  admin_supabase_status: ['ADMIN'],
  debug_access: ['ADMIN'],
};

// Role to scope level mapping
export const ROLE_TO_SCOPE: Record<string, ScopeLevel> = {
  // Admin
  'admin': 'ADMIN',
  // National scope
  'DG': 'NATIONAL',
  'Secrétaire général': 'NATIONAL',
  'Directeur central': 'NATIONAL',
  'Chef département central': 'NATIONAL',
  'Chef service central': 'NATIONAL',
  // Regional scope
  'DRANEF': 'REGIONAL',
  'Chef service régional SAP': 'REGIONAL',
  // Provincial scope
  'DPANEF': 'PROVINCIAL',
  // Local scope
  'ADP': 'LOCAL',
  'adp': 'LOCAL',
};

// User with RBAC fields
export interface RBACUser {
  id: string;
  name: string;
  email: string;
  role: 'adp' | 'admin';
  scope_level: ScopeLevel;
  role_label: string;
  dranef_id: string | null;
  dpanef_id: string | null;
  commune_ids: string[];
  region_id?: string;
}

// Entity types for filtering
export type EntityType = 'adp' | 'pdfcp' | 'activity' | 'conflict' | 'organisation' | 'commune';

// Generic interface for filterable entities
export interface FilterableEntity {
  id?: string;
  adp_id?: string;
  commune_id?: string;
  dranef_id?: string;
  dpanef_id?: string;
  region_id?: string;
  handled_by?: string;
  adp_responsable?: string;
}

// Check if user has required scope
export function hasScope(userScope: ScopeLevel, requiredScopes: ScopeLevel[]): boolean {
  return requiredScopes.includes(userScope);
}

// Check if user can access a menu item
export function canAccess(userScope: ScopeLevel, menuKey: MenuKey): boolean {
  const allowedScopes = MENU_ACCESS[menuKey];
  return allowedScopes ? allowedScopes.includes(userScope) : false;
}

// Derive scope level from role/role_label
export function deriveScopeLevel(role: string, roleLabel?: string): ScopeLevel {
  if (roleLabel && ROLE_TO_SCOPE[roleLabel]) {
    return ROLE_TO_SCOPE[roleLabel];
  }
  return ROLE_TO_SCOPE[role] || 'LOCAL';
}

// Interface for region lookup helper
export interface RegionLookup {
  getCommuneDpanefId: (communeId: string) => string | undefined;
  getCommuneDranefId: (communeId: string) => string | undefined;
  getDpanefDranefId: (dpanefId: string) => string | undefined;
}

// Apply scope filter to entity list
export function applyScopeFilter<T extends FilterableEntity>(
  items: T[],
  entityType: EntityType,
  user: RBACUser,
  regionLookup?: RegionLookup
): T[] {
  // ADMIN and NATIONAL have no restrictions
  if (user.scope_level === 'ADMIN' || user.scope_level === 'NATIONAL') {
    return items;
  }

  // REGIONAL: filter by dranef_id
  if (user.scope_level === 'REGIONAL' && user.dranef_id) {
    return items.filter((item) => {
      // Direct dranef_id match
      if (item.dranef_id) {
        return item.dranef_id === user.dranef_id;
      }
      // If entity has dpanef_id, check if it belongs to user's dranef
      if (item.dpanef_id && regionLookup) {
        const entityDranefId = regionLookup.getDpanefDranefId(item.dpanef_id);
        return entityDranefId === user.dranef_id;
      }
      // If entity has commune_id, trace up to dranef
      if (item.commune_id && regionLookup) {
        const entityDranefId = regionLookup.getCommuneDranefId(item.commune_id);
        return entityDranefId === user.dranef_id;
      }
      return false;
    });
  }

  // PROVINCIAL: filter by dpanef_id
  if (user.scope_level === 'PROVINCIAL' && user.dpanef_id) {
    return items.filter((item) => {
      // Direct dpanef_id match
      if (item.dpanef_id) {
        return item.dpanef_id === user.dpanef_id;
      }
      // If entity has commune_id, check if it belongs to user's dpanef
      if (item.commune_id && regionLookup) {
        const entityDpanefId = regionLookup.getCommuneDpanefId(item.commune_id);
        return entityDpanefId === user.dpanef_id;
      }
      return false;
    });
  }

  // LOCAL (ADP): filter by adp_id or commune_ids
  if (user.scope_level === 'LOCAL') {
    return items.filter((item) => {
      // Direct adp_id match (for activities, conflicts, etc.)
      if (item.adp_id && item.adp_id === user.id) {
        return true;
      }
      // Check handled_by for conflicts
      if (item.handled_by && item.handled_by === user.id) {
        return true;
      }
      // Check adp_responsable for PDFCP
      if (item.adp_responsable && item.adp_responsable === user.id) {
        return true;
      }
      // Commune-based filtering
      if (item.commune_id && user.commune_ids.length > 0) {
        return user.commune_ids.includes(item.commune_id);
      }
      return false;
    });
  }

  return items;
}

// Get scope level display label
export function getScopeLevelLabel(scope: ScopeLevel): string {
  const labels: Record<ScopeLevel, string> = {
    ADMIN: 'Administrateur',
    NATIONAL: 'National',
    REGIONAL: 'Régional',
    PROVINCIAL: 'Provincial',
    LOCAL: 'Local (ADP)',
  };
  return labels[scope];
}
