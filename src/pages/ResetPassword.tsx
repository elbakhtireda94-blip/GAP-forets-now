import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AnefLogo from '@/components/AnefLogo';
import forestHero from '@/assets/forest-hero.jpg';
import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Minimum 6 caractères').max(72, 'Maximum 72 caractères');

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sessionReady, setSessionReady] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Wait for the PASSWORD_RECOVERY event from the email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (user clicked link and session was set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: 'Erreur',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setSuccess(true);
      toast({
        title: 'Mot de passe mis à jour',
        description: 'Vous pouvez maintenant vous connecter.',
      });

      // Redirect after a short delay
      setTimeout(() => navigate('/menu', { replace: true }), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${forestHero})` }}
      />
      <div className="absolute inset-0 forest-overlay" />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="pt-12 pb-8 px-6">
          <div className="flex justify-center animate-fade-in">
            <AnefLogo size="lg" />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 md:px-6 pb-8">
          <div className="w-full max-w-md animate-slide-up">
            <div className="bg-card/95 backdrop-blur-xl rounded-3xl p-8 shadow-card border border-border/50">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  GAP Forêts
                </h1>
                <p className="text-muted-foreground text-sm">
                  Nouveau mot de passe
                </p>
              </div>

              {success ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Votre mot de passe a été mis à jour. Redirection...
                  </p>
                </div>
              ) : !sessionReady ? (
                <div className="text-center space-y-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Vérification du lien de réinitialisation...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Si cette page ne se charge pas, le lien est peut-être expiré.{' '}
                    <button type="button" onClick={() => navigate('/')} className="text-primary hover:underline">
                      Retour à la connexion
                    </button>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
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
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pl-12 h-12 rounded-xl bg-background border-border ${errors.confirmPassword ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                  </div>

                  <Button type="submit" variant="anef" size="xl" className="w-full mt-6" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                        Mise à jour...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <KeyRound size={20} />
                        Mettre à jour le mot de passe
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </main>

        <footer className="py-4 text-center">
          <p className="text-primary-foreground/60 text-xs">
            © 2026 ANEF - Agence Nationale des Eaux et Forêts
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ResetPassword;
