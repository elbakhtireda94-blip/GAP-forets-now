import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  X, Calendar, Tag, MapPin, Link2, Loader2, Users, Clock, 
  FileText, ChevronDown, ChevronUp, AlertTriangle, Building2,
  CheckCircle2, Target, Flag, Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  CahierJournalEntry, 
  JournalAttachment, 
  JournalCategory, 
  journalCategoryLabels,
  ValidationStatus,
  Priority,
  OrganisationType,
  organisationLabels,
} from '@/data/cahierJournalTypes';
import { JournalAttachmentUploader } from './JournalAttachmentUploader';
import { VoiceRecorder } from './VoiceRecorder';
import { TranscriptionPanel } from './TranscriptionPanel';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { JournalFormData } from '@/hooks/useCahierJournal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface JournalEntryFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: JournalFormData) => Promise<boolean>;
  initialData?: CahierJournalEntry | null;
  loading?: boolean;
}

const categoryOptions: JournalCategory[] = [
  'animation_territoriale',
  'mediation',
  'suivi_pdfcp',
  'organisation_usagers',
  'sensibilisation',
  'suivi_chantier',
  'partenariats',
  'activite_admin',
  'reunion',
  'animation',
  'diagnostic',
  'autre',
];

const priorityOptions: Priority[] = ['Faible', 'Moyenne', 'Élevée'];
const statusOptions: ValidationStatus[] = ['Brouillon', 'Validé ADP', 'Transmis hiérarchie'];
const organisationTypes: OrganisationType[] = ['ODF', 'Coopérative', 'Association', 'AGS'];

