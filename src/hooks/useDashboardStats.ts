import { useMemo } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useConflictsMetrics, ConflictsFilters, isOpposition } from './useConflictsMetrics';

// Utility: Normalize status strings for consistent comparisons
export const normalizeStatus = (status: string): string => {
  const normalized = status.toLowerCase().trim();
  
  // PDFCP statuses
  if (normalized.includes('validé') || normalized.includes('valide')) return 'Validé';
  if (normalized.includes('finalisé') || normalized.includes('finalise')) return 'Finalisé';
  if (normalized.includes('en cours')) return 'En cours';
  
  // Conflict/Opposition statuses
  if (normalized.includes('résolu') || normalized.includes('resolu')) return 'Résolu';
  
  return status;
};

export interface StatsFilters {
  dranef?: string;
  dpanef?: string;
  commune?: string;
  year?: string;
}

export interface DashboardStats {
  totalAdp: number;
  activeAdp: number;
  totalPdfcp: number;
  pdfcpValides: number;
  pdfcpEnCours: number;
  totalOdf: number;
  // Organisations structurelles counts
  organisationsOdf: number;
  organisationsCooperatives: number;
  organisationsAssociations: number;
  organisationsAgs: number;
  organisationsTotal: number;
  // Oppositions (type="Opposition")
  totalOppositions: number;
  oppositionsEnCours: number;
  oppositionsResolues: number;
  superficieOpposeeHa: number;
  superficieOpposeeLeveeHa: number;
  // Conflits (type absent ou type="Conflit")
  totalConflicts: number;
  conflictsEnCours: number;
  conflictsResolus: number;
  totalActivities: number;
  debugInfo: {
    n_ADP_filtré: number;
    n_PDFCP_filtré: number;
    n_ODF_filtré: number;
    n_opp_filtré: number;
    n_conflits_filtré: number;
    n_activities_filtré: number;
    ids_adp: string[];
    ids_pdfcp: string[];
    ids_oppositions: string[];
    ids_conflits: string[];
  };
}

export interface RegionStats {
  region: string;
  regionId: string;
  adp: number;
  pdfcp: number;
  odf: number;
  activites: number;
  oppositions: number;
  conflits: number;
}

export interface OrganisationCounts {
  odf: number;
  cooperatives: number;
  associations: number;
  ags: number;
  total: number;
}

