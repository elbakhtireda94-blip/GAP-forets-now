import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SyncStatus = 'pending' | 'synced' | 'error';

export interface PendingEntry {
  id: string;
  type: 'activity' | 'conflict' | 'pdfc';
  data: unknown;
  status: SyncStatus;
  createdAt: Date;
  error?: string;
}

interface SyncContextType {
  pendingEntries: PendingEntry[];
  lastSyncTime: Date | null;
  isOnline: boolean;
  isSyncing: boolean;
  addPendingEntry: (type: PendingEntry['type'], data: unknown) => string;
  updateEntryStatus: (id: string, status: SyncStatus, error?: string) => void;
  removePendingEntry: (id: string) => void;
  syncNow: () => Promise<void>;
  getPendingCount: () => number;
  getSyncHistory: () => { date: Date; count: number; success: boolean }[];
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const SYNC_STORAGE_KEY = 'anef_sync_data';
const SYNC_HISTORY_KEY = 'anef_sync_history';

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>(() => {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((e: PendingEntry) => ({
          ...e,
          createdAt: new Date(e.createdAt),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const stored = localStorage.getItem('anef_last_sync');
    return stored ? new Date(stored) : null;
  });

  const [syncHistory, setSyncHistory] = useState<{ date: Date; count: number; success: boolean }[]>(() => {
    const stored = localStorage.getItem(SYNC_HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((h: { date: string; count: number; success: boolean }) => ({
          ...h,
          date: new Date(h.date),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Persist pending entries
  useEffect(() => {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(pendingEntries));
  }, [pendingEntries]);

  // Persist sync history
  useEffect(() => {
    localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(syncHistory));
  }, [syncHistory]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const generateId = () => `SYNC${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

  const addPendingEntry = (type: PendingEntry['type'], data: unknown): string => {
    const id = generateId();
    const entry: PendingEntry = {
      id,
      type,
      data,
      status: 'pending',
      createdAt: new Date(),
    };
    setPendingEntries(prev => [...prev, entry]);
    return id;
  };

  const updateEntryStatus = (id: string, status: SyncStatus, error?: string) => {
    setPendingEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, status, error } : e))
    );
  };

  const removePendingEntry = (id: string) => {
    setPendingEntries(prev => prev.filter(e => e.id !== id));
  };

  const syncNow = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const pendingCount = pendingEntries.filter(e => e.status === 'pending').length;
    let successCount = 0;

    try {
      // Simulate sync process
      for (const entry of pendingEntries.filter(e => e.status === 'pending')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Simulate 95% success rate
        if (Math.random() > 0.05) {
          updateEntryStatus(entry.id, 'synced');
          successCount++;
        } else {
          updateEntryStatus(entry.id, 'error', 'Échec de synchronisation');
        }
      }

      // Remove synced entries after successful sync
      setPendingEntries(prev => prev.filter(e => e.status !== 'synced'));

      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('anef_last_sync', now.toISOString());

      // Add to sync history
      setSyncHistory(prev => [
        { date: now, count: pendingCount, success: successCount === pendingCount },
        ...prev.slice(0, 9), // Keep last 10 entries
      ]);
    } finally {
      setIsSyncing(false);
    }
  };

  const getPendingCount = () => pendingEntries.filter(e => e.status === 'pending').length;

  const getSyncHistory = () => syncHistory;

  return (
    <SyncContext.Provider
      value={{
        pendingEntries,
        lastSyncTime,
        isOnline,
        isSyncing,
        addPendingEntry,
        updateEntryStatus,
        removePendingEntry,
        syncNow,
        getPendingCount,
        getSyncHistory,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
