/**
 * Formulaire de saisie des lignes CP (Programmation annuelle)
 * SOURCE UNIQUE pour le comparatif PDFCP (colonne "Programmé/CP")
 * 
 * Chaque ligne = une action programmée pour une année + localisation spécifique
 * 
 * L'unité est automatiquement définie selon la composante sélectionnée
 * et verrouillée pour éviter les incohérences.
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Lock, Wand2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { useDatabase, PdfcpLigneCP, PdfcpLignePrevue, PDFC, StatutLigneCp } from '@/contexts/DatabaseContext';
import { useToast } from '@/hooks/use-toast';
import { formatDh } from '@/lib/formatters';
import { actionTypeConfig, ActionType } from '@/data/comparatifTypes';
import { 
  PROGRAM_COMPONENTS_REF, 
  getDefaultUnit, 
  isUnitValid,
  getUnitLabel,
} from '@/data/programComponentsRef';

interface PdfcpLignesCpFormProps {
  pdfcp: PDFC;
  lignesCp: PdfcpLigneCP[];
  lignesPrevues?: PdfcpLignePrevue[];
  readOnly?: boolean;
}

// Use component reference as source of truth
const actionTypes: ActionType[] = PROGRAM_COMPONENTS_REF.map(c => c.id as ActionType);

const STATUT_LIGNE_OPTIONS: { value: StatutLigneCp; label: string; color: string }[] = [
  { value: 'accepte', label: 'Accepté', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'ajuste', label: 'Ajusté', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'reporte', label: 'Reporté', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'rejete', label: 'Rejeté', color: 'bg-red-100 text-red-800 border-red-200' },
];

const emptyLigne: Omit<PdfcpLigneCP, 'id'> = {
  pdfc_id: '',
  commune_label: '',
  perimetre_label: '',
  site_label: '',
  annee: new Date().getFullYear(),
  action_type: 'Reboisement',
  unite: getDefaultUnit('Reboisement'),
  quantite_programmee: 0,
  budget_programme_dh: 0,
  reference_cp: '',
  statut_ligne: 'accepte',
  motif_ajustement: '',
};

const PdfcpLignesCpForm: React.FC<PdfcpLignesCpFormProps> = ({
  pdfcp,
  lignesCp,
  lignesPrevues = [],
  readOnly = false,
}) => {
  const { addPdfcCp, updatePdfcCp, deletePdfcCp, getCommuneName } = useDatabase();
  const { toast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PdfcpLigneCP, 'id'>>(emptyLigne);
  
  // Generate years array from PDFCP window
  const years = Array.from(
    { length: pdfcp.year_end - pdfcp.year_start + 1 },
    (_, i) => pdfcp.year_start + i
  );
  
  const communeName = getCommuneName(pdfcp.commune_id);
  
  const resetForm = () => {
    setFormData({
      ...emptyLigne,
      pdfc_id: pdfcp.id,
      commune_label: communeName,
      annee: pdfcp.year_start,
      reference_cp: `CP-${pdfcp.year_start}`,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Generate CP lines from Plan lines
  const handleGenerateFromPlan = () => {
    if (lignesPrevues.length === 0) return;
    let count = 0;
    lignesPrevues.forEach(plan => {
      // Check if CP already exists for this plan line
      const exists = lignesCp.some(cp =>
        cp.source_plan_line_id === plan.id ||
        (cp.annee === plan.annee && cp.action_type === plan.action_type && cp.perimetre_label === plan.perimetre_label && cp.site_label === plan.site_label)
      );
      if (!exists) {
        addPdfcCp({
          pdfc_id: pdfcp.id,
          commune_label: communeName,
          perimetre_label: plan.perimetre_label,
          site_label: plan.site_label,
          annee: plan.annee,
          action_type: plan.action_type,
          unite: plan.unite,
          quantite_programmee: plan.quantite_physique,
          budget_programme_dh: plan.budget_prevu_dh,
          reference_cp: `CP-${plan.annee}`,
          source_plan_line_id: plan.id,
          statut_ligne: 'accepte',
        });
        count++;
      }
    });
    toast({
      title: 'CP généré depuis le Plan',
      description: `${count} ligne(s) CP créée(s) à partir du Plan concerté. Vous pouvez maintenant ajuster les quantités et budgets.`,
    });
  };
  
  const handleAdd = () => {
    setFormData({
      ...emptyLigne,
      pdfc_id: pdfcp.id,
      commune_label: communeName,
      annee: pdfcp.year_start,
      reference_cp: `CP-${pdfcp.year_start}`,
    });
    setEditingId(null);
    setShowForm(true);
  };
  
  const handleEdit = (ligne: PdfcpLigneCP) => {
    setFormData({
      pdfc_id: ligne.pdfc_id,
      commune_id: ligne.commune_id,
      commune_label: ligne.commune_label,
      perimetre_label: ligne.perimetre_label,
      site_label: ligne.site_label,
      annee: ligne.annee,
      action_type: ligne.action_type,
      unite: ligne.unite,
      quantite_programmee: ligne.quantite_programmee,
      budget_programme_dh: ligne.budget_programme_dh,
      reference_cp: ligne.reference_cp,
      source_plan_line_id: ligne.source_plan_line_id,
      statut_ligne: ligne.statut_ligne || 'accepte',
      motif_ajustement: ligne.motif_ajustement || '',
    });
    setEditingId(ligne.id);
    setShowForm(true);
  };
  
  const handleDelete = (id: string) => {
    deletePdfcCp(id);
    toast({ title: 'Ligne supprimée', description: 'La ligne CP a été supprimée.' });
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
    if (formData.quantite_programmee < 0) {
      toast({ title: 'Erreur', description: 'La quantité doit être positive.', variant: 'destructive' });
      return false;
    }
    if (formData.budget_programme_dh < 0) {
      toast({ title: 'Erreur', description: 'Le budget doit être positif.', variant: 'destructive' });
      return false;
    }
    // Motif obligatoire si statut = ajusté, reporté ou rejeté
    if (formData.statut_ligne && formData.statut_ligne !== 'accepte' && !formData.motif_ajustement?.trim()) {
      toast({ title: 'Erreur', description: 'Le motif d\'ajustement est obligatoire lorsque le statut n\'est pas "Accepté".', variant: 'destructive' });
      return false;
    }
    return true;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    if (editingId) {
      updatePdfcCp(editingId, formData);
      toast({ title: 'Ligne mise à jour', description: 'Les modifications ont été enregistrées.' });
    } else {
      addPdfcCp(formData);
      toast({ title: 'Ligne ajoutée', description: 'La nouvelle ligne CP a été créée.' });
    }
    resetForm();
  };
  
  // Group lignes by year for display
  const lignesByYear = lignesCp.reduce((acc, l) => {
    if (!acc[l.annee]) acc[l.annee] = [];
    acc[l.annee].push(l);
    return acc;
  }, {} as Record<number, PdfcpLigneCP[]>);
  
  const totalBudget = lignesCp.reduce((sum, l) => sum + l.budget_programme_dh, 0);
  
  return (
    <Card className="border-border/50 shadow-soft border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Contrat-Programme (CP)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {lignesCp.length} ligne(s) • {formatDh(totalBudget)}
            </Badge>
            {!readOnly && !showForm && (
              <>
                {lignesPrevues.length > 0 && lignesCp.length === 0 && (
                  <Button size="sm" onClick={handleGenerateFromPlan} variant="outline" className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                    <Wand2 className="h-3 w-3" />
                    Générer depuis Plan
                  </Button>
                )}
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
        {/* Formulaire de saisie */}
        {showForm && (
          <div className="border rounded-lg p-4 bg-blue-50/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                {editingId ? 'Modifier la ligne CP' : 'Nouvelle ligne CP'}
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
                  onValueChange={v => setFormData({ ...formData, annee: parseInt(v), reference_cp: `CP-${v}` })}
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
                <Label className="text-xs">Quantité</Label>
                <Input
                  type="number"
                  className="h-9"
                  value={formData.quantite_programmee || ''}
                  onChange={e => setFormData({ ...formData, quantite_programmee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Budget CP (DH) *</Label>
                <Input
                  type="number"
                  className="h-9"
                  value={formData.budget_programme_dh || ''}
                  onChange={e => setFormData({ ...formData, budget_programme_dh: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Référence CP</Label>
                <Input
                  className="h-9"
                  value={formData.reference_cp}
                  onChange={e => setFormData({ ...formData, reference_cp: e.target.value })}
                  placeholder="Ex: CP-2024"
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
            
            {/* Statut de la ligne et motif d'ajustement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Statut de la ligne *</Label>
                <Select
                  value={formData.statut_ligne || 'accepte'}
                  onValueChange={v => setFormData({ ...formData, statut_ligne: v as StatutLigneCp })}
                >
                  <SelectTrigger className="bg-background h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {STATUT_LIGNE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${opt.color.split(' ')[0]}`} />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  Motif d'ajustement
                  {formData.statut_ligne && formData.statut_ligne !== 'accepte' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Obligatoire quand le statut n'est pas "Accepté"</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </Label>
                <Textarea
                  className="h-16 text-xs"
                  value={formData.motif_ajustement || ''}
                  onChange={e => setFormData({ ...formData, motif_ajustement: e.target.value })}
                  placeholder={formData.statut_ligne !== 'accepte' ? 'Motif obligatoire...' : 'Optionnel'}
                  required={formData.statut_ligne !== 'accepte'}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSubmit} className="gap-1 bg-blue-600 hover:bg-blue-700">
                <Save className="h-3 w-3" />
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Liste des lignes par année */}
        {lignesCp.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Aucune ligne CP saisie.</p>
            <p className="text-xs mt-1">
              Cliquez sur "Ajouter" pour saisir les programmations annuelles.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Année</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Budget CP</TableHead>
                  <TableHead>Réf. CP</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Localisation</TableHead>
                  {!readOnly && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map(year => (
                  <React.Fragment key={year}>
                    {(lignesByYear[year] || []).map(ligne => {
                      const statutOpt = STATUT_LIGNE_OPTIONS.find(o => o.value === ligne.statut_ligne);
                      return (
                        <TableRow key={ligne.id}>
                          <TableCell className="font-medium">{ligne.annee}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              {actionTypeConfig[ligne.action_type as ActionType]?.label || ligne.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {statutOpt ? (
                              <Badge variant="outline" className={`text-xs ${statutOpt.color}`}>
                                {statutOpt.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">—</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {ligne.quantite_programmee.toLocaleString()} {ligne.unite}
                          </TableCell>
                          <TableCell className="font-medium text-blue-700">
                            {formatDh(ligne.budget_programme_dh)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ligne.reference_cp || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={ligne.motif_ajustement || ''}>
                            {ligne.motif_ajustement || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ligne.commune_label || '-'} / {ligne.perimetre_label || '-'} / {ligne.site_label || '-'}
                          </TableCell>
                          {!readOnly && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(ligne)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(ligne.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Résumé par année */}
        {lignesCp.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {years.map(year => {
              const yearLignes = lignesByYear[year] || [];
              const yearBudget = yearLignes.reduce((sum, l) => sum + l.budget_programme_dh, 0);
              if (yearBudget === 0) return null;
              return (
                <Badge key={year} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                  {year}: {formatDh(yearBudget)}
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PdfcpLignesCpForm;
