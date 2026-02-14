import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import initialData from '@/data/database.json';

// Types
export interface Commune {
  id: string;
  name: string;
}

export interface Dpanef {
  id: string;
  name: string;
  communes: Commune[];
}

export interface Dranef {
  id: string;
  name: string;
  dpanef: Dpanef[];
}

export interface Region {
  id: string;
  name: string;
  dranef: Dranef[];
}

export interface User {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: 'adp' | 'admin';
  region_id: string;
  dranef_id: string;
  dpanef_id: string;
  commune_id: string;
}

export type CorpsFonctionnel = 'forestier' | 'support';
export type Sexe = 'Masculin' | 'Féminin';

export interface ADP {
  id: string;
  // Section 1 - Identité
  matricule: string;
  cine: string;
  full_name: string;
  sexe?: Sexe;
  date_naissance?: string; // ISO YYYY-MM-DD
  photo_url?: string;
  // Section 2 - Situation administrative
  date_recrutement?: string; // ISO YYYY-MM-DD
  anciennete_admin?: string;
  grade?: string;
  echelle?: string;
  corps_fonctionnel?: CorpsFonctionnel;
  // Section 3 - Affectation territoriale
  region_id: string;
  dranef_id: string;
  dpanef_id: string;
  commune_id: string;
  // Section 4 - Coordonnées
  phone: string;
  email: string;
  adresse?: string;
  // Statut
  status: 'Actif' | 'Inactif';
}

export interface PDFCComponent {
  type: string;
  surface_ha?: number;
  longueur_km?: number;
  nombre?: number;
  budget_dh: number;
}

export interface PDFC {
  id: string;
  title: string;
  commune_id: string;
  year_start: number;
  year_end: number;
  status: 'En cours' | 'Validé' | 'Finalisé';
  adp_responsable: string;
  components: PDFCComponent[];
}

// === ENTITÉ : Lignes prévues opérationnelles ===
// Source unique de vérité pour le comparatif PDFCP (colonne "Prévu")
export interface PdfcpLignePrevue {
  id: string;
  pdfc_id: string;
  // Localisation saisissable (pas AUTO)
  commune_id?: string;
  commune_label: string;
  perimetre_label: string;
  site_label: string;
  // Découpage temporel
  annee: number;
  // Action / unité / quantités
  action_type: string;
  unite: 'ha' | 'km' | 'm3' | 'u' | string;
  quantite_physique: number;
  budget_prevu_dh: number;
}

// Statut de ligne CP (arbitrage DPANEF/DRANEF)
export type StatutLigneCp = 'accepte' | 'ajuste' | 'reporte' | 'rejete';

// === NOUVELLE ENTITÉ : Lignes CP (Programmation annuelle) ===
// Source pour la colonne "Programmé (CP)" dans le comparatif
export interface PdfcpLigneCP {
  id: string;
  pdfc_id: string;
  commune_id?: string;
  commune_label: string;
  perimetre_label: string;
  site_label: string;
  annee: number;
  action_type: string;
  unite: 'ha' | 'km' | 'm3' | 'u' | string;
  quantite_programmee: number;
  budget_programme_dh: number;
  reference_cp: string;
  // Liaison vers la ligne Plan d'origine
  source_plan_line_id?: string;
  // Arbitrage
  statut_ligne?: StatutLigneCp;
  motif_ajustement?: string;
}

// === NOUVELLE ENTITÉ : Lignes Exécutées (Réalisé) ===
// Source pour la colonne "Exécuté" dans le comparatif
export interface PdfcpActionExec {
  id: string;
  pdfc_id: string;
  commune_id?: string;
  commune_label: string;
  perimetre_label: string;
  site_label: string;
  annee: number;
  action_type: string;
  unite: 'ha' | 'km' | 'm3' | 'u' | string;
  date_realisation: string; // ISO yyyy-mm-dd
  quantite_realisee: number;
  cout_reel_dh: number;
  statut: 'planifie' | 'en_cours' | 'termine' | 'annule' | 'bloque';
  preuve_url?: string;
  observations?: string;
  // Liaison vers la ligne CP d'origine
  source_cp_line_id?: string;
}

