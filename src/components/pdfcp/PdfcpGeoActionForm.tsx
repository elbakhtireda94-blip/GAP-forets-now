/**
 * Formulaire d'ajout/modification d'une action cartographique PDFCP
 * Exige la sélection d'une action prévue (planned_action_id) obligatoire
 */

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { MapPin, AlertCircle, Eye, Save, X, Loader2, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  PdfcpActionGeoRow,
  PlannedActionWithProgress,
  getGeoConfig,
  LAMBERT_ZONE_LABELS,
} from '@/hooks/usePdfcpActionsGeo';
import {
  parseLambertXY,
  convertPointsToWGS84,
  buildGeoJSON,
  calculateCentroid,
  validateGeometry,
  haversineDistance,
  LambertZone,
  WGS84Point,
} from '@/lib/lambert';

const PdfcpMapViewer = lazy(() => import('./PdfcpMapViewer'));

const MapLoadingFallback = () => (
  <div className="h-[350px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
    <div className="text-center text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      <p className="text-sm">Chargement de la carte...</p>
    </div>
  </div>
);

type GeomType = 'Point' | 'Polygon' | 'LineString';

interface PdfcpGeoActionFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<PdfcpActionGeoRow, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => Promise<any>;
  pdfcpId: string;
  plannedActions: PlannedActionWithProgress[];
  editAction?: PdfcpActionGeoRow;
  preselectedPlannedId?: string;
  checkOvershoot: (plannedActionId: string, value: number, excludeGeoId?: string) => { exceeds: boolean; warning: boolean; message: string };
}

