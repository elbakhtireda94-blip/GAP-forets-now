import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Monitor, ChevronDown, ChevronUp, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AnefLogo from '@/components/AnefLogo';
import forestHero from '@/assets/forest-hero.jpg';
import { DEMO_ACCOUNTS } from '@/hooks/useDemo';
import { useMySQLBackend } from '@/integrations/mysql-api/client';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Email invalide').max(255, 'Email trop long');
const passwordSchema = z.string().min(6, 'Minimum 6 caractères').max(72, 'Maximum 72 caractères');
const nameSchema = z.string().min(2, 'Minimum 2 caractères').max(100, 'Maximum 100 caractères');

type AuthMode = 'login' | 'signup' | 'forgot-password';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [showDemoPanel, setShowDemoPanel] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, login: authLogin } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/menu', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/menu', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setResetSent(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }

    if (mode !== 'forgot-password') {
      try {
        passwordSchema.parse(password);
      } catch (e) {
        if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
      }
    }

    if (mode === 'signup') {
      try {
        nameSchema.parse(fullName);
      } catch (e) {
        if (e instanceof z.ZodError) newErrors.fullName = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    console.log('[Auth Page] Attempting login via AuthContext...');
    
    try {
      const result = await authLogin(email.trim().toLowerCase(), password);
      
      if (result === true) {
        console.log('[Auth Page] Login successful via AuthContext');
        toast({
          title: 'Bienvenue !',
          description: 'Connexion réussie.',
        });
        navigate('/menu', { replace: true });
      } else if (result === 'profile_error') {
        toast({
          title: 'Profil introuvable',
          description: 'Connexion OK mais le profil n\'a pas été trouvé. Exécutez dans server/ : node seed.js puis redémarrez le backend.',
          variant: 'destructive',
        });
      } else if (typeof result === 'object' && result?.error) {
        console.error('[Auth Page] Login failed:', result.error);
        const msg = result.error;
        const isBackendUnreachable = /Backend temporairement indisponible|HTML|DOCTYPE|JSON|VITE_MYSQL|mauvais endpoint|proxy/i.test(msg);
        toast({
          title: isBackendUnreachable ? 'Backend temporairement indisponible' : 'Erreur de connexion',
          description: isBackendUnreachable
            ? 'Démarrez le serveur : cd server && npm run dev. Vérifiez .env : VITE_MYSQL_API_URL=http://localhost:3002'
            : msg.length > 200 ? msg.substring(0, 200) + '…' : msg,
          variant: 'destructive',
        });
      } else {
        console.error('[Auth Page] Login failed via AuthContext');
        const isMySQL = useMySQLBackend();
        const hint = isMySQL
          ? 'Mot de passe démo : Password1 (P majuscule). Vérifiez que le backend tourne (npm run dev dans server/) et que le seed a été exécuté (node server/seed.js).'
          : 'Email ou mot de passe incorrect.';
        toast({
          title: 'Erreur de connexion',
          description: hint,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[Auth Page] Login error:', err);
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('user already registered') || msg.includes('already been registered') || msg.includes('email already in use')) {
        setErrors({
          signup: 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.',
        });
        return;
      }
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Supabase may return a user with a fake_* identity if the user already exists
    // (when "Confirm email" is enabled and user tries to re-register)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setErrors({
        signup: 'Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.',
      });
      return;
    }

    toast({
      title: 'Compte créé !',
      description: 'Vérifiez votre boîte mail pour confirmer votre compte.',
    });
    switchMode('login');
  };

  const handleForgotPassword = async () => {
    const redirectUrl = `${window.location.origin}/reset`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: redirectUrl }
    );

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setResetSent(true);
    toast({
      title: 'Email envoyé',
      description: 'Consultez votre boîte mail pour réinitialiser votre mot de passe.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await handleLogin();
      } else if (mode === 'signup') {
        await handleSignup();
      } else {
        await handleForgotPassword();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Demo login (utilise authLogin = MySQL ou Supabase selon config) ---
  const handleDemoLogin = async (accountId: string) => {
    const account = DEMO_ACCOUNTS.find(a => a.id === accountId);
    if (!account) return;

    setDemoLoading(accountId);
    try {
      const result = await authLogin(account.email, account.password);
      if (result === true) {
        toast({
          title: `Mode démonstration — ${account.label}`,
          description: 'Connexion réussie.',
        });
        navigate('/menu', { replace: true });
      } else if (result === 'profile_error') {
        toast({
          title: 'Profil introuvable',
          description: 'Exécutez dans server/ : node seed.js puis redémarrez le backend.',
          variant: 'destructive',
        });
      } else if (typeof result === 'object' && result?.error) {
        const msg = result.error;
        const isBackendUnreachable = /Backend temporairement indisponible|HTML|DOCTYPE|JSON|VITE_MYSQL|mauvais endpoint|proxy|Impossible de joindre|Failed to fetch/i.test(msg);
        toast({
          title: isBackendUnreachable ? 'Backend temporairement indisponible' : 'Compte démo indisponible',
          description: isBackendUnreachable
            ? 'Démarrez le serveur dans un terminal : cd server && npm run dev. Vérifiez aussi .env : VITE_MYSQL_API_URL=http://localhost:3002'
            : msg.length > 180 ? msg.substring(0, 180) + '…' : msg,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Compte démo indisponible',
          description: 'Email ou mot de passe incorrect. Mot de passe : Password1 (P majuscule). Backend : npm run dev dans server/.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur lors de la connexion démo.',
        variant: 'destructive',
      });
    } finally {
      setDemoLoading(null);
    }
  };

  const renderTitle = () => {
    switch (mode) {
      case 'login': return 'Connectez-vous à votre compte';
      case 'signup': return 'Créer un nouveau compte';
      case 'forgot-password': return 'Réinitialiser votre mot de passe';
    }
  };

  const renderSubmitButton = () => {
    const labels: Record<AuthMode, { idle: string; loading: string; icon: React.ReactNode }> = {
      login: { idle: 'Se connecter', loading: 'Connexion...', icon: <LogIn size={20} /> },
      signup: { idle: 'Créer mon compte', loading: 'Création...', icon: <UserPlus size={20} /> },
      'forgot-password': { idle: 'Envoyer le lien', loading: 'Envoi...', icon: <KeyRound size={20} /> },
    };
    const l = labels[mode];
    return (
      <Button type="submit" variant="anef" size="xl" className="w-full mt-6" disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            {l.loading}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {l.icon}
            {l.idle}
          </span>
        )}
      </Button>
    );
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${forestHero})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 forest-overlay" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="pt-12 pb-8 px-6">
          <div className="flex justify-center animate-fade-in">
            <AnefLogo size="lg" />
          </div>
        </header>

        {/* Auth Form */}
        <main className="flex-1 flex items-center justify-center px-4 md:px-6 pb-8">
          <div className="w-full max-w-md animate-slide-up space-y-4">
            {/* Main Auth Card */}
            <div className="bg-card/95 backdrop-blur-xl rounded-3xl p-8 shadow-card border border-border/50">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  GAP Forêts
                </h1>
                <p className="text-muted-foreground text-sm">
                  {renderTitle()}
                </p>
              </div>

              {/* Signup error with action buttons */}
              {errors.signup && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive font-medium mb-3">{errors.signup}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => switchMode('login')}
                      className="flex-1"
                    >
                      <LogIn size={16} className="mr-1" />
                      Se connecter
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => switchMode('forgot-password')}
                      className="flex-1"
                    >
                      <KeyRound size={16} className="mr-1" />
                      Mot de passe oublié
                    </Button>
                  </div>
                </div>
              )}

              {/* Forgot password: success state */}
              {mode === 'forgot-password' && resetSent ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Un email de réinitialisation a été envoyé à <span className="font-semibold text-foreground">{email}</span>.
                    Consultez votre boîte de réception.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => switchMode('login')}
                    className="mt-4"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Retour à la connexion
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nom complet</label>
                      <Input
                        type="text"
                        placeholder="Prénom Nom"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`h-12 rounded-xl bg-background border-border ${errors.fullName ? 'border-destructive' : ''}`}
                      />
                      {errors.fullName && (
                        <p className="text-xs text-destructive">{errors.fullName}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="votre.email@anef.ma"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`pl-12 h-12 rounded-xl bg-background border-border ${errors.email ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>

                  {mode !== 'forgot-password' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Mot de passe</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`pl-12 pr-12 h-12 rounded-xl bg-background border-border ${errors.password ? 'border-destructive' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-xs text-destructive">{errors.password}</p>
                      )}
                    </div>
                  )}

                  {renderSubmitButton()}
                </form>
              )}

              {/* Footer links */}
              <div className="mt-6 pt-6 border-t border-border text-center space-y-2">
                {mode === 'login' && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Pas encore de compte ?{' '}
                      <button type="button" onClick={() => switchMode('signup')} className="text-primary font-medium hover:underline">
                        S'inscrire
                      </button>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <button type="button" onClick={() => switchMode('forgot-password')} className="text-primary font-medium hover:underline">
                        Mot de passe oublié ?
                      </button>
                    </p>
                  </>
                )}
                {mode === 'signup' && (
                  <p className="text-sm text-muted-foreground">
                    Déjà un compte ?{' '}
                    <button type="button" onClick={() => switchMode('login')} className="text-primary font-medium hover:underline">
                      Se connecter
                    </button>
                  </p>
                )}
                {mode === 'forgot-password' && !resetSent && (
                  <p className="text-sm text-muted-foreground">
                    <button type="button" onClick={() => switchMode('login')} className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                      <ArrowLeft size={14} />
                      Retour à la connexion
                    </button>
                  </p>
                )}
              </div>
            </div>

            {/* Comptes de démonstration — visible sur la page d'accueil pour présentation */}
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-primary/30 shadow-card overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDemoPanel(!showDemoPanel)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Comptes pour la démonstration</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                    Présentation
                  </Badge>
                </div>
                {showDemoPanel ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {showDemoPanel && (
                <div className="px-5 pb-5 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur un compte pour vous connecter. <strong>Mot de passe commun : Password1</strong>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DEMO_ACCOUNTS.map((account) => (
                      <Button
                        key={account.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!!demoLoading}
                        onClick={() => handleDemoLogin(account.id)}
                        className="h-auto py-4 px-4 flex flex-col items-start gap-1.5 text-left hover:bg-primary/10 hover:border-primary/50 transition-all border-2"
                      >
                        {demoLoading === account.id ? (
                          <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                        ) : (
                          <>
                            <span className="text-xl leading-none">{account.icon}</span>
                            <span className="text-sm font-semibold text-foreground">{account.label}</span>
                            <span className="text-xs text-muted-foreground leading-tight font-mono">{account.email}</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">{account.description}</span>
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Ces comptes nécessitent un backend déployé (MySQL). En local : <code className="bg-muted px-1 rounded">cd server && npm run dev</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 text-center">
          <p className="text-primary-foreground/60 text-xs">
            © 2026 ANEF - Agence Nationale des Eaux et Forêts
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Auth;
