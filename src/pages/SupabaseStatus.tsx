/**
 * Admin page — Backend Connection Status
 * Displays connectivity checks, auth state, and basic read tests.
 * Accessible to all authenticated users; admin-only features gated in UI.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Shield,
  Database,
  Users,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────
interface CheckResult {
  status: 'pending' | 'ok' | 'warn' | 'error';
  label: string;
  detail?: string;
}

// ─── Safe table check ────────────────────────────────────────────
async function safeTableCount(tableName: string): Promise<{ exists: boolean; count: number | null; error?: string }> {
  try {
    const { count, error } = await supabase
      .from(tableName as any)
      .select('*', { count: 'exact', head: true });
    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { exists: false, count: null };
      }
      return { exists: true, count: null, error: error.message };
    }
    return { exists: true, count: count ?? 0 };
  } catch (err: any) {
    return { exists: false, count: null, error: err.message };
  }
}

// ─── Component ───────────────────────────────────────────────────
const SupabaseStatus: React.FC = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [running, setRunning] = useState(false);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [promoting, setPromoting] = useState(false);

  const maskedUrl = (() => {
    try {
      const raw = import.meta.env.VITE_SUPABASE_URL || '';
      const url = new URL(raw);
      return url.hostname;
    } catch {
      return '—';
    }
  })();

  const setCheck = (key: string, result: CheckResult) =>
    setChecks((prev) => ({ ...prev, [key]: result }));

  const runChecks = useCallback(async () => {
    setRunning(true);
    setChecks({});

    // 1) Env vars
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    setCheck('env', {
      status: url && key ? 'ok' : 'error',
      label: "Variables d'environnement",
      detail: url && key ? 'URL et clé configurées' : 'Variable(s) manquante(s)',
    });

    // 2) Auth session
    try {
      const { data: { session: s }, error } = await supabase.auth.getSession();
      if (error) throw error;
      setCheck('auth', {
        status: s ? 'ok' : 'warn',
        label: 'Session authentification',
        detail: s
          ? `Connecté : ${s.user.email} (expire ${new Date(s.expires_at! * 1000).toLocaleString('fr-FR')})`
          : 'Aucune session active',
      });
    } catch (err: any) {
      setCheck('auth', { status: 'error', label: 'Session authentification', detail: err.message });
    }

    // 3) Read test — profiles
    const profilesResult = await safeTableCount('profiles');
    if (!profilesResult.exists) {
      setCheck('read', { status: 'error', label: 'Lecture (profiles)', detail: 'Table non créée' });
    } else if (profilesResult.error) {
      setCheck('read', { status: 'error', label: 'Lecture (profiles)', detail: profilesResult.error });
    } else {
      setCheck('read', {
        status: 'ok',
        label: 'Lecture (profiles)',
        detail: `Accessible — ${profilesResult.count} profil(s)`,
      });
    }

    // 4) Read test — regions (reference data)
    const regionsResult = await safeTableCount('regions');
    if (!regionsResult.exists) {
      setCheck('ref', { status: 'warn', label: 'Données référentielles (regions)', detail: 'Table non créée' });
    } else if (regionsResult.error) {
      setCheck('ref', { status: 'error', label: 'Données référentielles (regions)', detail: regionsResult.error });
    } else {
      setCheck('ref', {
        status: regionsResult.count && regionsResult.count > 0 ? 'ok' : 'warn',
        label: 'Données référentielles (regions)',
        detail: regionsResult.count && regionsResult.count > 0
          ? `${regionsResult.count} région(s) configurée(s)`
          : 'Aucune région — référentiel vide',
      });
    }

    // 5) Admin count from user_roles
    const rolesResult = await safeTableCount('user_roles');
    if (!rolesResult.exists) {
      // Fallback: no user_roles table
      setAdminCount(0);
      setCheck('admins', {
        status: 'warn',
        label: 'Comptes ADMIN',
        detail: 'Table user_roles non créée — impossible de vérifier',
      });
    } else {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('id')
          .eq('role', 'ADMIN');
        if (error) throw error;
        const count = data?.length ?? 0;
        setAdminCount(count);
        setCheck('admins', {
          status: count > 0 ? 'ok' : 'warn',
          label: 'Comptes ADMIN',
          detail: count > 0
            ? `${count} administrateur(s) trouvé(s)`
            : '⚠ Aucun ADMIN — utilisez le bouton ci-dessous',
        });
      } catch (err: any) {
        setAdminCount(0);
        setCheck('admins', { status: 'error', label: 'Comptes ADMIN', detail: err.message });
      }
    }

    // 6) PDFCP programs read
    const pdfcpResult = await safeTableCount('pdfcp_programs');
    if (!pdfcpResult.exists) {
      setCheck('pdfcp', { status: 'warn', label: 'PDFCP Programs', detail: 'Table non créée' });
    } else if (pdfcpResult.error) {
      setCheck('pdfcp', { status: 'error', label: 'PDFCP Programs', detail: pdfcpResult.error });
    } else {
      setCheck('pdfcp', {
        status: 'ok',
        label: 'PDFCP Programs',
        detail: `${pdfcpResult.count ?? 0} programme(s) en base`,
      });
    }

    setRunning(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  // ─── Promote to ADMIN ─────────────────────────────────────────
  const handlePromoteAdmin = async () => {
    if (!session?.access_token) {
      toast.error('Vous devez être connecté');
      return;
    }

    setPromoting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-role-setup', {
        body: {},
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Vous êtes maintenant ADMIN ! Rechargement…');
        // Re-run checks after a short delay
        setTimeout(() => {
          runChecks();
          // Force page reload to refresh auth context
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data?.error || 'Échec de la promotion');
      }
    } catch (err: any) {
      console.error('Admin promotion error:', err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setPromoting(false);
    }
  };

  const statusIcon = (status: CheckResult['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />;
      case 'warn':
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Statut Backend
          </h1>
          <p className="text-xs text-muted-foreground">Diagnostics de connexion</p>
        </div>
        <Button variant="outline" size="sm" onClick={runChecks} disabled={running}>
          <RefreshCw className={`h-4 w-4 mr-1 ${running ? 'animate-spin' : ''}`} />
          Relancer
        </Button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Connection Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Informations de connexion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Hostname</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{maskedUrl}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Environnement</span>
              <Badge variant={import.meta.env.PROD ? 'default' : 'outline'}>
                {import.meta.env.PROD ? 'Production' : 'Développement'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Utilisateur connecté</span>
              <span className="text-xs font-medium">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Rôle</span>
              <Badge variant="outline">{user?.scope_level || '—'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Checks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Vérifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(checks).map(([key, check]) => (
              <div key={key} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                {statusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  {check.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{check.detail}</p>
                  )}
                </div>
              </div>
            ))}
            {Object.keys(checks).length === 0 && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vérification en cours…
              </div>
            )}
          </CardContent>
        </Card>

        {/* First ADMIN setup */}
        {adminCount === 0 && session && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Aucun administrateur configuré
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 mb-3">
                    Pour un fonctionnement correct, au moins un utilisateur doit avoir le rôle ADMIN.
                    Cliquez ci-dessous pour vous attribuer ce rôle.
                  </p>
                  <Button
                    onClick={handlePromoteAdmin}
                    disabled={promoting}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    {promoting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Promotion en cours…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Me définir ADMIN
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dev mode info */}
        {import.meta.env.DEV && (
          <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Mode développement
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Le panneau démo est activé sur la page de connexion.
                    En production, il sera masqué automatiquement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default SupabaseStatus;
