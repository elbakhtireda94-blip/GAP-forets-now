import { useMemo } from 'react';
import { useDatabase, Conflict, isDelitForestier, type ConflictAxe } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { isOpposition, isResolved } from '@/hooks/useConflictsMetrics';

/**
 * Extended dashboard filters for /oppositions page
 */
export interface ConflictsDashboardFilters {
  year?: string;
  dranef?: string;
  dpanef?: string;
  commune?: string;
  adp?: string;
  type?: 'all' | 'Conflit' | 'Opposition';
  axe?: 'all' | ConflictAxe;
  status?: string;
  severity?: string;
}

/**
 * Monthly data point for bar chart
 */
export interface MonthlyDataPoint {
  month: string;
  label: string;
  conflits: number;
  oppositions: number;
}

/**
 * Status distribution for donut chart
 */
export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

/**
 * Top item for rankings
 */
export interface TopItem {
  id: string;
  name: string;
  count: number;
}

/**
 * Priority case
 */
export interface PriorityCase {
  id: string;
  nature: string;
  description: string;
  severity: string;
  status: string;
  commune: string;
  dateReported: string;
  handledBy: string;
}

/**
 * Extended metrics for conflicts dashboard
 */
export interface ConflictsDashboardMetrics {
  // Row 1 KPIs
  totalConflits: number;
  totalOppositions: number;
  ouverts: number;
  resolus: number;
  escalades: number;
  tauxResolution: number;
  
  // Row 2 KPIs (Oppositions specific)
  oppositionsEnCours: number;
  oppositionsLevees: number;
  superficieOpposition: number;
  superficieLevee: number;

  // Suivi des délits forestiers + contribution approche participative
  totalDelits: number;
  delitsEnZonesParticipatives: number;
  delitsEnZonesSansParticipatif: number;
  /** Réduction estimée (%) des délits en zones à approche participative (ODF/coop.) vs zones sans. Null si calcul non significatif. */
  contributionApprocheParticipative: number | null;
  /** Nombre de communes avec au moins une org (ODF, coop.) dans le périmètre */
  nbCommunesAvecApprocheParticipative: number;
  nbCommunesSansApprocheParticipative: number;
  
  // Chart data
  monthlyData: MonthlyDataPoint[];
  statusDistribution: StatusDistribution[];
  topCommunes: TopItem[];
  topNatures: TopItem[];
  
  // Priority cases
  priorityCases: PriorityCase[];
  
  // Quality alerts
  qualityAlerts: {
    oppositionsSansSuperficie: number;
    resoluesSansDate: number;
    totalAlerts: number;
    details: Array<{ id: string; type: 'missing_superficie' | 'missing_resolution_date'; commune: string }>;
  };
  
  // Filtered list
  filteredConflicts: Conflict[];
}

/**
 * Hook providing comprehensive dashboard metrics for conflicts/oppositions
 * Uses exact same scope filtering as the main list for consistency
 */
