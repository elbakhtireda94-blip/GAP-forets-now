import React, { useState } from 'react';
import { AlertTriangle, Send, X, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ValidationStatus, STATUS_LABELS } from '@/data/pdfcp_entry_types';
import { UnlockRequestsAPI } from '@/data/unlock_requests';
import { supabase } from '@/integrations/supabase/client';

// Email de l'Admin par défaut (à configurer selon l'environnement)
const ADMIN_EMAIL = 'admin@gap-forets.ma';

interface UnlockRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfcpId: string;
  pdfcpName: string;
  currentStatus: ValidationStatus;
  territoire: string;
}

const UnlockRequestModal: React.FC<UnlockRequestModalProps> = ({
  isOpen,
  onClose,
  pdfcpId,
  pdfcpName,
  currentStatus,
  territoire,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendEmailNotification = async (requestData: {
    pdfcp_id: string;
    pdfcp_name: string;
    requester_name: string;
    requester_email: string;
    requester_scope_level: string;
    territoire: string;
    current_validation_status: string;
    reason: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-unlock-request-email', {
        body: {
          ...requestData,
          admin_email: ADMIN_EMAIL,
        },
      });

      if (error) {
        console.error('Error sending email notification:', error);
        return { success: false, error };
      }

      // Success - no need to log response data in production
      return { success: true, data };
    } catch (error) {
      console.error('Error invoking edge function:', error);
      return { success: false, error };
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!reason.trim()) {
      toast({
        title: 'Motif obligatoire',
        description: 'Veuillez saisir le motif de votre demande de déverrouillage.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Vérifier si une demande est déjà en cours
      if (UnlockRequestsAPI.hasPendingRequest(pdfcpId)) {
        toast({
          title: 'Demande déjà existante',
          description: 'Une demande de déverrouillage est déjà en attente pour ce PDFCP.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const requestData = {
        pdfcp_id: pdfcpId,
        pdfcp_name: pdfcpName,
        requester_user_id: user.id,
        requester_name: user.name,
        requester_email: user.email,
        requester_scope_level: user.scope_level,
        territoire,
        current_validation_status: currentStatus,
        reason: reason.trim(),
      };

      // Créer la demande
      UnlockRequestsAPI.create(requestData);

      // Envoyer l'email de notification à l'Admin
      const emailResult = await sendEmailNotification(requestData);

      if (emailResult.success) {
        toast({
          title: 'Demande envoyée',
          description: (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-green-600" />
              <span>
                Votre demande a été enregistrée et un email de notification a été envoyé à l'Administrateur.
              </span>
            </div>
          ),
        });
      } else {
        toast({
          title: 'Demande enregistrée',
          description: 'Votre demande a été enregistrée et notifiée à l\'Admin dans l\'application. (Email non envoyé)',
          variant: 'default',
        });
      }

      setReason('');
      onClose();
    } catch (error) {
      console.error('Error submitting unlock request:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la demande. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Demande de déverrouillage (Admin)
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                L'annulation ou le déverrouillage ne peut être effectué que par l'Admin.
              </div>
              <p className="text-muted-foreground">
                Le PDFCP <strong>"{pdfcpName}"</strong> est actuellement verrouillé au statut{' '}
                <strong>{STATUS_LABELS[currentStatus]}</strong>.
              </p>
              <p className="text-muted-foreground">
                Toute annulation doit être validée par l'Administrateur national.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Motif de la demande <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Expliquez pourquoi vous demandez le déverrouillage de ce PDFCP..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ce motif sera transmis à l'Administrateur par email et dans l'application.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
            <Mail className="h-4 w-4 inline mr-2" />
            Un email de notification sera automatiquement envoyé à l'Administrateur.
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-1" />
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
            <Send className="h-4 w-4 mr-1" />
            {isSubmitting ? 'Envoi...' : 'Envoyer la demande à l\'Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnlockRequestModal;
