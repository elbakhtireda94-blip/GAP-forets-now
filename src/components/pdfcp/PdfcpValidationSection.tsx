/**
 * Self-contained validation & cancellation section for PDFCP detail page.
 * Uses new workflow: BROUILLON → CONCERTE_ADP → VALIDE_DPANEF → VALIDE_CENTRAL → VERROUILLE
 */
import React, { useState } from 'react';
import { 
  Shield, CheckCircle, Clock, Lock, XCircle, FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import AuditPanel from '@/components/AuditPanel';
import PdfcpValidationTimeline from './PdfcpValidationTimeline';
import CancellationModal from './CancellationModal';
import UnlockModal from './UnlockModal';
import { usePdfcpSupabase } from '@/hooks/usePdfcpSupabase';
import { usePdfcpValidation } from '@/hooks/usePdfcpValidation';
import {
  VALIDATION_STATUS_CONFIG,
  getAvailableActions,
  canCancelValidation,
  canUnlock,
  isPdfcpLocked,
  type PdfcpValidationStatus,
} from '@/data/pdfcpValidationWorkflow';

interface PdfcpValidationSectionProps {
  pdfcpId: string;
  communeName?: string;
}

const PdfcpValidationSection: React.FC<PdfcpValidationSectionProps> = ({
  pdfcpId,
  communeName,
}) => {
  const { user } = useAuth();
  const scopeLevel = user?.scope_level || 'LOCAL';
  const { program, history, isLoading, updateValidation, unlockProgram, isUpdating, isUnlocking } = usePdfcpSupabase(pdfcpId);
  const { cancelValidation, isCancelling } = usePdfcpValidation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 bg-muted/30">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!program) return null;

  const currentStatus = (program.validation_status || 'BROUILLON') as PdfcpValidationStatus;
  const statusConfig = VALIDATION_STATUS_CONFIG[currentStatus] || VALIDATION_STATUS_CONFIG.BROUILLON;
  const StatusIcon = statusConfig.icon;

  // Available forward validation actions
  const validationActions = getAvailableActions(currentStatus, scopeLevel);
  const showCancel = canCancelValidation(currentStatus, scopeLevel);
  const showUnlock = canUnlock(currentStatus, scopeLevel);
  const isLocked = isPdfcpLocked(currentStatus);

  const handleValidate = (status: string) => {
    updateValidation({ newStatus: status });
  };

  const handleCancelConfirm = (reason: string) => {
    cancelValidation({
      pdfcpId: program.id,
      pdfcpTitle: program.title,
      currentStatus,
      reason,
      localisation: communeName || program.commune_id || undefined,
      adpUserId: program.created_by || undefined,
    });
    setShowCancelModal(false);
  };

  const handleUnlockConfirm = (motif: string) => {
    unlockProgram({ motif });
    setShowUnlockModal(false);
  };

  return (
    <>
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Validation & Suivi
            </CardTitle>
            <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {/* Locked warning */}
          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
              <Lock className="h-5 w-5 text-red-600 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-red-800">PDFCP verrouillé</div>
                <div className="text-red-600 text-xs">
                  Ce PDFCP est verrouillé. Seul un administrateur peut le déverrouiller.
                </div>
              </div>
            </div>
          )}

          {/* Validation actions */}
          {validationActions.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {validationActions.map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.variant}
                  onClick={() => handleValidate(action.status)}
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Cancel & Unlock actions */}
          {(showCancel || showUnlock) && (
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {showCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowCancelModal(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Annuler la validation
                </Button>
              )}
              {showUnlock && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => setShowUnlockModal(true)}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Déverrouiller
                </Button>
              )}
            </div>
          )}

          {/* Validation timeline */}
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4" />
              Historique de validation
            </h4>
            <PdfcpValidationTimeline events={history} />
          </div>

          {/* Audit */}
          <Separator />
          <AuditPanel
            data={{
              created_at: program.created_at,
              created_by: program.created_by,
              updated_at: program.updated_at,
              status: program.status,
            }}
            showSync={false}
          />
        </CardContent>
      </Card>

      {/* Cancellation Modal */}
      <CancellationModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        onConfirm={handleCancelConfirm}
        stepLabel={VALIDATION_STATUS_CONFIG[currentStatus]?.label || currentStatus}
        pdfcpTitle={program.title}
        isLoading={isCancelling}
      />

      {/* Unlock Modal */}
      <UnlockModal
        open={showUnlockModal}
        onOpenChange={setShowUnlockModal}
        onConfirm={handleUnlockConfirm}
        pdfcpTitle={program.title}
        isLoading={isUnlocking}
      />
    </>
  );
};

export default PdfcpValidationSection;
