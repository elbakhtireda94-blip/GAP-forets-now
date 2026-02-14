import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MapContainer, GeoJSON, Pane, CircleMarker, Tooltip as MapTooltip, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import {
  normalizeRegionName,
  logUnmatchedRegion,
} from '@/data/moroccoRegions';
import {
  computeProvinceRegionMapping,
  filterProvincesForRegion,
  getProvinceDisplayName,
  getRegionDisplayName,
  computeCentroid,
} from '@/lib/geoUtils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, ZoomIn, ZoomOut, Home, MapPin, Building2, TreePine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DrillDownLevel } from '@/hooks/useDrillDownNavigation';

// --- Types ---

interface RegionData {
  name: string;
  value: number;
}

export type KpiHighlightMode = 'adp' | 'pdfcp' | 'odf' | 'activites' | 'oppositions' | 'conflits' | 'organisations' | null;

interface MoroccoMapProps {
  data: RegionData[];
  selectedRegion?: string;
  onRegionClick?: (region: string) => void;
  onProvinceClick?: (provinceName: string) => void;
  onCommuneClick?: (communeId: string) => void;
  communeList?: { id: string; name: string }[];
  selectedProvinceName?: string;
  indicator?: string;
  highlightMode?: KpiHighlightMode;
  regionDataByKpi?: Record<string, Record<string, number>>;
  drillLevel?: DrillDownLevel;
}

// --- Constants ---

// Unified geoBoundaries source (same OSM data for both levels = consistent boundaries)
const REGIONS_GEO_URL = '/data/geoboundaries-regions.geojson';
const PROVINCES_GEO_URL = '/data/geoboundaries-provinces.geojson';

const INTENSITY_LEVELS = {
  none: { label: 'N/A', color: '#f3f4f6' },
  low: { label: 'Faible', color: '#bbf7d0' },
  medium: { label: 'Moyen', color: '#4ade80' },
  high: { label: 'Élevé', color: '#16a34a' },
};

