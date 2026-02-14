/**
 * Formulaire de saisie des actions exécutées (Réalisé)
 * SOURCE UNIQUE pour le comparatif PDFCP (colonne "Exécuté")
 * 
 * Chaque action = une réalisation pour une année + localisation spécifique
 * 
 * L'unité est automatiquement définie selon la composante sélectionnée
 * et verrouillée pour éviter les incohérences.
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, CheckCircle, Lock } from 'lucide-react';
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
import { useDatabase, PdfcpActionExec, PdfcpLigneCP, PDFC } from '@/contexts/DatabaseContext';
import { useToast } from '@/hooks/use-toast';
import { formatDh } from '@/lib/formatters';
import { actionTypeConfig, ActionType, statutExecutionConfig, StatutExecution } from '@/data/comparatifTypes';
import { 
  PROGRAM_COMPONENTS_REF, 
  getDefaultUnit, 
  isUnitValid,
  getUnitLabel,
} from '@/data/programComponentsRef';

interface PdfcpActionsExecFormProps {
  pdfcp: PDFC;
  actionsExec: PdfcpActionExec[];
  lignesCp?: PdfcpLigneCP[];
  readOnly?: boolean;
}

// Use component reference as source of truth
const actionTypes: ActionType[] = PROGRAM_COMPONENTS_REF.map(c => c.id as ActionType);

const statutOptions: StatutExecution[] = ['planifie', 'en_cours', 'termine', 'annule', 'bloque'];

const emptyAction: Omit<PdfcpActionExec, 'id'> = {
  pdfc_id: '',
  commune_label: '',
  perimetre_label: '',
  site_label: '',
  annee: new Date().getFullYear(),
  action_type: 'Reboisement',
  unite: getDefaultUnit('Reboisement'),
  date_realisation: new Date().toISOString().slice(0, 10),
  quantite_realisee: 0,
  cout_reel_dh: 0,
  statut: 'termine',
  source_cp_line_id: '',
};

const PdfcpActionsExecForm: React.FC<PdfcpActionsExecFormProps> = ({
  pdfcp,
  actionsExec,
  lignesCp = [],
  readOnly = false,
}) => {
  const { addPdfcExec, updatePdfcExec, deletePdfcExec, getCommuneName } = useDatabase();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PdfcpActionExec, 'id'>>(emptyAction);
  
  // Generate years array from PDFCP window
  const years = Array.from(
    { length: pdfcp.year_end - pdfcp.year_start + 1 },
    (_, i) => pdfcp.year_start + i
  );
  
  const communeName = getCommuneName(pdfcp.commune_id);
  
  const resetForm = () => {
    setFormData({
      ...emptyAction,
      pdfc_id: pdfcp.id,
      commune_label: communeName,
      annee: pdfcp.year_start,
    });
    setEditingId(null);
    setShowForm(false);
  };
  
  const handleAdd = () => {
    setFormData({
      ...emptyAction,
      pdfc_id: pdfcp.id,
      commune_label: communeName,
      annee: pdfcp.year_start,
    });
    setEditingId(null);
    setShowForm(true);
  };
  
  const handleEdit = (action: PdfcpActionExec) => {
    setFormData({
      pdfc_id: action.pdfc_id,
      commune_id: action.commune_id,
      commune_label: action.commune_label,
      perimetre_label: action.perimetre_label,
      site_label: action.site_label,
      annee: action.annee,
      action_type: action.action_type,
      unite: action.unite,
      date_realisation: action.date_realisation,
      quantite_realisee: action.quantite_realisee,
      cout_reel_dh: action.cout_reel_dh,
      statut: action.statut,
      preuve_url: action.preuve_url,
      observations: action.observations,
      source_cp_line_id: action.source_cp_line_id || '',
    });
    setEditingId(action.id);
    setShowForm(true);
  };
  
  const handleDelete = (id: string) => {
    deletePdfcExec(id);
    toast({ title: 'Action supprimée', description: 'L\'action exécutée a été supprimée.' });
  };
  
  const validateForm = (): boolean => {
    if (!formData.annee) {
      toast({ title: 'Erreur', description: 'L\'année est obligatoire.', variant: 'destructive' });
      return false;
    }
    if (!formData.action_type) {
      toast({ title: 'Erreur', description: 'Le type d\'action est obligatoire.', variant: 'destructive' });
      return false;
    }
    if (!formData.date_realisation) {
      toast({ title: 'Erreur', description: 'La date de réalisation est obligatoire.', variant: 'destructive' });
      return false;
    }
    if (formData.quantite_realisee < 0) {
      toast({ title: 'Erreur', description: 'La quantité doit être positive.', variant: 'destructive' });
      return false;
    }
    if (formData.cout_reel_dh < 0) {
      toast({ title: 'Erreur', description: 'Le coût doit être positif.', variant: 'destructive' });
      return false;
    }
    return true;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    if (editingId) {
      updatePdfcExec(editingId, formData);
      toast({ title: 'Action mise à jour', description: 'Les modifications ont été enregistrées.' });
    } else {
      addPdfcExec(formData);
      toast({ title: 'Action ajoutée', description: 'La nouvelle action exécutée a été créée.' });
    }
    resetForm();
  };
  
  // Group actions by year for display
  const actionsByYear = actionsExec.reduce((acc, a) => {
    if (!acc[a.annee]) acc[a.annee] = [];
    acc[a.annee].push(a);
    return acc;
  }, {} as Record<number, PdfcpActionExec[]>);
  
  const totalCout = actionsExec.reduce((sum, a) => sum + a.cout_reel_dh, 0);
  
  return (
    <Card className="border-border/50 shadow-soft border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Actions Exécutées (Réalisé)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {actionsExec.length} action(s) • {formatDh(totalCout)}
            </Badge>
            {!readOnly && !showForm && (
              <Button size="sm" onClick={handleAdd} variant="outline" className="gap-1">
                <Plus className="h-3 w-3" />
                Ajouter
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulaire de saisie */}
        {showForm && (
          <div className="border rounded-lg p-4 bg-green-50/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                {editingId ? 'Modifier l\'action' : 'Nouvelle action exécutée'}
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
                    unite: getDefaultUnit(v) // Auto-fill unit
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
                <Label className="text-xs">Date réalisation *</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={formData.date_realisation}
                  onChange={e => setFormData({ ...formData, date_realisation: e.target.value })}
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Statut *</Label>
                <Select
                  value={formData.statut}
                  onValueChange={v => setFormData({ ...formData, statut: v as StatutExecution })}
                >
                  <SelectTrigger className="bg-background h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {statutOptions.map(s => (
                      <SelectItem key={s} value={s}>
                        {statutExecutionConfig[s]?.label || s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  Unité
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <Input
                  className="h-9 bg-muted/50 cursor-not-allowed"
                  value={`${formData.unite} (${getUnitLabel(formData.unite)})`}
                  readOnly
                  disabled
                />
                <p className="text-[10px] text-muted-foreground">
                  Définie automatiquement
                </p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Quantité réalisée</Label>
                <Input
                  type="number"
                  className="h-9"
                  value={formData.quantite_realisee || ''}
                  onChange={e => setFormData({ ...formData, quantite_realisee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Coût réel (DH) *</Label>
                <Input
                  type="number"
                  className="h-9"
                  value={formData.cout_reel_dh || ''}
                  onChange={e => setFormData({ ...formData, cout_reel_dh: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Preuve (URL)</Label>
                <Input
                  className="h-9"
                  value={formData.preuve_url || ''}
                  onChange={e => setFormData({ ...formData, preuve_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Observations</Label>
                <Input
                  className="h-9"
                  value={formData.observations || ''}
                  onChange={e => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Notes ou remarques..."
                />
              </div>
            </div>
            
            {/* Liaison ligne CP source */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ligne CP source (référence)</Label>
                <Select
                  value={formData.source_cp_line_id || '_none'}
                  onValueChange={v => {
                    const cpLine = lignesCp.find(l => l.id === v);
                    if (cpLine) {
                      setFormData({
                        ...formData,
                        source_cp_line_id: v,
                        action_type: cpLine.action_type,
                        unite: cpLine.unite,
                        annee: cpLine.annee,
                        perimetre_label: cpLine.perimetre_label,
                        site_label: cpLine.site_label,
                      });
                    } else {
                      setFormData({ ...formData, source_cp_line_id: '' });
                    }
                  }}
                >
                  <SelectTrigger className="bg-background h-9">
                    <SelectValue placeholder="Aucune (saisie libre)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="_none">Aucune (saisie libre)</SelectItem>
                    {lignesCp.map(cp => (
                      <SelectItem key={cp.id} value={cp.id}>
                        {cp.annee} — {actionTypeConfig[cp.action_type as ActionType]?.label || cp.action_type} — {cp.quantite_programmee} {cp.unite} — {formatDh(cp.budget_programme_dh)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Lier cette exécution à une ligne du Contrat-Programme
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSubmit} className="gap-1 bg-green-600 hover:bg-green-700">
                <Save className="h-3 w-3" />
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Liste des actions par année */}
        {actionsExec.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Aucune action exécutée saisie.</p>
            <p className="text-xs mt-1">
              Cliquez sur "Ajouter" pour saisir les réalisations terrain.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Année</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Coût réel</TableHead>
                  <TableHead>Réf. CP</TableHead>
                  <TableHead>Localisation</TableHead>
                  {!readOnly && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map(year => (
                  <React.Fragment key={year}>
                    {(actionsByYear[year] || []).map(action => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">{action.annee}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            {actionTypeConfig[action.action_type as ActionType]?.label || action.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {action.date_realisation}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${statutExecutionConfig[action.statut]?.color || 'bg-muted'}`}>
                            {statutExecutionConfig[action.statut]?.label || action.statut}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {action.quantite_realisee.toLocaleString()} {action.unite}
                        </TableCell>
                        <TableCell className="font-medium text-green-700">
                          {formatDh(action.cout_reel_dh)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {action.source_cp_line_id ? (
                            <Badge variant="outline" className="text-[10px]">
                              {lignesCp.find(cp => cp.id === action.source_cp_line_id)?.reference_cp || 'CP lié'}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {action.commune_label || '-'} / {action.perimetre_label || '-'} / {action.site_label || '-'}
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleEdit(action)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(action.id)}
                              >
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
        {actionsExec.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {years.map(year => {
              const yearActions = actionsByYear[year] || [];
              const yearCout = yearActions.reduce((sum, a) => sum + a.cout_reel_dh, 0);
              if (yearCout === 0) return null;
              return (
                <Badge key={year} variant="secondary" className="text-xs bg-green-100 text-green-800">
                  {year}: {formatDh(yearCout)}
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfcpActionsExecForm;
