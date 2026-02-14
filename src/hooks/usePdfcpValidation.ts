/**
 * Hook for PDFCP validation workflow including cancellation with mandatory reason
 * Uses new workflow: BROUILLON → CONCERTE_ADP → VALIDE_DPANEF → VALIDE_CENTRAL → VERROUILLE
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMySQLBackend, mysqlApi } from '@/integrations/mysql-api/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { toast } from 'sonner';
import type { CreateNotificationParams } from './useNotifications';

export type ValidationStep = 'CONCERTE_ADP' | 'VALIDE_DPANEF' | 'VALIDE_CENTRAL';

const STEP_LABELS: Record<ValidationStep, string> = {
  CONCERTE_ADP: 'Concerté ADP',
  VALIDE_DPANEF: 'Validé DPANEF',
  VALIDE_CENTRAL: 'Validé Central',
};

interface CancelValidationParams {
  pdfcpId: string;
  pdfcpTitle: string;
  currentStatus: string;
  reason: string;
  year?: number;
  composante?: string;
  localisation?: string;
  adpUserId?: string;
  dpanefUserIds?: string[];
  dranefUserIds?: string[];
}

export function usePdfcpValidation() {
  const { user } = useAuth();
  const { isDemoReadonly } = useDemo();
  const queryClient = useQueryClient();
  const isMySQL = useMySQLBackend();

  const buildNotificationRecipients = (params: CancelValidationParams): CreateNotificationParams[] => {
    const notifications: CreateNotificationParams[] = [];
    const now = new Date().toISOString();
    const stepLabel = STEP_LABELS[params.currentStatus as ValidationStep] || params.currentStatus;

    const baseNotif = {
      title: `Annulation validation ${stepLabel}`,
      message: `La validation "${stepLabel}" du PDFCP "${params.pdfcpTitle}" a été annulée par ${user?.name || 'un utilisateur'} (${user?.role_label || ''}).`,
      notification_type: `cancellation_${params.currentStatus.toLowerCase()}`,
      severity: 'critical' as const,
      pdfcp_id: params.pdfcpId,
      year: params.year,
      composante: params.composante,
      localisation: params.localisation,
      cancellation_reason: params.reason,
      cancelled_by_name: user?.name || 'Inconnu',
      cancelled_by_role: user?.role_label || 'Inconnu',
      cancelled_at: now,
    };

    const recipientIds = new Set<string>();
    if (params.adpUserId) recipientIds.add(params.adpUserId);
    params.dpanefUserIds?.forEach((id) => recipientIds.add(id));
    params.dranefUserIds?.forEach((id) => recipientIds.add(id));

    if (user?.auth_user_id) recipientIds.delete(user.auth_user_id);

    recipientIds.forEach((recipientId) => {
      notifications.push({ ...baseNotif, recipient_user_id: recipientId });
    });

    return notifications;
  };

  const cancelValidation = useMutation({
    mutationFn: async (params: CancelValidationParams) => {
      if (isDemoReadonly) throw new Error('Mode démonstration — modification impossible');
      if (!user) throw new Error('Non authentifié');

      if (isMySQL) {
        // Update program: revert to BROUILLON with motif
        const { data: updateData, error: updateError } = await mysqlApi.patchPdfcpProgram(params.pdfcpId, {
          validation_status: 'BROUILLON',
          locked: false,
          annulation_motif: params.reason,
        });
        if (updateError) throw new Error(updateError.message);
        if (!updateData) {
          throw new Error('Annulation refusée par les règles de sécurité. Vérifiez vos permissions.');
        }

        // Record in validation history
        const { error: historyError } = await mysqlApi.postPdfcpHistory(params.pdfcpId, {
          action: `cancellation_${params.currentStatus.toLowerCase()}`,
          from_status: params.currentStatus,
          to_status: 'BROUILLON',
          note: `Annulation motivée: ${params.reason}`,
          performed_by_name: user.name,
          performed_by_role: user.role_label,
        });
        if (historyError) throw new Error(historyError.message);

        // Unlock action lines (get all actions and update each)
        const { data: actions, error: fetchError } = await mysqlApi.getPdfcpActions(params.pdfcpId);
        if (fetchError) console.error('Error fetching actions:', fetchError);
        else {
          const actionsList = Array.isArray(actions) ? actions : [];
          for (const action of actionsList) {
            const { error: unlockError } = await mysqlApi.patchPdfcpAction(params.pdfcpId, action.id, { locked: false });
            if (unlockError) console.error('Error unlocking line:', unlockError);
          }
        }

        // Create notifications (MySQL doesn't have notifications table yet, skip for now)
        const notifications = buildNotificationRecipients(params);
        // TODO: Add notifications endpoint to MySQL API if needed
        if (notifications.length > 0) {
          console.warn('Notifications not yet supported in MySQL backend');
        }

        return { notifications: 0 }; // Notifications not implemented in MySQL yet
      }

      // Supabase path
      const { data: updateData, error: updateError } = await supabase
        .from('pdfcp_programs')
        .update({
          validation_status: 'BROUILLON',
          locked: false,
          updated_by: user.auth_user_id,
          annulation_motif: params.reason,
        } as any)
        .eq('id', params.pdfcpId)
        .select();

      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Annulation refusée par les règles de sécurité. Vérifiez vos permissions.');
      }

      // Record in validation history
      const { error: historyError } = await supabase
        .from('pdfcp_validation_history')
        .insert({
          pdfcp_id: params.pdfcpId,
          action: `cancellation_${params.currentStatus.toLowerCase()}`,
          from_status: params.currentStatus,
          to_status: 'BROUILLON',
          note: `Annulation motivée: ${params.reason}`,
          performed_by: user.auth_user_id,
          performed_by_name: user.name,
          performed_by_role: user.role_label,
        });

      if (historyError) throw historyError;

      // Unlock action lines
      const { error: unlockError } = await supabase
        .from('pdfcp_actions')
        .update({ locked: false } as any)
        .eq('pdfcp_id', params.pdfcpId);

      if (unlockError) console.error('Error unlocking lines:', unlockError);

      // Create notifications
      const notifications = buildNotificationRecipients(params);
      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications as any);
        if (notifError) console.error('Error creating notifications:', notifError);
      }

      return { notifications: notifications.length };
    },
    onSuccess: (result, params) => {
      queryClient.invalidateQueries({ queryKey: ['pdfcp-program'] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-programs'] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-actions-3layer', params.pdfcpId] });
      queryClient.invalidateQueries({ queryKey: ['pdfcp-history', params.pdfcpId] });
      const stepLabel = STEP_LABELS[params.currentStatus as ValidationStep] || params.currentStatus;
      toast.success(
        `Validation "${stepLabel}" annulée. ${result.notifications} notification(s) envoyée(s).`
      );
    },
    onError: (err) => {
      toast.error('Erreur lors de l\'annulation: ' + (err as Error).message);
    },
  });

  return {
    cancelValidation: cancelValidation.mutate,
    cancelValidationAsync: cancelValidation.mutateAsync,
    isCancelling: cancelValidation.isPending,
    stepLabels: STEP_LABELS,
  };
}
