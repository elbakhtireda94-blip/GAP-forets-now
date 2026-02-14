// Types pour le module Alertes Oppositions & Conflits
// Basé sur la structure commune/périmètre/site

import alertesData from './alertes.json';
import { ActionType, getZoneLabel, getPerimetreLabel, getSiteLabel } from './comparatifTypes';

// Nouveaux types d'alertes (v2)
export type TypeAlerte = 
  | 'empietement'
  | 'surpaturage'
  | 'parcours'
  | 'coupe_bois'
  | 'deperissement'
  | 'exploitation_illegale'
  | 'autre';

// Types legacy pour rétrocompatibilité (affichage uniquement, pas en création)
export type LegacyTypeAlerte = 
  | 'opposition'
  | 'conflit_foncier'
  | 'degradation'
  | 'incendie'
  | 'braconnage';

// Type combiné pour les données existantes
export type AllTypeAlerte = TypeAlerte | LegacyTypeAlerte;

export type GraviteAlerte = 'faible' | 'moyenne' | 'elevee' | 'critique';

export type StatutAlerte = 'ouverte' | 'en_traitement' | 'resolue' | 'escaladee';

export interface AlerteTerrain {
  id: string;
  commune_code: string;
  perimetre_id?: string;
  site_id?: string;
  action_type?: ActionType;
  annee?: number;
  type: AllTypeAlerte;
  gravite: GraviteAlerte;
  statut: StatutAlerte;
  description: string;
  autre_precision?: string; // Pour le champ "Préciser" quand type = "autre"
  mesures_prises?: string;
  services_concernes: string[];
  responsable_suivi?: string;
  date_signalement: string;
  date_limite?: string;
  resultat?: string;
  pieces_jointes_url: string[];
  created_by?: string;
  updated_at?: string;
}

