/**
 * Contrôle d'accès démo ADMIN / DG en production.
 * VITE_DISABLE_DEMO_ADMIN_DG=true (défaut en prod) : cartes ADMIN/DG désactivées et accès bloqué.
 * VITE_DISABLE_DEMO_ADMIN_DG=false : réactive ADMIN et DG pour usage interne.
 */

const DISABLE_VAR = import.meta.env.VITE_DISABLE_DEMO_ADMIN_DG as string | undefined;

/** true = ADMIN et DG désactivés (prod). false = réactivés. */
export function isDemoAdminDgDisabled(): boolean {
  return DISABLE_VAR !== 'false';
}

export const DEMO_ADMIN_DG_IDS = ['demo-admin', 'demo-dg'] as const;
export const DEMO_ADMIN_DG_EMAILS = ['demo@anef.ma', 'demo.dg@anef.ma'] as const;

export function isDemoAdminOrDgAccount(accountId: string): boolean {
  return DEMO_ADMIN_DG_IDS.includes(accountId as (typeof DEMO_ADMIN_DG_IDS)[number]);
}

export function isDemoAdminOrDgEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return DEMO_ADMIN_DG_EMAILS.some((e) => e.toLowerCase() === lower);
}
