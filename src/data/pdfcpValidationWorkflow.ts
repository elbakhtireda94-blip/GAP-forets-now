/**
 * PDFCP Validation Workflow Constants
 * 
 * States: BROUILLON → CONCERTE_ADP → VALIDE_DPANEF → VALIDE_CENTRAL → VERROUILLE
 * 
 * Rules:
 * - ADMIN: full control (all transitions, lock/unlock)
 * - ADP (LOCAL): BROUILLON → CONCERTE_ADP (soumet le plan concerté)
 * - DPANEF (PROVINCIAL): valide le CP (CONCERTE_ADP → VALIDE_DPANEF) et envoie au DRANEF
 * - DRANEF (REGIONAL): reçoit du DPANEF, valide (VALIDE_DPANEF → VALIDE_CENTRAL)
 * - ADMIN only: VALIDE_CENTRAL → VERROUILLE, VERROUILLE → VALIDE_CENTRAL (unlock)
 * 
 * Locking: modification blocked ONLY when validation_status === 'VERROUILLE'
 */

import { FileText, CheckCircle, Shield, Lock, Unlock } from 'lucide-react';
import type { ScopeLevel } from '@/lib/rbac';

export type PdfcpValidationStatus =
  | 'BROUILLON'
  | 'CONCERTE_ADP'
  | 'VALIDE_DPANEF'
  | 'VALIDE_CENTRAL'
  | 'VERROUILLE';

export const PDFCP_VALIDATION_STATUSES: PdfcpValidationStatus[] = [
  'BROUILLON',
  'CONCERTE_ADP',
  'VALIDE_DPANEF',
  'VALIDE_CENTRAL',
  'VERROUILLE',
];

export const VALIDATION_STATUS_CONFIG: Record<PdfcpValidationStatus, {
  label: string;
  color: string;
  icon: typeof FileText;
}> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: FileText },
  CONCERTE_ADP: { label: 'Concerté ADP', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: CheckCircle },
  VALIDE_DPANEF: { label: 'Validé DPANEF (envoyé au DRANEF)', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
  VALIDE_CENTRAL: { label: 'Validé DRANEF / Central', color: 'bg-primary/10 text-primary border-primary/30', icon: Shield },
  VERROUILLE: { label: 'Verrouillé', color: 'bg-red-100 text-red-800 border-red-300', icon: Lock },
};

/** Ordered transitions: from → allowed next statuses */
export const VALIDATION_TRANSITIONS: Record<PdfcpValidationStatus, PdfcpValidationStatus[]> = {
  BROUILLON: ['CONCERTE_ADP'],
  CONCERTE_ADP: ['VALIDE_DPANEF', 'BROUILLON'],
  VALIDE_DPANEF: ['VALIDE_CENTRAL', 'BROUILLON'],
  VALIDE_CENTRAL: ['VERROUILLE', 'BROUILLON'],
  VERROUILLE: ['VALIDE_CENTRAL'], // unlock only
};

/** Role required to advance to each status */
export const VALIDATION_ROLE_FOR_STATUS: Record<PdfcpValidationStatus, ScopeLevel[]> = {
  BROUILLON: ['ADMIN'], // revert via annulation
  CONCERTE_ADP: ['LOCAL', 'ADMIN'],
  VALIDE_DPANEF: ['PROVINCIAL', 'ADMIN'],
  VALIDE_CENTRAL: ['NATIONAL', 'REGIONAL', 'ADMIN'],
  VERROUILLE: ['ADMIN'],
};

/** Check if a PDFCP is locked (read-only) */
export function isPdfcpLocked(validationStatus: string | null | undefined): boolean {
  return validationStatus === 'VERROUILLE';
}

/** Check if user can advance validation to a target status */
export function canAdvanceValidation(
  currentStatus: string | null | undefined,
  targetStatus: PdfcpValidationStatus,
  userScope: ScopeLevel
): boolean {
  const current = (currentStatus || 'BROUILLON') as PdfcpValidationStatus;
  const allowedTransitions = VALIDATION_TRANSITIONS[current];
  if (!allowedTransitions?.includes(targetStatus)) return false;
  
  const allowedRoles = VALIDATION_ROLE_FOR_STATUS[targetStatus];
  return allowedRoles.includes(userScope);
}

