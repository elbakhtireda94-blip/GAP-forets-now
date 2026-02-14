// Types for Cahier Journal module - ANEF Professional Standard

export type JournalCategory = 
  | 'reunion'
  | 'animation'
  | 'animation_territoriale'
  | 'mediation'
  | 'diagnostic'
  | 'suivi_chantier'
  | 'suivi_pdfcp'
  | 'sensibilisation'
  | 'organisation_usagers'
  | 'partenariats'
  | 'activite_admin'
  | 'autre';

export type ValidationStatus = 'Brouillon' | 'Validé ADP' | 'Transmis hiérarchie';
export type Priority = 'Faible' | 'Moyenne' | 'Élevée';
export type OrganisationType = 'ODF' | 'Coopérative' | 'Association' | 'AGS';

export interface JournalAttachment {
  type: 'image' | 'pdf' | 'audio';
  url: string;
  filename: string;
  uploaded_at: string;
  storagePath?: string;
}

export interface CahierJournalEntry {
  id: string;
  entry_date: string;
  title: string;
  description: string;
  category: JournalCategory | null;
  
  // Location & linking
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  pdfcp_id: string | null;
  perimetre_label: string | null;
  site_label: string | null;
  
  // Territorial hierarchy
  dranef_id: string;
  dpanef_id: string;
  commune_id: string | null;
  adp_user_id: string;
  
  // Professional context
  participants_count: number | null;
  organisations_concernees: OrganisationType[];
  temps_passe_min: number | null;
  priorite: Priority;
  statut_validation: ValidationStatus;
  
  // Results & follow-up
  resultats_obtenus: string | null;
  decisions_prises: string | null;
  prochaines_etapes: string | null;
  contraintes_rencontrees: string | null;
  besoin_appui_hierarchique: boolean;
  justification_appui: string | null;
  
  // Attachments
  attachments: JournalAttachment[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ANEF Standard Category Labels
export const journalCategoryLabels: Record<JournalCategory, string> = {
  reunion: 'Réunion',
  animation: 'Animation',
  animation_territoriale: 'Animation territoriale',
  mediation: 'Médiation / Gestion des conflits',
  diagnostic: 'Diagnostic',
  suivi_chantier: 'Suivi des travaux forestiers',
  suivi_pdfcp: 'Suivi PDFCP',
  sensibilisation: 'Sensibilisation & communication',
  organisation_usagers: 'Organisation des usagers (ODF/Coop/AGS)',
  partenariats: 'Partenariats institutionnels',
  activite_admin: 'Activité administrative terrain',
  autre: 'Autre (à préciser)',
};

// Category colors for badges
export const journalCategoryColors: Record<JournalCategory, string> = {
  reunion: 'bg-amber-500/20 text-amber-700 border-amber-300',
  animation: 'bg-blue-500/20 text-blue-700 border-blue-300',
  animation_territoriale: 'bg-teal-500/20 text-teal-700 border-teal-300',
  mediation: 'bg-rose-500/20 text-rose-700 border-rose-300',
  diagnostic: 'bg-purple-500/20 text-purple-700 border-purple-300',
  suivi_chantier: 'bg-emerald-500/20 text-emerald-700 border-emerald-300',
  suivi_pdfcp: 'bg-green-600/20 text-green-700 border-green-300',
  sensibilisation: 'bg-indigo-500/20 text-indigo-700 border-indigo-300',
  organisation_usagers: 'bg-orange-500/20 text-orange-700 border-orange-300',
  partenariats: 'bg-cyan-500/20 text-cyan-700 border-cyan-300',
  activite_admin: 'bg-slate-500/20 text-slate-700 border-slate-300',
  autre: 'bg-gray-500/20 text-gray-700 border-gray-300',
};

// Priority colors
export const priorityColors: Record<Priority, string> = {
  'Faible': 'bg-gray-100 text-gray-600',
  'Moyenne': 'bg-blue-100 text-blue-700',
  'Élevée': 'bg-red-100 text-red-700',
};

// Status colors
export const statusColors: Record<ValidationStatus, string> = {
  'Brouillon': 'bg-gray-100 text-gray-600',
  'Validé ADP': 'bg-green-100 text-green-700',
  'Transmis hiérarchie': 'bg-primary/20 text-primary',
};

// Organisation type labels
export const organisationLabels: Record<OrganisationType, string> = {
  'ODF': 'Organisation de Développement Forestier',
  'Coopérative': 'Coopérative forestière',
  'Association': 'Association',
  'AGS': 'Association de Gestion Sylvo-pastorale',
};
