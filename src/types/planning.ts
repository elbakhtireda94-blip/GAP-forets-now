/**
 * Planning Intelligent - Modèle de données
 * Workflow: BROUILLON → SOUMIS → AJUSTEMENT_DPANEF → VALIDÉ | RETOURNÉ
 */

export type PlanningStatus =
  | 'BROUILLON'
  | 'SOUMIS'
  | 'AJUSTEMENT_DPANEF'
  | 'VALIDÉ'
  | 'RETOURNÉ';

export type PlanningItemType =
  | 'atelier'
  | 'transect'
  | 'mediation'
  | 'reunion_odf'
  | 'diagnostic'
  | 'suivi_pdfcp'
  | 'sensibilisation'
  | 'coordination'
  | 'reunion_commune'
  | 'autre';

export type RiskLevel = 'Faible' | 'Moyen' | 'Élevé';

export interface PlanningLogistics {
  vehicle_needed?: boolean;
  vehicle_type?: string;
  fuel_liters?: number;
  equipment_list?: string[];
  budget_estimate?: number;
  other_needs?: string;
}

export interface PlanningItem {
  id: string;
  planning_id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: PlanningItemType;
  commune_id: string;
  ust_id?: string | null;
  pdfcp_id?: string | null;
  odf_id?: string | null;
  objectives?: string;
  expected_deliverables?: string[]; // PV, fiche projet, rapport, matrice
  participants_estimated?: number;
  partners?: string; // commune, association, etc.
  logistics?: PlanningLogistics;
  risk_score?: number; // 0-100 or simple 1-5
  risk_social?: RiskLevel;
  risk_acces?: RiskLevel;
  risk_meteo?: RiskLevel;
  risk_securite?: RiskLevel;
  risk_conflit?: RiskLevel;
  distance_km_est?: number;
  duration_hours_est?: number;
  conflicts_linked?: string[]; // conflict ids
  attachments?: { label: string; url: string }[];
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Planning {
  id: string;
  month: number; // 1-12
  year: number;
  status: PlanningStatus;
  adp_id: string;
  dranef_id: string;
  dpanef_id: string;
  submitted_at?: string | null;
  validated_at?: string | null;
  validated_by?: string | null;
  returned_reason?: string | null;
  locked?: boolean; // admin unlock
  created_at: string;
  updated_at: string;
}

/** Détail d'une priorité pour le Top 5 */
export interface PlanningPriority {
  id: string;
  itemId: string;
  title: string;
  objective: string;
  justification: string;
  impactAttendu: string;
  risk: RiskLevel;
  besoinLogistique: string;
}

/** Alerte Assistant Décisionnel */
export type AlertSeverity = 'rouge' | 'orange' | 'vert';

export interface PlanningAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  suggestion?: string;
}

/** Recommandation Assistant */
export interface PlanningRecommendation {
  id: string;
  type: 'reorganiser' | 'mutualiser' | 'prioriser';
  title: string;
  description: string;
  details?: string[];
  why: string;
}

/** Score Impact (0-100) détaillé */
export interface ImpactScoreDetail {
  impact_participatif: number; // 30%
  avancement_pdfcp: number;   // 25%
  gestion_conflits: number;    // 20%
  efficience_logistique: number; // 15%
  qualite_livrables: number;  // 10%
  total: number;
}