/** Get available validation actions for the current user */
export function getAvailableActions(
  currentStatus: string | null | undefined,
  userScope: ScopeLevel
): { status: PdfcpValidationStatus; label: string; variant: 'default' | 'destructive' | 'outline' }[] {
  const current = (currentStatus || 'BROUILLON') as PdfcpValidationStatus;
  const actions: { status: PdfcpValidationStatus; label: string; variant: 'default' | 'destructive' | 'outline' }[] = [];

  // Forward transitions
  const transitions = VALIDATION_TRANSITIONS[current] || [];
  for (const target of transitions) {
    if (target === 'BROUILLON') continue; // handled as cancellation
    if (canAdvanceValidation(current, target, userScope)) {
      const config = VALIDATION_STATUS_CONFIG[target];
      let actionLabel = target === 'VERROUILLE' ? 'Verrouiller' : `Valider → ${config.label}`;
      if (target === 'VALIDE_DPANEF' && userScope === 'PROVINCIAL') actionLabel = 'Valider le CP et envoyer au DRANEF';
      if (target === 'VALIDE_CENTRAL' && userScope === 'REGIONAL') actionLabel = 'Donner le visa DRANEF (validation central)';
      actions.push({
        status: target,
        label: actionLabel,
        variant: target === 'VERROUILLE' ? 'destructive' : 'default',
      });
    }
  }

  return actions;
}

/** Check if user can cancel (revert to BROUILLON) from current status */
export function canCancelValidation(
  currentStatus: string | null | undefined,
  userScope: ScopeLevel
): boolean {
  const current = (currentStatus || 'BROUILLON') as PdfcpValidationStatus;
  if (current === 'BROUILLON' || current === 'VERROUILLE') return false;
  
  // ADMIN can always cancel
  if (userScope === 'ADMIN') return true;
  
  // ADP can cancel CONCERTE_ADP
  if (current === 'CONCERTE_ADP' && userScope === 'LOCAL') return true;
  
  // DPANEF can cancel VALIDE_DPANEF / VALIDE_CENTRAL
  if ((current === 'VALIDE_DPANEF' || current === 'VALIDE_CENTRAL') && userScope === 'PROVINCIAL') return true;
  
  // DRANEF can cancel VALIDE_DPANEF / VALIDE_CENTRAL
  if ((current === 'VALIDE_DPANEF' || current === 'VALIDE_CENTRAL') && userScope === 'REGIONAL') return true;
  
  return false;
}

/** Check if user (ADMIN only) can unlock a VERROUILLE program */
export function canUnlock(
  currentStatus: string | null | undefined,
  userScope: ScopeLevel
): boolean {
  return currentStatus === 'VERROUILLE' && userScope === 'ADMIN';
}

/** Timeline action key mapping for display */
export const TIMELINE_ACTION_CONFIG: Record<string, {
  icon: typeof FileText;
  label: string;
  color: string;
}> = {
  created: { icon: FileText, label: 'Création', color: 'text-blue-600 bg-blue-100' },
  status_change_concerte_adp: { icon: CheckCircle, label: 'Concerté ADP', color: 'text-blue-600 bg-blue-100' },
  status_change_valide_dpanef: { icon: CheckCircle, label: 'Validé DPANEF', color: 'text-green-600 bg-green-100' },
  status_change_valide_central: { icon: Shield, label: 'Validé Central', color: 'text-primary bg-primary/10' },
  status_change_verrouille: { icon: Lock, label: 'Verrouillé', color: 'text-red-600 bg-red-100' },
  unlocked: { icon: Unlock, label: 'Déverrouillé', color: 'text-orange-600 bg-orange-100' },
  cancellation_concerte: { icon: FileText, label: 'Annulation Concerté', color: 'text-red-600 bg-red-100' },
  cancellation_valide_dpanef: { icon: FileText, label: 'Annulation DPANEF', color: 'text-red-600 bg-red-100' },
  cancellation_valide_central: { icon: FileText, label: 'Annulation Central', color: 'text-red-600 bg-red-100' },
  // Legacy keys for backward compat
  status_change_validated_adp: { icon: CheckCircle, label: 'Validé ADP', color: 'text-blue-600 bg-blue-100' },
  status_change_validated_dpanef: { icon: CheckCircle, label: 'Validé DPANEF', color: 'text-green-600 bg-green-100' },
  status_change_visa_dranef: { icon: Shield, label: 'VISA DRANEF', color: 'text-primary bg-primary/10' },
  cancellation_cp: { icon: FileText, label: 'Annulation CP', color: 'text-red-600 bg-red-100' },
  cancellation_execute: { icon: FileText, label: 'Annulation Exécuté', color: 'text-red-600 bg-red-100' },
};