// Configuration des nouveaux types d'alertes (pour création)
export const typeAlerteConfig: Record<TypeAlerte, { label: string; icon: string; color: string }> = {
  'empietement': { label: 'Empiètement', icon: 'Footprints', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  'surpaturage': { label: 'Surpâturage', icon: 'Sprout', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  'parcours': { label: 'Parcours', icon: 'Route', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  'coupe_bois': { label: 'Coupe de bois', icon: 'Axe', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  'deperissement': { label: 'Dépérissement', icon: 'TreeDeciduous', color: 'bg-red-100 text-red-800 border-red-300' },
  'exploitation_illegale': { label: 'Exploitation illégale', icon: 'Ban', color: 'bg-red-100 text-red-800 border-red-300' },
  'autre': { label: 'Autre', icon: 'Info', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

// Configuration des types legacy (pour affichage des anciennes données uniquement)
export const legacyTypeAlerteConfig: Record<LegacyTypeAlerte, { label: string; icon: string; color: string }> = {
  'opposition': { label: 'Opposition (ancien)', icon: 'AlertTriangle', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  'conflit_foncier': { label: 'Conflit Foncier (ancien)', icon: 'MapPin', color: 'bg-red-100 text-red-800 border-red-300' },
  'degradation': { label: 'Dégradation (ancien)', icon: 'Trash2', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  'incendie': { label: 'Incendie (ancien)', icon: 'Flame', color: 'bg-red-100 text-red-800 border-red-300' },
  'braconnage': { label: 'Braconnage (ancien)', icon: 'Target', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

// Config combinée pour affichage de toutes les alertes (lecture)
export const allTypeAlerteConfig: Record<AllTypeAlerte, { label: string; icon: string; color: string }> = {
  ...typeAlerteConfig,
  ...legacyTypeAlerteConfig,
};

export const graviteConfig: Record<GraviteAlerte, { label: string; color: string; priority: number }> = {
  'faible': { label: 'Faible', color: 'bg-green-100 text-green-800', priority: 1 },
  'moyenne': { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-800', priority: 2 },
  'elevee': { label: 'Élevée', color: 'bg-orange-100 text-orange-800', priority: 3 },
  'critique': { label: 'Critique', color: 'bg-red-100 text-red-800', priority: 4 },
};

export const statutAlerteConfig: Record<StatutAlerte, { label: string; color: string }> = {
  'ouverte': { label: 'Ouverte', color: 'bg-blue-100 text-blue-800' },
  'en_traitement': { label: 'En traitement', color: 'bg-yellow-100 text-yellow-800' },
  'resolue': { label: 'Résolue', color: 'bg-green-100 text-green-800' },
  'escaladee': { label: 'Escaladée', color: 'bg-purple-100 text-purple-800' },
};

export const servicesConcernesOptions = [
  'ANEF Local',
  'DRANEF',
  'DPANEF',
  'Autorités Locales',
  'Gendarmerie Royale',
  'Protection Civile',
  'Eaux et Forêts',
  'Collectivité Territoriale',
  'Tribunal',
];

// Load alertes from JSON
export const loadAlertes = (): AlerteTerrain[] => {
  return (alertesData as AlerteTerrain[]).map(a => ({
    ...a,
    action_type: a.action_type as ActionType | undefined,
  }));
};

// Helper to get location label
export const getAlerteLocationLabel = (alerte: AlerteTerrain): string => {
  const parts: string[] = [];
  parts.push(getZoneLabel(alerte.commune_code));
  if (alerte.perimetre_id) {
    parts.push(getPerimetreLabel(alerte.commune_code, alerte.perimetre_id));
  }
  if (alerte.site_id && alerte.perimetre_id) {
    parts.push(getSiteLabel(alerte.commune_code, alerte.perimetre_id, alerte.site_id));
  }
  return parts.join(' > ');
};

// Helper functions
export const isAlerteCritique = (alerte: AlerteTerrain): boolean => {
  return alerte.gravite === 'critique' || alerte.gravite === 'elevee';
};

export const isDateLimiteDepassee = (alerte: AlerteTerrain): boolean => {
  if (!alerte.date_limite) return false;
  return new Date(alerte.date_limite) < new Date() && alerte.statut !== 'resolue';
};

export const sortAlertesByPriority = (alertes: AlerteTerrain[]): AlerteTerrain[] => {
  return [...alertes].sort((a, b) => {
    // First by gravite priority (descending)
    const priorityDiff = graviteConfig[b.gravite].priority - graviteConfig[a.gravite].priority;
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by date_limite (ascending, closer deadlines first)
    if (a.date_limite && b.date_limite) {
      return new Date(a.date_limite).getTime() - new Date(b.date_limite).getTime();
    }
    if (a.date_limite) return -1;
    if (b.date_limite) return 1;
    
    // Finally by date_signalement (descending, newer first)
    return new Date(b.date_signalement).getTime() - new Date(a.date_signalement).getTime();
  });
};

export const filterAlertesOuvertes = (alertes: AlerteTerrain[]): AlerteTerrain[] => {
  return alertes.filter(a => a.statut !== 'resolue');
};

// Filter alertes by location and action
export const filterAlertesByFilters = (
  alertes: AlerteTerrain[],
  filters: {
    annee?: number;
    commune_code?: string;
    perimetre_id?: string;
    site_id?: string;
    action_type?: string;
  }
): AlerteTerrain[] => {
  return alertes.filter(a => {
    if (filters.annee && a.annee && a.annee !== filters.annee) return false;
    if (filters.commune_code && a.commune_code !== filters.commune_code) return false;
    if (filters.perimetre_id && a.perimetre_id && a.perimetre_id !== filters.perimetre_id) return false;
    if (filters.site_id && a.site_id && a.site_id !== filters.site_id) return false;
    if (filters.action_type && a.action_type && a.action_type !== filters.action_type) return false;
    return true;
  });
};

// Check if should show critical banner
export const shouldShowCriticalBanner = (
  alertes: AlerteTerrain[],
  lignes: { taux_execution_cp: number | null; has_alerte: boolean }[]
): boolean => {
  // Critical/elevated gravity or deadline passed
  const hasCritical = alertes.some(a => 
    (isAlerteCritique(a) || isDateLimiteDepassee(a)) && a.statut !== 'resolue'
  );
  
  // Low execution with open alert
  const hasLowExecWithAlert = lignes.some(l => 
    l.has_alerte && l.taux_execution_cp !== null && l.taux_execution_cp < 50
  );
  
  return hasCritical || hasLowExecWithAlert;
};
