import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  compact = false,
  showDetails = true,
}) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    errorCount,
    lastSyncTime,
    syncAll,
    retryFailed,
  } = useOfflineSync();

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Jamais';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    
    return lastSyncTime.toLocaleDateString('fr-FR');
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Cloud className={cn(
                  'h-4 w-4',
                  isSyncing ? 'text-blue-500 animate-pulse' : 'text-green-500'
                )} />
              ) : (
                <CloudOff className="h-4 w-4 text-amber-500" />
              )}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {errorCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p>{isOnline ? 'En ligne' : 'Hors ligne'}</p>
              {pendingCount > 0 && <p>{pendingCount} en attente</p>}
              {errorCount > 0 && <p>{errorCount} erreur(s)</p>}
              <p className="text-muted-foreground">Sync: {formatLastSync()}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Cloud className={cn(
                'h-5 w-5',
                isSyncing ? 'text-blue-500 animate-pulse' : 'text-green-500'
              )} />
              <span className="font-medium text-sm">
                {isSyncing ? 'Synchronisation...' : 'En ligne'}
              </span>
            </>
          ) : (
            <>
              <CloudOff className="h-5 w-5 text-amber-500" />
              <span className="font-medium text-sm text-amber-600">Mode hors ligne</span>
            </>
          )}
        </div>
        
        {isOnline && pendingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={syncAll}
            disabled={isSyncing}
            className="h-8"
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isSyncing && 'animate-spin')} />
            Synchroniser
          </Button>
        )}
      </div>

      {showDetails && (
        <div className="space-y-2">
          {/* Pending count */}
          {pendingCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">En attente</span>
              <Badge variant="secondary">{pendingCount}</Badge>
            </div>
          )}

          {/* Error count */}
          {errorCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Erreurs</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{errorCount}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryFailed}
                  className="h-6 px-2 text-xs"
                >
                  Réessayer
                </Button>
              </div>
            </div>
          )}

          {/* All synced */}
          {pendingCount === 0 && errorCount === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>Toutes les données sont synchronisées</span>
            </div>
          )}

          {/* Last sync */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span>Dernière sync</span>
            <span>{formatLastSync()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