const emptyFormData: JournalFormData = {
  entry_date: format(new Date(), 'yyyy-MM-dd'),
  title: '',
  description: '',
  category: null,
  location_text: null,
  latitude: null,
  longitude: null,
  pdfcp_id: null,
  perimetre_label: null,
  site_label: null,
  commune_id: null,
  participants_count: null,
  organisations_concernees: [],
  temps_passe_min: null,
  priorite: 'Moyenne',
  statut_validation: 'Brouillon',
  resultats_obtenus: null,
  decisions_prises: null,
  prochaines_etapes: null,
  contraintes_rencontrees: null,
  besoin_appui_hierarchique: false,
  justification_appui: null,
  attachments: [],
};

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const { user, applyScopeFilter } = useAuth();
  const { getPdfcs } = useDatabase();
  
  const [formData, setFormData] = useState<JournalFormData>(emptyFormData);
  const [expandedSections, setExpandedSections] = useState({
    identification: true,
    localisation: true,
    description: true,
    resultats: false,
    justificatifs: false,
  });
  const [submitting, setSubmitting] = useState(false);
  // Shared audio state (persists across panel toggles)
  const [audioBlobForTranscription, setAudioBlobForTranscription] = useState<Blob | null>(null);
  const [audioUrlForTranscription, setAudioUrlForTranscription] = useState<string | null>(null);
  const [showTranscriptionPanel, setShowTranscriptionPanel] = useState(false);

  const pdfcps = applyScopeFilter(getPdfcs(), 'pdfcp');

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          entry_date: initialData.entry_date,
          title: initialData.title,
          description: initialData.description,
          category: initialData.category,
          location_text: initialData.location_text,
          latitude: initialData.latitude,
          longitude: initialData.longitude,
          pdfcp_id: initialData.pdfcp_id,
          perimetre_label: initialData.perimetre_label,
          site_label: initialData.site_label,
          commune_id: initialData.commune_id,
          participants_count: initialData.participants_count,
          organisations_concernees: initialData.organisations_concernees || [],
          temps_passe_min: initialData.temps_passe_min,
          priorite: initialData.priorite || 'Moyenne',
          statut_validation: initialData.statut_validation || 'Brouillon',
          resultats_obtenus: initialData.resultats_obtenus,
          decisions_prises: initialData.decisions_prises,
          prochaines_etapes: initialData.prochaines_etapes,
          contraintes_rencontrees: initialData.contraintes_rencontrees,
          besoin_appui_hierarchique: initialData.besoin_appui_hierarchique || false,
          justification_appui: initialData.justification_appui,
          attachments: initialData.attachments || [],
        });
        // Expand results section if editing
        setExpandedSections(prev => ({ ...prev, resultats: true }));
      } else {
        setFormData(emptyFormData);
        setExpandedSections({
          identification: true,
          localisation: true,
          description: true,
          resultats: false,
          justificatifs: false,
        });
        // Don't reset audio state when opening form (preserve recording)
        // Only reset when user explicitly clicks "Nouveau" in VoiceRecorder
      }
    }
  }, [open, initialData]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlForTranscription) {
        URL.revokeObjectURL(audioUrlForTranscription);
      }
    };
  }, [audioUrlForTranscription]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleOrganisationToggle = (org: OrganisationType) => {
    setFormData(prev => ({
      ...prev,
      organisations_concernees: prev.organisations_concernees.includes(org)
        ? prev.organisations_concernees.filter(o => o !== org)
        : [...prev.organisations_concernees, org],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) return;

    // Validation: if "Transmis hiérarchie", require results
    if (formData.statut_validation === 'Transmis hiérarchie' && !formData.resultats_obtenus?.trim()) {
      alert('Pour transmettre à la hiérarchie, veuillez renseigner les résultats obtenus.');
      return;
    }

    // Validation: if besoin_appui, require justification
    if (formData.besoin_appui_hierarchique && !formData.justification_appui?.trim()) {
      alert('Veuillez justifier le besoin d\'appui hiérarchique.');
      return;
    }

    setSubmitting(true);
    const success = await onSubmit(formData);
    setSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const isValid = formData.title.trim() && formData.description.trim();

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    section 
  }: { 
    title: string; 
    icon: React.ElementType; 
    section: keyof typeof expandedSections;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full py-2 text-left"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {initialData ? 'Modifier l\'entrée' : 'Nouvelle entrée du journal'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-6">
          {/* Section A: Identification */}
          <Card className="border-border/50">
            <CardHeader className="pb-0 pt-3 px-4">
              <SectionHeader title="Identification de l'activité" icon={Tag} section="identification" />
            </CardHeader>
            {expandedSections.identification && (
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="entry_date" className="text-xs">Date *</Label>
                    <Input
                      id="entry_date"
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="priorite" className="text-xs">Priorité</Label>
                    <Select
                      value={formData.priorite}
                      onValueChange={(value) => setFormData({ ...formData, priorite: value as Priority })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {priorityOptions.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Réunion de concertation avec l'ODF d'Aguelmam Azegza"
                    required
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="category" className="text-xs">Catégorie *</Label>
                    <Select
                      value={formData.category || 'none'}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        category: value === 'none' ? null : value as JournalCategory 
                      })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50 max-h-[200px]">
                        <SelectItem value="none">Aucune</SelectItem>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {journalCategoryLabels[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="statut" className="text-xs">Statut</Label>
                    <Select
                      value={formData.statut_validation}
                      onValueChange={(value) => setFormData({ ...formData, statut_validation: value as ValidationStatus })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section B: Localisation */}
          <Card className="border-border/50">
            <CardHeader className="pb-0 pt-3 px-4">
              <SectionHeader title="Localisation & rattachement" icon={MapPin} section="localisation" />
            </CardHeader>
            {expandedSections.localisation && (
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
                <div className="space-y-1">
                  <Label htmlFor="location_text" className="text-xs">Lieu</Label>
                  <Input
                    id="location_text"
                    value={formData.location_text || ''}
                    onChange={(e) => setFormData({ ...formData, location_text: e.target.value || null })}
                    placeholder="Ex: Douar Ait Brahim, forêt de Tazekka..."
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="perimetre" className="text-xs">Périmètre</Label>
                    <Input
                      id="perimetre"
                      value={formData.perimetre_label || ''}
                      onChange={(e) => setFormData({ ...formData, perimetre_label: e.target.value || null })}
                      placeholder="Périmètre..."
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="site" className="text-xs">Site</Label>
                    <Input
                      id="site"
                      value={formData.site_label || ''}
                      onChange={(e) => setFormData({ ...formData, site_label: e.target.value || null })}
                      placeholder="Site..."
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Lier à un PDFCP
                  </Label>
                  <Select
                    value={formData.pdfcp_id || 'none'}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      pdfcp_id: value === 'none' ? null : value 
                    })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Aucun PDFCP" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="none">Aucun PDFCP</SelectItem>
                      {pdfcps.map((pdfcp) => (
                        <SelectItem key={pdfcp.id} value={pdfcp.id}>
                          {pdfcp.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section C: Description */}
          <Card className="border-border/50">
            <CardHeader className="pb-0 pt-3 px-4">
              <SectionHeader title="Description professionnelle" icon={FileText} section="description" />
            </CardHeader>
            {expandedSections.description && (
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
                {/* Voice Recorder */}
                {user && user.auth_user_id && (
                  <VoiceRecorder
                    userId={user.auth_user_id}
                    onTranscriptionComplete={(text) => {
                      setFormData(prev => ({
                        ...prev,
                        description: prev.description
                          ? `${prev.description}\n\n${text}`
                          : text,
                      }));
                    }}
                    onAudioAttachment={(attachment) => {
                      setFormData(prev => ({
                        ...prev,
                        attachments: [...prev.attachments, attachment],
                      }));
                    }}
                    onAudioReady={(blob, url) => {
                      // Store audio blob and URL for intelligent transcription
                      setAudioBlobForTranscription(blob);
                      if (url) {
                        // Revoke previous URL if exists
                        if (audioUrlForTranscription) {
                          URL.revokeObjectURL(audioUrlForTranscription);
                        }
                        setAudioUrlForTranscription(url);
                      }
                      setShowTranscriptionPanel(true);
                    }}
                    onReset={() => {
                      // Reset audio state when user clicks "Nouveau"
                      if (audioUrlForTranscription) {
                        URL.revokeObjectURL(audioUrlForTranscription);
                      }
                      setAudioBlobForTranscription(null);
                      setAudioUrlForTranscription(null);
                      setShowTranscriptionPanel(false);
                    }}
                  />
                )}

                {/* Intelligent Transcription Panel */}
                {(showTranscriptionPanel || audioBlobForTranscription || audioUrlForTranscription) && (
                  <TranscriptionPanel
                    audioBlob={audioBlobForTranscription}
                    audioUrl={audioUrlForTranscription}
                    metadata={{
                      commune: formData.commune_id || undefined,
                      axis: formData.category || undefined,
                      type: formData.category || undefined,
                    }}
                    onInsertText={(text) => {
                      setFormData(prev => ({
                        ...prev,
                        description: prev.description
                          ? `${prev.description}\n\n${text}`
                          : text,
                      }));
                    }}
                    onClose={() => {
                      // Only hide panel, don't reset audio state
                      setShowTranscriptionPanel(false);
                    }}
                  />
                )}

                <div className="space-y-1">
                  <Label htmlFor="description" className="text-xs">Description détaillée *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre activité : quoi, pourquoi, avec qui..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="participants" className="text-xs flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Participants
                    </Label>
                    <Input
                      id="participants"
                      type="number"
                      min={0}
                      value={formData.participants_count ?? ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        participants_count: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="Nombre"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="temps" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Temps passé (min)
                    </Label>
                    <Input
                      id="temps"
                      type="number"
                      min={0}
                      step={15}
                      value={formData.temps_passe_min ?? ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        temps_passe_min: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="Minutes"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Organisations concernées
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {organisationTypes.map((org) => (
                      <label 
                        key={org} 
                        className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      >
                        <Checkbox
                          checked={formData.organisations_concernees.includes(org)}
                          onCheckedChange={() => handleOrganisationToggle(org)}
                        />
                        <span className="text-xs">{org}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section D: Résultats & Suivi */}
          <Card className="border-border/50">
            <CardHeader className="pb-0 pt-3 px-4">
              <SectionHeader title="Résultats & suivi" icon={Target} section="resultats" />
            </CardHeader>
            {expandedSections.resultats && (
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
                <div className="space-y-1">
                  <Label htmlFor="resultats" className="text-xs">Résultats obtenus</Label>
                  <Textarea
                    id="resultats"
                    value={formData.resultats_obtenus || ''}
                    onChange={(e) => setFormData({ ...formData, resultats_obtenus: e.target.value || null })}
                    placeholder="Faits concrets, décisions prises..."
                    rows={3}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="decisions" className="text-xs">Décisions prises</Label>
                  <Textarea
                    id="decisions"
                    value={formData.decisions_prises || ''}
                    onChange={(e) => setFormData({ ...formData, decisions_prises: e.target.value || null })}
                    placeholder="Décisions actées lors de l'activité..."
                    rows={2}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="etapes" className="text-xs">Prochaines étapes</Label>
                  <Textarea
                    id="etapes"
                    value={formData.prochaines_etapes || ''}
                    onChange={(e) => setFormData({ ...formData, prochaines_etapes: e.target.value || null })}
                    placeholder="Actions de suivi prévues..."
                    rows={2}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contraintes" className="text-xs">Contraintes rencontrées</Label>
                  <Textarea
                    id="contraintes"
                    value={formData.contraintes_rencontrees || ''}
                    onChange={(e) => setFormData({ ...formData, contraintes_rencontrees: e.target.value || null })}
                    placeholder="Difficultés, blocages..."
                    rows={2}
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.besoin_appui_hierarchique}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        besoin_appui_hierarchique: !!checked,
                        justification_appui: checked ? formData.justification_appui : null,
                      })}
                    />
                    <span className="text-sm font-medium text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Besoin d'appui hiérarchique
                    </span>
                  </label>
                  {formData.besoin_appui_hierarchique && (
                    <div className="space-y-1">
                      <Label htmlFor="justification" className="text-xs text-amber-700">
                        Justification *
                      </Label>
                      <Textarea
                        id="justification"
                        value={formData.justification_appui || ''}
                        onChange={(e) => setFormData({ ...formData, justification_appui: e.target.value || null })}
                        placeholder="Expliquez pourquoi un appui est nécessaire..."
                        rows={2}
                        className="bg-white"
                        required={formData.besoin_appui_hierarchique}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section E: Pièces jointes */}
          <Card className="border-border/50">
            <CardHeader className="pb-0 pt-3 px-4">
              <SectionHeader title="Pièces jointes" icon={FileText} section="justificatifs" />
            </CardHeader>
            {expandedSections.justificatifs && (
              <CardContent className="px-4 pt-2 pb-4">
                {user && (
                  <JournalAttachmentUploader
                    userId={user.id}
                    attachments={formData.attachments}
                    onChange={(attachments) => setFormData({ ...formData, attachments })}
                  />
                )}
              </CardContent>
            )}
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="anef"
              className="flex-1"
              disabled={!isValid || submitting || loading}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {initialData ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default JournalEntryForm;
