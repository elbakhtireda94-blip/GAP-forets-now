import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMySQLBackend, mysqlApi, getMySQLApiUrl, getToken, setToken } from '@/integrations/mysql-api/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PdfcpValidationStatus } from '@/data/pdfcpValidationWorkflow';

// Types
export interface PdfcpProgram {
  id: string;
  code: string;
  title: string;
  description?: string;
  start_year: number;
  end_year: number;
  dranef_id: string;
  dpanef_id: string;
  commune_id?: string;
  total_budget_dh: number;
  validation_status: PdfcpValidationStatus;
  locked: boolean;
  status: 'draft' | 'submitted' | 'validated' | 'archived';
  created_at: string;
  created_by?: string;
  updated_at: string;
  // Annulation fields
  annulation_motif?: string;
  annulation_par?: string;
  annulation_date?: string;
  // Unlock fields
  unlock_motif?: string;
  unlock_by?: string;
  unlock_at?: string;
}

export interface PdfcpAction {
  id: string;
  pdfcp_id: string;
  commune_id?: string;
  perimetre_id?: string;
  site_id?: string;
  action_key: string;
  action_label?: string;
  year: number;
  etat: 'PREVU' | 'CP' | 'EXECUTE';
  unite: string;
  physique: number;
  financier: number;
  geometry_type?: 'Point' | 'LineString' | 'Polygon';
  coordinates?: unknown;
  status: 'draft' | 'submitted' | 'validated' | 'archived';
  created_at: string;
}

export interface PdfcpAttachment {
  id: string;
  pdfcp_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_bytes?: number;
  description?: string;
  category: 'carte' | 'pv' | 'decision' | 'photo' | 'general';
  uploaded_by?: string;
  created_at: string;
}

export interface PdfcpValidationHistory {
  id: string;
  pdfcp_id: string;
  action: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  performed_by?: string;
  performed_by_name?: string;
  performed_by_role?: string;
  created_at: string;
}

