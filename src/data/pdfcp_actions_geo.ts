/**
 * Types et données pour les actions géographiques PDFCP
 */

export type GeoActionType = 
  | 'reboisement' 
  | 'regeneration' 
  | 'compensation_mise_en_defens' 
  | 'correction_ravins' 
  | 'points_eau'
  | 'piste';

export type GeomType = 'Point' | 'Polygon' | 'LineString';

export type LambertZoneType = '26191' | '26192';

export interface PdfcpActionGeo {
  id: string;
  pdfcp_id: string;
  action: GeoActionType;
  titre: string;
  description?: string;
  surface_ha?: number; // Seulement pour polygones
  longueur_km?: number; // Seulement pour LineString (piste)
  coords_text_lambert: string; // Saisie brute pour traçabilité
  lambert_zone: LambertZoneType;
  geom_type: GeomType; // Auto-déterminé selon l'action
  geometry: GeoJSON.Geometry | null;
  centroid_lat: number;
  centroid_lng: number;
  created_at: string;
  updated_at: string;
}

// Configuration des actions avec leur type de géométrie imposé
export const GEO_ACTION_CONFIG: Record<GeoActionType, {
  label: string;
  geomType: GeomType;
  icon: string;
  color: string;
}> = {
  reboisement: {
    label: 'Reboisement',
    geomType: 'Polygon',
    icon: '🌲',
    color: '#22c55e' // green-500
  },
  regeneration: {
    label: 'Régénération',
    geomType: 'Polygon',
    icon: '🌿',
    color: '#84cc16' // lime-500
  },
  compensation_mise_en_defens: {
    label: 'Compensation / Mise en défens',
    geomType: 'Polygon',
    icon: '🛡️',
    color: '#3b82f6' // blue-500
  },
  correction_ravins: {
    label: 'Correction ravins',
    geomType: 'Point',
    icon: '⛰️',
    color: '#f97316' // orange-500
  },
  points_eau: {
    label: "Points d'eau",
    geomType: 'Point',
    icon: '💧',
    color: '#06b6d4' // cyan-500
  },
  piste: {
    label: 'Piste',
    geomType: 'LineString',
    icon: '🛤️',
    color: '#a855f7' // purple-500
  }
};

// Labels pour les zones Lambert
export const LAMBERT_ZONE_LABELS: Record<LambertZoneType, string> = {
  '26191': 'Lambert Nord Maroc (EPSG:26191)',
  '26192': 'Lambert Sud Maroc (EPSG:26192)'
};

// Storage key pour localStorage
const STORAGE_KEY = 'anef_pdfcp_actions_geo';

// Données initiales (vide)
const initialData: PdfcpActionGeo[] = [];

/**
 * Charge les actions géo depuis localStorage
 */
export function loadPdfcpActionsGeo(): PdfcpActionGeo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erreur chargement actions géo:', error);
  }
  return initialData;
}

/**
 * Sauvegarde les actions géo dans localStorage
 */
export function savePdfcpActionsGeo(actions: PdfcpActionGeo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error('Erreur sauvegarde actions géo:', error);
  }
}

/**
 * Ajoute une action géo
 */
export function addPdfcpActionGeo(action: Omit<PdfcpActionGeo, 'id' | 'created_at' | 'updated_at'>): PdfcpActionGeo {
  const actions = loadPdfcpActionsGeo();
  const now = new Date().toISOString();
  
  const newAction: PdfcpActionGeo = {
    ...action,
    id: `GEO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: now,
    updated_at: now
  };
  
  actions.push(newAction);
  savePdfcpActionsGeo(actions);
  
  return newAction;
}

/**
 * Met à jour une action géo
 */
export function updatePdfcpActionGeo(id: string, updates: Partial<PdfcpActionGeo>): PdfcpActionGeo | null {
  const actions = loadPdfcpActionsGeo();
  const index = actions.findIndex(a => a.id === id);
  
  if (index === -1) return null;
  
  actions[index] = {
    ...actions[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  savePdfcpActionsGeo(actions);
  return actions[index];
}

/**
 * Supprime une action géo
 */
export function deletePdfcpActionGeo(id: string): boolean {
  const actions = loadPdfcpActionsGeo();
  const filtered = actions.filter(a => a.id !== id);
  
  if (filtered.length === actions.length) return false;
  
  savePdfcpActionsGeo(filtered);
  return true;
}

/**
 * Récupère les actions géo pour un PDFCP donné
 */
export function getActionsGeoByPdfcp(pdfcpId: string): PdfcpActionGeo[] {
  const actions = loadPdfcpActionsGeo();
  return actions.filter(a => a.pdfcp_id === pdfcpId);
}
