import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Users, Phone, Mail, MapPin, Camera, User, Briefcase, Building, Calendar, IdCard, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDatabase, ADP, CorpsFonctionnel, Sexe } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import CascadingDropdowns from '@/components/CascadingDropdowns';
import BottomNav from '@/components/BottomNav';
import ADPDetailsSheet from '@/components/adp/ADPDetailsSheet';
import { cn } from '@/lib/utils';

const emptyAdp: Omit<ADP, 'id'> = {
  matricule: '',
  cine: '',
  full_name: '',
  sexe: undefined,
  date_naissance: '',
  photo_url: '',
  date_recrutement: '',
  anciennete_admin: '',
  grade: '',
  echelle: '',
  corps_fonctionnel: undefined,
  region_id: '',
  dranef_id: '',
  dpanef_id: '',
  commune_id: '',
  phone: '',
  email: '',
  adresse: '',
  status: 'Actif',
};

interface FormErrors {
  matricule?: string;
  cine?: string;
  full_name?: string;
  commune_id?: string;
  phone?: string;
  email?: string;
}

const ADPManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { applyScopeFilter, user } = useAuth();
  const {
    getAdps,
    addAdp,
    updateAdp,
    deleteAdp,
    getCommuneName,
    getDpanefName,
    getDranefName,
    getRegionName,
  } = useDatabase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAdp, setSelectedAdp] = useState<ADP | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<ADP, 'id'>>(emptyAdp);
  const [errors, setErrors] = useState<FormErrors>({});

  // Apply RBAC scope filter to ADP list
  const adps = useMemo(() => {
    const allAdps = getAdps();
    return applyScopeFilter(allAdps, 'adp');
  }, [getAdps, applyScopeFilter]);

  const handleViewDetails = (adp: ADP) => {
    setSelectedAdp(adp);
    setDetailsOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyAdp);
    setErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (adp: ADP) => {
    setEditingId(adp.id);
    setFormData({
      matricule: adp.matricule || '',
      cine: adp.cine || '',
      full_name: adp.full_name,
      sexe: adp.sexe,
      date_naissance: adp.date_naissance || '',
      photo_url: adp.photo_url || '',
      date_recrutement: adp.date_recrutement || '',
      anciennete_admin: adp.anciennete_admin || '',
      grade: adp.grade || '',
      echelle: adp.echelle || '',
      corps_fonctionnel: adp.corps_fonctionnel,
      region_id: adp.region_id,
      dranef_id: adp.dranef_id,
      dpanef_id: adp.dpanef_id,
      commune_id: adp.commune_id,
      phone: adp.phone,
      email: adp.email,
      adresse: adp.adresse || '',
      status: adp.status,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteAdp(deleteId);
      toast({ title: 'ADP supprimé', description: 'L\'agent a été supprimé avec succès.' });
    }
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.matricule.trim()) {
      newErrors.matricule = 'Le matricule est obligatoire';
    }

    if (!formData.cine.trim()) {
      newErrors.cine = 'La CINE est obligatoire';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Le nom complet est obligatoire';
    }

    if (!formData.commune_id) {
      newErrors.commune_id = 'L\'affectation territoriale est obligatoire';
    }

    // Validation téléphone marocain (06/07)
    if (formData.phone && !/^(06|07)\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Format invalide (06/07 suivi de 8 chiffres)';
    }

    // Validation email @anef.ma
    if (formData.email && !formData.email.toLowerCase().endsWith('@anef.ma')) {
      newErrors.email = 'L\'email doit être @anef.ma';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast({ title: 'Erreur de validation', description: 'Veuillez corriger les erreurs du formulaire.', variant: 'destructive' });
      return;
    }

    const trimmedData = {
      ...formData,
      matricule: formData.matricule.trim(),
      cine: formData.cine.trim(),
      full_name: formData.full_name.trim(),
      phone: formData.phone.replace(/\s/g, ''),
      email: formData.email.trim().toLowerCase(),
      adresse: formData.adresse?.trim() || '',
    };

    if (editingId) {
      updateAdp(editingId, trimmedData);
      toast({ title: 'ADP modifié', description: 'Les informations ont été mises à jour avec succès.' });
    } else {
      addAdp(trimmedData);
      toast({ title: 'ADP enregistré', description: 'Le nouvel agent a été créé avec succès.' });
    }
    setDialogOpen(false);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for preview (in real app, would upload to storage)
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate('/menu')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Gestion des ADP</h1>
            <p className="text-primary-foreground/80 text-sm">Agents de Développement de Partenariat</p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="px-4 py-4">
        <Button onClick={handleAdd} className="w-full gap-2" variant="anef">
          <Plus className="h-4 w-4" />
          Ajouter un ADP
        </Button>
      </div>

      {/* ADP List */}
      <div className="px-4 space-y-3">
        {adps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun ADP enregistré</p>
          </div>
        ) : (
          adps.map(adp => (
            <div
              key={adp.id}
              className="bg-card rounded-xl p-4 border border-border/50 shadow-soft"
            >
              <div className="flex items-start gap-3">
                {/* Photo */}
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {adp.photo_url ? (
                    <img src={adp.photo_url} alt={adp.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{adp.full_name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        adp.status === 'Actif'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {adp.status}
                    </span>
                  </div>
                  {adp.matricule && (
                    <p className="text-xs text-muted-foreground mb-1">Mat: {adp.matricule}</p>
                  )}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{getCommuneName(adp.commune_id)}</span>
                    </div>
                    {adp.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{adp.phone}</span>
                      </div>
                    )}
                    {adp.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{adp.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleViewDetails(adp)}
                    title="Voir les détails"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(adp)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(adp.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog - Professional HR Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <IdCard className="h-5 w-5 text-primary" />
              {editingId ? 'Modifier l\'ADP' : 'Nouvel Agent ADP'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Fiche agent - Données RH ANEF</p>
          </DialogHeader>
          
          <div className="px-6 py-5 space-y-6">
            {/* Section 1 - Identité de l'ADP */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Identité de l'ADP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Photo + Infos principales */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Photo */}
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="w-28 h-28 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
                      onClick={handlePhotoClick}
                    >
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Photo ADP" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Photo</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handlePhotoClick}
                      className="text-xs"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Changer la photo
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>

                  {/* Champs identité */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Matricule ADP *</Label>
                      <Input
                        value={formData.matricule}
                        onChange={e => setFormData({ ...formData, matricule: e.target.value })}
                        placeholder="Ex: ADP-2024-001"
                        className={cn(errors.matricule && "border-destructive")}
                      />
                      {errors.matricule && <p className="text-xs text-destructive">{errors.matricule}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">CINE *</Label>
                      <Input
                        value={formData.cine}
                        onChange={e => setFormData({ ...formData, cine: e.target.value })}
                        placeholder="Ex: AB123456"
                        className={cn(errors.cine && "border-destructive")}
                      />
                      {errors.cine && <p className="text-xs text-destructive">{errors.cine}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Nom complet *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Nom et prénom"
                        className={cn(errors.full_name && "border-destructive")}
                      />
                      {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sexe</Label>
                      <Select
                        value={formData.sexe || '__none__'}
                        onValueChange={v => setFormData({ ...formData, sexe: v === '__none__' ? undefined : v as Sexe })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="__none__">Non renseigné</SelectItem>
                          <SelectItem value="Masculin">Masculin</SelectItem>
                          <SelectItem value="Féminin">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date de naissance</Label>
                      <Input
                        type="date"
                        value={formData.date_naissance || ''}
                        onChange={e => setFormData({ ...formData, date_naissance: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2 - Situation administrative */}
            <Card className="border-l-4 border-l-secondary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Situation administrative
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date de recrutement</Label>
                    <Input
                      type="date"
                      value={formData.date_recrutement || ''}
                      onChange={e => setFormData({ ...formData, date_recrutement: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Ancienneté admin.</Label>
                    <Input
                      value={formData.anciennete_admin || ''}
                      onChange={e => setFormData({ ...formData, anciennete_admin: e.target.value })}
                      placeholder="Ex: 5 ans"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Grade</Label>
                    <Input
                      value={formData.grade || ''}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="Ex: Technicien"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Échelle</Label>
                    <Input
                      value={formData.echelle || ''}
                      onChange={e => setFormData({ ...formData, echelle: e.target.value })}
                      placeholder="Ex: 9"
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Corps fonctionnel - Cards sélectionnables */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Corps fonctionnel</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all text-center",
                        formData.corps_fonctionnel === 'forestier'
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 bg-card"
                      )}
                      onClick={() => setFormData({ ...formData, corps_fonctionnel: 'forestier' })}
                    >
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
                        🌲
                      </div>
                      <p className="font-medium text-sm">Personnel forestier</p>
                      <p className="text-xs text-muted-foreground mt-1">Agents techniques terrain</p>
                    </div>

                    <div
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all text-center",
                        formData.corps_fonctionnel === 'support'
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 bg-card"
                      )}
                      onClick={() => setFormData({ ...formData, corps_fonctionnel: 'support' })}
                    >
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-secondary/20 flex items-center justify-center">
                        🏢
                      </div>
                      <p className="font-medium text-sm">Personnel de support</p>
                      <p className="text-xs text-muted-foreground mt-1">Services administratifs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3 - Affectation territoriale */}
            <Card className="border-l-4 border-l-accent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Affectation territoriale *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CascadingDropdowns
                  regionId={formData.region_id}
                  dranefId={formData.dranef_id}
                  dpanefId={formData.dpanef_id}
                  communeId={formData.commune_id}
                  onRegionChange={v => setFormData({ ...formData, region_id: v, dranef_id: '', dpanef_id: '', commune_id: '' })}
                  onDranefChange={v => setFormData({ ...formData, dranef_id: v, dpanef_id: '', commune_id: '' })}
                  onDpanefChange={v => setFormData({ ...formData, dpanef_id: v, commune_id: '' })}
                  onCommuneChange={v => setFormData({ ...formData, commune_id: v })}
                  compact={false}
                />
                {errors.commune_id && <p className="text-xs text-destructive mt-2">{errors.commune_id}</p>}
              </CardContent>
            </Card>

            {/* Section 4 - Coordonnées */}
            <Card className="border-l-4 border-l-muted-foreground">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Coordonnées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Téléphone</Label>
                    <Input
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="06XXXXXXXX ou 07XXXXXXXX"
                      className={cn(errors.phone && "border-destructive")}
                    />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email professionnel</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="prenom.nom@anef.ma"
                      className={cn(errors.email && "border-destructive")}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Adresse</Label>
                    <Input
                      value={formData.adresse || ''}
                      onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                      placeholder="Adresse de résidence (optionnel)"
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={v => setFormData({ ...formData, status: v as 'Actif' | 'Inactif' })}
                  >
                    <SelectTrigger className="bg-background w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="Actif">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Actif
                        </span>
                      </SelectItem>
                      <SelectItem value="Inactif">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                          Inactif
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} variant="anef" className="gap-2">
              <Calendar className="h-4 w-4" />
              {editingId ? 'Mettre à jour' : 'Enregistrer ADP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet ADP ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ADP Details Sheet */}
      <ADPDetailsSheet 
        adp={selectedAdp} 
        open={detailsOpen} 
        onOpenChange={setDetailsOpen} 
      />

      <BottomNav />
    </div>
  );
};

export default ADPManagement;