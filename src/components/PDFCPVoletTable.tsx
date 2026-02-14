import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  PDFCPLigneProgramme,
  VoletType,
  TypeOperation,
  UniteType,
  uniteOptions,
  typeOperationOptions,
  calculateTauxRealisation,
  getTotalsByVolet,
} from '@/data/pdfcpTypes';

interface PDFCPVoletTableProps {
  volet: VoletType;
  lignes: PDFCPLigneProgramme[];
  annees: number[];
  onAddLigne: (ligne: Omit<PDFCPLigneProgramme, 'id_ligne' | 'taux_realisation_quantite' | 'taux_realisation_budget'>) => void;
  onUpdateLigne: (id: string, ligne: Partial<PDFCPLigneProgramme>) => void;
  onDeleteLigne: (id: string) => void;
  idPdfcp: string;
}

const emptyLigne = (volet: VoletType, idPdfcp: string, annee: number): Omit<PDFCPLigneProgramme, 'id_ligne' | 'taux_realisation_quantite' | 'taux_realisation_budget'> => ({
  id_pdfcp: idPdfcp,
  annee,
  volet,
  type_operation: 'Execution',
  foret: '',
  perimetre_ou_piste_ou_point: '',
  lieu: '',
  parc_pastoral: '',
  usagers_ou_origine_proposition: '',
  unite: 'ha',
  quantite_prevue: 0,
  quantite_realisee: 0,
  montant_prevu: 0,
  montant_realise: 0,
  programmation_commentaire: '',
});