// Hook principal
export function usePdfcpSupabase(pdfcpId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isMySQL = useMySQLBackend();

  // Fetch single PDFCP - FORCE MySQL API (Supabase bypassed)
  const programQuery = useQuery({
    queryKey: ['pdfcp-program', pdfcpId],
    queryFn: async () => {
      if (!pdfcpId) return null;
      const apiUrl = `${getMySQLApiUrl()}/api/pdfcp/programs/${pdfcpId}`;
      console.log('[PDFCP GET]', apiUrl);
      
      const { data, error } = await mysqlApi.getPdfcpProgram(pdfcpId);
      if (error) {
        console.error('[PDFCP GET] Error:', error);
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error('Serveur indisponible. Vérifiez que le backend MySQL est démarré.');
        }
        throw new Error(error.message);
      }
      return (data as PdfcpProgram) || null;
    },
    enabled: !!pdfcpId,
  });

  // Fetch all PDFCPs (for list/dashboard) - FORCE MySQL API (Supabase bypassed)
  const programsQuery = useQuery({
    queryKey: ['pdfcp-programs'],
    queryFn: async () => {
      const apiUrl = `${getMySQLApiUrl()}/api/pdfcp/programs`;
      console.log('[PDFCP GET All]', apiUrl);
      
      const { data, error } = await mysqlApi.getPdfcpPrograms();
      if (error) {
        console.error('[PDFCP GET All] Error:', error);
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error('Serveur indisponible. Vérifiez que le backend MySQL est démarré.');
        }
        throw new Error(error.message);
      }
      return (Array.isArray(data) ? data : []) as PdfcpProgram[];
    },
  });

  // Fetch actions for a PDFCP - FORCE MySQL API (Supabase bypassed)
  const actionsQuery = useQuery({
    queryKey: ['pdfcp-actions', pdfcpId],
    queryFn: async () => {
      if (!pdfcpId) return [];
      const apiUrl = `${getMySQLApiUrl()}/api/pdfcp/programs/${pdfcpId}/actions`;
      console.log('[PDFCP GET Actions]', apiUrl);
      
      const { data, error } = await mysqlApi.getPdfcpActions(pdfcpId);
      if (error) {
        console.error('[PDFCP GET Actions] Error:', error);
        throw new Error(error.message);
      }
      return (Array.isArray(data) ? data : []) as PdfcpAction[];
    },
    enabled: !!pdfcpId,
  });

  // Fetch attachments - FORCE MySQL API (Supabase bypassed)
  const attachmentsQuery = useQuery({
    queryKey: ['pdfcp-attachments', pdfcpId],
    queryFn: async () => {
      if (!pdfcpId) return [];
      const apiUrl = `${getMySQLApiUrl()}/api/pdfcp/programs/${pdfcpId}/attachments`;
      console.log('[PDFCP GET Attachments]', apiUrl);
      
      const { data, error } = await mysqlApi.getPdfcpAttachments(pdfcpId);
      if (error) {
        console.error('[PDFCP GET Attachments] Error:', error);
        throw new Error(error.message);
      }
      return (Array.isArray(data) ? data : []) as PdfcpAttachment[];
    },
    enabled: !!pdfcpId,
  });

  // Fetch validation history - FORCE MySQL API (Supabase bypassed)
  const historyQuery = useQuery({
    queryKey: ['pdfcp-history', pdfcpId],
    queryFn: async () => {
      if (!pdfcpId) return [];
      const apiUrl = `${getMySQLApiUrl()}/api/pdfcp/programs/${pdfcpId}/history`;
      console.log('[PDFCP GET History]', apiUrl);
      
      const { data, error } = await mysqlApi.getPdfcpHistory(pdfcpId);
      if (error) {
        console.error('[PDFCP GET History] Error:', error);
        throw new Error(error.message);
      }
      return (Array.isArray(data) ? data : []) as PdfcpValidationHistory[];
    },
    enabled: !!pdfcpId,
  });

  // Mutation: Update validation status
  const updateValidationMutation = useMutation({
    mutationFn: async ({ 
      newStatus, 
      note 
    }: { 
      newStatus: string; 
      note?: string;
    }) => {
      if (!pdfcpId || !user) throw new Error('Missing pdfcp or user');

      const currentProgram = programQuery.data;
      const fromStatus = currentProgram?.validation_status;

      // Only lock when status is VERROUILLE
      const shouldLock = newStatus === 'VERROUILLE';

      if (isMySQL) {
        const { data: updateData, error: updateError } = await mysqlApi.patchPdfcpProgram(pdfcpId, {
          validation_status: newStatus,
          locked: shouldLock,
        });
        if (updateError) throw new Error(updateError.message);
        if (!updateData) throw new Error('Mise à jour refusée par les règles de sécurité.');

        // Add history entry
        const { error: historyError } = await mysqlApi.postPdfcpHistory(pdfcpId, {
          action: `status_change_${newStatus.toLowerCase()}`,
          from_status: fromStatus,
          to_status: newStatus,
          note,
          performed_by_name: user.name,
          performed_by_role: user.role_label,
        });
        if (historyError) throw new Error(historyError.message);
        return;
      }

      const { data: updateData, error: updateError } = await supabase
        .from('pdfcp_programs')
        .update({ 
          validation_status: newStatus,
          locked: shouldLock,
          updated_by: user.auth_user_id,
        })
        .eq('id', pdfcpId)
        .select();

      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Mise à jour refusée par les règles de sécurité.');
      }

      // Add history entry
      const { error: historyError } = await supabase
        .from('pdfcp_validation_history')
        .insert({
          pdfcp_id: pdfcpId,
          action: `status_change_${newStatus.toLowerCase()}`,
          from_status: fromStatus,
          to_status: newStatus,
          note,
          performed_by: user.auth_user_id,
          performed_by_name: user.name,
          performed_by_role: user.role_label,
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-program', pdfcpId] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-history', pdfcpId] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-programs'] });
      toast.success('Statut de validation mis à jour');
    },
    onError: (err) => {
      toast.error('Erreur lors de la mise à jour: ' + (err as Error).message);
    },
  });

  // Mutation: Unlock (ADMIN only, VERROUILLE → VALIDE_CENTRAL)
  const unlockMutation = useMutation({
    mutationFn: async ({ motif }: { motif: string }) => {
      if (!pdfcpId || !user) throw new Error('Missing pdfcp or user');

      if (isMySQL) {
        const { data: updateData, error: updateError } = await mysqlApi.patchPdfcpProgram(pdfcpId, {
          validation_status: 'VALIDE_CENTRAL',
          locked: false,
          unlock_motif: motif,
        });
        if (updateError) throw new Error(updateError.message);
        if (!updateData) throw new Error('Déverrouillage refusé par les règles de sécurité.');

        // Record in history
        const { error: historyError } = await mysqlApi.postPdfcpHistory(pdfcpId, {
          action: 'unlocked',
          from_status: 'VERROUILLE',
          to_status: 'VALIDE_CENTRAL',
          note: `Déverrouillage: ${motif}`,
          performed_by_name: user.name,
          performed_by_role: user.role_label,
        });
        if (historyError) console.error('Error recording unlock history:', historyError);
        return;
      }

      const { data: updateData, error: updateError } = await supabase
        .from('pdfcp_programs')
        .update({
          validation_status: 'VALIDE_CENTRAL',
          locked: false,
          unlock_motif: motif,
          // unlock_by and unlock_at are set by trigger
          updated_by: user.auth_user_id,
        } as any)
        .eq('id', pdfcpId)
        .select();

      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Déverrouillage refusé par les règles de sécurité.');
      }

      // Record in history
      const { error: historyError } = await supabase
        .from('pdfcp_validation_history')
        .insert({
          pdfcp_id: pdfcpId,
          action: 'unlocked',
          from_status: 'VERROUILLE',
          to_status: 'VALIDE_CENTRAL',
          note: `Déverrouillage: ${motif}`,
          performed_by: user.auth_user_id,
          performed_by_name: user.name,
          performed_by_role: user.role_label,
        });

      if (historyError) console.error('Error recording unlock history:', historyError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-program', pdfcpId] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-history', pdfcpId] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-programs'] });
      toast.success('PDFCP déverrouillé avec succès');
    },
    onError: (err) => {
      toast.error('Erreur: ' + (err as Error).message);
    },
  });

  // Mutation: Upload attachment
  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ 
      file, 
      category, 
      description 
    }: { 
      file: File; 
      category: string; 
      description?: string;
    }) => {
      if (!pdfcpId || !user) throw new Error('Missing pdfcp or user');

      if (isMySQL) {
        // For MySQL, we need to handle file upload differently
        // For now, create a base64 data URL or use a file upload endpoint
        // This is a simplified version - you may want to add a file upload endpoint
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const { error: insertError } = await mysqlApi.postPdfcpAttachment(pdfcpId, {
          file_name: file.name,
          file_url: fileData, // Store as data URL for MySQL (or use a file server)
          file_type: file.type.split('/')[1] || 'other',
          file_size_bytes: file.size,
          description,
          category,
        });
        if (insertError) throw new Error(insertError.message);
        return;
      }

      const fileName = `${pdfcpId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('pdfcp-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('pdfcp-attachments')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('pdfcp_attachments')
        .insert({
          pdfcp_id: pdfcpId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type.split('/')[1] || 'other',
          file_size_bytes: file.size,
          description,
          category,
          uploaded_by: user.auth_user_id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-attachments', pdfcpId] });
      toast.success('Pièce jointe ajoutée');
    },
    onError: (err) => {
      toast.error('Erreur lors de l\'upload: ' + (err as Error).message);
    },
  });

  // Mutation: Delete attachment
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!pdfcpId) throw new Error('Missing pdfcp');
      if (isMySQL) {
        const { error } = await mysqlApi.deletePdfcpAttachment(pdfcpId, attachmentId);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase
        .from('pdfcp_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-attachments', pdfcpId] });
      toast.success('Pièce jointe supprimée');
    },
  });

  // Mutation: Create program (used from list page)
  // FORCE MySQL API - Supabase bypassed for PDFCP
  const createProgramMutation = useMutation({
    mutationFn: async (params: {
      title: string;
      code?: string;
      start_year: number;
      end_year: number;
      dranef_id: string;
      dpanef_id: string;
      commune_id?: string;
      description?: string;
      total_budget_dh?: number;
    }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      
      const code = params.code?.trim() || `PDFCP-${params.start_year}-${Date.now().toString(36).slice(-6)}`;
      const payload = {
        code,
        title: params.title.trim(),
        description: params.description?.trim() || null,
        start_year: params.start_year,
        end_year: params.end_year,
        dranef_id: params.dranef_id,
        dpanef_id: params.dpanef_id,
        commune_id: params.commune_id || null,
        total_budget_dh: params.total_budget_dh ?? 0,
        validation_status: 'BROUILLON',
        locked: false,
      };
      
      // Vérifier le token avant l'appel
      const token = getToken();
      const isMySQLBackend = useMySQLBackend();
      const allTokenKeys = Object.keys(localStorage).filter(k => k.includes('token') || k.includes('auth'));
      const supabaseSession = localStorage.getItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token');
      
      console.log('[PDFCP Create] Token check:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        localStorageKey: 'anef_mysql_token',
        isMySQLBackend,
        allTokenKeys,
        hasSupabaseSession: !!supabaseSession,
        user: user ? { id: user.id, email: user.email } : null,
      });
      
      if (!token) {
        console.error('[PDFCP Create] ❌ No MySQL token found in localStorage');
        console.error('[PDFCP Create] Debug info:', {
          isMySQLBackend,
          allLocalStorageKeys: Object.keys(localStorage),
          envVITE_USE_MYSQL_BACKEND: import.meta.env.VITE_USE_MYSQL_BACKEND,
        });
        
        // Si MySQL backend est activé mais pas de token, c'est un problème de connexion
        if (isMySQLBackend) {
          toast.error('Session MySQL expirée. Veuillez vous reconnecter pour obtenir un nouveau token MySQL.', {
            duration: 5000,
          });
        } else {
          toast.error('Le backend MySQL n\'est pas activé. Veuillez définir VITE_USE_MYSQL_BACKEND=true dans votre .env et redémarrer le serveur.', {
            duration: 8000,
          });
        }
        
        // Rediriger vers login après un court délai
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        throw new Error('Token manquant. Veuillez vous reconnecter.');
      }
      
      const API_BASE_URL = getMySQLApiUrl();
      const apiUrl = `${API_BASE_URL}/api/pdfcp/programs`;
      console.log('[PDFCP Create] URL=', apiUrl, 'status/response will follow in [PDFCP] logs');

      const { data, error } = await mysqlApi.postPdfcpProgram(payload);

      if (error) {
        console.error('[PDFCP Create] Error:', error.message);
        if (error.message.includes('renvoyé du HTML') || error.message.includes('mauvais endpoint')) {
          toast.error('Backend injoignable ou mauvais proxy. Vérifiez VITE_MYSQL_API_URL et que le serveur tourne sur le bon port.');
          throw new Error(error.message);
        }
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          throw new Error('Serveur indisponible. Vérifiez que le backend MySQL est démarré.');
        }
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          console.error('[PDFCP Create] 401 Unauthorized - clearing token and redirecting');
          setToken(null);
          toast.error('Session expirée. Veuillez vous reconnecter.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          throw new Error('Non autorisé. Veuillez vous reconnecter.');
        }
        throw new Error(error.message);
      }
      
      if (!data || !(data as any).id) {
        console.error('[PDFCP Create] No ID returned from API');
        throw new Error('Création échouée: aucune ID retournée');
      }
      
      console.log('[PDFCP Create] Success: Created PDFCP', (data as any).id);
      return (data as any).id as string;
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-programs'] });
      toast.success('PDFCP créé en base centrale');
    },
    onError: (err) => {
      toast.error('Erreur: ' + (err as Error).message);
    },
  });

  // Computed: Actions by state
  const actionsByEtat = {
    prevu: actionsQuery.data?.filter(a => a.etat === 'PREVU') || [],
    cp: actionsQuery.data?.filter(a => a.etat === 'CP') || [],
    execute: actionsQuery.data?.filter(a => a.etat === 'EXECUTE') || [],
  };

  // Computed: Totals
  const totals = {
    budgetPrevu: actionsByEtat.prevu.reduce((sum, a) => sum + (a.financier || 0), 0),
    budgetCp: actionsByEtat.cp.reduce((sum, a) => sum + (a.financier || 0), 0),
    budgetExecute: actionsByEtat.execute.reduce((sum, a) => sum + (a.financier || 0), 0),
    physiquePrevu: actionsByEtat.prevu.reduce((sum, a) => sum + (a.physique || 0), 0),
    physiqueCp: actionsByEtat.cp.reduce((sum, a) => sum + (a.physique || 0), 0),
    physiqueExecute: actionsByEtat.execute.reduce((sum, a) => sum + (a.physique || 0), 0),
  };

  const tauxExecution = totals.budgetPrevu > 0 
    ? Math.round((totals.budgetExecute / totals.budgetPrevu) * 100) 
    : 0;

  return {
    // Queries
    program: programQuery.data,
    programs: programsQuery.data || [],
    actions: actionsQuery.data || [],
    attachments: attachmentsQuery.data || [],
    history: historyQuery.data || [],
    
    // Loading states
    isLoading: programQuery.isLoading || actionsQuery.isLoading,
    isProgramsLoading: programsQuery.isLoading,
    
    // Computed
    actionsByEtat,
    totals,
    tauxExecution,
    
    // Mutations
    updateValidation: updateValidationMutation.mutate,
    unlockProgram: unlockMutation.mutate,
    uploadAttachment: uploadAttachmentMutation.mutate,
    deleteAttachment: deleteAttachmentMutation.mutate,
    createProgram: createProgramMutation.mutateAsync,
    
    // Mutation states
    isUpdating: updateValidationMutation.isPending,
    isUnlocking: unlockMutation.isPending,
    isUploading: uploadAttachmentMutation.isPending,
    isCreatingProgram: createProgramMutation.isPending,
  };
}