// Distribution sub-type for Distribution activities
export interface DistributionData {
  date_distribution?: string; // YYYY-MM-DD
  nombre_distribue?: number;
  espece?: string; // nature: plants, ruches, fours, etc.
  details?: string; // textarea
}

// Occasions officielles de sensibilisation
export const SENSIBILISATION_OCCASIONS = [
  'Journée internationale des forêts',
  'Journée mondiale des zones humides (Convention de Ramsar)',
  'Journée mondiale de lutte contre la désertification et la sécheresse',
  'Journée internationale de la biodiversité',
  'Journée internationale de la coopération',
  'Journée nationale / campagne de lutte contre les incendies de forêts (LCI)',
  'Autre (à préciser)',
] as const;

export type SensibilisationOccasion = typeof SENSIBILISATION_OCCASIONS[number];

// Attachment type for activity photos/documents
export interface ActivityAttachmentData {
  type: 'image' | 'pdf';
  url: string;
  filename: string;
  uploaded_at: string;
  storagePath?: string;
}

export interface Activity {
  id: string;
  type: string;
  date: string;
  adp_id: string;
  commune_id: string;
  description: string;
  participants: number;
  issues: string;
  resolution: string;
  // New fields from Excel observations
  objet?: string; // Intitulé/objet de l'activité
  nb_beneficiaires?: number; // For accompaniment activities
  distribution?: DistributionData; // For Distribution activities
  // Sensibilisation specific fields
  sensibilisation_occasion?: SensibilisationOccasion;
  sensibilisation_occasion_other?: string; // When 'Autre (à préciser)' is selected
  // Distribution specific field (distinct from nb_beneficiaires for Accompagnement)
  beneficiaries_count?: number; // Number of beneficiaries for Distribution
  // Attachments (photos/PDFs)
  attachments?: ActivityAttachmentData[];
}

// Official list of conflict natures
export const CONFLICT_NATURES = [
  'Privation du droit d\'usage',
  'Opposition aux accès (points d\'eau, pistes, etc.)',
  'Opposition aux travaux de reforestation',
  'Conflit foncier',
  'Exploitation illégale',
  'Autre',
] as const;

export type ConflictNature = typeof CONFLICT_NATURES[number];

// Migration mapping for old conflict natures to new ones
export const CONFLICT_NATURE_MIGRATION: Record<string, ConflictNature> = {
  'Opposition à la mise en défens': 'Opposition aux travaux de reforestation',
  'Conflit pastoral': 'Privation du droit d\'usage',
  'Opposition aux travaux de reboisement': 'Opposition aux travaux de reforestation',
  // Keep matching ones
  'Conflit foncier': 'Conflit foncier',
  'Exploitation illégale': 'Exploitation illégale',
  'Autre': 'Autre',
};

export interface Conflict {
  id: string;
  commune_id: string;
  nature: string;
  nature_other?: string; // When 'Autre' is selected, store the custom value
  description: string;
  status: 'En cours' | 'Résolu' | 'Escaladé';
  severity: 'Faible' | 'Moyenne' | 'Élevée' | 'Critique';
  handled_by: string;
  date_reported: string;
  resolution_notes: string;
  // Extended fields
  type?: 'Conflit' | 'Opposition';
  superficie_opposee_ha?: number;
  action_type?: string;
  perimetre_id?: string;
  site_id?: string;
  mesures_adp?: string;
  mesures_services?: string;
  services_concernes?: string[];
  prochaine_action?: string;
  resolution_date?: string; // Replaces date_limite - date when conflict was resolved
  attachments?: { label: string; url: string }[];
  updated_at?: string;
}

// === NOUVELLE ENTITÉ : Organisations structurelles ===
export type OrganisationStatut = 'ODF' | 'Cooperative' | 'Association' | 'AGS';