export const useConflictsDashboard = (filters: ConflictsDashboardFilters) => {
  const { applyScopeFilter } = useAuth();
  const { data, getConflicts, getCommuneName, getAdpName } = useDatabase();

  const metrics = useMemo((): ConflictsDashboardMetrics => {
    // 1. Get all conflicts and apply RBAC scope filter
    let conflictsList = applyScopeFilter(getConflicts(), 'conflict');

    // 2. Apply geographic filters
    if (filters.dranef && filters.dranef !== 'all') {
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

    if (filters.dpanef && filters.dpanef !== 'all') {
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

    if (filters.commune && filters.commune !== 'all') {
      conflictsList = conflictsList.filter(c => c.commune_id === filters.commune);
    }

    // 3. Apply year filter
    if (filters.year && filters.year !== 'all') {
      const year = parseInt(filters.year);
      conflictsList = conflictsList.filter(c => {
        const conflictYear = new Date(c.date_reported).getFullYear();
        return conflictYear === year;
      });
    }

    // 4. Apply ADP filter
    if (filters.adp && filters.adp !== 'all') {
      conflictsList = conflictsList.filter(c => c.handled_by === filters.adp);
    }

    // 5. Apply type filter
    if (filters.type && filters.type !== 'all') {
      conflictsList = conflictsList.filter(c => {
        if (filters.type === 'Opposition') return isOpposition(c);
        if (filters.type === 'Conflit') return !isOpposition(c);
        return true;
      });
    }

    // 6. Apply status filter
    if (filters.status && filters.status !== 'all') {
      conflictsList = conflictsList.filter(c => c.status === filters.status);
    }

    // 7. Apply severity filter
    if (filters.severity && filters.severity !== 'all') {
      conflictsList = conflictsList.filter(c => c.severity === filters.severity);
    }

    // 8. Apply axe filter (ANEF–Population, Population–Population, ANEF–Institution)
    if (filters.axe && filters.axe !== 'all') {
      conflictsList = conflictsList.filter(c => c.axe === filters.axe);
    }

    // Calculate KPIs
    const totalConflits = conflictsList.length;
    const oppositions = conflictsList.filter(isOpposition);
    const totalOppositions = oppositions.length;
    
    const ouverts = conflictsList.filter(c => c.status === 'En cours').length;
    const resolus = conflictsList.filter(c => isResolved(c)).length;
    const escalades = conflictsList.filter(c => c.status === 'Escaladé').length;
    const tauxResolution = totalConflits > 0 ? Math.round((resolus / totalConflits) * 100) : 0;
    
    const oppositionsEnCours = oppositions.filter(c => !isResolved(c)).length;
    const oppositionsLevees = oppositions.filter(isResolved).length;
    const superficieOpposition = oppositions.reduce((sum, c) => sum + (c.superficie_opposee_ha || 0), 0);
    const superficieLevee = oppositions.filter(isResolved).reduce((sum, c) => sum + (c.superficie_opposee_ha || 0), 0);

    // Suivi des délits forestiers (natures = Exploitation illégale, etc.)
    const delits = conflictsList.filter(isDelitForestier);
    const totalDelits = delits.length;

    // Communes à approche participative = communes ayant au moins une organisation (ODF, Coopérative, etc.)
    const communesAvecOrg = new Set<string>(
      (data.organisations || []).filter(o => o.commune_id).map(o => o.commune_id!)
    );
    const delitsEnZonesParticipatives = delits.filter(c => communesAvecOrg.has(c.commune_id)).length;
    const delitsEnZonesSansParticipatif = totalDelits - delitsEnZonesParticipatives;

    // Communes dans le périmètre (filtré) : déduire des conflits pour avoir le dénominateur
    const communesDansPerimetre = new Set(conflictsList.map(c => c.commune_id));
    const nbCommunesAvecApprocheParticipative = [...communesDansPerimetre].filter(id => communesAvecOrg.has(id)).length;
    const nbCommunesSansApprocheParticipative = communesDansPerimetre.size - nbCommunesAvecApprocheParticipative;

    // Contribution approche participative : réduction relative du "taux de délits" (délits/commune) en zones avec ODF vs sans.
    // Formule : Réduction = (1 - (délits_p / max(1,nb_communes_p)) / (délits_s / max(1,nb_communes_s))) * 100
    let contributionApprocheParticipative: number | null = null;
    const tauxDenomSans = delitsEnZonesSansParticipatif / Math.max(1, nbCommunesSansApprocheParticipative);
    const tauxDenomPart = delitsEnZonesParticipatives / Math.max(1, nbCommunesAvecApprocheParticipative);
    if (tauxDenomSans > 0 && (delitsEnZonesParticipatives > 0 || delitsEnZonesSansParticipatif > 0)) {
      const tauxPart = tauxDenomPart;
      const tauxSans = tauxDenomSans;
      contributionApprocheParticipative = Math.round((1 - tauxPart / tauxSans) * 100);
      contributionApprocheParticipative = Math.max(-999, Math.min(999, contributionApprocheParticipative));
    }

    // Monthly data (last 6 months)
    const now = new Date();
    const monthlyData: MonthlyDataPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('fr-FR', { month: 'short' });
      
      const monthConflicts = conflictsList.filter(c => c.date_reported.startsWith(monthKey));
      monthlyData.push({
        month: monthKey,
        label,
        conflits: monthConflicts.filter(c => !isOpposition(c)).length,
        oppositions: monthConflicts.filter(isOpposition).length,
      });
    }

    // Status distribution
    const statusDistribution: StatusDistribution[] = [
      { name: 'En cours', value: ouverts, color: 'hsl(45, 93%, 47%)' },
      { name: 'Résolu', value: resolus, color: 'hsl(142, 71%, 45%)' },
      { name: 'Escaladé', value: escalades, color: 'hsl(0, 84%, 60%)' },
    ].filter(s => s.value > 0);

    // Top 5 communes
    const communeCounts: Record<string, number> = {};
    conflictsList.forEach(c => {
      communeCounts[c.commune_id] = (communeCounts[c.commune_id] || 0) + 1;
    });
    const topCommunes: TopItem[] = Object.entries(communeCounts)
      .map(([id, count]) => ({ id, name: getCommuneName(id) || id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top 5 natures
    const natureCounts: Record<string, number> = {};
    conflictsList.forEach(c => {
      const nature = c.nature || 'Non spécifié';
      natureCounts[nature] = (natureCounts[nature] || 0) + 1;
    });
    const topNatures: TopItem[] = Object.entries(natureCounts)
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Priority cases: En cours + Élevée/Critique
    const severityOrder: Record<string, number> = { 'Critique': 4, 'Élevée': 3, 'Moyenne': 2, 'Faible': 1 };
    const priorityCases: PriorityCase[] = conflictsList
      .filter(c => c.status === 'En cours' && (c.severity === 'Élevée' || c.severity === 'Critique'))
      .sort((a, b) => {
        const sevDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.date_reported).getTime() - new Date(a.date_reported).getTime();
      })
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        nature: c.nature,
        description: c.description,
        severity: c.severity,
        status: c.status,
        commune: getCommuneName(c.commune_id) || c.commune_id,
        dateReported: c.date_reported,
        handledBy: getAdpName(c.handled_by) || c.handled_by || '-',
      }));

    // Quality alerts
    const oppositionsSansSuperficie = oppositions.filter(c => !c.superficie_opposee_ha || c.superficie_opposee_ha <= 0);
    const resoluesSansDate = oppositions.filter(c => isResolved(c) && !c.resolution_date);
    
    const qualityAlertDetails: Array<{ id: string; type: 'missing_superficie' | 'missing_resolution_date'; commune: string }> = [
      ...oppositionsSansSuperficie.map(c => ({ id: c.id, type: 'missing_superficie' as const, commune: getCommuneName(c.commune_id) || c.commune_id })),
      ...resoluesSansDate.map(c => ({ id: c.id, type: 'missing_resolution_date' as const, commune: getCommuneName(c.commune_id) || c.commune_id })),
    ];

    const qualityAlerts = {
      oppositionsSansSuperficie: oppositionsSansSuperficie.length,
      resoluesSansDate: resoluesSansDate.length,
      totalAlerts: oppositionsSansSuperficie.length + resoluesSansDate.length,
      details: qualityAlertDetails.slice(0, 10), // Limit to first 10 for display
    };

    return {
      totalConflits,
      totalOppositions,
      ouverts,
      resolus,
      escalades,
      tauxResolution,
      oppositionsEnCours,
      oppositionsLevees,
      superficieOpposition,
      superficieLevee,
      totalDelits,
      delitsEnZonesParticipatives,
      delitsEnZonesSansParticipatif,
      contributionApprocheParticipative,
      nbCommunesAvecApprocheParticipative,
      nbCommunesSansApprocheParticipative,
      monthlyData,
      statusDistribution,
      topCommunes,
      topNatures,
      priorityCases,
      qualityAlerts,
      filteredConflicts: conflictsList,
    };
  }, [data, filters, getConflicts, applyScopeFilter, getCommuneName, getAdpName]);

  return metrics;
};

export default useConflictsDashboard;
