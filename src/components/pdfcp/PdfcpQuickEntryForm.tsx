/**
 * Mode "Saisie rapide" : choisir une action + périmètre/site une seule fois,
 * puis cocher plusieurs années pour créer des lignes en lot.
 */

import React, { useState } from 'react';
import { Zap, Save, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDatabase, PDFC } from '@/contexts/DatabaseContext';
import { useToast } from '@/hooks/use-toast';
import { actionTypeConfig, ActionType } from '@/data/comparatifTypes';
import {
  PROGRAM_COMPONENTS_REF,
  getDefaultUnit,
  getUnitLabel,
} from '@/data/programComponentsRef';

interface PdfcpQuickEntryFormProps {
  pdfcp: PDFC;
  onDone: () => void;
}

const actionTypes: ActionType[] = PROGRAM_COMPONENTS_REF.map(c => c.id as ActionType);

const PdfcpQuickEntryForm: React.FC<PdfcpQuickEntryFormProps> = ({ pdfcp, onDone }) => {
  const { addPdfcPrevu, getCommuneName } = useDatabase();
  const { toast } = useToast();

  const years = Array.from(
    { length: pdfcp.year_end - pdfcp.year_start + 1 },
    (_, i) => pdfcp.year_start + i
  );

  const communeName = getCommuneName(pdfcp.commune_id);

  const [actionType, setActionType] = useState<string>('Reboisement');
  const [perimetre, setPerimetre] = useState('');
  const [site, setSite] = useState('');
  const [quantite, setQuantite] = useState<number>(0);
  const [budget, setBudget] = useState<number>(0);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  const unite = getDefaultUnit(actionType);

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const selectAllYears = () => {
    setSelectedYears(prev => (prev.length === years.length ? [] : [...years]));
  };

  const handleSubmit = () => {
    if (selectedYears.length === 0) {
      toast({ title: 'Erreur', description: 'Sélectionnez au moins une année.', variant: 'destructive' });
      return;
    }
    if (quantite <= 0) {
      toast({ title: 'Erreur', description: 'La quantité doit être > 0.', variant: 'destructive' });
      return;
    }

    for (const year of selectedYears) {
      addPdfcPrevu({
        pdfc_id: pdfcp.id,
        commune_label: communeName,
        perimetre_label: perimetre,
        site_label: site,
        annee: year,
        action_type: actionType,
        unite,
        quantite_physique: quantite,
        budget_prevu_dh: budget,
      });
    }

    toast({
      title: `${selectedYears.length} ligne(s) créée(s)`,
      description: `${actionTypeConfig[actionType as ActionType]?.label || actionType} pour ${selectedYears.join(', ')}.`,
    });
    onDone();
  };

  return (
    <div className="border rounded-lg p-4 bg-accent/10 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Saisie rapide — plusieurs années
        </h4>
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 1: Action + Unit + Commune */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Action *</Label>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger className="bg-background h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {actionTypes.map(t => (
                <SelectItem key={t} value={t}>
                  {actionTypeConfig[t]?.label || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            Unité <Lock className="h-3 w-3 text-muted-foreground" />
          </Label>
          <Input
            className="h-9 bg-muted/50 cursor-not-allowed"
            value={`${unite} (${getUnitLabel(unite)})`}
            readOnly
            disabled
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            Commune <Lock className="h-3 w-3 text-muted-foreground" />
          </Label>
          <Input
            className="h-9 bg-muted/50 cursor-not-allowed"
            value={communeName}
            readOnly
            disabled
          />
        </div>
      </div>

      {/* Row 2: Quantité + Budget + Périmètre + Site */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Quantité par année *</Label>
          <Input
            type="number"
            className="h-9"
            value={quantite || ''}
            onChange={e => setQuantite(parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Budget par année (DH)</Label>
          <Input
            type="number"
            className="h-9"
            value={budget || ''}
            onChange={e => setBudget(parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Périmètre</Label>
          <Input
            className="h-9"
            value={perimetre}
            onChange={e => setPerimetre(e.target.value)}
            placeholder="Ex: Aït Mokhtar"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Site</Label>
          <Input
            className="h-9"
            value={site}
            onChange={e => setSite(e.target.value)}
            placeholder="Ex: Versant Nord"
          />
        </div>
      </div>

      {/* Row 3: Year checkboxes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Années à créer *</Label>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAllYears}>
            {selectedYears.length === years.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map(year => (
            <label
              key={year}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors text-sm ${
                selectedYears.includes(year)
                  ? 'bg-primary/10 border-primary text-primary font-medium'
                  : 'bg-background border-border hover:bg-muted/50'
              }`}
            >
              <Checkbox
                checked={selectedYears.includes(year)}
                onCheckedChange={() => toggleYear(year)}
                className="h-3.5 w-3.5"
              />
              {year}
            </label>
          ))}
        </div>
        {selectedYears.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            {selectedYears.length} année(s) → {selectedYears.length} ligne(s) seront créées
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onDone}>
          Annuler
        </Button>
        <Button size="sm" onClick={handleSubmit} className="gap-1" disabled={selectedYears.length === 0}>
          <Save className="h-3 w-3" />
          Créer {selectedYears.length} ligne(s)
        </Button>
      </div>
    </div>
  );
};

export default PdfcpQuickEntryForm;