const LEVEL_CONFIG: Record<DrillDownLevel, { label: string; icon: React.ElementType; color: string }> = {
  national: { label: 'Vue Nationale', icon: Home, color: 'bg-primary/10 text-primary border-primary/20' },
  region: { label: 'Vue Régionale', icon: MapPin, color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  dpanef: { label: 'Vue Provinciale', icon: Building2, color: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  commune: { label: 'Vue Communale', icon: TreePine, color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
};

const PROVINCE_COLORS = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'];
const COMMUNE_COLORS = { default: '#059669', selected: '#047857', ring: '#34d399' };

// --- Utilities ---

function generateCommunePositions(
  centroid: { lat: number; lng: number },
  communes: { id: string; name: string }[],
  spreadDeg: number = 0.06
): { id: string; name: string; lat: number; lng: number }[] {
  if (communes.length === 0) return [];
  if (communes.length === 1) return [{ ...communes[0], lat: centroid.lat, lng: centroid.lng }];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return communes.map((commune, i) => {
    const r = spreadDeg * Math.sqrt((i + 0.5) / communes.length);
    const theta = i * goldenAngle;
    return { ...commune, lat: centroid.lat + r * Math.cos(theta), lng: centroid.lng + r * Math.sin(theta) };
  });
}

function normalizeForMatch(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get region name from geoBoundaries feature properties and normalize it
 * to match the official 12 Morocco regions.
 */
function getRegionNameNormalized(props: Record<string, unknown>): string | null {
  const rawName = getRegionDisplayName(props);
  return normalizeRegionName(rawName);
}

// --- MapController ---

const MapController: React.FC<{
  regionsGeoData: FeatureCollection;
  filteredProvinces: FeatureCollection | null;
  selectedRegion: string | null;
  selectedProvince: string | null;
  selectedCommuneId: string | null;
  communePositions: { id: string; lat: number; lng: number }[];
  drillLevel: DrillDownLevel;
  onInitialized: () => void;
}> = ({ regionsGeoData, filteredProvinces, selectedRegion, selectedProvince, selectedCommuneId, communePositions, drillLevel, onInitialized }) => {
  const map = useMap();
  const initialBoundsRef = useRef<L.LatLngBounds | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (regionsGeoData?.features.length > 0 && !isInitializedRef.current) {
      const layer = L.geoJSON(regionsGeoData);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        initialBoundsRef.current = bounds;
        map.fitBounds(bounds, { padding: [15, 15], animate: false });
        map.setMinZoom(4);
        map.setMaxZoom(12);
        isInitializedRef.current = true;
        onInitialized();
      }
    }
  }, [regionsGeoData, map, onInitialized]);

  useEffect(() => {
    if (!isInitializedRef.current || !initialBoundsRef.current) return;
    const flyOpts = { duration: 0.5, easeLinearity: 0.5 };

    if (drillLevel === 'national') {
      map.flyToBounds(initialBoundsRef.current, { padding: [15, 15], ...flyOpts });
      return;
    }

    if (drillLevel === 'region' && selectedRegion) {
      const feat = regionsGeoData.features.find(f => {
        const normalized = getRegionNameNormalized(f.properties || {});
        return normalized === selectedRegion;
      });
      if (feat) {
        const bounds = L.geoJSON(feat).getBounds();
        if (bounds.isValid()) { map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 8, ...flyOpts }); return; }
      }
    }

    if (drillLevel === 'dpanef' && selectedProvince && filteredProvinces) {
      const feat = filteredProvinces.features.find(f =>
        getProvinceDisplayName(f.properties || {}) === selectedProvince
      );
      if (feat) {
        const bounds = L.geoJSON(feat).getBounds();
        if (bounds.isValid()) { map.flyToBounds(bounds, { padding: [30, 30], maxZoom: 10, ...flyOpts }); return; }
      }
    }

    if (drillLevel === 'commune' && selectedCommuneId) {
      const pos = communePositions.find(c => c.id === selectedCommuneId);
      if (pos) { map.flyTo(L.latLng(pos.lat, pos.lng), 10, flyOpts); return; }
    }
  }, [map, drillLevel, selectedRegion, selectedProvince, selectedCommuneId, regionsGeoData, filteredProvinces, communePositions]);

  return null;
};

// --- Main Component ---