export interface OrganisationStruct {
  id: string;
  nom: string;
  statut: OrganisationStatut;
  date_creation: string; // ISO 'YYYY-MM-DD'
  domaines_activites: string[]; // ex: ["PFNL","Apiculture","Écotourisme"]
  // Liaisons pour filtrage et contrôle d'accès
  region_id?: string;
  dranef_id?: string;
  dpanef_id?: string;
  commune_id?: string;
  adp_id?: string; // ADP responsable/concerné
  // Métadonnées
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  regions: Region[];
  users: User[];
  adp: ADP[];
  pdfc: PDFC[];
  pdfc_prevus: PdfcpLignePrevue[];   // Lignes prévues opérationnelles
  pdfc_cps: PdfcpLigneCP[];          // Lignes CP (programmation)
  pdfc_exec: PdfcpActionExec[];      // Actions exécutées (réalisé)
  activities: Activity[];
  conflicts: Conflict[];
  organisations: OrganisationStruct[];
}

interface DatabaseContextType {
  data: Database;
  // Direct access to pdfc array for reactive hooks
  pdfcs: PDFC[];
  // Region helpers
  getRegions: () => Region[];
  getDranefsByRegion: (regionId: string) => Dranef[];
  getDpanefsByDranef: (dranefId: string) => Dpanef[];
  getCommunesByDpanef: (dpanefId: string) => Commune[];
  getRegionName: (id: string) => string;
  getDranefName: (id: string) => string;
  getDpanefName: (id: string) => string;
  getCommuneName: (id: string) => string;
  // ADP CRUD
  getAdps: () => ADP[];
  getAdpById: (id: string) => ADP | undefined;
  getAdpName: (id: string) => string;
  addAdp: (adp: Omit<ADP, 'id'>) => void;
  updateAdp: (id: string, adp: Partial<ADP>) => void;
  deleteAdp: (id: string) => void;
  // PDFC CRUD
  getPdfcs: () => PDFC[];
  getPdfcById: (id: string) => PDFC | undefined;
  addPdfc: (pdfc: Omit<PDFC, 'id'>) => void;
  updatePdfc: (id: string, pdfc: Partial<PDFC>) => void;
  deletePdfc: (id: string) => void;
  // PDFCP Lignes Prévues CRUD (source unique pour comparatif opérationnel)
  getPdfcPrevusByPdfcId: (pdfcId: string) => PdfcpLignePrevue[];
  addPdfcPrevu: (ligne: Omit<PdfcpLignePrevue, 'id'>) => void;
  updatePdfcPrevu: (id: string, updates: Partial<PdfcpLignePrevue>) => void;
  deletePdfcPrevu: (id: string) => void;
  // === PDFCP Lignes CP CRUD (programmation annuelle) ===
  getPdfcCpsByPdfcId: (pdfcId: string) => PdfcpLigneCP[];
  addPdfcCp: (ligne: Omit<PdfcpLigneCP, 'id'>) => void;
  updatePdfcCp: (id: string, updates: Partial<PdfcpLigneCP>) => void;
  deletePdfcCp: (id: string) => void;
  // === PDFCP Actions Exécutées CRUD (réalisé) ===
  getPdfcExecByPdfcId: (pdfcId: string) => PdfcpActionExec[];
  addPdfcExec: (action: Omit<PdfcpActionExec, 'id'>) => void;
  updatePdfcExec: (id: string, updates: Partial<PdfcpActionExec>) => void;
  deletePdfcExec: (id: string) => void;
  // Activities CRUD
  getActivities: () => Activity[];
  getActivityById: (id: string) => Activity | undefined;
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, activity: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  // Conflicts CRUD
  getConflicts: () => Conflict[];
  getConflictById: (id: string) => Conflict | undefined;
  addConflict: (conflict: Omit<Conflict, 'id'>) => void;
  updateConflict: (id: string, conflict: Partial<Conflict>) => void;
  deleteConflict: (id: string) => void;
  // Organisations CRUD
  getOrganisations: () => OrganisationStruct[];
  getOrganisationsByCommune: (communeId: string) => OrganisationStruct[];
  addOrganisation: (org: Omit<OrganisationStruct, 'id'>) => void;
  updateOrganisation: (id: string, updates: Partial<OrganisationStruct>) => void;
  deleteOrganisation: (id: string) => void;
  // Auth
  authenticateUser: (email: string, password: string) => User | null;
  // Statistics
  getStats: () => {
    totalAdp: number;
    activeAdp: number;
    totalPdfc: number;
    pdfcByStatus: Record<string, number>;
    totalActivities: number;
    activitiesByMonth: Record<string, number>;
    totalConflicts: number;
    conflictsByStatus: Record<string, number>;
    totalOppositions: number;
    oppositionsByStatus: Record<string, number>;
    superficieOpposeeHa: number;
    superficieOpposeeLeveeHa: number;
  };
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const STORAGE_KEY = 'anef_database';

/**
 * UNIFIED HELPER: Determine if a conflict is an "Opposition"
 * This helper is exported and must be used by all components for consistent logic.
 * 
 * Rules:
 * 1) If type field exists => type === "Opposition"
 * 2) Otherwise, infer from nature field based on keywords
 */
export const isOppositionHelper = (conflict: Conflict): boolean => {
  // If type is already set, use it directly
  if (conflict.type) {
    return conflict.type === 'Opposition';
  }
  
  // Infer from nature field
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
  
  return oppositionPatterns.some(pattern => natureLower.includes(pattern.toLowerCase()));
};

/**
 * AUTO-MIGRATION: Assign 'type' field to conflicts that don't have it.
 * This ensures all legacy data gets properly categorized.
 */
const migrateConflictsType = (conflicts: Conflict[]): Conflict[] => {
  let needsUpdate = false;
  
  const migrated = conflicts.map(conflict => {
    if (!conflict.type) {
      needsUpdate = true;
      return {
        ...conflict,
        type: isOppositionHelper(conflict) ? 'Opposition' : 'Conflit',
      } as Conflict;
    }
    return conflict;
  });
  
  if (needsUpdate) {
    console.log('[DatabaseContext] Migrated conflicts type field:', 
      migrated.filter(c => c.type === 'Opposition').length, 'oppositions,',
      migrated.filter(c => c.type === 'Conflit').length, 'conflits'
    );
  }
  
  return migrated;
};

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<Database>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migration douce: ajouter pdfc_prevus, pdfc_cps, pdfc_exec si absents
        if (!parsed.pdfc_prevus) {
          parsed.pdfc_prevus = [];
        }
        if (!parsed.pdfc_cps) {
          parsed.pdfc_cps = [];
        }
        if (!parsed.pdfc_exec) {
          parsed.pdfc_exec = [];
        }
        if (!parsed.organisations) {
          parsed.organisations = [];
        }
        // AUTO-MIGRATE conflicts type field
        if (parsed.conflicts) {
          parsed.conflicts = migrateConflictsType(parsed.conflicts);
        }
        return parsed as Database;
      } catch {
        return { ...(initialData as any), pdfc_prevus: [], pdfc_cps: [], pdfc_exec: [], organisations: [] } as Database;
      }
    }
    // For initial data, also migrate conflicts
    const initial = { ...(initialData as any), pdfc_prevus: [], pdfc_cps: [], pdfc_exec: [], organisations: [] } as Database;
    if (initial.conflicts) {
      initial.conflicts = migrateConflictsType(initial.conflicts);
    }
    return initial;
  });

  // Persist to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Generate unique ID
  const generateId = (prefix: string): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  };

  // Region helpers
  const getRegions = () => data.regions;

  const getDranefsByRegion = (regionId: string): Dranef[] => {
    const region = data.regions.find(r => r.id === regionId);
    return region?.dranef || [];
  };

  const getDpanefsByDranef = (dranefId: string): Dpanef[] => {
    for (const region of data.regions) {
      const dranef = region.dranef.find(d => d.id === dranefId);
      if (dranef) return dranef.dpanef;
    }
    return [];
  };

  const getCommunesByDpanef = (dpanefId: string): Commune[] => {
    for (const region of data.regions) {
      for (const dranef of region.dranef) {
        const dpanef = dranef.dpanef.find(d => d.id === dpanefId);
        if (dpanef) return dpanef.communes;
      }
    }
    return [];
  };

  const getRegionName = (id: string): string => {
    return data.regions.find(r => r.id === id)?.name || '';
  };

  const getDranefName = (id: string): string => {
    for (const region of data.regions) {
      const dranef = region.dranef.find(d => d.id === id);
      if (dranef) return dranef.name;
    }
    return '';
  };

  const getDpanefName = (id: string): string => {
    for (const region of data.regions) {
      for (const dranef of region.dranef) {
        const dpanef = dranef.dpanef.find(d => d.id === id);
        if (dpanef) return dpanef.name;
      }
    }
    return '';
  };

  const getCommuneName = (id: string): string => {
    for (const region of data.regions) {
      for (const dranef of region.dranef) {
        for (const dpanef of dranef.dpanef) {
          const commune = dpanef.communes.find(c => c.id === id);
          if (commune) return commune.name;
        }
      }
    }
    return '';
  };

  // ADP CRUD
  const getAdps = () => data.adp;
  
  const getAdpById = (id: string) => data.adp.find(a => a.id === id);
  
  const getAdpName = (id: string): string => {
    return data.adp.find(a => a.id === id)?.full_name || '';
  };

  const addAdp = (adp: Omit<ADP, 'id'>) => {
    const newAdp = { ...adp, id: generateId('ADP') };
    setData(prev => ({ ...prev, adp: [...prev.adp, newAdp as ADP] }));
  };

  const updateAdp = (id: string, updates: Partial<ADP>) => {
    setData(prev => ({
      ...prev,
      adp: prev.adp.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const deleteAdp = (id: string) => {
    setData(prev => ({ ...prev, adp: prev.adp.filter(a => a.id !== id) }));
  };

  // PDFC CRUD
  const getPdfcs = () => data.pdfc;
  
  const getPdfcById = (id: string) => data.pdfc.find(p => p.id === id);

  const addPdfc = (pdfc: Omit<PDFC, 'id'>) => {
    const newPdfc = { ...pdfc, id: generateId('PDFC') };
    setData(prev => ({ ...prev, pdfc: [...prev.pdfc, newPdfc as PDFC] }));
  };

  const updatePdfc = (id: string, updates: Partial<PDFC>) => {
    setData(prev => ({
      ...prev,
      pdfc: prev.pdfc.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const deletePdfc = (id: string) => {
    setData(prev => ({ ...prev, pdfc: prev.pdfc.filter(p => p.id !== id) }));
  };

  // === PDFCP Lignes Prévues CRUD (Source unique pour comparatif opérationnel) ===
  const getPdfcPrevusByPdfcId = (pdfcId: string): PdfcpLignePrevue[] => {
    return (data.pdfc_prevus || []).filter(lp => lp.pdfc_id === pdfcId);
  };

  const addPdfcPrevu = (ligne: Omit<PdfcpLignePrevue, 'id'>) => {
    const newLigne: PdfcpLignePrevue = {
      ...ligne,
      id: generateId('PREV'),
      budget_prevu_dh: Number(ligne.budget_prevu_dh) || 0,
      quantite_physique: Number(ligne.quantite_physique) || 0,
    };
    setData(prev => ({
      ...prev,
      pdfc_prevus: [...(prev.pdfc_prevus || []), newLigne],
    }));
  };

  const updatePdfcPrevu = (id: string, updates: Partial<PdfcpLignePrevue>) => {
    setData(prev => ({
      ...prev,
      pdfc_prevus: (prev.pdfc_prevus || []).map(lp =>
        lp.id === id ? { ...lp, ...updates } : lp
      ),
    }));
  };

  const deletePdfcPrevu = (id: string) => {
    setData(prev => ({
      ...prev,
      pdfc_prevus: (prev.pdfc_prevus || []).filter(lp => lp.id !== id),
    }));
  };

  // === PDFCP Lignes CP CRUD (Programmation annuelle) ===
  const getPdfcCpsByPdfcId = (pdfcId: string): PdfcpLigneCP[] => {
    return (data.pdfc_cps || []).filter(lp => lp.pdfc_id === pdfcId);
  };

  const addPdfcCp = (ligne: Omit<PdfcpLigneCP, 'id'>) => {
    const newLigne: PdfcpLigneCP = {
      ...ligne,
      id: generateId('CP'),
      budget_programme_dh: Number(ligne.budget_programme_dh) || 0,
      quantite_programmee: Number(ligne.quantite_programmee) || 0,
      reference_cp: ligne.reference_cp || `CP-${ligne.annee}`,
    };
    setData(prev => ({
      ...prev,
      pdfc_cps: [...(prev.pdfc_cps || []), newLigne],
    }));
  };

  const updatePdfcCp = (id: string, updates: Partial<PdfcpLigneCP>) => {
    setData(prev => ({
      ...prev,
      pdfc_cps: (prev.pdfc_cps || []).map(lp =>
        lp.id === id ? { ...lp, ...updates } : lp
      ),
    }));
  };

  const deletePdfcCp = (id: string) => {
    setData(prev => ({
      ...prev,
      pdfc_cps: (prev.pdfc_cps || []).filter(lp => lp.id !== id),
    }));
  };

  // === PDFCP Actions Exécutées CRUD (Réalisé) ===
  const getPdfcExecByPdfcId = (pdfcId: string): PdfcpActionExec[] => {
    return (data.pdfc_exec || []).filter(lp => lp.pdfc_id === pdfcId);
  };

  const addPdfcExec = (action: Omit<PdfcpActionExec, 'id'>) => {
    const newAction: PdfcpActionExec = {
      ...action,
      id: generateId('EXEC'),
      cout_reel_dh: Number(action.cout_reel_dh) || 0,
      quantite_realisee: Number(action.quantite_realisee) || 0,
      date_realisation: action.date_realisation || new Date().toISOString().slice(0, 10),
      statut: action.statut || 'termine',
    };
    setData(prev => ({
      ...prev,
      pdfc_exec: [...(prev.pdfc_exec || []), newAction],
    }));
  };

  const updatePdfcExec = (id: string, updates: Partial<PdfcpActionExec>) => {
    setData(prev => ({
      ...prev,
      pdfc_exec: (prev.pdfc_exec || []).map(lp =>
        lp.id === id ? { ...lp, ...updates } : lp
      ),
    }));
  };

  const deletePdfcExec = (id: string) => {
    setData(prev => ({
      ...prev,
      pdfc_exec: (prev.pdfc_exec || []).filter(lp => lp.id !== id),
    }));
  };

  // Activities CRUD
  const getActivities = () => data.activities;
  
  const getActivityById = (id: string) => data.activities.find(a => a.id === id);

  const addActivity = (activity: Omit<Activity, 'id'>) => {
    const newActivity = { ...activity, id: generateId('ACT') };
    setData(prev => ({ ...prev, activities: [...prev.activities, newActivity as Activity] }));
  };

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    setData(prev => ({
      ...prev,
      activities: prev.activities.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const deleteActivity = (id: string) => {
    setData(prev => ({ ...prev, activities: prev.activities.filter(a => a.id !== id) }));
  };

  // Conflicts CRUD
  const getConflicts = () => data.conflicts;
  
  const getConflictById = (id: string) => data.conflicts.find(c => c.id === id);

  const addConflict = (conflict: Omit<Conflict, 'id'>) => {
    const newConflict = { ...conflict, id: generateId('CONF') };
    setData(prev => ({ ...prev, conflicts: [...prev.conflicts, newConflict as Conflict] }));
  };

  const updateConflict = (id: string, updates: Partial<Conflict>) => {
    setData(prev => ({
      ...prev,
      conflicts: prev.conflicts.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const deleteConflict = (id: string) => {
    setData(prev => ({ ...prev, conflicts: prev.conflicts.filter(c => c.id !== id) }));
  };

  // === Organisations CRUD ===
  const getOrganisations = (): OrganisationStruct[] => data.organisations || [];
  
  const getOrganisationsByCommune = (communeId: string): OrganisationStruct[] => {
    return (data.organisations || []).filter(o => o.commune_id === communeId);
  };

  const addOrganisation = (org: Omit<OrganisationStruct, 'id'>) => {
    const newOrg: OrganisationStruct = {
      ...org,
      id: generateId('ORG'),
    };
    setData(prev => ({
      ...prev,
      organisations: [...(prev.organisations || []), newOrg],
    }));
  };

  const updateOrganisation = (id: string, updates: Partial<OrganisationStruct>) => {
    setData(prev => ({
      ...prev,
      organisations: (prev.organisations || []).map(o =>
        o.id === id ? { ...o, ...updates } : o
      ),
    }));
  };

  const deleteOrganisation = (id: string) => {
    setData(prev => ({
      ...prev,
      organisations: (prev.organisations || []).filter(o => o.id !== id),
    }));
  };

  // Auth
  const authenticateUser = (email: string, password: string): User | null => {
    const user = data.users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    return user || null;
  };

  // Statistics - uses the unified isOppositionHelper for consistent logic
  const getStats = () => {
    const activitiesByMonth: Record<string, number> = {};
    data.activities.forEach(activity => {
      const month = activity.date.substring(0, 7); // YYYY-MM
      activitiesByMonth[month] = (activitiesByMonth[month] || 0) + 1;
    });

    const pdfcByStatus: Record<string, number> = {};
    data.pdfc.forEach(pdfc => {
      pdfcByStatus[pdfc.status] = (pdfcByStatus[pdfc.status] || 0) + 1;
    });

    // Helper: check if resolved
    const isResolved = (c: Conflict): boolean => {
      const statusLower = (c.status || '').toLowerCase();
      return ['résolu', 'resolu', 'levé', 'leve', 'clôturé', 'cloturé', 'cloture'].some(s => statusLower.includes(s));
    };

    // Use unified helper - after migration, type field should be set for all conflicts
    // But still use helper for backwards compatibility
    const oppositions = data.conflicts.filter(c => c.type === 'Opposition');
    const conflits = data.conflicts.filter(c => c.type !== 'Opposition');

    const conflictsByStatus: Record<string, number> = {};
    conflits.forEach(conflict => {
      conflictsByStatus[conflict.status] = (conflictsByStatus[conflict.status] || 0) + 1;
    });

    const oppositionsByStatus: Record<string, number> = {};
    oppositions.forEach(opposition => {
      oppositionsByStatus[opposition.status] = (oppositionsByStatus[opposition.status] || 0) + 1;
    });

    const superficieOpposeeHa = oppositions.reduce(
      (sum, o) => sum + Number(o.superficie_opposee_ha || 0), 0
    );

    const superficieOpposeeLeveeHa = oppositions
      .filter(isResolved)
      .reduce((sum, o) => sum + Number(o.superficie_opposee_ha || 0), 0);

    return {
      totalAdp: data.adp.length,
      activeAdp: data.adp.filter(a => a.status === 'Actif').length,
      totalPdfc: data.pdfc.length,
      pdfcByStatus,
      totalActivities: data.activities.length,
      activitiesByMonth,
      totalConflicts: conflits.length,
      conflictsByStatus,
      totalOppositions: oppositions.length,
      oppositionsByStatus,
      superficieOpposeeHa,
      superficieOpposeeLeveeHa,
    };
  };

  return (
    <DatabaseContext.Provider
      value={{
        data,
        pdfcs: data.pdfc,
        getRegions,
        getDranefsByRegion,
        getDpanefsByDranef,
        getCommunesByDpanef,
        getRegionName,
        getDranefName,
        getDpanefName,
        getCommuneName,
        getAdps,
        getAdpById,
        getAdpName,
        addAdp,
        updateAdp,
        deleteAdp,
        getPdfcs,
        getPdfcById,
        addPdfc,
        updatePdfc,
        deletePdfc,
        getPdfcPrevusByPdfcId,
        addPdfcPrevu,
        updatePdfcPrevu,
        deletePdfcPrevu,
        getPdfcCpsByPdfcId,
        addPdfcCp,
        updatePdfcCp,
        deletePdfcCp,
        getPdfcExecByPdfcId,
        addPdfcExec,
        updatePdfcExec,
        deletePdfcExec,
        getActivities,
        getActivityById,
        addActivity,
        updateActivity,
        deleteActivity,
        getConflicts,
        getConflictById,
        addConflict,
        updateConflict,
        deleteConflict,
        getOrganisations,
        getOrganisationsByCommune,
        addOrganisation,
        updateOrganisation,
        deleteOrganisation,
        authenticateUser,
        getStats,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
