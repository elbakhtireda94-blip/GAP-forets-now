import { useMemo } from 'react';
import { useDatabase, Conflict } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shared filters interface used by both Dashboard and ConflictsManagement
 */
export interface ConflictsFilters {
  dranef?: string;
  dpanef?: string;
  commune?: string;
  year?: string;
}

/**
 * Unified metrics structure for conflicts and oppositions
 */
export interface ConflictsMetrics {
  // Total counts (all entries in conflicts table)
  totalConflits: number;
  
  // Oppositions (type === 'Opposition' OR nature contains 'opposition')
  totalOppositions: number;
  oppositionsEnCours: number;
  oppositionsLevees: number;
  
  // Superficie calculations
  superficieOpposition: number;
  superficieLevee: number;
  
  // Debug info
  debugInfo: {
    filteredConflictsCount: number;
    oppositionsIds: string[];
    conflitsIds: string[];
  };
}

/**
 * Helper function to determine if a conflict is an "Opposition"
 * Uses the EXACT same logic for Dashboard and /oppositions page
 * 
 * After migration, all conflicts should have type set.
 * For backwards compatibility, still checks nature field.
 */
export const isOpposition = (conflict: Conflict): boolean => {
  // After migration, type field should be set - use it directly
  if (conflict.type === 'Opposition') return true;
  if (conflict.type === 'Conflit') return false;
  
  // Fallback for any unmigrated data - infer from nature
  const natureLower = (conflict.nature || '').toLowerCase();
  const oppositionPatterns = [
    'opposition',
    'privation du droit d\'usage',
    'opposition aux accès',
    'opposition des accès',
    'opposition aux travaux de reforestation',
    'conflit foncier',
    'exploitation illégale',
  ];
  
  return oppositionPatterns.some(pattern => natureLower.includes(pattern));
};

/**
 * Helper function to check if a conflict/opposition is resolved
 */
export const isResolved = (conflict: Conflict): boolean => {
  const status = conflict.status?.toLowerCase().trim() || '';
  return (
    status === 'résolu' ||
    status === 'resolu' ||
    status === 'levé' ||
    status === 'leve' ||
    status === 'clôturé' ||
    status === 'cloture'
  );
};

/**
 * Helper function to check if a conflict/opposition is in progress
 */
export const isEnCours = (conflict: Conflict): boolean => {
  const status = conflict.status?.toLowerCase().trim() || '';
  return (
    status === 'en cours' ||
    status === 'ouvert' ||
    (!isResolved({ ...conflict, status: conflict.status }))
  );
};

/**
 * Hook that provides unified conflict/opposition metrics
 * MUST be used by both Dashboard and ConflictsManagement for consistent KPIs
 */
export const useConflictsMetrics = (filters?: ConflictsFilters) => {
  const { applyScopeFilter } = useAuth();
  const { data, getConflicts } = useDatabase();

  const metrics = useMemo((): ConflictsMetrics => {
    // 1. Get all conflicts and apply RBAC scope filter
    let conflictsList = applyScopeFilter(getConflicts(), 'conflict');

    // 2. Apply geographic filters (same logic as useDashboardStats)
    if (filters?.dranef && filters.dranef !== 'all') {
      const communeIds = new Set<string>();
      data.regions.forEach(region => {
        region.dranef.forEach(dr => {
          if (dr.id === filters.dranef) {
            dr.dpanef.forEach(dp => {
              dp.communes.forEach(c => communeIds.add(c.id));
            });
          }
        });
      });
      conflictsList = conflictsList.filter(c => communeIds.has(c.commune_id));
    }

    if (filters?.dpanef && filters.dpanef !== 'all') {
      const communeIds = new Set<string>();
      data.regions.forEach(region => {
        region.dranef.forEach(dr => {
          dr.dpanef.forEach(dp => {
            if (dp.id === filters.dpanef) {
              dp.communes.forEach(c => communeIds.add(c.id));
            }
          });
        });
      });
      conflictsList = conflictsList.filter(c => communeIds.has(c.commune_id));
    }

    if (filters?.commune && filters.commune !== 'all') {
      conflictsList = conflictsList.filter(c => c.commune_id === filters.commune);
    }

    // 3. Apply year filter based on date_reported (same field as /oppositions)
    if (filters?.year && filters.year !== 'all') {
      const year = parseInt(filters.year);
      conflictsList = conflictsList.filter(c => {
        const conflictYear = new Date(c.date_reported).getFullYear();
        return conflictYear === year;
      });
    }

    // 4. Calculate metrics using unified logic
    const totalConflits = conflictsList.length;

    // Separate oppositions using unified isOpposition helper
    const oppositions = conflictsList.filter(isOpposition);
    const totalOppositions = oppositions.length;
    
    // Opposition status counts
    const oppositionsEnCours = oppositions.filter(c => !isResolved(c)).length;
    const oppositionsLevees = oppositions.filter(isResolved).length;

    // Superficie calculations (for oppositions only)
    const superficieOpposition = oppositions.reduce(
      (sum, c) => sum + (c.superficie_opposee_ha || 0), 
      0
    );
    const superficieLevee = oppositions
      .filter(isResolved)
      .reduce((sum, c) => sum + (c.superficie_opposee_ha || 0), 0);

    return {
      totalConflits,
      totalOppositions,
      oppositionsEnCours,
      oppositionsLevees,
      superficieOpposition,
      superficieLevee,
      debugInfo: {
        filteredConflictsCount: conflictsList.length,
        oppositionsIds: oppositions.map(o => o.id).slice(0, 10),
        conflitsIds: conflictsList.filter(c => !isOpposition(c)).map(c => c.id).slice(0, 10),
      },
    };
  }, [data, filters, getConflicts, applyScopeFilter]);

  return metrics;
};

export default useConflictsMetrics;
