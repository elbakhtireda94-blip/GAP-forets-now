/**
 * useDemo — Détecte les comptes démo (demo@anef.ma, adp.demo@anef.ma).
 * Mot de passe commun : Password1
 *
 * isDemoReadonly est à false : les comptes démo ont accès en saisie
 * pour tester toutes les fonctionnalités de l'app (PDFCP, cahier de journal, etc.).
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/** Mot de passe commun pour tous les comptes démo (seed server/seed.js) */
export const DEMO_PASSWORD = 'Password1';

export const DEMO_ACCOUNTS = [
  {
    id: 'demo-production',
    label: 'Démo Production (Admin)',
    icon: '👔',
    description: 'Accès complet pour les tests',
    email: 'demo@anef.ma',
    password: DEMO_PASSWORD,
    scope: 'ADMIN' as const,
  },
  {
    id: 'adp-demo',
    label: 'ADP Démo Terrain',
    icon: '🌱',
    description: 'DRANEF RSK, DPANEF Kénitra, Sidi Taibi',
    email: 'adp.demo@anef.ma',
    password: DEMO_PASSWORD,
    scope: 'LOCAL' as const,
  },
] as const;

/** Emails reconnus comme comptes démo (alignés sur le seed) */
const DEMO_EMAIL_PATTERN = /^(demo|adp\.demo)@anef\.ma$/i;

export function useDemo() {
  const { user } = useAuth();

  const isDemo = useMemo(() => {
    if (!user?.email) return false;
    return DEMO_EMAIL_PATTERN.test(user.email);
  }, [user?.email]);

  const demoRole = useMemo(() => {
    if (!isDemo || !user?.email) return null;
    return DEMO_ACCOUNTS.find(a => a.email === user.email) || null;
  }, [isDemo, user?.email]);

  return {
    isDemo,
    // Désactivé : les comptes démo peuvent saisir et modifier pour tester l'app.
    isDemoReadonly: false,
    demoRole,
    demoLabel: demoRole?.label || 'Démonstration',
  };
}
