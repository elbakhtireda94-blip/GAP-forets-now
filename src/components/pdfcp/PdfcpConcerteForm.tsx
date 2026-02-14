/**
 * Formulaire simplifié de saisie ADP — Lignes Concerté (Population)
 * 
 * Wizard en 2 étapes :
 * 1. Choisir année + composante + localisation
 * 2. Saisir quantité + budget + notes
 * 
 * + Bouton "Ajouter une ligne" rapide
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Lock, ChevronRight, ChevronLeft, MapPin, Calendar, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
import { ETAT_COLORS, type PdfcpActionLine } from '@/data/pdfcp_entry_types';
import { usePdfcpActions, type AddActionParams } from '@/hooks/usePdfcpActions';

interface PdfcpConcerteFormProps {
  pdfcpId: string;
  communeId?: string;
  communeName?: string;
  yearStart: number;
  yearEnd: number;
  readOnly?: boolean;
  /** Après ajout d'une ligne, appelé avec l'id créé pour proposer la carto. */
  onActionAdded?: (createdActionId: string) => void;
}

type FormStep = 'idle' | 'step1' | 'step2';

const PdfcpConcerteForm: React.FC<PdfcpConcerteFormProps> = ({
  pdfcpId,
  communeId,
  communeName = '',
  yearStart,
  yearEnd,
  readOnly = false,
  onActionAdded,
}) => {
  const { concerteLines, addAction, updateAction, deleteAction, isAdding } = usePdfcpActions(pdfcpId, { onActionAdded });

  const [step, setStep] = useState<FormStep>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Step 1 data
  const [year, setYear] = useState(yearStart);
  const [actionKey, setActionKey] = useState(PROGRAM_COMPONENTS_REF[0]?.id || '');
  const [perimetreId, setPerimetreId] = useState('');
  const [siteId, setSiteId] = useState('');

  // Step 2 data
  const [physique, setPhysique] = useState(0);
  const [financier, setFinancier] = useState(0);
  const [notes, setNotes] = useState('');

  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);
  const unite = getDefaultUnit(actionKey);
  const componentLabel = PROGRAM_COMPONENTS_REF.find(c => c.id === actionKey)?.label || actionKey;

  const resetForm = () => {
    setStep('idle');
    setEditingId(null);
    setYear(yearStart);
    setActionKey(PROGRAM_COMPONENTS_REF[0]?.id || '');
    setPerimetreId('');
    setSiteId('');
    setPhysique(0);
    setFinancier(0);
    setNotes('');
  };

  const handleAdd = () => {
    setEditingId(null);
    setStep('step1');
  };

  const handleEdit = (line: PdfcpActionLine) => {
    setEditingId(line.id);
    setYear(line.year);
    setActionKey(line.action_key);
    setPerimetreId(line.perimetre_id || '');
    setSiteId(line.site_id || '');
    setPhysique(line.physique);
    setFinancier(line.financier);
    setNotes(line.notes || '');
    setStep('step2'); // Go directly to step 2 for editing
  };

  const handleStep1Next = () => {
    if (!year || !actionKey) return;
    setStep('step2');
  };

  const handleSubmit = () => {
    if (physique < 0 || financier < 0) return;

    if (editingId) {
      updateAction({
        id: editingId,
        year,
        action_key: actionKey,
        action_label: componentLabel,
        unite,
        physique,
        financier,
        perimetre_id: perimetreId || undefined,
        site_id: siteId || undefined,
        notes: notes || undefined,
      });
    } else {
      const params: AddActionParams = {
        pdfcp_id: pdfcpId,
        commune_id: communeId,
        action_key: actionKey,
        action_label: componentLabel,
        year,
        etat: 'CONCERTE',
        unite,
        physique,
        financier,
        perimetre_id: perimetreId || undefined,
        site_id: siteId || undefined,
        notes: notes || undefined,
      };
      addAction(params);
    }
    resetForm();
  };

  const totalBudget = concerteLines.reduce((s, l) => s + l.financier, 0);

  // Group by year
  const linesByYear = concerteLines.reduce((acc, l) => {
    if (!acc[l.year]) acc[l.year] = [];
    acc[l.year].push(l);
    return acc;
  }, {} as Record<number, PdfcpActionLine[]>);

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-soft border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Concerté (Population)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={ETAT_COLORS.CONCERTE}>
                {concerteLines.length} ligne(s) • {formatDh(totalBudget)}
              </Badge>
              {!readOnly && step === 'idle' && (
                <Button size="sm" onClick={handleAdd} variant="outline" className="gap-1">
                  <Plus className="h-3 w-3" />
                  Ajouter une ligne
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* === WIZARD STEP 1: Année + Composante + Localisation === */}
          {step === 'step1' && (
            <div className="border-2 border-emerald-200 rounded-xl p-5 bg-emerald-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                  Étape 1 — Choisir l'action
                </h4>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Année *
                  </Label>
                  <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" /> Composante *
                  </Label>
                  <Select value={actionKey} onValueChange={setActionKey}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {PROGRAM_COMPONENTS_REF.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} ({c.default_unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Commune
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input className="bg-muted/50 cursor-not-allowed" value={communeName} readOnly disabled />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Périmètre</Label>
                  <Input value={perimetreId} onChange={e => setPerimetreId(e.target.value)} placeholder="Ex: Aït Mokhtar" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Site</Label>
                  <Input value={siteId} onChange={e => setSiteId(e.target.value)} placeholder="Ex: Versant Nord" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    Unité <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input className="bg-muted/50 cursor-not-allowed" value={`${unite} (${getUnitLabel(unite)})`} readOnly disabled />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleStep1Next} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                  Suivant <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* === WIZARD STEP 2: Quantité + Budget + Notes === */}
          {step === 'step2' && (
            <div className="border-2 border-emerald-200 rounded-xl p-5 bg-emerald-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                  Étape 2 — Saisir les données
                </h4>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Résumé step 1 */}
              <div className="bg-background rounded-lg p-3 text-sm flex flex-wrap gap-3 items-center">
                <Badge variant="outline">{year}</Badge>
                <Badge variant="outline">{componentLabel}</Badge>
                <Badge variant="secondary">{unite}</Badge>
                {perimetreId && <span className="text-muted-foreground text-xs">📍 {perimetreId}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quantité physique ({unite}) *</Label>
                  <Input
                    type="number"
                    value={physique || ''}
                    onChange={e => setPhysique(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Budget prévu (DH) *</Label>
                  <Input
                    type="number"
                    value={financier || ''}
                    onChange={e => setFinancier(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min={0}
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> Notes (optionnel)
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Observations, contexte de la concertation..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                {!editingId && (
                  <Button variant="outline" size="sm" onClick={() => setStep('step1')} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Retour
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={resetForm}>Annuler</Button>
                  <Button size="sm" onClick={handleSubmit} disabled={isAdding} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-3 w-3" />
                    {editingId ? 'Mettre à jour' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* === TABLE DES LIGNES === */}
          {concerteLines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune ligne concertée saisie</p>
              <p className="text-xs mt-1">Cliquez sur "Ajouter une ligne" pour commencer la planification.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Année</TableHead>
                    <TableHead>Composante</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Localisation</TableHead>
                    {!readOnly && <TableHead className="w-20">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map(y => (
                    <React.Fragment key={y}>
                      {(linesByYear[y] || []).map(line => (
                        <TableRow key={line.id} className={line.locked ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{line.year}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {line.action_label || line.action_key}
                            </Badge>
                          </TableCell>
                          <TableCell>{line.physique.toLocaleString()} {line.unite}</TableCell>
                          <TableCell className="font-medium">{formatDh(line.financier)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {communeName} / {line.perimetre_id || '-'} / {line.site_id || '-'}
                          </TableCell>
                          {!readOnly && (
                            <TableCell>
                              {line.locked ? (
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(line)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteAction(line.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Résumé par année */}
          {concerteLines.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {years.map(y => {
                const yLines = linesByYear[y] || [];
                const yBudget = yLines.reduce((s, l) => s + l.financier, 0);
                if (yBudget === 0) return null;
                return (
                  <Badge key={y} variant="secondary" className="text-xs">
                    {y}: {formatDh(yBudget)}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfcpConcerteForm;
