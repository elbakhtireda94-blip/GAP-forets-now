import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface CancellationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  stepLabel: string; // "Concerté" | "CP" | "Exécuté"
  pdfcpTitle?: string;
  isLoading?: boolean;
}

const CancellationModal: React.FC<CancellationModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  stepLabel,
  pdfcpTitle,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim().length < 10) return;
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Annulation de validation
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span>
              Vous allez annuler la validation de l'étape{' '}
              <Badge variant="outline" className="font-semibold">
                {stepLabel}
              </Badge>
            </span>
            {pdfcpTitle && (
              <span className="block text-xs text-muted-foreground">
                PDFCP : {pdfcpTitle}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            <p className="font-medium mb-1">⚠️ Conséquences de l'annulation :</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Le statut repassera à <strong>Brouillon</strong></li>
              <li>Les données redeviendront modifiables</li>
              <li>Tous les acteurs concernés seront notifiés</li>
              <li>L'historique de cette annulation sera conservé</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason" className="font-medium">
              Motif d'annulation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Expliquez le motif de cette annulation (minimum 10 caractères)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {reason.trim().length < 10
                  ? `Minimum 10 caractères (${reason.trim().length}/10)`
                  : '✓ Motif valide'}
              </span>
              <span>{reason.length}/500</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={reason.trim().length < 10 || isLoading}
          >
            {isLoading ? 'En cours...' : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancellationModal;
