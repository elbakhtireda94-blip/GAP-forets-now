import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-xl font-semibold text-foreground">Page introuvable</h2>
          <p className="text-muted-foreground">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <p className="text-sm text-muted-foreground/70 font-mono bg-muted rounded-lg px-3 py-2 mt-4">
            {location.pathname}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <Button
            onClick={() => navigate('/menu')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground pt-4">
          Si le problème persiste, contactez l'administrateur.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
