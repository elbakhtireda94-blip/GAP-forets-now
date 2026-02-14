import React, { lazy, Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotificationCenter = lazy(() => import('@/components/NotificationCenter'));

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backPath?: string;
  rightAction?: React.ReactNode;
  showNotifications?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  backPath = '/menu',
  rightAction,
  showNotifications = true,
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20 shrink-0"
            onClick={() => navigate(backPath)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{title}</h1>
          {subtitle && (
            <p className="text-primary-foreground/80 text-xs truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showNotifications && (
            <Suspense fallback={null}>
              <NotificationCenter />
            </Suspense>
          )}
          {rightAction}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
