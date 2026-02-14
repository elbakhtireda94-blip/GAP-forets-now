import { useState, useCallback, useMemo } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';

export type DrillDownLevel = 'national' | 'region' | 'dpanef' | 'commune';

export interface DrillDownState {
  level: DrillDownLevel;
  dranefId: string;
  dpanefId: string;
  communeId: string;
  dranefName?: string;
  dpanefName?: string;
  communeName?: string;
  // Geographic coordinates for map zoom
  focusCoords?: { lat: number; lng: number };
  zoomLevel: number;
}

export interface DrillDownHandlers {
  selectRegion: (regionName: string, regionId?: string) => void;
  selectDpanef: (dpanefId: string) => void;
  selectCommune: (communeId: string) => void;
  navigateToLevel: (level: DrillDownLevel) => void;
  reset: () => void;
}

// Zoom levels for each drill-down level
export const ZOOM_LEVELS = {
  national: 5,
  region: 6.5,
  dpanef: 8,
  commune: 10,
} as const;

// Morocco center coordinates
export const MOROCCO_CENTER = { lat: 31.5, lng: -7 };

// Approximate region centers for zooming
export const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  'tanger-tetouan-al hoceima': { lat: 35.2, lng: -5.5 },
  'oriental': { lat: 34.0, lng: -2.5 },
  'fes-meknes': { lat: 34.0, lng: -5.0 },
  'rabat-sale-kenitra': { lat: 34.0, lng: -6.8 },
  'beni mellal-khenifra': { lat: 32.3, lng: -6.4 },
  'casablanca-settat': { lat: 33.2, lng: -7.6 },
  'marrakech-safi': { lat: 31.6, lng: -8.0 },
  'draa-tafilalet': { lat: 31.0, lng: -5.5 },
  'souss-massa': { lat: 30.0, lng: -9.0 },
  'guelmim-oued noun': { lat: 28.5, lng: -10.0 },
  'laayoune-sakia el hamra': { lat: 27.0, lng: -13.0 },
  'dakhla-oued ed-dahab': { lat: 23.7, lng: -15.9 },
};

export function useDrillDownNavigation() {
  const { getDranefName, getDpanefName, getCommuneName } = useDatabase();
  
  const [dranefId, setDranefId] = useState('');
  const [dpanefId, setDpanefId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [regionName, setRegionName] = useState('');

  // Compute current level
  const level = useMemo<DrillDownLevel>(() => {
    if (communeId && communeId !== 'all') return 'commune';
    if (dpanefId && dpanefId !== 'all') return 'dpanef';
    if (dranefId && dranefId !== 'all') return 'region';
    return 'national';
  }, [dranefId, dpanefId, communeId]);

  // Get human-readable names
  const dranefName = useMemo(() => {
    if (!dranefId || dranefId === 'all') return undefined;
    return getDranefName(dranefId) || dranefId;
  }, [dranefId, getDranefName]);

  const dpanefName = useMemo(() => {
    if (!dpanefId || dpanefId === 'all') return undefined;
    return getDpanefName(dpanefId) || dpanefId;
  }, [dpanefId, getDpanefName]);

  const communeName = useMemo(() => {
    if (!communeId || communeId === 'all') return undefined;
    return getCommuneName(communeId) || communeId;
  }, [communeId, getCommuneName]);

  // Calculate focus coordinates and zoom level based on current level
  const { focusCoords, zoomLevel } = useMemo(() => {
    const normalized = regionName.toLowerCase().replace(/-/g, ' ').replace('dranef ', '');
    const center = REGION_CENTERS[normalized];
    
    if (level === 'commune') {
      // Use region center with higher zoom for commune
      if (center) {
        return { focusCoords: center, zoomLevel: ZOOM_LEVELS.commune };
      }
    }
    
    if (level === 'dpanef') {
      if (center) {
        return { focusCoords: center, zoomLevel: ZOOM_LEVELS.dpanef };
      }
    }
    
    if (level === 'region') {
      if (center) {
        return { focusCoords: center, zoomLevel: ZOOM_LEVELS.region };
      }
    }
    
    return { focusCoords: MOROCCO_CENTER, zoomLevel: ZOOM_LEVELS.national };
  }, [level, regionName]);

  // Navigation handlers
  const selectRegion = useCallback((name: string, id?: string) => {
    if (!name) {
      setDranefId('');
      setDpanefId('');
      setCommuneId('');
      setRegionName('');
      return;
    }
    
    setRegionName(name);
    if (id) setDranefId(id);
    setDpanefId('');
    setCommuneId('');
  }, []);

  const selectDpanef = useCallback((id: string) => {
    setDpanefId(id);
    setCommuneId('');
  }, []);

  const selectCommune = useCallback((id: string) => {
    setCommuneId(id);
  }, []);

  const navigateToLevel = useCallback((targetLevel: DrillDownLevel) => {
    switch (targetLevel) {
      case 'national':
        setDranefId('');
        setDpanefId('');
        setCommuneId('');
        setRegionName('');
        break;
      case 'region':
        setDpanefId('');
        setCommuneId('');
        break;
      case 'dpanef':
        setCommuneId('');
        break;
    }
  }, []);

  const reset = useCallback(() => {
    setDranefId('');
    setDpanefId('');
    setCommuneId('');
    setRegionName('');
  }, []);

  const state: DrillDownState = {
    level,
    dranefId,
    dpanefId,
    communeId,
    dranefName,
    dpanefName,
    communeName,
    focusCoords,
    zoomLevel,
  };

  const handlers: DrillDownHandlers = {
    selectRegion,
    selectDpanef,
    selectCommune,
    navigateToLevel,
    reset,
  };

  return { state, handlers, setDranefId, setDpanefId, setCommuneId };
}
