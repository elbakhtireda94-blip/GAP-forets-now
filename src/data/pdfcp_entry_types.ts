// Types pour le module PDFCP à 3 couches : Concerté / CP / Exécuté

export type EtatType = 'CONCERTE' | 'CP' | 'EXECUTE';

// Workflow de validation en 5 niveaux: BROUILLON → CONCERTE_ADP → VALIDE_DPANEF → VALIDE_CENTRAL → VERROUILLE
export type ValidationStatus = 'BROUILLON' | 'CONCERTE_ADP' | 'VALIDE_DPANEF' | 'VALIDE_CENTRAL' | 'VERROUILLE';

export type StatutExecution = 'planifie' | 'en_cours' | 'termine' | 'annule' | 'bloque';

export type StatutLigneCp = 'accepte' | 'ajuste' | 'reporte' | 'rejete';

export interface UserRef {
  userId: string;
  name: string;
}

/**
 * Ligne d'action PDFCP unifiée — table unique `pdfcp_actions`
 * Le champ `etat` détermine la couche : CONCERTE, CP ou EXECUTE
 */
export interface PdfcpActionLine {
  id: string;
  pdfcp_id: string;
  // Localisation
  commune_id?: string;
  perimetre_id?: string;
  site_id?: string;
  // Action
  action_key: string;
  action_label?: string;
  year: number;
  etat: EtatType;
  unite: string;
  physique: number;
  financier: number;
  // Traçabilité inter-couches
  source_plan_line_id?: string; // CP → lien vers la ligne Concerté d'origine
  source_cp_line_id?: string;   // Execute → lien vers la ligne CP source
  justification_ecart?: string; // Obligatoire si CP diffère du Concerté
  // Exécution spécifique
  date_realisation?: string;
  statut_execution?: StatutExecution;
  preuves?: unknown[];   // URLs de preuves (photos, docs, audio)
  notes?: string;
  locked?: boolean;
  // Méta
  geometry_type?: 'Point' | 'LineString' | 'Polygon';
  coordinates?: unknown;
  status?: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface ActionAudit {
  id: string;
  pdfcpId: string;
  entryId: string;
  field: 'physique' | 'financier' | 'etat' | 'perimetre_id' | 'site_id' | 'action_key' | 'annee';
  oldValue: string;
  newValue: string;
  changedBy: UserRef;
  changedAt: string;
}

// Structure de validation étendue pour le workflow 3 niveaux
export interface PdfcpValidation {
  pdfcpId: string;
  status: ValidationStatus;
  locked: boolean;
  validatedAdpBy: UserRef | null;
  validatedAdpAt: string | null;
  validatedDpanefBy: UserRef | null;
  validatedDpanefAt: string | null;
  visaDranefBy: UserRef | null;
  visaDranefAt: string | null;
  note: string | null;
  validatedBy?: UserRef | null;
  validatedAt?: string | null;
}

// Constantes
export const FIXED_YEARS = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const ETAT_LABELS: Record<EtatType, string> = {
  CONCERTE: 'Concerté (Population)',
  CP: 'Contrat-Programme',
  EXECUTE: 'Exécuté (Terrain)',
};

export const ETAT_DESCRIPTIONS: Record<EtatType, string> = {
  CONCERTE: 'Planification concertée avec la population locale',
  CP: 'Programmation négociée avec le siège ANEF',
  EXECUTE: 'Réalisation effective sur le terrain',
};

export const ETAT_COLORS: Record<EtatType, string> = {
  CONCERTE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CP: 'bg-amber-100 text-amber-800 border-amber-200',
  EXECUTE: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const STATUS_LABELS: Record<ValidationStatus, string> = {
  BROUILLON: 'Brouillon',
  CONCERTE_ADP: 'Concerté ADP',
  VALIDE_DPANEF: 'Validé DPANEF',
  VALIDE_CENTRAL: 'Validé Central',
  VERROUILLE: 'Verrouillé',
};

export const STATUS_COLORS: Record<ValidationStatus, string> = {
  BROUILLON: 'bg-gray-100 text-gray-800 border-gray-300',
  CONCERTE_ADP: 'bg-blue-100 text-blue-800 border-blue-300',
  VALIDE_DPANEF: 'bg-green-100 text-green-800 border-green-300',
  VALIDE_CENTRAL: 'bg-primary/10 text-primary border-primary/30',
  VERROUILLE: 'bg-red-100 text-red-800 border-red-300',
};

export const STATUT_EXECUTION_CONFIG: Record<StatutExecution, { label: string; className: string }> = {
  planifie: { label: 'Planifié', className: 'bg-muted text-muted-foreground' },
  en_cours: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
  termine: { label: 'Terminé', className: 'bg-green-100 text-green-800' },
  annule: { label: 'Annulé', className: 'bg-red-100 text-red-800' },
  bloque: { label: 'Bloqué', className: 'bg-orange-100 text-orange-800' },
};

export const STATUT_LIGNE_CP_CONFIG: Record<StatutLigneCp, { label: string; className: string }> = {
  accepte: { label: 'Accepté', className: 'bg-green-100 text-green-800 border-green-200' },
  ajuste: { label: 'Ajusté', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  reporte: { label: 'Reporté', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  rejete: { label: 'Rejeté', className: 'bg-red-100 text-red-800 border-red-200' },
};

// Helpers
export const getEcartStatus = (execute: number, reference: number): 'sous' | 'sur' | 'conforme' => {
  if (reference === 0) return 'conforme';
  const ratio = execute / reference;
  if (ratio < 0.95) return 'sous';
  if (ratio > 1.05) return 'sur';
  return 'conforme';
};

export const calculateTaux = (execute: number, reference: number): number | null => {
  if (reference === 0) return null;
  return Math.round((execute / reference) * 100);
};

// Détermine si le PDFCP est verrouillé — uniquement quand VERROUILLE
export const isLockedForScope = (status: ValidationStatus, scopeLevel: string): boolean => {
  if (scopeLevel === 'ADMIN') return false;
  return status === 'VERROUILLE';
};

// Message de verrouillage selon le statut
export const getLockMessage = (status: ValidationStatus): string => {
  switch (status) {
    case 'BROUILLON':
      return 'Module éditable';
    case 'CONCERTE_ADP':
      return 'Concerté ADP — éditable';
    case 'VALIDE_DPANEF':
      return 'Validé DPANEF — éditable';
    case 'VALIDE_CENTRAL':
      return 'Validé Central — éditable';
    case 'VERROUILLE':
      return 'Module verrouillé (déverrouillage ADMIN requis)';
    default:
      return 'Module éditable';
  }
};

/**
 * Vérifie si une ligne CP nécessite une justification d'écart
 * Compare la ligne CP avec la ligne Concerté source
 */
export const needsJustification = (
  cpLine: PdfcpActionLine,
  concerteLine?: PdfcpActionLine
): boolean => {
  if (!concerteLine) return false;
  return (
    cpLine.physique !== concerteLine.physique ||
    cpLine.financier !== concerteLine.financier
  );
};

/**
 * Vérifie si une ligne Exécuté nécessite des preuves
 * Obligatoire si budget > 0
 */
export const needsProof = (execLine: PdfcpActionLine): boolean => {
  return execLine.financier > 0;
};