const PdfcpGeoActionForm: React.FC<PdfcpGeoActionFormProps> = ({
  open,
  onClose,
  onSave,
  pdfcpId,
  plannedActions,
  editAction,
  preselectedPlannedId,
  checkOvershoot,
}) => {
  // Form state
  const [plannedActionId, setPlannedActionId] = useState('');
  const [geomType, setGeomType] = useState<GeomType>('Point');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [surfaceRealisee, setSurfaceRealisee] = useState('');
  const [longueurKm, setLongueurKm] = useState<number | null>(null);
  const [lambertZone, setLambertZone] = useState('');
  const [coordsText, setCoordsText] = useState('');
  const [dateRealisation, setDateRealisation] = useState('');
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewGeometry, setPreviewGeometry] = useState<GeoJSON.Geometry | null>(null);
  const [previewCentroid, setPreviewCentroid] = useState<{ lat: number; lng: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [overshootResult, setOvershootResult] = useState<{ exceeds: boolean; warning: boolean; message: string } | null>(null);

  // Selected planned action details
  const selectedPlanned = useMemo(
    () => plannedActions.find(pa => pa.id === plannedActionId),
    [plannedActions, plannedActionId]
  );

  // Initialize form
  useEffect(() => {
    if (!open) return;
    if (editAction) {
      setPlannedActionId(editAction.planned_action_id);
      setGeomType(editAction.geom_type as GeomType);
      setTitre(editAction.titre);
      setDescription(editAction.description || '');
      setSurfaceRealisee(editAction.surface_realisee_ha?.toString() || '');
      setLongueurKm(editAction.longueur_realisee_km);
      setLambertZone(editAction.lambert_zone);
      setCoordsText(editAction.coords_text_lambert);
      setDateRealisation(editAction.date_realisation || '');
      setObservations(editAction.observations || '');
      setShowPreview(false);
      setPreviewGeometry(null);
      setPreviewCentroid(null);
    } else {
      resetForm();
      if (preselectedPlannedId) {
        setPlannedActionId(preselectedPlannedId);
        const pa = plannedActions.find(p => p.id === preselectedPlannedId);
        if (pa) {
          const cfg = getGeoConfig(pa.action_key);
          setGeomType(cfg.suggestedGeom);
        }
      }
    }
    setErrors([]);
    setOvershootResult(null);
  }, [open, editAction, preselectedPlannedId, plannedActions]);

  const resetForm = () => {
    setPlannedActionId('');
    setGeomType('Point');
    setTitre('');
    setDescription('');
    setSurfaceRealisee('');
    setLongueurKm(null);
    setLambertZone('');
    setCoordsText('');
    setDateRealisation('');
    setObservations('');
    setShowPreview(false);
    setPreviewGeometry(null);
    setPreviewCentroid(null);
    setOvershootResult(null);
  };

  // When planned action changes, auto-fill geom type
  const handlePlannedActionChange = (id: string) => {
    setPlannedActionId(id);
    const pa = plannedActions.find(p => p.id === id);
    if (pa) {
      const cfg = getGeoConfig(pa.action_key);
      setGeomType(cfg.suggestedGeom);
      if (!titre) {
        setTitre(pa.action_label || pa.action_key);
      }
    }
    setOvershootResult(null);
  };

  // Validate & preview
  const handlePreview = () => {
    const newErrors: string[] = [];
    if (!plannedActionId) newErrors.push("Sélectionnez une action prévue");
    if (!titre.trim()) newErrors.push("Le titre est obligatoire");
    if (!lambertZone) newErrors.push("Zone Lambert obligatoire");
    if (!coordsText.trim()) newErrors.push("Les coordonnées Lambert sont obligatoires");

    if (newErrors.length > 0) { setErrors(newErrors); return; }

    const parseResult = parseLambertXY(coordsText);
    if (!parseResult.success) {
      setErrors(parseResult.errors.map(e => `Coordonnées invalides: ${e}`));
      return;
    }

    const validation = validateGeometry(parseResult.points, geomType);
    if (!validation.valid) { setErrors([validation.error!]); return; }

    const wgs84Points = convertPointsToWGS84(parseResult.points, lambertZone as LambertZone);
    if (wgs84Points.length === 0) { setErrors(['Conversion géographique impossible']); return; }

    const geometry = buildGeoJSON(wgs84Points, geomType);
    if (!geometry) { setErrors(['Impossible de construire la géométrie']); return; }

    const centroid = calculateCentroid(wgs84Points);

    if (geomType === 'LineString' && wgs84Points.length === 2) {
      const len = haversineDistance(wgs84Points[0], wgs84Points[1]);
      setLongueurKm(Math.round(len * 100) / 100);
    }

    setPreviewGeometry(geometry);
    setPreviewCentroid({ lat: centroid.lat, lng: centroid.lng });
    setErrors([]);
    setShowPreview(true);

    // Check overshoot
    const value = geomType === 'LineString'
      ? (longueurKm || 0)
      : (parseFloat(surfaceRealisee) || 0);
    if (plannedActionId && value > 0) {
      const result = checkOvershoot(plannedActionId, value, editAction?.id);
      setOvershootResult(result);
    }
  };

  // Save
  const handleSave = async () => {
    if (!previewGeometry || !previewCentroid || !plannedActionId) {
      setErrors(["Veuillez prévisualiser avant d'enregistrer"]);
      return;
    }

    if (overshootResult?.exceeds && !editAction) {
      setErrors(["Le cumul dépasse la tolérance autorisée. Seul un ADMIN peut forcer cette action."]);
      return;
    }

    setIsSaving(true);
    try {
      const actionType = selectedPlanned?.action_key || '';
      await onSave({
        pdfcp_id: pdfcpId,
        planned_action_id: plannedActionId,
        action_type: actionType,
        titre: titre.trim(),
        description: description.trim() || null,
        surface_realisee_ha: geomType === 'Polygon' && surfaceRealisee ? parseFloat(surfaceRealisee) : null,
        longueur_realisee_km: geomType === 'LineString' && longueurKm ? longueurKm : null,
        coords_text_lambert: coordsText,
        lambert_zone: lambertZone,
        geom_type: geomType,
        geometry: previewGeometry as any,
        centroid_lat: previewCentroid.lat,
        centroid_lng: previewCentroid.lng,
        date_realisation: dateRealisation || null,
        statut: 'planifie',
        observations: observations.trim() || null,
        preuves: [],
      });
      resetForm();
      onClose();
    } catch {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  // Preview action for map
  const previewMapAction: PdfcpActionGeoRow | null = useMemo(() => {
    if (!previewGeometry || !previewCentroid) return null;
    return {
      id: 'preview',
      pdfcp_id: pdfcpId,
      planned_action_id: plannedActionId,
      action_type: selectedPlanned?.action_key || '',
      titre: titre || 'Prévisualisation',
      description: null,
      surface_realisee_ha: parseFloat(surfaceRealisee) || null,
      longueur_realisee_km: longueurKm,
      coords_text_lambert: coordsText,
      lambert_zone: lambertZone,
      geom_type: geomType,
      geometry: previewGeometry,
      centroid_lat: previewCentroid.lat,
      centroid_lng: previewCentroid.lng,
      date_realisation: null,
      statut: 'planifie',
      observations: null,
      preuves: [],
      created_at: new Date().toISOString(),
      created_by: null,
      updated_at: new Date().toISOString(),
      updated_by: null,
    };
  }, [previewGeometry, previewCentroid, pdfcpId, plannedActionId, selectedPlanned, titre, surfaceRealisee, longueurKm, coordsText, lambertZone, geomType]);

  // Format planned action label for dropdown
  const formatPlannedLabel = (pa: PlannedActionWithProgress) => {
    const cfg = getGeoConfig(pa.action_key);
    const physique = pa.physique || 0;
    return `${cfg.icon} [${pa.year}] ${pa.action_label || pa.action_key} — Prévu: ${physique} ${pa.unite} / Réalisé: ${pa.cumul_realise.toFixed(1)} / Reste: ${pa.reste.toFixed(1)}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {editAction ? "Modifier l'action cartographique" : 'Nouvelle action cartographique'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            {/* 1. Planned action (mandatory) */}
            <div>
              <Label htmlFor="planned-action" className="font-semibold">Action prévue (PDFCP) *</Label>
              {plannedActions.length === 0 ? (
                <Alert className="mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Aucune action prévue disponible. Ajoutez d'abord des actions dans le Plan concerté (Base centrale MySQL).
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={plannedActionId} onValueChange={handlePlannedActionChange}>
                  <SelectTrigger id="planned-action">
                    <SelectValue placeholder="Sélectionner l'action prévue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plannedActions.map(pa => (
                      <SelectItem key={pa.id} value={pa.id} disabled={pa.reste <= 0 && !editAction}>
                        <span className={`text-xs ${pa.reste <= 0 ? 'text-muted-foreground line-through' : ''}`}>
                          {formatPlannedLabel(pa)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Auto-filled info from planned action */}
            {selectedPlanned && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getGeoConfig(selectedPlanned.action_key).icon}</span>
                  <span className="font-medium">{selectedPlanned.action_label || selectedPlanned.action_key}</span>
                  <span className="text-muted-foreground">— {selectedPlanned.year}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Prévu: <strong>{selectedPlanned.physique} {selectedPlanned.unite}</strong></div>
                  <div>Réalisé: <strong>{selectedPlanned.cumul_realise.toFixed(1)}</strong></div>
                  <div>Reste: <strong className={selectedPlanned.reste <= 0 ? 'text-destructive' : 'text-green-600'}>{selectedPlanned.reste.toFixed(1)}</strong></div>
                </div>
                <Progress value={selectedPlanned.taux_realisation} className="h-2" />
              </div>
            )}

            {/* Titre */}
            <div>
              <Label htmlFor="titre">Titre *</Label>
              <Input id="titre" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Reboisement Zone Nord" />
            </div>

            {/* Geometry type */}
            <div>
              <Label htmlFor="geom-type">Type de géométrie</Label>
              <Select value={geomType} onValueChange={v => setGeomType(v as GeomType)}>
                <SelectTrigger id="geom-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Point">📍 Point (1 coordonnée)</SelectItem>
                  <SelectItem value="Polygon">🔷 Polygone (min. 3 points)</SelectItem>
                  <SelectItem value="LineString">📏 Ligne (2 points: départ/arrivée)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Surface (Polygon) or Length (LineString) */}
            {geomType === 'Polygon' && (
              <div>
                <Label htmlFor="surface">Surface réalisée (ha)</Label>
                <Input id="surface" type="number" step="0.01" value={surfaceRealisee} onChange={e => setSurfaceRealisee(e.target.value)} placeholder="Ex: 45.5" />
              </div>
            )}
            {geomType === 'LineString' && (
              <div>
                <Label>Longueur (km) — calculée automatiquement</Label>
                <Input type="number" value={longueurKm !== null ? longueurKm.toFixed(2) : ''} readOnly disabled className="bg-muted" />
              </div>
            )}

            {/* Lambert zone */}
            <div>
              <Label htmlFor="lambert-zone">Zone Lambert *</Label>
              <Select value={lambertZone} onValueChange={setLambertZone}>
                <SelectTrigger id="lambert-zone"><SelectValue placeholder="Sélectionner la zone" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LAMBERT_ZONE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lambert coordinates */}
            <div>
              <Label htmlFor="coords">Coordonnées Lambert *</Label>
              <Textarea
                id="coords"
                value={coordsText}
                onChange={e => setCoordsText(e.target.value)}
                placeholder={
                  geomType === 'Point'
                    ? "X Y\nEx: 432360.00 318820.00"
                    : geomType === 'LineString'
                    ? "X_départ Y_départ\nX_arrivée Y_arrivée"
                    : "X Y (1 point par ligne)\nEx:\n432150.25 318945.60\n432410.80 318770.45\n432230.10 318500.90"
                }
                rows={geomType === 'Point' ? 2 : geomType === 'LineString' ? 3 : 5}
                className="font-mono text-sm"
              />
            </div>

            {/* Date + observations */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date">Date réalisation</Label>
                <Input id="date" type="date" value={dateRealisation} onChange={e => setDateRealisation(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="obs">Observations</Label>
                <Input id="obs" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Notes..." />
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Overshoot warning */}
            {overshootResult?.warning && (
              <Alert variant={overshootResult.exceeds ? 'destructive' : 'default'} className={!overshootResult.exceeds ? 'border-yellow-500 bg-yellow-50' : ''}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">{overshootResult.message}</AlertDescription>
              </Alert>
            )}

            {/* Preview button */}
            <Button type="button" variant="outline" onClick={handlePreview} className="w-full" disabled={!plannedActionId}>
              <Eye className="h-4 w-4 mr-2" />
              Prévisualiser sur carte
            </Button>
          </div>

          {/* Map preview */}
          <div className="space-y-2">
            <Label>Aperçu cartographique</Label>
            {showPreview && previewMapAction ? (
              <Suspense fallback={<MapLoadingFallback />}>
                <PdfcpMapViewer actions={[previewMapAction]} selectedActionId="preview" className="h-[350px]" />
              </Suspense>
            ) : (
              <div className="h-[350px] bg-muted/50 rounded-xl flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Cliquez "Prévisualiser" pour voir la géométrie</p>
                </div>
              </div>
            )}
            {showPreview && previewCentroid && (
              <p className="text-xs text-muted-foreground text-center">
                Centroïde: {previewCentroid.lat.toFixed(6)}°N, {previewCentroid.lng.toFixed(6)}°W
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-2" />Annuler</Button>
          <Button onClick={handleSave} disabled={!showPreview || !previewGeometry || isSaving || !plannedActionId}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfcpGeoActionForm;
