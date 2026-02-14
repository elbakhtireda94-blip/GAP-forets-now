import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mysqlApi, getMySQLApiUrl, getToken, request as mysqlRequest } from '@/integrations/mysql-api/client';

export type SyncStatus = 'pending' | 'synced' | 'error' | 'conflict';
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  tableName: string;
  operation: SyncOperation;
  recordId?: string;
  payload: Record<string, unknown>;
  status: SyncStatus;
  errorMessage?: string;
  retryCount: number;
  queuedAt: Date;
  syncedAt?: Date;
  offlineId: string;
}

const STORAGE_KEY = 'anef_offline_queue';
const MAX_RETRIES = 3;

// Generate unique offline ID
const generateOfflineId = () => 
  `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function useOfflineSync() {
  const { user, isAuthenticated } = useAuth();
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncInProgress = useRef(false);

  // Load queue from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setQueue(parsed.map((item: SyncQueueItem) => ({
          ...item,
          queuedAt: new Date(item.queuedAt),
          syncedAt: item.syncedAt ? new Date(item.syncedAt) : undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }, []);

  // Persist queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }, [queue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (queue.some(item => item.status === 'pending')) {
        syncAll();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue]);

  // Add item to queue
  const addToQueue = useCallback((
    tableName: string,
    operation: SyncOperation,
    payload: Record<string, unknown>,
    recordId?: string
  ): string => {
    const offlineId = generateOfflineId();
    const item: SyncQueueItem = {
      id: offlineId,
      tableName,
      operation,
      recordId,
      payload,
      status: 'pending',
      retryCount: 0,
      queuedAt: new Date(),
      offlineId,
    };

    setQueue(prev => [...prev, item]);
    
    // Try to sync immediately if online
    if (isOnline && isAuthenticated) {
      syncItem(item);
    }

    return offlineId;
  }, [isOnline, isAuthenticated]);

  // Sync a single item
  const syncItem = useCallback(async (item: SyncQueueItem): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Si tableName commence par "pdfcp_", utiliser MySQL API au lieu de Supabase
      const isPdfcpTable = item.tableName.startsWith('pdfcp_');
      
      if (isPdfcpTable) {
        // Utiliser MySQL API pour les tables PDFCP
        const token = getToken();
        if (!token) {
          throw new Error('Token MySQL manquant. Veuillez vous reconnecter.');
        }
        
        const apiUrl = `${getMySQLApiUrl()}/api/${item.tableName}`;
        console.log(`[OfflineSync MySQL] ${item.operation} ${apiUrl}`);
        
        let result;
        switch (item.operation) {
          case 'INSERT':
            // Pour pdfcp_programs, utiliser la route spécifique
            if (item.tableName === 'pdfcp_programs') {
              const { data, error } = await mysqlApi.postPdfcpProgram({
                ...item.payload,
                created_by: user.id,
                updated_by: user.id,
              } as any);
              if (error) throw new Error(error.message);
              result = { data, error: null };
            } else {
              // Pour autres tables pdfcp_*, utiliser request générique
              const { data, error } = await mysqlRequest('POST', `/${item.tableName}`, {
                ...item.payload,
                created_by: user.id,
                updated_by: user.id,
              });
              if (error) throw new Error(error.message);
              result = { data, error: null };
            }
            break;
            
          case 'UPDATE':
            if (!item.recordId) throw new Error('Record ID required for UPDATE');
            // Pour pdfcp_programs
            if (item.tableName === 'pdfcp_programs') {
              const { data, error } = await mysqlApi.patchPdfcpProgram(item.recordId, {
                ...item.payload,
                updated_by: user.id,
              } as any);
              if (error) throw new Error(error.message);
              result = { data, error: null };
            } else {
              const { data, error } = await mysqlRequest('PATCH', `/${item.tableName}/${item.recordId}`, {
                ...item.payload,
                updated_by: user.id,
              });
              if (error) throw new Error(error.message);
              result = { data, error: null };
            }
            break;
            
          case 'DELETE':
            if (!item.recordId) throw new Error('Record ID required for DELETE');
            // Pour pdfcp_programs, pas de DELETE dans l'API actuelle, utiliser route générique
            const { data, error } = await mysqlRequest('DELETE', `/${item.tableName}/${item.recordId}`);
            if (error) throw new Error(error.message);
            result = { data, error: null };
            break;
        }
        
        if (result.error) {
          throw result.error;
        }
      } else {
        // Comportement existant pour les tables non-PDFCP (Supabase)
        let result;
        
        switch (item.operation) {
          case 'INSERT':
            result = await (supabase
              .from(item.tableName as 'field_activities')
              .insert({
                ...item.payload,
                created_by: user.id,
                updated_by: user.id,
              } as never));
            break;
            
          case 'UPDATE':
            if (!item.recordId) throw new Error('Record ID required for UPDATE');
            result = await (supabase
              .from(item.tableName as 'field_activities')
              .update({
                ...item.payload,
                updated_by: user.id,
              } as never)
              .eq('id', item.recordId));
            break;
            
          case 'DELETE':
            if (!item.recordId) throw new Error('Record ID required for DELETE');
            result = await (supabase
              .from(item.tableName as 'field_activities')
              .delete()
              .eq('id', item.recordId));
            break;
        }

        if (result.error) {
          throw result.error;
        }
      }

      // Mark as synced
      setQueue(prev => prev.map(q => 
        q.offlineId === item.offlineId 
          ? { ...q, status: 'synced' as SyncStatus, syncedAt: new Date() }
          : q
      ));

      // Also record in sync_queue table for audit
      // Sanitize payload to remove sensitive fields before storing
      const sanitizePayload = (data: Record<string, unknown>): Record<string, string | number | boolean | null> => {
        const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'apiKey', 'cine', 'email', 'phone'];
        const sanitized: Record<string, string | number | boolean | null> = {};
        for (const [key, value] of Object.entries(data)) {
          if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            sanitized[key] = '[REDACTED]';
          } else if (value === null || value === undefined) {
            sanitized[key] = null;
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            sanitized[key] = value;
          } else if (Array.isArray(value)) {
            sanitized[key] = `[Array:${value.length}]`;
          } else if (typeof value === 'object') {
            sanitized[key] = '[Object]';
          } else {
            sanitized[key] = String(value);
          }
        }
        return sanitized;
      };
      
      // Store only operation metadata, not full payload to prevent data leakage
      const auditPayload = {
        operation_summary: `${item.operation} on ${item.tableName}`,
        field_count: Object.keys(item.payload).length,
        has_attachments: 'attachments' in item.payload,
        sanitized_fields: sanitizePayload(item.payload),
      };
      
      await supabase.from('sync_queue').insert([{
        user_id: user.id,
        table_name: item.tableName,
        operation: item.operation,
        record_id: item.recordId || null,
        payload: auditPayload,
        sync_status: 'synced',
        offline_id: item.offlineId,
        synced_at: new Date().toISOString(),
      }]);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setQueue(prev => prev.map(q => 
        q.offlineId === item.offlineId 
          ? { 
              ...q, 
              status: q.retryCount >= MAX_RETRIES ? 'error' : 'pending',
              errorMessage,
              retryCount: q.retryCount + 1,
            }
          : q
      ));

      console.error(`Sync error for ${item.tableName}:`, error);
      return false;
    }
  }, [user]);

  // Sync all pending items
  const syncAll = useCallback(async () => {
    if (!isOnline || !isAuthenticated || syncInProgress.current) return;

    syncInProgress.current = true;
    setIsSyncing(true);

    const pendingItems = queue.filter(item => 
      item.status === 'pending' && item.retryCount < MAX_RETRIES
    );

    for (const item of pendingItems) {
      await syncItem(item);
      // Small delay between operations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setLastSyncTime(new Date());
    setIsSyncing(false);
    syncInProgress.current = false;
  }, [queue, isOnline, isAuthenticated, syncItem]);

  // Clear synced items from queue
  const clearSynced = useCallback(() => {
    setQueue(prev => prev.filter(item => item.status !== 'synced'));
  }, []);

  // Remove specific item from queue
  const removeFromQueue = useCallback((offlineId: string) => {
    setQueue(prev => prev.filter(item => item.offlineId !== offlineId));
  }, []);

  // Retry failed items
  const retryFailed = useCallback(() => {
    setQueue(prev => prev.map(item => 
      item.status === 'error' 
        ? { ...item, status: 'pending' as SyncStatus, retryCount: 0 }
        : item
    ));
    
    if (isOnline) {
      syncAll();
    }
  }, [isOnline, syncAll]);

  // Get counts
  const pendingCount = queue.filter(item => item.status === 'pending').length;
  const errorCount = queue.filter(item => item.status === 'error').length;
  const syncedCount = queue.filter(item => item.status === 'synced').length;

  return {
    // State
    queue,
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingCount,
    errorCount,
    syncedCount,
    
    // Actions
    addToQueue,
    syncAll,
    syncItem,
    clearSynced,
    removeFromQueue,
    retryFailed,
  };
}