export const useDashboardStats = (filters?: StatsFilters) => {
  const { applyScopeFilter } = useAuth();
  const { 
    data, 
    getAdps, 
    getPdfcs, 
    getActivities, 
    getConflicts,
    getOrganisations,
    getRegions,
    getDranefName,
    getDpanefName,
    getCommuneName,
  } = useDatabase();

  // Use the shared conflicts metrics hook for unified calculations
  const conflictsMetrics = useConflictsMetrics(filters as ConflictsFilters);

  // Get filter options from DatabaseContext
  const filterOptions = useMemo(() => {
    const regions = getRegions();
    
    // Extract unique DRANEF names
    const dranefList: { id: string; name: string }[] = [];
    regions.forEach(region => {
      region.dranef.forEach(dr => {
        dranefList.push({ id: dr.id, name: dr.name });
      });
    });

    // Get DPANEF based on selected DRANEF
    const getDpanefsForDranef = (dranefId: string) => {
      const dpanefList: { id: string; name: string }[] = [];
      regions.forEach(region => {
        region.dranef.forEach(dr => {
          if (dr.id === dranefId) {
            dr.dpanef.forEach(dp => {
              dpanefList.push({ id: dp.id, name: dp.name });
            });
          }
        });
      });
      return dpanefList;
    };

    // Get Communes based on selected DPANEF
    const getCommunesForDpanef = (dpanefId: string) => {
      const communeList: { id: string; name: string }[] = [];
      regions.forEach(region => {
        region.dranef.forEach(dr => {
          dr.dpanef.forEach(dp => {
            if (dp.id === dpanefId) {
              dp.communes.forEach(c => {
                communeList.push({ id: c.id, name: c.name });
              });
            }
          });
        });
      });
      return communeList;
    };

    return {
      dranefs: dranefList,
      getDpanefsForDranef,
      getCommunesForDpanef,
    };
  }, [data, getRegions]);

  // Calculate stats with RBAC scope filter + additional filters applied
  const stats = useMemo((): DashboardStats => {
    // First apply RBAC scope filter
    let adpList = applyScopeFilter(getAdps(), 'adp');
    let pdfcList = applyScopeFilter(getPdfcs(), 'pdfcp');
    let activitiesList = applyScopeFilter(getActivities(), 'activity');

    // Apply filters by geographic hierarchy (for non-conflict data)
    if (filters?.dranef && filters.dranef !== 'all') {
      adpList = adpList.filter(a => a.dranef_id === filters.dranef);
      
      // Get communes under this DRANEF
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
      
      pdfcList = pdfcList.filter(p => communeIds.has(p.commune_id));
      activitiesList = activitiesList.filter(a => communeIds.has(a.commune_id));
    }

    if (filters?.dpanef && filters.dpanef !== 'all') {
      adpList = adpList.filter(a => a.dpanef_id === filters.dpanef);
      
      // Get communes under this DPANEF
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
      
      pdfcList = pdfcList.filter(p => communeIds.has(p.commune_id));
      activitiesList = activitiesList.filter(a => communeIds.has(a.commune_id));
    }

    if (filters?.commune && filters.commune !== 'all') {
      adpList = adpList.filter(a => a.commune_id === filters.commune);
      pdfcList = pdfcList.filter(p => p.commune_id === filters.commune);
      activitiesList = activitiesList.filter(a => a.commune_id === filters.commune);
    }

    // Apply year filter
    if (filters?.year && filters.year !== 'all') {
      const year = parseInt(filters.year);
      pdfcList = pdfcList.filter(p => p.year_start <= year && p.year_end >= year);
      activitiesList = activitiesList.filter(a => {
        const actYear = new Date(a.date).getFullYear();
        return actYear === year;
      });
    }

    // Deduplicated counts using unique IDs
    const uniqueAdpIds = new Set(adpList.map(a => a.id));
    const uniquePdfcIds = new Set(pdfcList.map(p => p.id));
    
    const totalAdp = uniqueAdpIds.size;
    const activeAdp = adpList.filter(a => a.status === 'Actif').length;
    const totalPdfcp = uniquePdfcIds.size;
    
    // PDFCP by status
    const pdfcpValides = pdfcList.filter(p => {
      const normalized = normalizeStatus(p.status);
      return normalized === 'Validé' || normalized === 'Finalisé';
    }).length;
    
    const pdfcpEnCours = pdfcList.filter(p => {
      const normalized = normalizeStatus(p.status);
      return normalized === 'En cours';
    }).length;

    // ODF: Count ADPs that are active (as proxy for ODF constitué)
    const totalOdf = activeAdp;

    // Organisations structurelles - counts from DatabaseContext
    const allOrganisations = getOrganisations();
    const organisationsOdf = allOrganisations.filter(o => o.statut === 'ODF').length;
    const organisationsCooperatives = allOrganisations.filter(o => o.statut === 'Cooperative').length;
    const organisationsAssociations = allOrganisations.filter(o => o.statut === 'Association').length;
    const organisationsAgs = allOrganisations.filter(o => o.statut === 'AGS').length;
    const organisationsTotal = allOrganisations.length;

    // USE SHARED CONFLICTS METRICS (same logic as /oppositions page)
    // This ensures Dashboard KPIs match exactly with /oppositions
    const totalOppositions = conflictsMetrics.totalOppositions;
    const oppositionsEnCours = conflictsMetrics.oppositionsEnCours;
    const oppositionsResolues = conflictsMetrics.oppositionsLevees;
    const superficieOpposeeHa = conflictsMetrics.superficieOpposition;
    const superficieOpposeeLeveeHa = conflictsMetrics.superficieLevee;
    
    // Total conflicts = all entries in conflicts table (same as /oppositions totalConflits)
    const totalConflicts = conflictsMetrics.totalConflits;
    const conflictsEnCours = conflictsMetrics.totalConflits - conflictsMetrics.oppositionsLevees;
    const conflictsResolus = conflictsMetrics.oppositionsLevees; // Using shared resolved count

    const totalActivities = activitiesList.length;

    return {
      totalAdp,
      activeAdp,
      totalPdfcp,
      pdfcpValides,
      pdfcpEnCours,
      totalOdf,
      organisationsOdf,
      organisationsCooperatives,
      organisationsAssociations,
      organisationsAgs,
      organisationsTotal,
      totalOppositions,
      oppositionsEnCours,
      oppositionsResolues,
      superficieOpposeeHa,
      superficieOpposeeLeveeHa,
      totalConflicts,
      conflictsEnCours,
      conflictsResolus,
      totalActivities,
      debugInfo: {
        n_ADP_filtré: totalAdp,
        n_PDFCP_filtré: totalPdfcp,
        n_ODF_filtré: totalOdf,
        n_opp_filtré: totalOppositions,
        n_conflits_filtré: totalConflicts,
        n_activities_filtré: totalActivities,
        ids_adp: Array.from(uniqueAdpIds).slice(0, 10),
        ids_pdfcp: Array.from(uniquePdfcIds).slice(0, 10),
        ids_oppositions: conflictsMetrics.debugInfo.oppositionsIds,
        ids_conflits: conflictsMetrics.debugInfo.conflitsIds,
      },
    };
  }, [data, filters, getAdps, getPdfcs, getActivities, getOrganisations, applyScopeFilter, conflictsMetrics]);

  // Stats by region for map and table (also RBAC filtered)
  const regionStats = useMemo((): RegionStats[] => {
    const regions = getRegions();
    const adpList = applyScopeFilter(getAdps(), 'adp');
    const pdfcList = applyScopeFilter(getPdfcs(), 'pdfcp');
    const activitiesList = applyScopeFilter(getActivities(), 'activity');
    const conflictsList = applyScopeFilter(getConflicts(), 'conflict');

    return regions.flatMap(region => {
      return region.dranef.map(dranef => {
        // Get all commune IDs under this DRANEF
        const communeIds = new Set<string>();
        dranef.dpanef.forEach(dp => {
          dp.communes.forEach(c => communeIds.add(c.id));
        });

        // Filter data by communes
        const regionAdp = adpList.filter(a => a.dranef_id === dranef.id);
        const regionPdfc = pdfcList.filter(p => communeIds.has(p.commune_id));
        const regionActivities = activitiesList.filter(a => communeIds.has(a.commune_id));
        const regionConflictsList = conflictsList.filter(c => communeIds.has(c.commune_id));
        
        // Use shared isOpposition helper for consistent logic
        const regionOppositions = regionConflictsList.filter(isOpposition);
        const regionConflits = regionConflictsList.filter(c => !isOpposition(c));

        return {
          region: dranef.name.replace('DRANEF ', ''),
          regionId: dranef.id,
          adp: new Set(regionAdp.map(a => a.id)).size,
          pdfcp: new Set(regionPdfc.map(p => p.id)).size,
          odf: regionAdp.filter(a => a.status === 'Actif').length,
          activites: regionActivities.length,
          oppositions: regionOppositions.length,
          conflits: regionConflits.length,
        };
      });
    });
  }, [data, getRegions, getAdps, getPdfcs, getActivities, getConflicts, applyScopeFilter]);

  return {
    stats,
    regionStats,
    filterOptions,
  };
};

export default useDashboardStats;
