import React from 'react';
import { useSync } from '@/contexts/SyncContext';

const AppFooter: React.FC = () => {
  const { lastSyncTime } = useSync();

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Jamais synchronisé';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <footer className="fixed bottom-16 left-0 right-0 bg-card/80 backdrop-blur-sm border-t border-border px-4 py-2 z-30">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>ADP Territoire v1.0</span>
        <span>Sync: {formatSyncTime(lastSyncTime)}</span>
      </div>
    </footer>
  );
};

export default AppFooter;
