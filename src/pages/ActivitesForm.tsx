import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Camera, MapPin, Users, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import { getCommunesByDpanef } from '@/data/anefData';

// Taxonomie des axes
const activityAxes = [
  { value: 'PDFCP', label: 'PDFCP', icon: '📘' },
  { value: 'ODF', label: 'ODF', icon: '🌿' },
  { value: 'ANIMATION_TERRITORIALE', label: 'Animation territoriale', icon: '🤝' },
] as const;

// Types par axe
const activityTypesByAxis = {
  PDFCP: [
    { value: 'DIAGNOSTIC_PARTICIPATIF', label: 'Diagnostic participatif', icon: '🔍' },
    { value: 'CONCERTATION_VALIDATION', label: 'Concertation / validation', icon: '✅' },
    { value: 'PLANIFICATION_PROGRAMMATION', label: 'Planification / programmation', icon: '🗓️' },
    { value: 'SUIVI_EXECUTION_ACTIONS', label: 'Suivi exécution actions', icon: '🧩' },
    { value: 'SUIVI_CONTRAT_CONVENTION', label: 'Suivi contrat / convention', icon: '📄' },
    { value: 'SUIVI_INDICATEURS_REPORTING', label: 'Indicateurs / reporting', icon: '📊' },
    { value: 'GESTION_BLOCAGE', label: 'Blocage / retard', icon: '⛔' },
    { value: 'GESTION_CONFLIT_OPPOSITION', label: 'Conflit / opposition', icon: '⚠️' },
  ],
  ODF: [
    { value: 'CREATION_STRUCTURATION', label: 'Création / structuration', icon: '🏗️' },
    { value: 'RENFORCEMENT_CAPACITES', label: 'Renforcement capacités', icon: '🎓' },
    { value: 'APPUI_PROJET', label: 'Appui projet', icon: '🧠' },
    { value: 'SUIVI_CONVENTION_PARTENARIAT', label: 'Convention / partenariat', icon: '🤝' },
    { value: 'MOBILISATION_COMMUNICATION', label: 'Mobilisation / communication', icon: '📣' },
    { value: 'SUIVI_ACTIVITE_ECONOMIQUE', label: 'Activité économique', icon: '💼' },
    { value: 'GESTION_CONFLITS_INTERNES', label: 'Conflits internes', icon: '🧯' },
    { value: 'APPUI_ADMINISTRATIF', label: 'Appui administratif', icon: '🗂️' },
  ],
  ANIMATION_TERRITORIALE: [
    { value: 'REUNION_COMMUNAUTAIRE', label: 'Réunion communautaire', icon: '👥' },
    { value: 'REUNION_INSTITUTIONNELLE', label: 'Réunion institutionnelle', icon: '🏛️' },
    { value: 'SENSIBILISATION_COMMUNICATION', label: 'Sensibilisation', icon: '📢' },
    { value: 'MEDIATION_NEGOCIATION', label: 'Médiation / négociation', icon: '🤝' },
    { value: 'MISSION_VISITE_TERRAIN', label: 'Mission / visite terrain', icon: '🚶' },
    { value: 'ACCOMPAGNEMENT_USAGERS', label: 'Accompagnement usagers', icon: '🧑‍🌾' },
    { value: 'COORDINATION_PARTENAIRES', label: 'Coordination partenaires', icon: '🧩' },
    { value: 'ALERTE_TERRAIN', label: 'Alerte terrain', icon: '🚨' },
  ],
} as const;

const publicVise = [
  { value: 'femmes', label: 'Femmes' },
  { value: 'jeunes', label: 'Jeunes' },
  { value: 'usagers', label: 'Usagers' },
  { value: 'odf', label: 'ODF' },
  { value: 'elus', label: 'Élus locaux' },
  { value: 'agriculteurs', label: 'Agriculteurs' },
  { value: 'eleveurs', label: 'Éleveurs' },
];

const participantsProfileOptions = [
  { value: 'USAGERS', label: 'Usagers' },
  { value: 'ELUS', label: 'Élus' },
  { value: 'ODF', label: 'ODF' },
  { value: 'AUTORITES', label: 'Autorités' },
  { value: 'PARTENAIRES', label: 'Partenaires' },
  { value: 'MIXTE', label: 'Mixte' },
];

const ActivitesForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    axis: '' as '' | 'PDFCP' | 'ODF' | 'ANIMATION_TERRITORIALE',
    type: '',
    commune: user?.commune || '',
    gpsLat: '',
    gpsLng: '',
    participants: '',
    participantsProfile: '',
    public: [] as string[],
    summary: '',
    resultats: '',
    date: new Date().toISOString().split('T')[0],
    heure: '09:00',
    duree: '',
    // Détails avancés - PDFCP
    pdfcpId: '',
    phasePdfcp: '',
    progressPercent: '',
    isBlocked: false,
    riskLevel: '',
    // Détails avancés - ODF
    odfId: '',
    maturityLevel: '',
    mainNeed: '',
    engagementLevel: '',
    // Détails avancés - ANIMATION_TERRITORIALE
    theme: '',
    tensionLevel: '',
    projectRisk: '',
    lienPdfcpId: '',
    lienOdfId: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const communes = user?.dpanef ? getCommunesByDpanef(user.dpanef) : [];

  // Types disponibles selon l'axe sélectionné
  const availableTypes = formData.axis ? activityTypesByAxis[formData.axis] : [];

  const handleAxisChange = (axis: typeof formData.axis) => {
    setFormData({
      ...formData,
      axis,
      type: '', // Reset type quand l'axe change
      // Reset les champs spécifiques à l'axe précédent
      pdfcpId: '',
      phasePdfcp: '',
      progressPercent: '',
      isBlocked: false,
      riskLevel: '',
      odfId: '',
      maturityLevel: '',
      mainNeed: '',
      engagementLevel: '',
      theme: '',
      tensionLevel: '',
      projectRisk: '',
      lienPdfcpId: '',
      lienOdfId: '',
    });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            gpsLat: position.coords.latitude.toFixed(6),
            gpsLng: position.coords.longitude.toFixed(6),
          });
          toast({
            title: "Position obtenue",
            description: "Coordonnées GPS enregistrées",
          });
        },
        () => {
          toast({
            title: "Erreur",
            description: "Impossible d'obtenir la position GPS",
            variant: "destructive",
          });
        }
      );
    }
  };

  const togglePublic = (value: string) => {
    const publicList = formData.public.includes(value)
      ? formData.public.filter((p) => p !== value)
      : [...formData.public, value];
    setFormData({ ...formData, public: publicList });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation de base
    if (!formData.axis || !formData.type || !formData.commune || !formData.date || !formData.heure || !formData.summary.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Validation selon l'axe
    if (formData.axis === 'PDFCP' && !formData.pdfcpId) {
      toast({
        title: "Erreur",
        description: "Le champ PDFCP est obligatoire pour les activités PDFCP",
        variant: "destructive",
      });
      return;
    }

    if (formData.axis === 'ODF' && !formData.odfId) {
      toast({
        title: "Erreur",
        description: "Le champ ODF est obligatoire pour les activités ODF",
        variant: "destructive",
      });
      return;
    }

    // Construction du payload
    const payload: Record<string, unknown> = {
      axis: formData.axis,
      type: formData.type,
      commune: formData.commune,
      gpsLat: formData.gpsLat ? parseFloat(formData.gpsLat) : null,
      gpsLng: formData.gpsLng ? parseFloat(formData.gpsLng) : null,
      date: formData.date,
      heure: formData.heure,
      duree: formData.duree ? parseFloat(formData.duree) : null,
      participantsCount: formData.participants ? parseInt(formData.participants, 10) : null,
      participantsProfile: formData.participantsProfile || null,
      summary: formData.summary.trim(),
      resultats: formData.resultats.trim() || null,
      public: formData.public,
    };

    // Champs spécifiques PDFCP
    if (formData.axis === 'PDFCP') {
      payload.pdfcpId = formData.pdfcpId;
      payload.phasePdfcp = formData.phasePdfcp || null;
      payload.progressPercent = formData.progressPercent ? parseInt(formData.progressPercent, 10) : null;
      payload.isBlocked = formData.isBlocked;
      payload.riskLevel = formData.riskLevel || null;
    }

    // Champs spécifiques ODF
    if (formData.axis === 'ODF') {
      payload.odfId = formData.odfId;
      payload.maturityLevel = formData.maturityLevel || null;
      payload.mainNeed = formData.mainNeed || null;
      payload.engagementLevel = formData.engagementLevel || null;
    }

    // Champs spécifiques ANIMATION_TERRITORIALE
    if (formData.axis === 'ANIMATION_TERRITORIALE') {
      payload.theme = formData.theme || null;
      payload.tensionLevel = formData.tensionLevel ? parseInt(formData.tensionLevel, 10) : null;
      payload.projectRisk = formData.projectRisk || null;
      payload.lienPdfcpId = formData.lienPdfcpId || null;
      payload.lienOdfId = formData.lienOdfId || null;
    }

    console.log('Payload activité:', payload);

    toast({
      title: "Succès",
      description: "Activité enregistrée",
    });
    
    navigate('/menu');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-secondary pt-6 pb-4 px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-secondary-foreground/10 text-secondary-foreground hover:bg-secondary-foreground/20 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-secondary-foreground">
              Activités ADP
            </h1>
            <p className="text-secondary-foreground/70 text-xs">Approche participative</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-5">
        {/* Type d'activité - Étape A : Choix de l'axe */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-3">
          <h3 className="font-semibold text-foreground">Axe d'activité *</h3>
          <div className="grid grid-cols-3 gap-2">
            {activityAxes.map((axis) => (
              <button
                key={axis.value}
                type="button"
                onClick={() => handleAxisChange(axis.value)}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  formData.axis === axis.value
                    ? 'bg-secondary text-secondary-foreground ring-2 ring-secondary'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span className="text-2xl">{axis.icon}</span>
                <span className="text-xs text-center">{axis.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type d'activité - Étape B : Choix du type (filtré par axe) */}
        {formData.axis && (
          <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-3">
            <h3 className="font-semibold text-foreground">Type d'activité *</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`p-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    formData.type === type.value
                      ? 'bg-secondary text-secondary-foreground ring-2 ring-secondary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-xs text-left flex-1">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-4">
          <h3 className="font-semibold text-foreground">Localisation</h3>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Commune *</label>
            <Select 
              value={formData.commune} 
              onValueChange={(value) => setFormData({ ...formData, commune: value })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {communes.length > 0 ? communes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                )) : (
                  <SelectItem value={user?.commune || 'default'}>{user?.commune || 'Commune'}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Position GPS</label>
            <Button
              type="button"
              variant="outline"
              onClick={handleGetLocation}
              className="w-full justify-start gap-2"
            >
              <MapPin size={18} />
              {formData.gpsLat ? `${formData.gpsLat}, ${formData.gpsLng}` : 'Obtenir position GPS'}
            </Button>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-4">
          <h3 className="font-semibold text-foreground">Date et durée</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Calendar size={14} className="inline mr-1" />
                Date *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                <Clock size={14} className="inline mr-1" />
                Heure *
              </label>
              <Input
                type="time"
                value={formData.heure}
                onChange={(e) => setFormData({ ...formData, heure: e.target.value })}
                className="h-11 rounded-xl"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Durée (heures)</label>
            <Input
              type="number"
              value={formData.duree}
              onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
              placeholder="Ex: 2"
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        {/* Participants */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-secondary" />
            <h3 className="font-semibold text-foreground">Participants</h3>
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre de participants</label>
            <Input
              type="number"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              placeholder="Ex: 25"
              className="h-11 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Profil des participants</label>
            <Select
              value={formData.participantsProfile}
              onValueChange={(value) => setFormData({ ...formData, participantsProfile: value })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {participantsProfileOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Public visé</label>
            <div className="flex flex-wrap gap-2">
              {publicVise.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePublic(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    formData.public.includes(p.value)
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résumé obligatoire */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Résumé (2 lignes) *
          </label>
          <Textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            placeholder="Résumez l'activité en 2 lignes maximum..."
            className="rounded-xl min-h-[60px]"
            required
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground mt-1">{formData.summary.length}/200</p>
        </div>

        {/* Détails avancés (repliable) */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
            <CollapsibleTrigger className="w-full flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Détails avancés</h3>
              {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 mt-4">
              {/* Résultats détaillés */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Résultats obtenus (détaillés)</label>
                <Textarea
                  value={formData.resultats}
                  onChange={(e) => setFormData({ ...formData, resultats: e.target.value })}
                  placeholder="Décrivez les résultats de l'activité..."
                  className="rounded-xl min-h-[100px]"
                />
              </div>

              {/* Champs spécifiques PDFCP */}
              {formData.axis === 'PDFCP' && (
                <div className="space-y-4 pt-2 border-t">
                  <h4 className="text-sm font-medium text-foreground">Détails PDFCP</h4>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">PDFCP *</label>
                    <Input
                      value={formData.pdfcpId}
                      onChange={(e) => setFormData({ ...formData, pdfcpId: e.target.value })}
                      placeholder="ID ou nom du PDFCP"
                      className="h-11 rounded-xl"
                      required={formData.axis === 'PDFCP'}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Phase PDFCP</label>
                    <Select
                      value={formData.phasePdfcp}
                      onValueChange={(value) => setFormData({ ...formData, phasePdfcp: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                        <SelectItem value="Programme">Programme</SelectItem>
                        <SelectItem value="Validation">Validation</SelectItem>
                        <SelectItem value="Execution">Exécution</SelectItem>
                        <SelectItem value="Suivi">Suivi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Progression (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.progressPercent}
                      onChange={(e) => setFormData({ ...formData, progressPercent: e.target.value })}
                      placeholder="0-100"
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isBlocked" className="text-xs font-medium text-muted-foreground">
                      Activité bloquée
                    </Label>
                    <Switch
                      id="isBlocked"
                      checked={formData.isBlocked}
                      onCheckedChange={(checked) => setFormData({ ...formData, isBlocked: checked })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Niveau de risque</label>
                    <Select
                      value={formData.riskLevel}
                      onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faible">Faible</SelectItem>
                        <SelectItem value="moyen">Moyen</SelectItem>
                        <SelectItem value="eleve">Élevé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Champs spécifiques ODF */}
              {formData.axis === 'ODF' && (
                <div className="space-y-4 pt-2 border-t">
                  <h4 className="text-sm font-medium text-foreground">Détails ODF</h4>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">ODF *</label>
                    <Input
                      value={formData.odfId}
                      onChange={(e) => setFormData({ ...formData, odfId: e.target.value })}
                      placeholder="ID ou nom de l'ODF"
                      className="h-11 rounded-xl"
                      required={formData.axis === 'ODF'}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Niveau de maturité</label>
                    <Select
                      value={formData.maturityLevel}
                      onValueChange={(value) => setFormData({ ...formData, maturityLevel: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Naissante</SelectItem>
                        <SelectItem value="2">2 - Structurée</SelectItem>
                        <SelectItem value="3">3 - Active</SelectItem>
                        <SelectItem value="4">4 - Performante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Besoins principaux</label>
                    <Select
                      value={formData.mainNeed}
                      onValueChange={(value) => setFormData({ ...formData, mainNeed: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gouv">Gouvernance</SelectItem>
                        <SelectItem value="projet">Projet</SelectItem>
                        <SelectItem value="financement">Financement</SelectItem>
                        <SelectItem value="technique">Technique</SelectItem>
                        <SelectItem value="conflit">Conflit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Niveau d'engagement</label>
                    <Select
                      value={formData.engagementLevel}
                      onValueChange={(value) => setFormData({ ...formData, engagementLevel: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faible">Faible</SelectItem>
                        <SelectItem value="moyen">Moyen</SelectItem>
                        <SelectItem value="fort">Fort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Champs spécifiques ANIMATION_TERRITORIALE */}
              {formData.axis === 'ANIMATION_TERRITORIALE' && (
                <div className="space-y-4 pt-2 border-t">
                  <h4 className="text-sm font-medium text-foreground">Détails Animation territoriale</h4>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Thème</label>
                    <Select
                      value={formData.theme}
                      onValueChange={(value) => setFormData({ ...formData, theme: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reboisement">Reboisement</SelectItem>
                        <SelectItem value="mise_en_defens">Mise en défens</SelectItem>
                        <SelectItem value="compensation">Compensation</SelectItem>
                        <SelectItem value="PFNL">PFNL</SelectItem>
                        <SelectItem value="pastoralisme">Pastoralisme</SelectItem>
                        <SelectItem value="eau_sol">Eau / Sol</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Niveau de tension</label>
                    <Select
                      value={formData.tensionLevel}
                      onValueChange={(value) => setFormData({ ...formData, tensionLevel: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Aucune</SelectItem>
                        <SelectItem value="1">1 - Faible</SelectItem>
                        <SelectItem value="2">2 - Moyenne</SelectItem>
                        <SelectItem value="3">3 - Élevée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Risque projet</label>
                    <Select
                      value={formData.projectRisk}
                      onValueChange={(value) => setFormData({ ...formData, projectRisk: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faible">Faible</SelectItem>
                        <SelectItem value="moyen">Moyen</SelectItem>
                        <SelectItem value="eleve">Élevé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Lien PDFCP (optionnel)</label>
                    <Input
                      value={formData.lienPdfcpId}
                      onChange={(e) => setFormData({ ...formData, lienPdfcpId: e.target.value })}
                      placeholder="ID PDFCP"
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Lien ODF (optionnel)</label>
                    <Input
                      value={formData.lienOdfId}
                      onChange={(e) => setFormData({ ...formData, lienOdfId: e.target.value })}
                      placeholder="ID ODF"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Photos */}
        <div className="bg-card rounded-2xl p-4 shadow-soft border border-border/50">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Photos</label>
          <button
            type="button"
            className="w-full h-28 border-2 border-dashed border-secondary/30 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-secondary hover:text-secondary transition-colors"
          >
            <Camera size={28} />
            <span className="text-sm">Ajouter des photos</span>
          </button>
        </div>

        {/* Submit */}
        <Button type="submit" variant="secondary" size="xl" className="w-full">
          <Save size={20} />
          Enregistrer l'activité
        </Button>
      </form>

      <BottomNav />
    </div>
  );
};

export default ActivitesForm;
