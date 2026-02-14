// Types for Supabase tables
// Auto-generated types are in src/integrations/supabase/types.ts
// This file contains extended TypeScript interfaces for business logic

export type ValidationStatus = 'draft' | 'submitted' | 'validated' | 'archived';

export type ConflictType = 'conflit' | 'opposition';

export type ConflictSeverity = 'faible' | 'moyenne' | 'elevee' | 'critique';

export type ConflictStatus = 'ouvert' | 'en_cours' | 'resolu' | 'escalade';

export type ActivityType = 
  | 'sensibilisation'
  | 'formation'
  | 'reunion'
  | 'visite_terrain'
  | 'distribution'
  | 'suivi_projet'
  | 'mediation';

export type OrganizationType = 'ODF' | 'cooperative' | 'association' | 'AGS';

export type OrganizationStatusType = 'active' | 'inactive' | 'en_creation' | 'dissoute';

export type PdfcpValidationStatus = 'DRAFT' | 'VALIDATED_ADP' | 'VALIDATED_DPANEF' | 'VISA_DRANEF';

// =============================================
// ADP Agents
// =============================================
export interface AdpAgent {
  id: string;
  user_id?: string;
  matricule: string;
  cine?: string;
  full_name: string;
  sex?: 'M' | 'F';
  date_of_birth?: string;
  photo_url?: string;
  recruitment_date?: string;
  grade?: string;
  scale?: string;
  corps?: 'Forestier' | 'Support';
  dranef_id: string;
  dpanef_id: string;
  commune_ids: string[];
  phone?: string;
  email?: string;
  status: ValidationStatus;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

// =============================================
// PDFCP Programs
// =============================================
export interface PdfcpProgram {
  id: string;
  code: string;
  title: string;
  description?: string;
  start_year: number;
  end_year: number;
  dranef_id: string;
  dpanef_id: string;
  commune_id?: string;
  total_budget_dh: number;
  validation_status: PdfcpValidationStatus;
  locked: boolean;
  validated_adp_by?: string;
  validated_adp_at?: string;
  validated_dpanef_by?: string;
  validated_dpanef_at?: string;
  visa_dranef_by?: string;
  visa_dranef_at?: string;
  validation_note?: string;
  status: ValidationStatus;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

// =============================================
// PDFCP Actions
// =============================================
export interface PdfcpAction {
  id: string;
  pdfcp_id: string;
  commune_id?: string;
  perimetre_id?: string;
  site_id?: string;
  action_key: string;
  action_label?: string;
  year: number;
  etat: 'PREVU' | 'CP' | 'EXECUTE';
  unite: string;
  physique: number;
  financier: number;
  geometry_type?: 'Point' | 'LineString' | 'Polygon';
  coordinates?: unknown;
  status: ValidationStatus;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

// =============================================
// Field Activities
// =============================================
export interface FieldActivity {
  id: string;
  adp_user_id: string;
  dranef_id: string;
  dpanef_id: string;
  commune_id?: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  activity_date: string;
  occasion?: string;
  object?: string;
  beneficiaries_count?: number;
  participants_count?: number;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  attachments: unknown[];
  pdfcp_id?: string;
  status: ValidationStatus;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

// =============================================
// Conflicts
// =============================================
export interface Conflict {
  id: string;
  adp_user_id: string;
  dranef_id: string;
  dpanef_id: string;
  commune_id?: string;
  conflict_type: ConflictType;
  nature: string;
  severity: ConflictSeverity;
  conflict_status: ConflictStatus;
  title: string;
  description?: string;
  parties_involved?: string[];
  reported_date: string;
  resolution_date?: string;
  superficie_opposee_ha?: number;
  superficie_levee_ha?: number;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  attachments: unknown[];
  pdfcp_id?: string;
  status: ValidationStatus;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

// =============================================
// Organizations
// =============================================
export interface Organization {
  id: string;
  name: string;
  organization_type: OrganizationType;
  registration_number?: string;
  dranef_id: string;
  dpanef_id: string;
  commune_id?: string;
  creation_date?: string;
  activity_domains?: string[];
  members_count?: number;
  president_name?: string;
  contact_phone?: string;
  organization_status: OrganizationStatusType;
  adp_user_id?: string;
  status: ValidationStatus;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

// =============================================
// Sync Queue
// =============================================
export interface SyncQueueEntry {
  id: string;
  user_id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id?: string;
  payload: unknown;
  sync_status: 'pending' | 'synced' | 'error' | 'conflict';
  error_message?: string;
  retry_count: number;
  queued_at: string;
  synced_at?: string;
  client_id?: string;
  offline_id?: string;
}

// =============================================
// Workflow Helpers
// =============================================
export const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  validated: 'Validé',
  archived: 'Archivé',
};

export const VALIDATION_STATUS_COLORS: Record<ValidationStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  submitted: 'bg-blue-100 text-blue-800 border-blue-300',
  validated: 'bg-green-100 text-green-800 border-green-300',
  archived: 'bg-amber-100 text-amber-800 border-amber-300',
};

export const CONFLICT_STATUS_LABELS: Record<ConflictStatus, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  escalade: 'Escaladé',
};

export const CONFLICT_SEVERITY_LABELS: Record<ConflictSeverity, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  elevee: 'Élevée',
  critique: 'Critique',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  sensibilisation: 'Sensibilisation',
  formation: 'Formation',
  reunion: 'Réunion',
  visite_terrain: 'Visite terrain',
  distribution: 'Distribution',
  suivi_projet: 'Suivi projet',
  mediation: 'Médiation',
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  ODF: 'ODF',
  cooperative: 'Coopérative',
  association: 'Association',
  AGS: 'AGS',
};

// =============================================
// Workflow state machine
// =============================================
export const WORKFLOW_TRANSITIONS: Record<ValidationStatus, ValidationStatus[]> = {
  draft: ['submitted'],
  submitted: ['validated', 'draft'], // Can be rejected back to draft
  validated: ['archived'],
  archived: [],
};

export function canTransitionTo(
  currentStatus: ValidationStatus,
  targetStatus: ValidationStatus
): boolean {
  return WORKFLOW_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function getNextStatus(currentStatus: ValidationStatus): ValidationStatus | null {
  const transitions = WORKFLOW_TRANSITIONS[currentStatus];
  return transitions?.[0] ?? null;
}
