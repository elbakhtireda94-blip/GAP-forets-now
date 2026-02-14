import React, { useState } from 'react';
import { Unlock } from 'lucide-react';
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

interface UnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motif: string) => void;
  pdfcpTitle?: string;
  isLoading?: boolean;
}

const UnlockModal: React.FC<UnlockModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  pdfcpTitle,
  isLoading = false,
}) => {
  const [motif, setMotif] = useState('');

  const handleConfirm = () => {
    if (motif.trim().length < 10) return;
    onConfirm(motif.trim());
    setMotif('');
  };

  const handleClose = () => {
    setMotif('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Unlock className="h-5 w-5" />
            Déverrouillage PDFCP
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span>
              Vous allez déverrouiller ce PDFCP et le remettre au statut{' '}
              <strong>Validé Central</strong>.
            </span>
            {pdfcpTitle && (
              <span className="block text-xs text-muted-foreground">
                PDFCP : {pdfcpTitle}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
            <p className="font-medium mb-1">⚠️ Action administrateur uniquement</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Le statut repassera à <strong>Validé Central</strong></li>
              <li>Les données redeviendront modifiables</li>
              <li>L'historique de ce déverrouillage sera conservé</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unlock-motif" className="font-medium">
              Motif de déverrouillage <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="unlock-motif"
              placeholder="Expliquez le motif de ce déverrouillage (minimum 10 caractères)..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {motif.trim().length < 10
                  ? `Minimum 10 caractères (${motif.trim().length}/10)`
                  : '✓ Motif valide'}
              </span>
              <span>{motif.length}/500</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={handleConfirm}
            disabled={motif.trim().length < 10 || isLoading}
          >
            {isLoading ? 'En cours...' : 'Confirmer le déverrouillage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnlockModal;
