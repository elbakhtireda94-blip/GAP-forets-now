import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, CheckCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useSync } from '@/contexts/SyncContext';
import { useDraft } from '@/hooks/useDraft';
import { useToast } from '@/hooks/use-toast';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';

type EntryType = 'activity' | 'conflict';

interface EntryFormData {
  entryType: EntryType;
  // Activity fields
  activityType: string;
  date: string;
  description: string;
  participants: string;
  issues: string;
  resolution: string;
  // Conflict fields
  conflictNature: string;
  conflictDescription: string;
  severity: string;
}

const activityTypes = [
  'Sensibilisation',
  'Réunion communautaire',
  'Formation',
  'Visite terrain',
  'Médiation',
  'Suivi PDFCP',
  'Autre',
];

const conflictNatures = [
  'Opposition à la mise en défens',
  'Délimitation foncière',
  'Accès aux ressources',
  'Utilisation des terres',
  'Autre',
];

const severityLevels = [
  { value: 'Faible', label: 'Faible', color: 'bg-green-100 text-green-800' },
  { value: 'Moyenne', label: 'Moyenne', color: 'bg-amber-100 text-amber-800' },
  { value: 'Élevée', label: 'Élevée', color: 'bg-red-100 text-red-800' },
];

const NouvelleSaisie: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    getRegionName, 
    getDranefName, 
    getDpanefName, 
    getCommuneName,
    addActivity,
    addConflict,
    getAdpById,
    getAdps,
  } = useDatabase();
  const { addPendingEntry, isOnline } = useSync();
  const { toast } = useToast();

  const initialFormData: EntryFormData = {
    entryType: 'activity',
    activityType: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    participants: '',
    issues: '',
    resolution: '',
    conflictNature: '',
    conflictDescription: '',
    severity: 'Moyenne',
  };

  const { value: formData, setValue: setFormData, hasDraft, clearDraft } = useDraft({
    key: 'nouvelle_saisie',
    initialValue: initialFormData,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Get user's ADP info
  const adps = getAdps();
  const userAdp = adps.find(a => a.email.toLowerCase() === user?.email.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (formData.entryType === 'activity') {
        const activityData = {
          type: formData.activityType,
          date: formData.date,
          adp_id: userAdp?.id || '',
          commune_id: userAdp?.commune_id || user?.commune || '',
          description: formData.description,
          participants: parseInt(formData.participants) || 0,
          issues: formData.issues,
          resolution: formData.resolution,
        };

        if (isOnline) {
          addActivity(activityData);
        } else {
          addPendingEntry('activity', activityData);
        }
      } else {
        const conflictData = {
          commune_id: userAdp?.commune_id || user?.commune || '',
          nature: formData.conflictNature,
          description: formData.conflictDescription,
          status: 'En cours' as const,
          severity: formData.severity as 'Faible' | 'Moyenne' | 'Élevée',
          handled_by: userAdp?.id || '',
          date_reported: formData.date,
          resolution_notes: '',
        };

        if (isOnline) {
          addConflict(conflictData);
        } else {
          addPendingEntry('conflict', conflictData);
        }
      }

      clearDraft();
      setSaved(true);

      toast({
        title: isOnline ? 'Saisie enregistrée' : 'Saisie sauvegardée localement',
        description: isOnline 
          ? 'Les données ont été synchronisées avec succès.'
          : 'Les données seront synchronisées une fois connecté.',
      });

      setTimeout(() => {
        navigate('/mes-saisies');
      }, 1500);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'enregistrement.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <div className="bg-primary/10 rounded-full p-4 inline-block mb-4">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Saisie enregistrée</h2>
          <p className="text-muted-foreground">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader 
        title="Nouvelle Saisie" 
        subtitle="Activité ou Opposition"
        showBack
        backPath="/menu"
      />

      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Mode hors ligne - Les données seront synchronisées plus tard
          </span>
        </div>
      )}

      {/* Draft indicator */}
      {hasDraft && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ✓ Brouillon sauvegardé automatiquement
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Pre-filled location info */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Affectation</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">DRANEF:</span>
              <p className="font-medium truncate">{getDranefName(user?.dranef || '')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">DPANEF:</span>
              <p className="font-medium truncate">{getDpanefName(user?.dpanef || '')}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Commune:</span>
              <p className="font-medium">{getCommuneName(user?.commune || '')}</p>
            </div>
          </div>
        </div>

        {/* Entry type selector */}
        <div className="space-y-2">
          <Label>Type de saisie</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={formData.entryType === 'activity' ? 'default' : 'outline'}
              className="h-12"
              onClick={() => setFormData({ ...formData, entryType: 'activity' })}
            >
              Activité
            </Button>
            <Button
              type="button"
              variant={formData.entryType === 'conflict' ? 'default' : 'outline'}
              className="h-12"
              onClick={() => setFormData({ ...formData, entryType: 'conflict' })}
            >
              Opposition
            </Button>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        {formData.entryType === 'activity' ? (
          <>
            {/* Activity Type */}
            <div className="space-y-2">
              <Label>Type d'activité</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) => setFormData({ ...formData, activityType: value })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {activityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez l'activité réalisée..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label htmlFor="participants">Nombre de participants</Label>
              <Input
                id="participants"
                type="number"
                min="0"
                placeholder="0"
                value={formData.participants}
                onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              />
            </div>

            {/* Issues */}
            <div className="space-y-2">
              <Label htmlFor="issues">Difficultés rencontrées</Label>
              <Textarea
                id="issues"
                placeholder="Décrivez les difficultés s'il y en a..."
                value={formData.issues}
                onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                rows={2}
              />
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <Label htmlFor="resolution">Actions prises</Label>
              <Textarea
                id="resolution"
                placeholder="Quelles actions ont été prises..."
                value={formData.resolution}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                rows={2}
              />
            </div>
          </>
        ) : (
          <>
            {/* Conflict Nature */}
            <div className="space-y-2">
              <Label>Nature de l'opposition</Label>
              <Select
                value={formData.conflictNature}
                onValueChange={(value) => setFormData({ ...formData, conflictNature: value })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Sélectionner la nature" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {conflictNatures.map((nature) => (
                    <SelectItem key={nature} value={nature}>
                      {nature}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <Label>Sévérité</Label>
              <div className="grid grid-cols-3 gap-2">
                {severityLevels.map((level) => (
                  <Button
                    key={level.value}
                    type="button"
                    variant={formData.severity === level.value ? 'default' : 'outline'}
                    className="h-10"
                    onClick={() => setFormData({ ...formData, severity: level.value })}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conflict Description */}
            <div className="space-y-2">
              <Label htmlFor="conflictDescription">Description détaillée</Label>
              <Textarea
                id="conflictDescription"
                placeholder="Décrivez l'opposition en détail..."
                value={formData.conflictDescription}
                onChange={(e) => setFormData({ ...formData, conflictDescription: e.target.value })}
                rows={4}
                required
              />
            </div>
          </>
        )}

        {/* Submit button */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full h-12"
            disabled={isSaving}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Enregistrement...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Enregistrer
              </div>
            )}
          </Button>
        </div>
      </form>

      <BottomNav />
    </div>
  );
};

export default NouvelleSaisie;
