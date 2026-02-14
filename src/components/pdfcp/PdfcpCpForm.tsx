/**
 * Formulaire CP (Contrat-Programme) — Saisie/validation DPANEF/Central
 * 
 * - Permet de générer des lignes CP depuis les lignes Concerté
 * - Justification obligatoire si écart avec le Concerté
 * - Statut de chaque ligne: accepté / ajusté / reporté / rejeté
 */

import React, { useState } from 'react';
import { Plus, Save, X, Wand2, AlertTriangle, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDh } from '@/lib/formatters';
import { PROGRAM_COMPONENTS_REF, getDefaultUnit, getUnitLabel } from '@/data/programComponentsRef';
import {
  ETAT_COLORS,
  STATUT_LIGNE_CP_CONFIG,
  type PdfcpActionLine,
  type StatutLigneCp,
  needsJustification,
} from '@/data/pdfcp_entry_types';
import { usePdfcpActions, type AddActionParams } from '@/hooks/usePdfcpActions';
import { toast } from 'sonner';

interface PdfcpCpFormProps {
  pdfcpId: string;
  communeName?: string;
  yearStart: number;
  yearEnd: number;
  readOnly?: boolean;
  /** Après ajout d'une ligne, appelé avec l'id créé pour proposer la carto. */
  onActionAdded?: (createdActionId: string) => void;
}