const PDFCPVoletTable: React.FC<PDFCPVoletTableProps> = ({
  volet,
  lignes,
  annees,
  onAddLigne,
  onUpdateLigne,
  onDeleteLigne,
  idPdfcp,
}) => {
  const { toast } = useToast();
  const [selectedAnnee, setSelectedAnnee] = useState<number>(annees[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLigne, setEditingLigne] = useState<PDFCPLigneProgramme | null>(null);
  const [formData, setFormData] = useState<Omit<PDFCPLigneProgramme, 'id_ligne' | 'taux_realisation_quantite' | 'taux_realisation_budget'>>(
    emptyLigne(volet, idPdfcp, selectedAnnee)
  );

  const filteredLignes = lignes.filter(l => l.annee === selectedAnnee);
  const totals = getTotalsByVolet(lignes, volet);

  const handleOpenAdd = () => {
    setEditingLigne(null);
    setFormData(emptyLigne(volet, idPdfcp, selectedAnnee));
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (ligne: PDFCPLigneProgramme) => {
    setEditingLigne(ligne);
    setFormData({
      id_pdfcp: ligne.id_pdfcp,
      annee: ligne.annee,
      volet: ligne.volet,
      type_operation: ligne.type_operation,
      foret: ligne.foret,
      perimetre_ou_piste_ou_point: ligne.perimetre_ou_piste_ou_point,
      lieu: ligne.lieu,
      parc_pastoral: ligne.parc_pastoral,
      usagers_ou_origine_proposition: ligne.usagers_ou_origine_proposition,
      unite: ligne.unite,
      quantite_prevue: ligne.quantite_prevue,
      quantite_realisee: ligne.quantite_realisee,
      montant_prevu: ligne.montant_prevu,
      montant_realise: ligne.montant_realise,
      coord_x_depart: ligne.coord_x_depart,
      coord_y_depart: ligne.coord_y_depart,
      coord_x_arrivee: ligne.coord_x_arrivee,
      coord_y_arrivee: ligne.coord_y_arrivee,
      programmation_commentaire: ligne.programmation_commentaire,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.perimetre_ou_piste_ou_point) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner le périmètre/piste/point",
        variant: "destructive",
      });
      return;
    }

    if (editingLigne) {
      onUpdateLigne(editingLigne.id_ligne, {
        ...formData,
        taux_realisation_quantite: calculateTauxRealisation(formData.quantite_realisee, formData.quantite_prevue),
        taux_realisation_budget: calculateTauxRealisation(formData.montant_realise, formData.montant_prevu),
      });
      toast({ title: "Succès", description: "Ligne mise à jour" });
    } else {
      onAddLigne(formData);
      toast({ title: "Succès", description: "Ligne ajoutée" });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    onDeleteLigne(id);
    toast({ title: "Succès", description: "Ligne supprimée" });
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'decimal' }).format(montant) + ' DH';
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Actions</p>
            <p className="text-lg font-bold text-foreground">{totals.count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget prévu</p>
            <p className="text-lg font-bold text-foreground">{formatMontant(totals.montantPrevu)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taux quantité</p>
            <div className="flex items-center gap-2">
              <Progress value={totals.tauxQuantite} className="h-2 flex-1" />
              <span className="text-sm font-medium">{totals.tauxQuantite}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taux budget</p>
            <div className="flex items-center gap-2">
              <Progress value={totals.tauxBudget} className="h-2 flex-1" />
              <span className="text-sm font-medium">{totals.tauxBudget}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Year Filter + Add Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Année:</span>
          <div className="flex gap-1">
            {annees.map(annee => (
              <Button
                key={annee}
                variant={selectedAnnee === annee ? 'anef' : 'outline'}
                size="sm"
                onClick={() => setSelectedAnnee(annee)}
                className="h-8 px-3"
              >
                {annee}
              </Button>
            ))}
          </div>
        </div>
        <Button variant="anef" size="sm" onClick={handleOpenAdd}>
          <Plus size={16} />
          Ajouter
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[120px]">Forêt</TableHead>
                <TableHead>Périmètre/Piste/Point</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead className="w-[80px] text-right">Qté prév.</TableHead>
                <TableHead className="w-[80px] text-right">Qté réal.</TableHead>
                <TableHead className="w-[100px] text-right">Montant prév.</TableHead>
                <TableHead className="w-[100px] text-right">Montant réal.</TableHead>
                <TableHead className="w-[60px] text-center">Taux</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Aucune action pour {selectedAnnee}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLignes.map((ligne) => (
                  <TableRow key={ligne.id_ligne}>
                    <TableCell className="font-medium">{ligne.foret || '-'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ligne.perimetre_ou_piste_ou_point}</p>
                        <p className="text-xs text-muted-foreground">{ligne.lieu}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {ligne.type_operation}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {ligne.quantite_prevue} {ligne.unite}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {ligne.quantite_realisee} {ligne.unite}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatMontant(ligne.montant_prevu)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatMontant(ligne.montant_realise)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Progress 
                          value={ligne.taux_realisation_quantite} 
                          className="h-1.5 w-12" 
                        />
                        <span className="text-xs font-medium">
                          {ligne.taux_realisation_quantite}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenEdit(ligne)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(ligne.id_ligne)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLigne ? 'Modifier la ligne' : 'Ajouter une ligne'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Année</label>
                <Select
                  value={formData.annee.toString()}
                  onValueChange={(v) => setFormData({ ...formData, annee: parseInt(v) })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {annees.map(a => (
                      <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type opération</label>
                <Select
                  value={formData.type_operation}
                  onValueChange={(v) => setFormData({ ...formData, type_operation: v as TypeOperation })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOperationOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Forêt</label>
              <Input
                value={formData.foret}
                onChange={(e) => setFormData({ ...formData, foret: e.target.value })}
                placeholder="Nom de la forêt"
                className="h-10"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Périmètre / Piste / Point *</label>
              <Input
                value={formData.perimetre_ou_piste_ou_point}
                onChange={(e) => setFormData({ ...formData, perimetre_ou_piste_ou_point: e.target.value })}
                placeholder="Ex: Piste Inzerki, Matfia Masfour..."
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Lieu</label>
                <Input
                  value={formData.lieu}
                  onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                  placeholder="Localisation"
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Parc pastoral</label>
                <Input
                  value={formData.parc_pastoral}
                  onChange={(e) => setFormData({ ...formData, parc_pastoral: e.target.value })}
                  placeholder="Parc pastoral"
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Origine proposition</label>
              <Input
                value={formData.usagers_ou_origine_proposition}
                onChange={(e) => setFormData({ ...formData, usagers_ou_origine_proposition: e.target.value })}
                placeholder="Ex: Usagers, ANEF, ODF..."
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Unité</label>
                <Select
                  value={formData.unite}
                  onValueChange={(v) => setFormData({ ...formData, unite: v as UniteType })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniteOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qté prévue</label>
                <Input
                  type="number"
                  value={formData.quantite_prevue}
                  onChange={(e) => setFormData({ ...formData, quantite_prevue: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qté réalisée</label>
                <Input
                  type="number"
                  value={formData.quantite_realisee}
                  onChange={(e) => setFormData({ ...formData, quantite_realisee: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Montant prévu (DH)</label>
                <Input
                  type="number"
                  value={formData.montant_prevu}
                  onChange={(e) => setFormData({ ...formData, montant_prevu: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Montant réalisé (DH)</label>
                <Input
                  type="number"
                  value={formData.montant_realise}
                  onChange={(e) => setFormData({ ...formData, montant_realise: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
            </div>

            {/* Coordinates (for Pistes and Points d'eau) */}
            {(volet === 'Points_Eau' || volet === 'Pistes_Rehabilitation' || volet === 'Pistes_Ouverture') && (
              <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin size={14} className="text-primary" />
                  Coordonnées GPS (optionnel)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">X départ</label>
                    <Input
                      type="number"
                      value={formData.coord_x_depart || ''}
                      onChange={(e) => setFormData({ ...formData, coord_x_depart: parseFloat(e.target.value) || undefined })}
                      className="h-9"
                      placeholder="X"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y départ</label>
                    <Input
                      type="number"
                      value={formData.coord_y_depart || ''}
                      onChange={(e) => setFormData({ ...formData, coord_y_depart: parseFloat(e.target.value) || undefined })}
                      className="h-9"
                      placeholder="Y"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">X arrivée</label>
                    <Input
                      type="number"
                      value={formData.coord_x_arrivee || ''}
                      onChange={(e) => setFormData({ ...formData, coord_x_arrivee: parseFloat(e.target.value) || undefined })}
                      className="h-9"
                      placeholder="X"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Y arrivée</label>
                    <Input
                      type="number"
                      value={formData.coord_y_arrivee || ''}
                      onChange={(e) => setFormData({ ...formData, coord_y_arrivee: parseFloat(e.target.value) || undefined })}
                      className="h-9"
                      placeholder="Y"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Commentaire programmation</label>
              <Input
                value={formData.programmation_commentaire}
                onChange={(e) => setFormData({ ...formData, programmation_commentaire: e.target.value })}
                placeholder="Ex: Retenue en CP 2026, AO infructueux..."
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X size={16} />
              Annuler
            </Button>
            <Button variant="anef" onClick={handleSave}>
              <Save size={16} />
              {editingLigne ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDFCPVoletTable;
