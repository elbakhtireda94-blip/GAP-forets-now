// Types pour le module État Comparatif PDFCP vs CP vs Réalisé
// Basé sur la structure commune/périmètre/site

import zonesData from './zones.json';
import pdfcpPrevusData from './pdfcp_prevus.json';
import cpProgrammeData from './cp_programme.json';
import actionsExecuteesData from './actions_executees.json';

export type ActionType = 
  | 'Reboisement'
  | 'CMD'  // Compensation de Mise en Défens
  | 'PFNL' // Produits Forestiers Non Ligneux
  | 'Sensibilisation'
  | 'Sylvopastoralisme'
  | 'Points_Eau'
  | 'Pistes'
  | 'Regeneration'
  | 'Apiculture'
  | 'Arboriculture'
  | 'Equipement';

export type StatutExecution = 'planifie' | 'en_cours' | 'termine' | 'annule' | 'bloque';

// Structure Zone (commune/périmètre/site)
export interface Site {
  site_id: string;
  nom: string;
}

export interface Perimetre {
  perimetre_id: string;
  nom: string;
  sites: Site[];
}

export interface Zone {
  commune_code: string;
  commune: string;
  dpanef: string;
  dranef: string;
  perimetres: Perimetre[];
}

// Données PDFCP
export interface PDFCPPrevu {
  id: string;
  commune_code: string;
  perimetre_id: string;
  site_id: string;
  action_type: ActionType;
  annee: number;
  unite: string;
  quantite_prevue: number;
  budget_prevu: number;
}

export interface CPProgramme {
  id: string;
  commune_code: string;
  perimetre_id: string;
  site_id: string;
  action_type: ActionType;
  annee: number;
  unite: string;
  quantite_programmee: number;
  budget_programme: number;
  reference_cp: string;
}

export interface ActionExecutee {
  id: string;
  commune_code: string;
  perimetre_id: string;
  site_id: string;
  action_type: ActionType;
  annee: number;
  date_realisation: string;
  quantite_realisee: number;
  cout_reel: number;
  statut: StatutExecution;
  preuve_url?: string;
  observations?: string;
}

// Ligne du tableau comparatif
export interface LigneComparatif {
  // Clé composite
  commune_code: string;
  perimetre_id: string;
  site_id: string;
  action_type: ActionType;
  annee: number;
  // Labels
  commune_label: string;
  perimetre_label: string;
  site_label: string;
  // PDFCP Plan
  quantite_prevue: number;
  budget_prevu: number;
  unite: string;
  // CP Annuel
  quantite_programmee: number | null;
  budget_programme: number | null;
  reference_cp: string | null;
  // Réalisé (cumul)
  quantite_realisee: number;
  cout_reel: number;
  // Calculés
  taux_execution_cp: number | null;      // (réalisé / programmé) * 100
  taux_execution_pdfcp: number | null;   // (réalisé / prévu) * 100
  ecart_budget: number | null;           // cout_reel - budget_programme
  has_alerte: boolean;
  alerte_ids: string[];
}

// Action type configuration
export const actionTypeConfig: Record<ActionType, { label: string; color: string }> = {
  'Reboisement': { label: 'Reboisement', color: 'hsl(var(--primary))' },
  'CMD': { label: 'Compensation Mise en Défens', color: 'hsl(142, 76%, 36%)' },
  'PFNL': { label: 'Produits Forestiers Non Ligneux', color: 'hsl(45, 93%, 47%)' },
  'Sensibilisation': { label: 'Sensibilisation', color: 'hsl(200, 98%, 39%)' },
  'Sylvopastoralisme': { label: 'Sylvopastoralisme', color: 'hsl(25, 95%, 53%)' },
  'Points_Eau': { label: 'Points d\'eau', color: 'hsl(210, 70%, 50%)' },
  'Pistes': { label: 'Pistes', color: 'hsl(30, 70%, 50%)' },
  'Regeneration': { label: 'Régénération', color: 'hsl(var(--secondary))' },
  'Apiculture': { label: 'Apiculture', color: 'hsl(50, 80%, 50%)' },
  'Arboriculture': { label: 'Arboriculture', color: 'hsl(120, 60%, 40%)' },
  'Equipement': { label: 'Équipement', color: 'hsl(280, 70%, 50%)' },
};

