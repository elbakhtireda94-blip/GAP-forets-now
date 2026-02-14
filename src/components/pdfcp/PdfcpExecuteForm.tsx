/**
 * Formulaire Exécuté (Terrain) — Saisie ADP + preuves
 * 
 * - Sélection d'une ligne CP source pour pré-remplir
 * - Preuve obligatoire si budget > 0
 * - Date de réalisation + statut d'exécution
 */

import React, { useState } from 'react';
import { Plus, Save, X, Hammer, AlertTriangle, Camera, Trash2 } from 'lucide-react';
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
import { PROGRAM_COMPONENTS_REF } from '@/data/programComponentsRef';
import {
  ETAT_COLORS,
  STATUT_EXECUTION_CONFIG,
  type PdfcpActionLine,
  type StatutExecution,
  needsProof,
} from '@/data/pdfcp_entry_types';
import { usePdfcpActions, type AddActionParams } from '@/hooks/usePdfcpActions';
import { toast } from 'sonner';
import PdfcpComparatifExecution from './PdfcpComparatifExecution';

interface PdfcpExecuteFormProps {
  pdfcpId: string;
  communeName?: string;
  yearStart: number;
  yearEnd: number;
  readOnly?: boolean;
  /** Après ajout d'une ligne, appelé avec l'id créé pour proposer la carto. */
  onActionAdded?: (createdActionId: string) => void;
}

const statutOptions: StatutExecution[] = ['planifie', 'en_cours', 'termine', 'annule', 'bloque'];

