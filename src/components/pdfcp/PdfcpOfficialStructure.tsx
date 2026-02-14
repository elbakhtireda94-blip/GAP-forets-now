import React, { useState } from 'react';
import { 
  FileText, Users, TrendingUp, Shield, CheckCircle, 
  Clock, AlertTriangle, Lock, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDh } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import AuditPanel from '@/components/AuditPanel';
import PdfcpValidationTimeline from './PdfcpValidationTimeline';
import PdfcpAttachmentsPanel from './PdfcpAttachmentsPanel';
import CancellationModal from './CancellationModal';
import UnlockModal from './UnlockModal';
import { PdfcpProgram, PdfcpAction, PdfcpAttachment, PdfcpValidationHistory } from '@/hooks/usePdfcpSupabase';
import { usePdfcpValidation } from '@/hooks/usePdfcpValidation';
import {
  VALIDATION_STATUS_CONFIG,
  getAvailableActions,
  canCancelValidation,
  canUnlock,
  isPdfcpLocked,
  type PdfcpValidationStatus,
} from '@/data/pdfcpValidationWorkflow';

interface PdfcpOfficialStructureProps {
  program: PdfcpProgram;
  actions: PdfcpAction[];
  attachments: PdfcpAttachment[];
  history: PdfcpValidationHistory[];
  totals: {
    budgetPrevu: number;
    budgetCp: number;
    budgetExecute: number;
    physiquePrevu: number;
    physiqueCp: number;
    physiqueExecute: number;
  };
  tauxExecution: number;
  onValidate?: (status: string, note?: string) => void;
  onUploadAttachment: (file: File, category: string, description?: string) => void;
  onDeleteAttachment: (id: string) => void;
  isUploading?: boolean;
  communeName?: string;
  dranefName?: string;
  dpanefName?: string;
}