const PdfcpCpForm: React.FC<PdfcpCpFormProps> = ({
  pdfcpId,
  communeName = '',
  yearStart,
  yearEnd,
  readOnly = false,
  onActionAdded,
}) => {
  const { concerteLines, cpLines, addAction, deleteAction, isAdding } = usePdfcpActions(pdfcpId, { onActionAdded });
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [sourcePlanId, setSourcePlanId] = useState('');
  const [physique, setPhysique] = useState(0);
  const [financier, setFinancier] = useState(0);
  const [statutLigne, setStatutLigne] = useState<StatutLigneCp>('accepte');
  const [justification, setJustification] = useState('');

  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);
  const totalBudget = cpLines.reduce((s, l) => s + l.financier, 0);

  const resetForm = () => {
    setShowForm(false);
    setSourcePlanId('');
    setPhysique(0);
    setFinancier(0);
    setStatutLigne('accepte');
    setJustification('');
  };

  // Generate CP from Concerté
  const handleGenerateFromConcerte = () => {
    let added = 0;
    concerteLines.forEach(cl => {
      // Check if CP line already exists for same action+year
      const exists = cpLines.some(cp =>
        cp.action_key === cl.action_key &&
        cp.year === cl.year &&
        cp.perimetre_id === cl.perimetre_id
      );
      if (!exists) {
        addAction({
          pdfcp_id: pdfcpId,
          commune_id: cl.commune_id,
          perimetre_id: cl.perimetre_id,
          site_id: cl.site_id,
          action_key: cl.action_key,
          action_label: cl.action_label,
          year: cl.year,
          etat: 'CP',
          unite: cl.unite,
          physique: cl.physique,
          financier: cl.financier,
          source_plan_line_id: cl.id,
        });
        added++;
      }
    });
    if (added === 0) {
      toast.info('Toutes les lignes CP ont déjà été générées');
    }
  };

  const handleSelectSource = (planLineId: string) => {
    setSourcePlanId(planLineId);
    const source = concerteLines.find(c => c.id === planLineId);
    if (source) {
      setPhysique(source.physique);
      setFinancier(source.financier);
    }
  };

  const handleSubmit = () => {
    const source = concerteLines.find(c => c.id === sourcePlanId);

    // Check justification requirement
    if (source) {
      const hasEcart = physique !== source.physique || financier !== source.financier;
      if (hasEcart && !justification.trim()) {
        toast.error('Justification obligatoire quand le CP diffère du Concerté');
        return;
      }
    }

    const params: AddActionParams = {
      pdfcp_id: pdfcpId,
      commune_id: source?.commune_id,
      perimetre_id: source?.perimetre_id,
      site_id: source?.site_id,
      action_key: source?.action_key || PROGRAM_COMPONENTS_REF[0]?.id || '',
      action_label: source?.action_label,
      year: source?.year || yearStart,
      etat: 'CP',
      unite: source?.unite || 'ha',
      physique,
      financier,
      source_plan_line_id: sourcePlanId || undefined,
      justification_ecart: justification || undefined,
    };
    addAction(params);
    resetForm();
  };

  // Find source Concerté line for a CP line
  const getSourceConcerte = (cpLine: PdfcpActionLine): PdfcpActionLine | undefined => {
    if (cpLine.source_plan_line_id) {
      return concerteLines.find(c => c.id === cpLine.source_plan_line_id);
    }
    return concerteLines.find(c =>
      c.action_key === cpLine.action_key &&
      c.year === cpLine.year &&
      c.perimetre_id === cpLine.perimetre_id
    );
  };

  return (
    <div className="space-y-4">
      {readOnly && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2 border border-border/50">
          La saisie du CP est réservée au DPANEF. Vous consultez les données en lecture seule.
        </p>
      )}
      <Card className="border-border/50 shadow-soft border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-amber-600" />
              Contrat-Programme (CP)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={ETAT_COLORS.CP}>
                {cpLines.length} ligne(s) • {formatDh(totalBudget)}
              </Badge>
              {!readOnly && (
                <>
                  {concerteLines.length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleGenerateFromConcerte} className="gap-1">
                      <Wand2 className="h-3 w-3" />
                      Générer depuis Concerté
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1">
                    <Plus className="h-3 w-3" />
                    Ajouter
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Formulaire de saisie CP */}
          {showForm && (
            <div className="border-2 border-amber-200 rounded-xl p-5 bg-amber-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Nouvelle ligne CP</h4>
                <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-4 w-4" /></Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Ligne Concerté source *</Label>
                  <Select value={sourcePlanId || '_none'} onValueChange={v => v !== '_none' && handleSelectSource(v)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none">Saisie libre</SelectItem>
                      {concerteLines.map(cl => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {cl.year} — {cl.action_label || cl.action_key} — {cl.physique} {cl.unite} — {formatDh(cl.financier)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantité CP</Label>
                    <Input type="number" value={physique || ''} onChange={e => setPhysique(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Budget CP (DH)</Label>
                    <Input type="number" value={financier || ''} onChange={e => setFinancier(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                {/* Warning if écart */}
                {sourcePlanId && (() => {
                  const source = concerteLines.find(c => c.id === sourcePlanId);
                  if (!source) return null;
                  const hasEcart = physique !== source.physique || financier !== source.financier;
                  if (!hasEcart) return null;
                  return (
                    <div className="space-y-2">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <div className="font-medium text-orange-800">Écart détecté avec le Concerté</div>
                          <div className="text-orange-600 mt-1">
                            Concerté: {source.physique} {source.unite} / {formatDh(source.financier)}
                            <br />CP: {physique} {source.unite} / {formatDh(financier)}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-orange-800">Justification de l'écart *</Label>
                        <Textarea
                          value={justification}
                          onChange={e => setJustification(e.target.value)}
                          placeholder="Motif de l'ajustement..."
                          rows={2}
                          className="border-orange-200"
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={resetForm}>Annuler</Button>
                  <Button size="sm" onClick={handleSubmit} disabled={isAdding} className="gap-1 bg-amber-600 hover:bg-amber-700">
                    <Save className="h-3 w-3" /> Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table CP */}
          {cpLines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune ligne CP saisie</p>
              <p className="text-xs mt-1">
                {concerteLines.length > 0
                  ? 'Cliquez "Générer depuis Concerté" pour pré-remplir.'
                  : 'Les lignes Concerté doivent être saisies d\'abord.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Année</TableHead>
                    <TableHead>Composante</TableHead>
                    <TableHead>Qty CP</TableHead>
                    <TableHead>Budget CP</TableHead>
                    <TableHead>Δ Concerté</TableHead>
                    <TableHead>Justification</TableHead>
                    {!readOnly && <TableHead className="w-16"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cpLines.map(line => {
                    const source = getSourceConcerte(line);
                    const hasEcart = source && (line.physique !== source.physique || line.financier !== source.financier);
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">{line.year}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{line.action_label || line.action_key}</Badge>
                        </TableCell>
                        <TableCell>{line.physique.toLocaleString()} {line.unite}</TableCell>
                        <TableCell className="font-medium">{formatDh(line.financier)}</TableCell>
                        <TableCell>
                          {hasEcart ? (
                            <span className="text-orange-600 text-xs font-medium">
                              Δ {(line.financier - source!.financier > 0 ? '+' : '')}{formatDh(line.financier - source!.financier)}
                            </span>
                          ) : source ? (
                            <span className="text-green-600 text-xs">Conforme ✓</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {line.justification_ecart || '-'}
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAction(line.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfcpCpForm;
