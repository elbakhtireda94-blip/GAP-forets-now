/**
 * Formulaire de saisie des lignes prévues opérationnelles
 * SOURCE UNIQUE pour le comparatif PDFCP (colonne "Prévu")
 * 
 * - Commune verrouillée (lecture seule, issue du PDFCP)
 * - Unité verrouillée selon la composante
 * - Mode saisie rapide multi-années
 * - Résumé automatique des composantes
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useDatabase, PdfcpLignePrevue, PDFC } from '@/contexts/DatabaseContext';
import { useToast } from '@/hooks/use-toast';
import { formatDh } from '@/lib/formatters';
import { actionTypeConfig, ActionType } from '@/data/comparatifTypes';
import {
  PROGRAM_COMPONENTS_REF,
  getDefaultUnit,
  getUnitLabel,
} from '@/data/programComponentsRef';
import PdfcpComponentsSummary from './PdfcpComponentsSummary';
import PdfcpQuickEntryForm from './PdfcpQuickEntryForm';

interface PdfcpLignesPrevuesFormProps {
  pdfcp: PDFC;
  lignesPrevues: PdfcpLignePrevue[];
  readOnly?: boolean;
}

const actionTypes: ActionType[] = PROGRAM_COMPONENTS_REF.map(c => c.id as ActionType);

const emptyLigne: Omit<PdfcpLignePrevue, 'id'> = {
  pdfc_id: '',
  commune_label: '',
  perimetre_label: '',
  site_label: '',
  annee: new Date().getFullYear(),
  action_type: 'Reboisement',
  unite: getDefaultUnit('Reboisement'),
  quantite_physique: 0,
  budget_prevu_dh: 0,
};

type FormMode = 'none' | 'single' | 'quick';

const PdfcpLignesPrevuesForm: React.FC<PdfcpLignesPrevuesFormProps> = ({
  pdfcp,
  lignesPrevues,
  readOnly = false,
}) => {
  const { addPdfcPrevu, updatePdfcPrevu, deletePdfcPrevu, getCommuneName } = useDatabase();
  const { toast } = useToast();

  const [formMode, setFormMode] = useState<FormMode>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PdfcpLignePrevue, 'id'>>(emptyLigne);

  const years = Array.from(
    { length: pdfcp.year_end - pdfcp.year_start + 1 },
    (_, i) => pdfcp.year_start + i
  );

  const communeName = getCommuneName(pdfcp.commune_id);

  const resetForm = () => {
    setFormData({ ...emptyLigne, pdfc_id: pdfcp.id, commune_label: communeName, annee: pdfcp.year_start });
    setEditingId(null);
    setFormMode('none');
  };

  const handleAdd = () => {
    setFormData({ ...emptyLigne, pdfc_id: pdfcp.id, commune_label: communeName, annee: pdfcp.year_start });
    setEditingId(null);
    setFormMode('single');
  };

  const handleEdit = (ligne: PdfcpLignePrevue) => {
    setFormData({
      pdfc_id: ligne.pdfc_id,
      commune_id: ligne.commune_id,
      commune_label: communeName, // Always use PDFCP commune
      perimetre_label: ligne.perimetre_label,
      site_label: ligne.site_label,
      annee: ligne.annee,
      action_type: ligne.action_type,
      unite: ligne.unite,
      quantite_physique: ligne.quantite_physique,
      budget_prevu_dh: ligne.budget_prevu_dh,
    });
    setEditingId(ligne.id);
    setFormMode('single');
  };

  const handleDelete = (id: string) => {
    deletePdfcPrevu(id);
    toast({ title: 'Ligne supprimée', description: 'La ligne prévue a été supprimée.' });
  };

  const validateForm = (): boolean => {
    if (!formData.annee) {
      toast({ title: 'Erreur', description: "L'année est obligatoire.", variant: 'destructive' });
      return false;
    }
    if (!formData.action_type) {
      toast({ title: 'Erreur', description: "Le type d'action est obligatoire.", variant: 'destructive' });
      return false;
    }
    if (formData.quantite_physique < 0) {
      toast({ title: 'Erreur', description: 'La quantité doit être positive.', variant: 'destructive' });
      return false;
    }
    if (formData.budget_prevu_dh < 0) {
      toast({ title: 'Erreur', description: 'Le budget doit être positif.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingId) {
      updatePdfcPrevu(editingId, formData);
      toast({ title: 'Ligne mise à jour', description: 'Les modifications ont été enregistrées.' });
    } else {
      addPdfcPrevu(formData);
      toast({ title: 'Ligne ajoutée', description: 'La nouvelle ligne prévue a été créée.' });
    }
    resetForm();
  };

  // Group lignes by year
  const lignesByYear = lignesPrevues.reduce((acc, l) => {
    if (!acc[l.annee]) acc[l.annee] = [];
    acc[l.annee].push(l);
    return acc;
  }, {} as Record<number, PdfcpLignePrevue[]>);

  const totalBudget = lignesPrevues.reduce((sum, l) => sum + l.budget_prevu_dh, 0);

  return (
    <div className="space-y-4">
      {/* Résumé automatique des composantes */}
      <PdfcpComponentsSummary lignesPrevues={lignesPrevues} />

      {/* Formulaire principal */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lignes Prévues (Opérationnel)</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {lignesPrevues.length} ligne(s) • {formatDh(totalBudget)}
              </Badge>
              {formMode === 'none' && !readOnly && (
                <>
                  <Button size="sm" onClick={() => setFormMode('quick')} variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Saisie rapide
                  </Button>
                  <Button size="sm" onClick={handleAdd} variant="outline" className="gap-1">
                    <Plus className="h-3 w-3" />
                    Ajouter
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick entry mode */}
          {formMode === 'quick' && (
            <PdfcpQuickEntryForm pdfcp={pdfcp} onDone={resetForm} />
          )}

          {/* Single entry form */}
          {formMode === 'single' && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {editingId ? 'Modifier la ligne' : 'Nouvelle ligne prévue'}
                </h4>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Année *</Label>
                  <Select
                    value={String(formData.annee)}
                    onValueChange={v => setFormData({ ...formData, annee: parseInt(v) })}
                  >
                    <SelectTrigger className="bg-background h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {years.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Action *</Label>
                  <Select
                    value={formData.action_type}
                    onValueChange={v => setFormData({
                      ...formData,
                      action_type: v,
                      unite: getDefaultUnit(v),
                    })}
                  >
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
                    value={`${formData.unite} (${getUnitLabel(formData.unite)})`}
                    readOnly
                    disabled
                  />
                  <p className="text-[10px] text-muted-foreground">Définie automatiquement</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Quantité</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={formData.quantite_physique || ''}
                    onChange={e => setFormData({ ...formData, quantite_physique: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Budget (DH) *</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={formData.budget_prevu_dh || ''}
                    onChange={e => setFormData({ ...formData, budget_prevu_dh: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                {/* Commune — read-only */}
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

                <div className="space-y-1">
                  <Label className="text-xs">Périmètre</Label>
                  <Input
                    className="h-9"
                    value={formData.perimetre_label}
                    onChange={e => setFormData({ ...formData, perimetre_label: e.target.value })}
                    placeholder="Ex: Aït Mokhtar"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Site</Label>
                  <Input
                    className="h-9"
                    value={formData.site_label}
                    onChange={e => setFormData({ ...formData, site_label: e.target.value })}
                    placeholder="Ex: Versant Nord"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={resetForm}>Annuler</Button>
                <Button size="sm" onClick={handleSubmit} className="gap-1">
                  <Save className="h-3 w-3" />
                  {editingId ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}

          {/* Table des lignes */}
          {lignesPrevues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Aucune ligne prévue saisie.</p>
              <p className="text-xs mt-1">
                Cliquez sur "Ajouter" ou "Saisie rapide" pour commencer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Année</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map(year => (
                    <React.Fragment key={year}>
                      {(lignesByYear[year] || []).map(ligne => (
                        <TableRow key={ligne.id}>
                          <TableCell className="font-medium">{ligne.annee}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {actionTypeConfig[ligne.action_type as ActionType]?.label || ligne.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ligne.quantite_physique.toLocaleString()} {ligne.unite}
                          </TableCell>
                          <TableCell className="font-medium">{formatDh(ligne.budget_prevu_dh)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {communeName} / {ligne.perimetre_label || '-'} / {ligne.site_label || '-'}
                          </TableCell>
                          {!readOnly && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(ligne)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(ligne.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
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
          {lignesPrevues.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {years.map(year => {
                const yearLignes = lignesByYear[year] || [];
                const yearBudget = yearLignes.reduce((sum, l) => sum + l.budget_prevu_dh, 0);
                if (yearBudget === 0) return null;
                return (
                  <Badge key={year} variant="secondary" className="text-xs">
                    {year}: {formatDh(yearBudget)}
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

export default PdfcpLignesPrevuesForm;