const PdfcpOfficialStructure: React.FC<PdfcpOfficialStructureProps> = ({
  program,
  actions,
  attachments,
  history,
  totals,
  tauxExecution,
  onValidate,
  onUploadAttachment,
  onDeleteAttachment,
  isUploading,
  communeName,
  dranefName,
  dpanefName,
}) => {
  const { user, hasScope } = useAuth();
  const scopeLevel = user?.scope_level || 'LOCAL';
  const { cancelValidation, isCancelling } = usePdfcpValidation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  
  const currentStatus = (program.validation_status || 'BROUILLON') as PdfcpValidationStatus;
  const statusConfig = VALIDATION_STATUS_CONFIG[currentStatus] || VALIDATION_STATUS_CONFIG.BROUILLON;
  const StatusIcon = statusConfig.icon;

  // New workflow-based permissions
  const validationActions = getAvailableActions(currentStatus, scopeLevel);
  const showCancel = canCancelValidation(currentStatus, scopeLevel);
  const showUnlockBtn = canUnlock(currentStatus, scopeLevel);
  const isLocked = isPdfcpLocked(currentStatus);
  const canEdit = !isLocked && hasScope(['LOCAL', 'ADMIN']);

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
    if (onValidate) {
      // Use the parent's validation handler for unlock
      onValidate('VALIDE_CENTRAL', `Déverrouillage: ${motif}`);
    }
    setShowUnlockModal(false);
  };

  // Actions by year
  const actionsByYear = actions.reduce((acc, action) => {
    if (!acc[action.year]) acc[action.year] = [];
    acc[action.year].push(action);
    return acc;
  }, {} as Record<number, PdfcpAction[]>);

  const years = Object.keys(actionsByYear).map(Number).sort();

  return (
    <div className="space-y-6">
      {/* Locked warning */}
      {isLocked && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-red-600 shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-red-800">PDFCP verrouillé</div>
            <div className="text-red-600">
              Ce PDFCP est verrouillé. Seul un administrateur peut le déverrouiller.
            </div>
          </div>
        </div>
      )}

      {/* ===== PARTIE I: IDENTIFICATION ===== */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Partie I – Identification du PDFCP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Code</p>
              <p className="font-medium">{program.code}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Titre</p>
              <p className="font-medium">{program.title}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Période</p>
              <p className="font-medium">{program.start_year} – {program.end_year}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget Total</p>
              <p className="font-medium text-primary">{formatDh(program.total_budget_dh)}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">DRANEF</p>
              <p className="font-medium">{dranefName || program.dranef_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DPANEF</p>
              <p className="font-medium">{dpanefName || program.dpanef_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commune</p>
              <p className="font-medium">{communeName || program.commune_id || '-'}</p>
            </div>
          </div>

          {program.description && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{program.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== PARTIE II: PROGRAMME QUINQUENNAL ===== */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Partie II – Programme Quinquennal d'Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Budget Prévu</div>
              <div className="font-semibold text-blue-600">{formatDh(totals.budgetPrevu)}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Budget CP</div>
              <div className="font-semibold text-amber-600">{formatDh(totals.budgetCp)}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Budget Exécuté</div>
              <div className="font-semibold text-green-600">{formatDh(totals.budgetExecute)}</div>
            </div>
            <div className={cn(
              'rounded-lg p-3 text-center',
              tauxExecution >= 75 ? 'bg-green-50 dark:bg-green-900/20' :
              tauxExecution >= 50 ? 'bg-amber-50 dark:bg-amber-900/20' :
              'bg-red-50 dark:bg-red-900/20'
            )}>
              <div className="text-xs text-muted-foreground mb-1">Taux Exécution</div>
              <div className={cn(
                'font-semibold',
                tauxExecution >= 75 ? 'text-green-600' :
                tauxExecution >= 50 ? 'text-amber-600' : 'text-red-600'
              )}>
                {tauxExecution}%
              </div>
            </div>
          </div>

          {/* Actions by year tabs */}
          {years.length > 0 ? (
            <Tabs defaultValue={String(years[0])} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {years.map(year => (
                  <TabsTrigger key={year} value={String(year)} className="flex-shrink-0">
                    {year}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {actionsByYear[year].length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              {years.map(year => (
                <TabsContent key={year} value={String(year)} className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Action</th>
                          <th className="text-center p-2 font-medium">État</th>
                          <th className="text-right p-2 font-medium">Physique</th>
                          <th className="text-left p-2 font-medium">Unité</th>
                          <th className="text-right p-2 font-medium">Financier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actionsByYear[year].map(action => (
                          <tr key={action.id} className="border-b last:border-0">
                            <td className="p-2">{action.action_label || action.action_key}</td>
                            <td className="p-2 text-center">
                              <Badge variant={
                                action.etat === 'EXECUTE' ? 'default' :
                                action.etat === 'CP' ? 'secondary' : 'outline'
                              } className="text-xs">
                                {action.etat}
                              </Badge>
                            </td>
                            <td className="p-2 text-right font-mono">{action.physique}</td>
                            <td className="p-2">{action.unite}</td>
                            <td className="p-2 text-right font-mono">{formatDh(action.financier)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune action programmée</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== PARTIE III: VALIDATION & SUIVI ===== */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Partie III – Validation & Suivi
            </CardTitle>
            <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Validation actions */}
          {onValidate && validationActions.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {validationActions.map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.variant}
                  onClick={() => onValidate(action.status)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Cancel & Unlock actions */}
          {(showCancel || showUnlockBtn) && (
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
              {showUnlockBtn && (
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attachments */}
            <div>
              <PdfcpAttachmentsPanel
                attachments={attachments}
                onUpload={onUploadAttachment}
                onDelete={onDeleteAttachment}
                isUploading={isUploading}
                canEdit={canEdit}
              />
            </div>

            {/* Validation timeline */}
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4" />
                Historique de validation
              </h4>
              <PdfcpValidationTimeline events={history} />
            </div>
          </div>

          {/* Audit panel */}
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
      />
    </div>
  );
};

export default PdfcpOfficialStructure;
