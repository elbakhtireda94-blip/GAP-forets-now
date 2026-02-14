import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Checks that required Supabase environment variables are present.
 * Renders an error screen if any are missing.
 */
const SupabaseCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Configuration manquante</h1>
          <p className="text-muted-foreground text-sm">
            Les variables d'environnement Lovable Cloud ne sont pas configurées.
            Veuillez vérifier que les variables suivantes sont définies&nbsp;:
          </p>
          <ul className="text-xs text-left bg-muted rounded-lg p-4 space-y-1 font-mono">
            <li className={url ? 'text-green-600' : 'text-destructive font-semibold'}>
              {url ? '✓' : '✗'} VITE_SUPABASE_URL
            </li>
            <li className={key ? 'text-green-600' : 'text-destructive font-semibold'}>
              {key ? '✓' : '✗'} VITE_SUPABASE_PUBLISHABLE_KEY
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Contactez l'administrateur système ou vérifiez la configuration du projet.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SupabaseCheck;