export const statutExecutionConfig: Record<StatutExecution, { label: string; color: string }> = {
  'planifie': { label: 'Planifié', color: 'bg-muted text-muted-foreground' },
  'en_cours': { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  'termine': { label: 'Terminé', color: 'bg-green-100 text-green-800' },
  'annule': { label: 'Annulé', color: 'bg-red-100 text-red-800' },
  'bloque': { label: 'Bloqué', color: 'bg-orange-100 text-orange-800' },
};

// Données depuis JSON
export const zones: Zone[] = zonesData as Zone[];
export const pdfcpPrevus: PDFCPPrevu[] = pdfcpPrevusData as PDFCPPrevu[];
export const cpProgrammes: CPProgramme[] = cpProgrammeData as CPProgramme[];
export const actionsExecutees: ActionExecutee[] = actionsExecuteesData as ActionExecutee[];

// Helper functions
export const getZoneLabel = (commune_code: string): string => {
  const zone = zones.find(z => z.commune_code === commune_code);
  return zone?.commune || commune_code;
};

export const getPerimetreLabel = (commune_code: string, perimetre_id: string): string => {
  const zone = zones.find(z => z.commune_code === commune_code);
  const perimetre = zone?.perimetres.find(p => p.perimetre_id === perimetre_id);
  return perimetre?.nom || perimetre_id;
};

export const getSiteLabel = (commune_code: string, perimetre_id: string, site_id: string): string => {
  const zone = zones.find(z => z.commune_code === commune_code);
  const perimetre = zone?.perimetres.find(p => p.perimetre_id === perimetre_id);
  const site = perimetre?.sites.find(s => s.site_id === site_id);
  return site?.nom || site_id;
};

export const calculateTauxExecution = (realise: number, reference: number | null): number | null => {
  if (reference === null || reference === 0) return null;
  return Math.round((realise / reference) * 100);
};

export const getExecutionBadgeColor = (taux: number | null): string => {
  if (taux === null) return 'bg-muted text-muted-foreground';
  if (taux >= 100) return 'bg-green-100 text-green-800';
  if (taux >= 75) return 'bg-blue-100 text-blue-800';
  if (taux >= 50) return 'bg-yellow-100 text-yellow-800';
  if (taux >= 25) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

// Get unique values for filters (global)
export const getUniqueAnnees = (): number[] => {
  const annees = new Set<number>();
  pdfcpPrevus.forEach(p => annees.add(p.annee));
  cpProgrammes.forEach(c => annees.add(c.annee));
  return Array.from(annees).sort();
};

export const getUniqueCommunes = (): { code: string; label: string }[] => {
  return zones.map(z => ({ code: z.commune_code, label: z.commune }));
};

export const getPerimetresByCommune = (commune_code: string): { id: string; nom: string }[] => {
  const zone = zones.find(z => z.commune_code === commune_code);
  return zone?.perimetres.map(p => ({ id: p.perimetre_id, nom: p.nom })) || [];
};

export const getSitesByPerimetre = (commune_code: string, perimetre_id: string): { id: string; nom: string }[] => {
  const zone = zones.find(z => z.commune_code === commune_code);
  const perimetre = zone?.perimetres.find(p => p.perimetre_id === perimetre_id);
  return perimetre?.sites.map(s => ({ id: s.site_id, nom: s.nom })) || [];
};

export const getUniqueActionTypes = (): ActionType[] => {
  const types = new Set<ActionType>();
  pdfcpPrevus.forEach(p => types.add(p.action_type));
  return Array.from(types);
};

// Get unique values from filtered lignes (scoped)
export const getUniqueAnneesFromLignes = (lignes: LigneComparatif[]): number[] => {
  const annees = new Set<number>();
  lignes.forEach(l => annees.add(l.annee));
  return Array.from(annees).sort();
};

export const getUniqueCommunesFromLignes = (lignes: LigneComparatif[]): { code: string; label: string }[] => {
  const communeMap = new Map<string, string>();
  lignes.forEach(l => communeMap.set(l.commune_code, l.commune_label));
  return Array.from(communeMap.entries()).map(([code, label]) => ({ code, label }));
};

export const getUniquePerimetresFromLignes = (lignes: LigneComparatif[]): { id: string; nom: string }[] => {
  const perimetreMap = new Map<string, string>();
  lignes.forEach(l => perimetreMap.set(l.perimetre_id, l.perimetre_label));
  return Array.from(perimetreMap.entries()).map(([id, nom]) => ({ id, nom }));
};

export const getUniqueSitesFromLignes = (lignes: LigneComparatif[]): { id: string; nom: string }[] => {
  const siteMap = new Map<string, string>();
  lignes.forEach(l => siteMap.set(l.site_id, l.site_label));
  return Array.from(siteMap.entries()).map(([id, nom]) => ({ id, nom }));
};

export const getUniqueActionTypesFromLignes = (lignes: LigneComparatif[]): ActionType[] => {
  const types = new Set<ActionType>();
  lignes.forEach(l => types.add(l.action_type));
  return Array.from(types);
};

// Options for building filtered lines
export interface BuildLignesOptions {
  communeCode?: string;
  allowedActionTypes?: ActionType[];
  yearStart?: number;
  yearEnd?: number;
  // Override prévu data with dynamic data from DatabaseContext (pdfc_prevus)
  overridePrevus?: PDFCPPrevu[];
  // Override CP data with dynamic data from DatabaseContext (pdfc_cps)
  overrideCps?: CPProgramme[];
  // Override exec data with dynamic data from DatabaseContext (pdfc_exec)
  overrideExec?: ActionExecutee[];
  // Labels for custom locations from pdfc_prevus
  customLabels?: Map<string, { commune: string; perimetre: string; site: string }>;
}

// Build comparative data with optional filtering
export const buildLignesComparatif = (
  alertes: { commune_code: string; perimetre_id?: string; site_id?: string; action_type?: string; annee?: number; id: string; statut: string }[] = [],
  options?: BuildLignesOptions
): LigneComparatif[] => {
  const lignes: LigneComparatif[] = [];
  const alertesOuvertes = alertes.filter(a => a.statut !== 'resolue');

  // Use overrides if provided, otherwise use static JSON
  const sourcePrevus: PDFCPPrevu[] = options?.overridePrevus ?? pdfcpPrevus;
  const sourceCps: CPProgramme[] = options?.overrideCps ?? cpProgrammes;
  const sourceExec: ActionExecutee[] = options?.overrideExec ?? actionsExecutees;

  // Filter source data if options provided
  let filteredPrevus = sourcePrevus;
  
  if (options?.communeCode) {
    filteredPrevus = filteredPrevus.filter(p => p.commune_code === options.communeCode);
  }
  if (options?.allowedActionTypes && options.allowedActionTypes.length > 0) {
    filteredPrevus = filteredPrevus.filter(p => options.allowedActionTypes!.includes(p.action_type));
  }
  if (options?.yearStart != null) {
    filteredPrevus = filteredPrevus.filter(p => p.annee >= options.yearStart!);
  }
  if (options?.yearEnd != null) {
    filteredPrevus = filteredPrevus.filter(p => p.annee <= options.yearEnd!);
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && options) {
    console.log('[ComparatifTable] buildLignesComparatif options:', options);
    console.log('[ComparatifTable] Sources:', 
      options.overridePrevus ? 'dynamic prevus' : 'static prevus',
      options.overrideCps ? 'dynamic cps' : 'static cps',
      options.overrideExec ? 'dynamic exec' : 'static exec'
    );
    console.log('[ComparatifTable] filteredPrevus.length:', filteredPrevus.length);
  }

  for (const prevu of filteredPrevus) {
    // Find matching CP - first try from override, then match by key
    const cp = sourceCps.find(
      c => c.commune_code === prevu.commune_code && 
           c.perimetre_id === prevu.perimetre_id &&
           c.site_id === prevu.site_id &&
           c.annee === prevu.annee && 
           c.action_type === prevu.action_type
    ) || sourceCps.find(
      // Fallback: match by action_type + annee only (for user-entered data)
      c => c.annee === prevu.annee && c.action_type === prevu.action_type
    );

    // Find matching executions - first try from override, then match by key
    const execs = sourceExec.filter(
      e => e.commune_code === prevu.commune_code && 
           e.perimetre_id === prevu.perimetre_id &&
           e.site_id === prevu.site_id &&
           e.annee === prevu.annee && 
           e.action_type === prevu.action_type
    );
    
    // Fallback: match by action_type + annee only
    const execsFallback = execs.length === 0 
      ? sourceExec.filter(e => e.annee === prevu.annee && e.action_type === prevu.action_type)
      : execs;

    const totalRealise = execsFallback.reduce((sum, e) => sum + e.quantite_realisee, 0);
    const totalCout = execsFallback.reduce((sum, e) => sum + e.cout_reel, 0);

    // Find related alertes
    const relatedAlertes = alertesOuvertes.filter(a => 
      a.commune_code === prevu.commune_code &&
      (!a.perimetre_id || a.perimetre_id === prevu.perimetre_id) &&
      (!a.site_id || a.site_id === prevu.site_id) &&
      (!a.action_type || a.action_type === prevu.action_type) &&
      (!a.annee || a.annee === prevu.annee)
    );

    // Use custom labels if provided, otherwise use zone lookup
    const labelKey = `${prevu.commune_code}|${prevu.perimetre_id}|${prevu.site_id}`;
    const customLabel = options?.customLabels?.get(labelKey);
    
    const communeLabel = customLabel?.commune || getZoneLabel(prevu.commune_code);
    const perimetreLabel = customLabel?.perimetre || getPerimetreLabel(prevu.commune_code, prevu.perimetre_id);
    const siteLabel = customLabel?.site || getSiteLabel(prevu.commune_code, prevu.perimetre_id, prevu.site_id);

    lignes.push({
      commune_code: prevu.commune_code,
      perimetre_id: prevu.perimetre_id,
      site_id: prevu.site_id,
      action_type: prevu.action_type,
      annee: prevu.annee,
      commune_label: communeLabel,
      perimetre_label: perimetreLabel,
      site_label: siteLabel,
      quantite_prevue: prevu.quantite_prevue,
      budget_prevu: prevu.budget_prevu,
      unite: prevu.unite,
      quantite_programmee: cp?.quantite_programmee ?? null,
      budget_programme: cp?.budget_programme ?? null,
      reference_cp: cp?.reference_cp ?? null,
      quantite_realisee: totalRealise,
      cout_reel: totalCout,
      taux_execution_cp: calculateTauxExecution(totalRealise, cp?.quantite_programmee ?? null),
      taux_execution_pdfcp: calculateTauxExecution(totalRealise, prevu.quantite_prevue),
      ecart_budget: cp ? totalCout - cp.budget_programme : null,
      has_alerte: relatedAlertes.length > 0,
      alerte_ids: relatedAlertes.map(a => a.id),
    });
  }

  return lignes;
};

// Get executions for a specific line
export const getExecutionsForLine = (ligne: LigneComparatif): ActionExecutee[] => {
  return actionsExecutees.filter(
    e => e.commune_code === ligne.commune_code && 
         e.perimetre_id === ligne.perimetre_id &&
         e.site_id === ligne.site_id &&
         e.annee === ligne.annee && 
         e.action_type === ligne.action_type
  );
};
