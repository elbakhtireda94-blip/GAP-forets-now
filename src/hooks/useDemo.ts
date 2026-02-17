/**
 * useDemo — Comptes démo : ADMIN, DG, DRANEF, DPANEF, ADP (voir DEMO_ACCOUNTS).
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
    id: 'demo-admin',
    label: 'Démo ADMIN',
    icon: '👔',
    description: 'Accès complet administrateur',
    email: 'demo@anef.ma',
    password: DEMO_PASSWORD,
    scope: 'ADMIN' as const,
  },
  {
    id: 'demo-dg',
    label: 'Démo DG',
    icon: '🏛️',
    description: 'Direction générale (niveau national)',
    email: 'demo.dg@anef.ma',
    password: DEMO_PASSWORD,
    scope: 'NATIONAL' as const,
  },
  {
    id: 'demo-dranef',
    label: 'Démo DRANEF',
    icon: '📍',
    description: 'DRANEF Rabat-Salé-Kénitra',
    email: 'dranef.rsk@anef.ma',
    password: DEMO_PASSWORD,
    scope: 'REGIONAL' as const,
  },
  {
    id: 'demo-dpanef',
    label: 'Démo DPANEF',
    icon: '🏢',
    description: 'DPANEF Kénitra',
    email: 'dpanef.ken@anef.ma',
    password: DEMO_PASSWORD,
    scope: 'PROVINCIAL' as const,
  },
  {
    id: 'demo-adp',
    label: 'Démo ADP',
    icon: '🌱',
    description: 'ADP terrain — Sidi Taibi, DPANEF Kénitra',
    email: 'adp.demo@anef.ma',
    password: DEMO_PASSWORD,
    scope: 'LOCAL' as const,
  },
] as const;

/** Emails reconnus comme comptes démo (alignés sur le seed) */
const DEMO_EMAIL_PATTERN = /^(demo|demo\.dg|adp\.demo|dranef\.rsk|dpanef\.ken)@anef\.ma$/i;

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