const MoroccoMap: React.FC<MoroccoMapProps> = ({
  data,
  selectedRegion: externalSelectedRegion,
  onRegionClick,
  onProvinceClick,
  onCommuneClick,
  communeList = [],
  selectedProvinceName,
  indicator = 'Indicateur',
  highlightMode = null,
  regionDataByKpi = {},
  drillLevel = 'national',
}) => {
  const [regionsGeoData, setRegionsGeoData] = useState<FeatureCollection | null>(null);
  const [allProvincesData, setAllProvincesData] = useState<FeatureCollection | null>(null);
  const [provinceRegionMapping, setProvinceRegionMapping] = useState<Map<string, string> | null>(null);
  const [internalSelectedRegion, setInternalSelectedRegion] = useState<string | null>(null);
  const [internalSelectedProvince, setInternalSelectedProvince] = useState<string | null>(null);
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [effectiveLevel, setEffectiveLevel] = useState<DrillDownLevel>(drillLevel);
  const prevLevelRef = useRef<DrillDownLevel>(drillLevel);
  const drillLevelRef = useRef(drillLevel);
  drillLevelRef.current = drillLevel;

  const selectedRegion = externalSelectedRegion || internalSelectedRegion;

  // --- Level transition overlay ---
  useEffect(() => {
    if (drillLevel !== prevLevelRef.current) {
      setIsTransitioning(true);
      const swapTimer = setTimeout(() => setEffectiveLevel(drillLevel), 150);
      const endTimer = setTimeout(() => setIsTransitioning(false), 400);
      prevLevelRef.current = drillLevel;
      return () => { clearTimeout(swapTimer); clearTimeout(endTimer); };
    }
  }, [drillLevel]);

  // Sync internal state on drill-up
  useEffect(() => {
    if (drillLevel === 'national') {
      setInternalSelectedRegion(null);
      setInternalSelectedProvince(null);
      setSelectedCommuneId(null);
    } else if (drillLevel === 'region') {
      setInternalSelectedProvince(null);
      setSelectedCommuneId(null);
    } else if (drillLevel === 'dpanef') {
      setSelectedCommuneId(null);
    }
  }, [drillLevel]);

  const showProvinces = !!selectedRegion && effectiveLevel !== 'national';

  // Compute selected province: external prop or internal click
  const selectedProvince = useMemo(() => {
    if (internalSelectedProvince) return internalSelectedProvince;
    if (!selectedProvinceName || !allProvincesData || !selectedRegion || !provinceRegionMapping) return null;
    
    // Get the region's official name for mapping lookup
    const regionFeature = regionsGeoData?.features.find(f => {
      const normalized = getRegionNameNormalized(f.properties || {});
      return normalized === selectedRegion;
    });
    if (!regionFeature) return null;
    const regionShapeName = getRegionDisplayName(regionFeature.properties || {});
    
    const provinces = filterProvincesForRegion(allProvincesData.features, regionShapeName, provinceRegionMapping);
    const normalizedTarget = normalizeForMatch(selectedProvinceName);
    const match = provinces.find(f => {
      const name = normalizeForMatch(getProvinceDisplayName(f.properties || {}));
      return name.includes(normalizedTarget) || normalizedTarget.includes(name);
    });
    return match ? getProvinceDisplayName(match.properties || {}) : null;
  }, [internalSelectedProvince, selectedProvinceName, allProvincesData, selectedRegion, provinceRegionMapping, regionsGeoData]);

  const showCommunes = !!selectedProvince && (effectiveLevel === 'dpanef' || effectiveLevel === 'commune') && communeList.length > 0;

  // --- Data Loading ---
  useEffect(() => {
    fetch(REGIONS_GEO_URL)
      .then(res => res.json())
      .then((geojson: FeatureCollection) => {
        setRegionsGeoData(geojson);
      })
      .catch(err => console.error('Error loading regions data:', err));
  }, []);

  useEffect(() => {
    if (!showProvinces || allProvincesData) return;
    fetch(PROVINCES_GEO_URL)
      .then(res => res.json())
      .then((d: FeatureCollection) => {
        setAllProvincesData(d);
      })
      .catch(err => console.error('Error loading provinces data:', err));
  }, [showProvinces, allProvincesData]);

  // Compute province-to-region mapping when both datasets are loaded
  useEffect(() => {
    if (!regionsGeoData || !allProvincesData || provinceRegionMapping) return;
    const mapping = computeProvinceRegionMapping(regionsGeoData, allProvincesData);
    setProvinceRegionMapping(mapping);
    if (import.meta.env.DEV) {
      console.log(`[MoroccoMap] Province-region mapping computed: ${mapping.size} provinces mapped`);
    }
  }, [regionsGeoData, allProvincesData, provinceRegionMapping]);

  // --- Computed ---
  const filteredProvinces = useMemo<FeatureCollection | null>(() => {
    if (!showProvinces || !allProvincesData || !selectedRegion || !provinceRegionMapping || !regionsGeoData) return null;
    
    // Find the geoBoundaries region shapeName that corresponds to our normalized region name
    const regionFeature = regionsGeoData.features.find(f => {
      const normalized = getRegionNameNormalized(f.properties || {});
      return normalized === selectedRegion;
    });
    if (!regionFeature) return null;
    
    const regionShapeName = getRegionDisplayName(regionFeature.properties || {});
    const filtered = filterProvincesForRegion(allProvincesData.features, regionShapeName, provinceRegionMapping);
    return filtered.length > 0 ? { type: 'FeatureCollection', features: filtered } : null;
  }, [showProvinces, allProvincesData, selectedRegion, provinceRegionMapping, regionsGeoData]);

  const selectedProvinceFeature = useMemo(() => {
    if (!selectedProvince || !filteredProvinces) return null;
    return filteredProvinces.features.find(f =>
      getProvinceDisplayName(f.properties || {}) === selectedProvince
    ) || null;
  }, [selectedProvince, filteredProvinces]);

  const provinceCentroid = useMemo(() => {
    if (!selectedProvinceFeature) return null;
    const c = computeCentroid(selectedProvinceFeature);
    return c ? { lat: c[1], lng: c[0] } : null;
  }, [selectedProvinceFeature]);

  const communePositions = useMemo(() => {
    if (!provinceCentroid || communeList.length === 0) return [];
    return generateCommunePositions(provinceCentroid, communeList);
  }, [provinceCentroid, communeList]);

  const dataByRegion = useMemo(() => {
    const m = new Map<string, RegionData>();
    data.forEach(item => { const n = normalizeRegionName(item.name); if (n) m.set(n, item); });
    return m;
  }, [data]);

  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  // --- Style functions ---
  const getRegionColor = useCallback((properties: Record<string, unknown>, isSelected: boolean): string => {
    const normalized = getRegionNameNormalized(properties);
    if (!normalized) { logUnmatchedRegion(getRegionDisplayName(properties)); return INTENSITY_LEVELS.none.color; }
    if (highlightMode && regionDataByKpi[highlightMode]) {
      const val = regionDataByKpi[highlightMode][normalized] ?? 0;
      if (val === 0) return '#e5e7eb';
      const max = Math.max(...Object.values(regionDataByKpi[highlightMode]), 1);
      const r = val / max;
      return r < 0.33 ? INTENSITY_LEVELS.low.color : r < 0.66 ? INTENSITY_LEVELS.medium.color : INTENSITY_LEVELS.high.color;
    }
    const rd = dataByRegion.get(normalized);
    if (!rd || rd.value === 0) return INTENSITY_LEVELS.none.color;
    const r = rd.value / maxValue;
    if (selectedRegion && !isSelected) return '#e5e7eb';
    return r < 0.33 ? INTENSITY_LEVELS.low.color : r < 0.66 ? INTENSITY_LEVELS.medium.color : INTENSITY_LEVELS.high.color;
  }, [dataByRegion, maxValue, selectedRegion, highlightMode, regionDataByKpi]);

  const getRegionStyle = useCallback((feat: Feature<Geometry, Record<string, unknown>> | undefined) => {
    if (!feat) return {};
    const props = feat.properties || {};
    const normalized = getRegionNameNormalized(props);
    const isSelected = normalized === selectedRegion;
    if (showProvinces && isSelected) {
      return { fillColor: '#f0f9ff', weight: 2, opacity: 1, color: '#1e40af', fillOpacity: 0.25 };
    }
    if (showProvinces && !isSelected) {
      return { fillColor: '#f3f4f6', weight: 0.5, opacity: 0.2, color: '#d1d5db', fillOpacity: 0.1 };
    }
    return {
      fillColor: getRegionColor(props, isSelected),
      weight: isSelected ? 2.5 : 1, opacity: 1,
      color: isSelected ? '#1e40af' : '#94a3b8',
      fillOpacity: isSelected ? 0.9 : 0.7,
    };
  }, [selectedRegion, getRegionColor, showProvinces]);

  const getProvinceStyle = useCallback((feat: Feature<Geometry, Record<string, unknown>> | undefined) => {
    if (!feat) return {};
    const provinceName = getProvinceDisplayName(feat.properties || {});
    const isSelected = selectedProvince === provinceName;
    const index = filteredProvinces?.features.indexOf(feat) ?? 0;
    const colorIndex = index % PROVINCE_COLORS.length;
    if (isSelected) {
      return { fillColor: '#1d4ed8', weight: 3, opacity: 1, color: '#1e3a8a', fillOpacity: showCommunes ? 0.3 : 0.8 };
    }
    if (selectedProvince) {
      return { fillColor: '#e5e7eb', weight: showCommunes ? 0.5 : 1, opacity: showCommunes ? 0.4 : 0.7, color: '#94a3b8', fillOpacity: showCommunes ? 0.15 : 0.4 };
    }
    return { fillColor: PROVINCE_COLORS[colorIndex], weight: 1.5, opacity: 1, color: '#1e40af', fillOpacity: 0.6 };
  }, [selectedProvince, filteredProvinces, showCommunes]);

  // --- Click Handlers ---
  const handleRegionClick = useCallback((regionName: string) => {
    if (drillLevelRef.current !== 'national') return;
    const normalized = normalizeRegionName(regionName);
    if (!normalized) return;
    setInternalSelectedRegion(prev => prev === normalized ? null : normalized);
    setInternalSelectedProvince(null);
    setSelectedCommuneId(null);
    onRegionClick?.(normalized);
  }, [onRegionClick]);

  const handleProvinceClick = useCallback((provinceName: string) => {
    if (drillLevelRef.current !== 'region') return;
    setInternalSelectedProvince(prev => prev === provinceName ? null : provinceName);
    setSelectedCommuneId(null);
    onProvinceClick?.(provinceName);
  }, [onProvinceClick]);

  const handleCommuneClick = useCallback((communeId: string) => {
    if (drillLevelRef.current !== 'dpanef' && drillLevelRef.current !== 'commune') return;
    setSelectedCommuneId(prev => prev === communeId ? null : communeId);
    onCommuneClick?.(communeId);
  }, [onCommuneClick]);

  const handleReset = useCallback(() => {
    setInternalSelectedRegion(null);
    setInternalSelectedProvince(null);
    setSelectedCommuneId(null);
    onRegionClick?.('');
  }, [onRegionClick]);

  // --- Feature Event Bindings ---
  const onEachRegionFeature = useCallback((feat: Feature<Geometry, Record<string, unknown>>, layer: L.Layer) => {
    const props = feat.properties || {};
    const rawName = getRegionDisplayName(props);
    const normalized = getRegionNameNormalized(props);
    const rd = normalized ? dataByRegion.get(normalized) : null;
    layer.bindTooltip(
      `<div class="font-medium">${normalized || rawName}</div><div class="text-xs opacity-80">${rd?.value ?? 0} ${indicator}</div>`,
      { permanent: false, direction: 'top', className: 'morocco-map-tooltip' }
    );
    layer.on({
      click: () => handleRegionClick(rawName),
      mouseover: (e) => {
        if (drillLevelRef.current !== 'national') return;
        (e.target as L.Path).setStyle({ weight: 2, color: '#475569', fillOpacity: 0.85 });
        (e.target as L.Path).bringToFront();
      },
      mouseout: (e) => {
        if (drillLevelRef.current !== 'national') return;
        (e.target as L.Path).setStyle(getRegionStyle(feat));
      },
    });
  }, [dataByRegion, indicator, handleRegionClick, getRegionStyle]);

  const onEachProvinceFeature = useCallback((feat: Feature<Geometry, Record<string, unknown>>, layer: L.Layer) => {
    const provinceName = getProvinceDisplayName(feat.properties || {});
    layer.bindTooltip(
      `<div class="font-medium">${provinceName}</div><div class="text-xs opacity-80">Province / DPANEF</div>`,
      { permanent: false, direction: 'top', className: 'morocco-map-tooltip' }
    );
    layer.on({
      click: () => handleProvinceClick(provinceName),
      mouseover: (e) => {
        if (drillLevelRef.current !== 'region') return;
        (e.target as L.Path).setStyle({ weight: 2.5, color: '#1e3a8a', fillOpacity: 0.75 });
        (e.target as L.Path).bringToFront();
      },
      mouseout: (e) => {
        if (drillLevelRef.current !== 'region') return;
        (e.target as L.Path).setStyle(getProvinceStyle(feat));
      },
    });
  }, [handleProvinceClick, getProvinceStyle]);

  const handleMapInitialized = useCallback(() => setMapReady(true), []);
  const levelConfig = LEVEL_CONFIG[effectiveLevel];
  const LevelIcon = levelConfig.icon;

  if (!regionsGeoData) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement de la carte...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Header bar */}
      {(selectedRegion || highlightMode || effectiveLevel !== 'national') && (
        <div className="flex items-center justify-between bg-primary/5 rounded-lg px-4 py-2.5 border border-primary/20 animate-fade-in">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-300', levelConfig.color)}>
              <LevelIcon className="h-3 w-3" />
              {levelConfig.label}
            </span>

            {effectiveLevel !== 'national' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ZoomIn className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {effectiveLevel === 'region' && 'x1.5'}
                  {effectiveLevel === 'dpanef' && 'x2'}
                  {effectiveLevel === 'commune' && 'x3'}
                </span>
              </div>
            )}

            {selectedRegion && (
              <>
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-foreground">
                    Région : <span className="text-primary">{selectedRegion}</span>
                  </span>
                </div>
              </>
            )}

            {selectedProvince && (
              <>
                <span className="text-muted-foreground hidden sm:inline">›</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-sm font-medium text-foreground">
                    Province : <span className="text-blue-700">{selectedProvince}</span>
                  </span>
                </div>
              </>
            )}

            {selectedCommuneId && communePositions.length > 0 && (
              <>
                <span className="text-muted-foreground hidden sm:inline">›</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-sm font-medium text-foreground">
                    Commune : <span className="text-emerald-700">
                      {communePositions.find(c => c.id === selectedCommuneId)?.name || selectedCommuneId}
                    </span>
                  </span>
                </div>
              </>
            )}

            {highlightMode && (
              <>
                <span className="text-muted-foreground hidden sm:inline">•</span>
                <span className="text-sm font-medium text-foreground">
                  KPI : <span className="text-accent-foreground capitalize">{highlightMode}</span>
                </span>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réinitialiser
          </Button>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full rounded-xl overflow-hidden bg-white shadow-sm border border-border/50" style={{ height: '380px' }}>
        {/* Transition overlay */}
        <div
          className="absolute inset-0 z-[1000] pointer-events-none transition-opacity duration-[400ms] ease-in-out"
          style={{
            opacity: isTransitioning ? 1 : 0,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.85), rgba(255,255,255,0.3))',
          }}
        />

        <MapContainer
          center={[29, -8]}
          zoom={5}
          style={{ height: '100%', width: '100%', background: 'white' }}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          zoomControl={false}
          dragging={true}
          attributionControl={false}
          keyboard={false}
          boxZoom={false}
        >
          <MapController
            regionsGeoData={regionsGeoData}
            filteredProvinces={filteredProvinces}
            selectedRegion={selectedRegion || null}
            selectedProvince={selectedProvince}
            selectedCommuneId={selectedCommuneId}
            communePositions={communePositions}
            drillLevel={drillLevel}
            onInitialized={handleMapInitialized}
          />

          {/* Layer 1: Regions */}
          <Pane name="regions-layer" style={{ zIndex: 401 }}>
            <GeoJSON
              key={'regions-' + JSON.stringify(data) + selectedRegion + effectiveLevel}
              data={regionsGeoData}
              style={getRegionStyle}
              onEachFeature={onEachRegionFeature}
            />
          </Pane>

          {/* Layer 2: Provinces */}
          {showProvinces && filteredProvinces && (
            <Pane name="provinces-layer" style={{ zIndex: 402 }}>
              <GeoJSON
                key={'provinces-' + selectedRegion + selectedProvince + effectiveLevel}
                data={filteredProvinces}
                style={getProvinceStyle}
                onEachFeature={onEachProvinceFeature}
              />
            </Pane>
          )}

          {/* Layer 3: Communes (CircleMarkers) */}
          {showCommunes && (
            <Pane name="communes-layer" style={{ zIndex: 403 }}>
              {communePositions.map(pos => {
                const isSelected = selectedCommuneId === pos.id;
                return (
                  <CircleMarker
                    key={pos.id}
                    center={[pos.lat, pos.lng]}
                    radius={isSelected ? 12 : 8}
                    pathOptions={{
                      fillColor: isSelected ? COMMUNE_COLORS.selected : COMMUNE_COLORS.default,
                      color: isSelected ? COMMUNE_COLORS.ring : '#ffffff',
                      weight: isSelected ? 3 : 2,
                      fillOpacity: isSelected ? 0.9 : 0.7,
                      opacity: 1,
                    }}
                    eventHandlers={{
                      click: () => handleCommuneClick(pos.id),
                      mouseover: (e) => {
                        const target = e.target as L.CircleMarker;
                        target.setRadius(isSelected ? 13 : 10);
                        target.setStyle({ fillOpacity: 0.9, weight: 3 });
                      },
                      mouseout: (e) => {
                        const target = e.target as L.CircleMarker;
                        target.setRadius(isSelected ? 12 : 8);
                        target.setStyle({ fillOpacity: isSelected ? 0.9 : 0.7, weight: isSelected ? 3 : 2 });
                      },
                    }}
                  >
                    <MapTooltip direction="top" className="morocco-map-tooltip">
                      <div className="font-medium">{pos.name}</div>
                      <div className="text-xs opacity-80">Commune</div>
                    </MapTooltip>
                  </CircleMarker>
                );
              })}
            </Pane>
          )}
        </MapContainer>

        {/* Layer count badges */}
        {(showProvinces || showCommunes) && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 animate-fade-in">
            {showProvinces && filteredProvinces && (
              <div className="bg-blue-600 text-white rounded-lg px-2.5 py-1.5 shadow-md">
                <span className="text-xs font-medium">
                  {filteredProvinces.features.length} province{filteredProvinces.features.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {showCommunes && (
              <div className="bg-emerald-600 text-white rounded-lg px-2.5 py-1.5 shadow-md">
                <span className="text-xs font-medium">
                  {communePositions.length} commune{communePositions.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Zoom level indicator */}
        <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-border/50 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {effectiveLevel === 'national' ? <ZoomOut className="h-3 w-3" /> : <ZoomIn className="h-3 w-3" />}
            <span className="font-medium">
              {effectiveLevel === 'national' && 'Zoom: National'}
              {effectiveLevel === 'region' && 'Zoom: Région'}
              {effectiveLevel === 'dpanef' && 'Zoom: Province'}
              {effectiveLevel === 'commune' && 'Zoom: Commune'}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
        {showCommunes ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COMMUNE_COLORS.default, border: '2px solid white', boxShadow: '0 0 0 1px #d1d5db' }} />
              <span className="text-xs text-muted-foreground">Commune</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COMMUNE_COLORS.selected, border: `2px solid ${COMMUNE_COLORS.ring}`, boxShadow: '0 0 0 1px #d1d5db' }} />
              <span className="text-xs text-muted-foreground">Commune sélectionnée</span>
            </div>
          </div>
        ) : showProvinces ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-sm border border-blue-500" style={{ backgroundColor: '#60a5fa' }} />
              <span className="text-xs text-muted-foreground">Province / DPANEF</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-sm border border-blue-800" style={{ backgroundColor: '#1d4ed8' }} />
              <span className="text-xs text-muted-foreground">Province sélectionnée</span>
            </div>
          </div>
        ) : (
          Object.entries(INTENSITY_LEVELS).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-sm border border-border/40" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))
        )}
      </div>

      {/* Tooltip styles */}
      <style>{`
        .morocco-map-tooltip {
          background-color: hsl(var(--popover));
          color: hsl(var(--popover-foreground));
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          box-shadow: 0 4px 12px -2px rgb(0 0 0 / 0.12);
        }
        .morocco-map-tooltip::before {
          border-top-color: hsl(var(--border)) !important;
        }
        .leaflet-container {
          background: white !important;
          font-family: inherit;
        }
        .leaflet-interactive {
          cursor: pointer !important;
        }
      `}</style>
    </div>
  );
};

export default MoroccoMap;