const PdfcpExecuteForm: React.FC<PdfcpExecuteFormProps> = ({
  pdfcpId,
  communeName = '',
  yearStart,
  yearEnd,
  readOnly = false,
  onActionAdded,
}) => {
  const { cpLines, executeLines, addAction, deleteAction, isAdding } = usePdfcpActions(pdfcpId, { onActionAdded });
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [sourceCpId, setSourceCpId] = useState('');
  const [physique, setPhysique] = useState(0);
  const [financier, setFinancier] = useState(0);
  const [dateRealisation, setDateRealisation] = useState(new Date().toISOString().slice(0, 10));
  const [statut, setStatut] = useState<StatutExecution>('termine');
  const [notes, setNotes] = useState('');
  const [preuveUrl, setPreuveUrl] = useState('');

  const years = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);
  const totalBudget = executeLines.reduce((s, l) => s + l.financier, 0);

  const resetForm = () => {
    setShowForm(false);
    setSourceCpId('');
    setPhysique(0);
    setFinancier(0);
    setDateRealisation(new Date().toISOString().slice(0, 10));
    setStatut('termine');
    setNotes('');
    setPreuveUrl('');
  };

  const handleSelectSource = (cpLineId: string) => {
    setSourceCpId(cpLineId);
    const source = cpLines.find(c => c.id === cpLineId);
    if (source) {
      setPhysique(source.physique);
      setFinancier(source.financier);
    }
  };

  const handleSubmit = () => {
    // Check proof requirement
    if (financier > 0 && !preuveUrl.trim()) {
      toast.error('Preuve obligatoire pour les actions avec budget > 0');
      return;
    }

    const source = cpLines.find(c => c.id === sourceCpId);

    const params: AddActionParams = {
      pdfcp_id: pdfcpId,
      commune_id: source?.commune_id,
      perimetre_id: source?.perimetre_id,
      site_id: source?.site_id,
      action_key: source?.action_key || PROGRAM_COMPONENTS_REF[0]?.id || '',
      action_label: source?.action_label,
      year: source?.year || yearStart,
      etat: 'EXECUTE',
      unite: source?.unite || 'ha',
      physique,
      financier,
      source_cp_line_id: sourceCpId || undefined,
      date_realisation: dateRealisation,
      statut_execution: statut,
      preuves: preuveUrl ? [preuveUrl] : [],
      notes: notes || undefined,
    };
    addAction(params);
    resetForm();
  };

  // Find source CP for display
  const getSourceCp = (execLine: PdfcpActionLine): PdfcpActionLine | undefined => {
    if (execLine.source_cp_line_id) {
      return cpLines.find(c => c.id === execLine.source_cp_line_id);
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      {/* Comparatif dynamique Plan / CP / Exécuté */}
      <PdfcpComparatifExecution pdfcpId={pdfcpId} />

      <Card className="border-border/50 shadow-soft border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Hammer className="h-4 w-4 text-blue-600" />
              Exécuté (Terrain)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={ETAT_COLORS.EXECUTE}>
                {executeLines.length} action(s) • {formatDh(totalBudget)}
              </Badge>
              {!readOnly && (
                <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1">
                  <Plus className="h-3 w-3" />
                  Ajouter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Formulaire */}
          {showForm && (
            <div className="border-2 border-blue-200 rounded-xl p-5 bg-blue-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Nouvelle action exécutée</h4>
                <Button size="sm" variant="ghost" onClick={resetForm}><X className="h-4 w-4" /></Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Ligne CP source</Label>
                  <Select value={sourceCpId || '_none'} onValueChange={v => v !== '_none' ? handleSelectSource(v) : setSourceCpId('')}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="_none">Saisie libre</SelectItem>
                      {cpLines.map(cl => (
                        <SelectItem key={cl.id} value={cl.id}>
                          {cl.year} — {cl.action_label || cl.action_key} — {cl.physique} {cl.unite} — {formatDh(cl.financier)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantité réalisée</Label>
                    <Input type="number" value={physique || ''} onChange={e => setPhysique(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Coût réel (DH)</Label>
                    <Input type="number" value={financier || ''} onChange={e => setFinancier(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date réalisation *</Label>
                    <Input type="date" value={dateRealisation} onChange={e => setDateRealisation(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Statut *</Label>
                    <Select value={statut} onValueChange={v => setStatut(v as StatutExecution)}>
                      <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {statutOptions.map(s => (
                          <SelectItem key={s} value={s}>{STATUT_EXECUTION_CONFIG[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Preuve */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5" /> Preuve (URL photo/document)
                    {financier > 0 && <span className="text-red-600 text-xs ml-1">* obligatoire</span>}
                  </Label>
                  <Input
                    value={preuveUrl}
                    onChange={e => setPreuveUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  {financier > 0 && !preuveUrl && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      Preuve obligatoire pour les actions avec budget
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Observations</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes terrain..." rows={2} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={resetForm}>Annuler</Button>
                  <Button size="sm" onClick={handleSubmit} disabled={isAdding} className="gap-1 bg-blue-600 hover:bg-blue-700">
                    <Save className="h-3 w-3" /> Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table exécuté */}
          {executeLines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hammer className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune action exécutée</p>
              <p className="text-xs mt-1">Saisissez les réalisations terrain ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Année</TableHead>
                    <TableHead>Composante</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Coût réel</TableHead>
                    <TableHead>Preuve</TableHead>
                    {!readOnly && <TableHead className="w-16"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executeLines.map(line => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.year}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          {line.action_label || line.action_key}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{line.date_realisation || '-'}</TableCell>
                      <TableCell>
                        {line.statut_execution && (
                          <Badge className={`text-[10px] ${STATUT_EXECUTION_CONFIG[line.statut_execution]?.className || ''}`}>
                            {STATUT_EXECUTION_CONFIG[line.statut_execution]?.label || line.statut_execution}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{line.physique.toLocaleString()} {line.unite}</TableCell>
                      <TableCell className="font-medium">{formatDh(line.financier)}</TableCell>
                      <TableCell>
                        {(line.preuves as any[])?.length > 0 ? (
                          <Badge variant="outline" className="text-[10px] text-green-700">✓ Preuve</Badge>
                        ) : line.financier > 0 ? (
                          <Badge variant="outline" className="text-[10px] text-red-700">⚠ Manquante</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      {!readOnly && (
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAction(line.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfcpExecuteForm;
