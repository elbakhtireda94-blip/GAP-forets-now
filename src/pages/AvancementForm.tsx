import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Camera, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';

const pdfcpList = [
  { id: '1', titre: 'PDFCP Aguelmam Azegza - Conservation des cédraies' },
  { id: '2', titre: 'PDFCP Oum Rbia - Gestion participative' },
  { id: '3', titre: 'PDFCP El Hammam - Reboisement communautaire' },
];

const AvancementForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    pdfcpId: '',
    avancement: [50],
    actionsRealisees: '',
    actionsRetard: '',
    problemes: '',
    commentaires: '',
    dateMiseAJour: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pdfcpId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un PDFCP",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Succès",
      description: "État d'avancement mis à jour",
    });
    
    navigate('/menu');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary pt-6 pb-4 px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">
              État d'avancement
            </h1>
            <p className="text-primary-foreground/70 text-xs">Mise à jour PDFCP</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-5">
        {/* Select PDFCP */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Sélectionner un PDFCP *
          </label>
          <Select 
            value={formData.pdfcpId} 
            onValueChange={(value) => setFormData({ ...formData, pdfcpId: value })}
          >
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="Choisir le PDFCP" />
            </SelectTrigger>
            <SelectContent>
              {pdfcpList.map((pdfcp) => (
                <SelectItem key={pdfcp.id} value={pdfcp.id}>
                  {pdfcp.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Progress */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Avancement global</h3>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
              <TrendingUp size={16} className="text-primary" />
              <span className="text-lg font-bold text-primary">{formData.avancement[0]}%</span>
            </div>
          </div>
          
          <div className="pt-2">
            <Slider
              value={formData.avancement}
              onValueChange={(value) => setFormData({ ...formData, avancement: value })}
              max={100}
              step={5}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Actions Réalisées */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-4">
          <h3 className="font-semibold text-foreground">Détails de l'avancement</h3>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Actions réalisées
            </label>
            <Textarea
              value={formData.actionsRealisees}
              onChange={(e) => setFormData({ ...formData, actionsRealisees: e.target.value })}
              placeholder="Listez les actions accomplies..."
              className="rounded-xl min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Actions en retard
            </label>
            <Textarea
              value={formData.actionsRetard}
              onChange={(e) => setFormData({ ...formData, actionsRetard: e.target.value })}
              placeholder="Listez les actions en retard..."
              className="rounded-xl min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Problèmes rencontrés
            </label>
            <Textarea
              value={formData.problemes}
              onChange={(e) => setFormData({ ...formData, problemes: e.target.value })}
              placeholder="Décrivez les difficultés..."
              className="rounded-xl min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Commentaires ADP
            </label>
            <Textarea
              value={formData.commentaires}
              onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
              placeholder="Vos observations..."
              className="rounded-xl min-h-[80px]"
            />
          </div>
        </div>

        {/* Photo */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Photo terrain (optionnel)
          </label>
          <button
            type="button"
            className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Camera size={28} />
            <span className="text-sm">Prendre une photo</span>
          </button>
        </div>

        {/* Date */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Date de mise à jour
          </label>
          <Input
            type="date"
            value={formData.dateMiseAJour}
            onChange={(e) => setFormData({ ...formData, dateMiseAJour: e.target.value })}
            className="h-11 rounded-xl"
          />
        </div>

        {/* Submit */}
        <Button type="submit" variant="anef" size="xl" className="w-full">
          <Save size={20} />
          Ajouter mise à jour
        </Button>
      </form>

      <BottomNav />
    </div>
  );
};

export default AvancementForm;
