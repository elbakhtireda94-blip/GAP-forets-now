/**
 * Province (DPANEF) mapping utilities for Morocco map drill-down.
 * 
 * The GADM ADM2 data uses old (pre-2015) regional divisions.
 * This module maps old regions + province names to the current 12 regions.
 */

import type { MoroccoRegion } from './moroccoRegions';
import { normalizeRegionName } from './moroccoRegions';

// Primary mapping: Old GADM NAME_1 → New 12-region name
const OLD_REGION_PRIMARY_MAP: Record<string, MoroccoRegion> = {
  'Chaouia-Ouardigha': 'Casablanca-Settat',
  'Doukkala-Abda': 'Casablanca-Settat',
  'Fès-Boulemane': 'Fès-Meknès',
  'Gharb-Chrarda-BeniHssen': 'Rabat-Salé-Kénitra',
  'Grand Casablanca': 'Casablanca-Settat',
  'Guelmim-EsSemara': 'Guelmim-Oued Noun',
  'Laâyoune-Boujdour-Sakia El Hamra': 'Laâyoune-Sakia El Hamra',
  'Marrakech-Tensift-Al Haouz': 'Marrakech-Safi',
  'Meknès-Tafilalet': 'Fès-Meknès',
  'Oued Ed-Dahab-Lagouira': 'Dakhla-Oued Ed Dahab',
  'Rabat-Salé-Zemmour-Zaer': 'Rabat-Salé-Kénitra',
  'Souss-Massa-Draâ': 'Souss-Massa',
  'Tadla-Azilal': 'Béni Mellal-Khénifra',
  'Tanger-Tétouan': 'Tanger-Tétouan-Al Hoceïma',
  'Taza-Al Hoceima-Taounate': 'Tanger-Tétouan-Al Hoceïma',
  'Oriental': 'Oriental',
};

// Province-level overrides for provinces that moved to a different
// new region than their old region's primary mapping
const PROVINCE_OVERRIDE: Record<string, MoroccoRegion> = {
  // From Doukkala-Abda: Safi → Marrakech-Safi
  'Safi': 'Marrakech-Safi',
  'Youssoufia': 'Marrakech-Safi',
  // From Guelmim-Es Semara: Es-Semara → Laâyoune-Sakia El Hamra
  'Es-Semara': 'Laâyoune-Sakia El Hamra',
  'EsSemara': 'Laâyoune-Sakia El Hamra',
  // From Chaouia-Ouardigha: Khouribga → Béni Mellal-Khénifra
  'Khouribga': 'Béni Mellal-Khénifra',
  // From Meknès-Tafilalet: Khénifra → Béni Mellal-Khénifra
  'Khénifra': 'Béni Mellal-Khénifra',
  'Khenifra': 'Béni Mellal-Khénifra',
  'Khemisset': 'Rabat-Salé-Kénitra',
  // From Meknès-Tafilalet: Errachidia → Drâa-Tafilalet
  'Errachidia': 'Drâa-Tafilalet',
  'Midelt': 'Drâa-Tafilalet',
  // From Souss-Massa-Draâ: Ouarzazate, Zagora, Tinghir → Drâa-Tafilalet
  'Ouarzazate': 'Drâa-Tafilalet',
  'Zagora': 'Drâa-Tafilalet',
  'Tinghir': 'Drâa-Tafilalet',
  // From Taza-Al Hoceima-Taounate: Taza, Taounate → Fès-Meknès
  'Taza': 'Fès-Meknès',
  'Taounate': 'Fès-Meknès',
};

/**
 * Normalize a province name for matching
 */
function normalizeProvinceName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get the new region name for a province from GADM data.
 * Uses the old region (NAME_1) and province name (NAME_2) from GADM properties.
 */
export function getNewRegionForProvince(
  gadmOldRegion: string,
  provinceName: string
): MoroccoRegion | null {
  // Check province-level override first
  if (PROVINCE_OVERRIDE[provinceName]) {
    return PROVINCE_OVERRIDE[provinceName];
  }

  // Normalize province name and try override
  const normalizedProvince = normalizeProvinceName(provinceName);
  for (const [key, region] of Object.entries(PROVINCE_OVERRIDE)) {
    if (normalizeProvinceName(key) === normalizedProvince) {
      return region;
    }
  }

  // Fall back to old region primary mapping
  if (OLD_REGION_PRIMARY_MAP[gadmOldRegion]) {
    return OLD_REGION_PRIMARY_MAP[gadmOldRegion];
  }

  // Try normalized match on old region names
  const normalizedOldRegion = normalizeProvinceName(gadmOldRegion);
  for (const [key, region] of Object.entries(OLD_REGION_PRIMARY_MAP)) {
    if (normalizeProvinceName(key) === normalizedOldRegion) {
      return region;
    }
  }

  return null;
}

/**
 * Extract province name from GADM GeoJSON feature properties
 */
export function getProvinceNameFromProperties(props: Record<string, unknown>): string {
  return (props.NAME_2 as string) || (props.name as string) || '';
}

/**
 * Extract old region name from GADM GeoJSON feature properties
 */
export function getOldRegionFromProperties(props: Record<string, unknown>): string {
  return (props.NAME_1 as string) || '';
}

/**
 * Filter GADM province features for a specific new region.
 * Returns only features whose provinces belong to the specified new region.
 * Logs warnings in development for any mismatched provinces.
 */
// Track logged mismatches to avoid spam
const _loggedMismatches = new Set<string>();

export function filterProvincesForRegion(
  features: GeoJSON.Feature[],
  targetRegion: string
): GeoJSON.Feature[] {
  const normalizedTarget = normalizeRegionName(targetRegion);
  if (!normalizedTarget) return [];

  return features.filter((feature) => {
    const props = feature.properties || {};
    const oldRegion = getOldRegionFromProperties(props);
    const provinceName = getProvinceNameFromProperties(props);
    const newRegion = getNewRegionForProvince(oldRegion, provinceName);

    // Dev-mode consistency check
    if (process.env.NODE_ENV === 'development' && newRegion && newRegion !== normalizedTarget) {
      const logKey = `${provinceName}->${normalizedTarget}`;
      if (!_loggedMismatches.has(logKey)) {
        _loggedMismatches.add(logKey);
        console.warn(
          `[MoroccoMap] Province "${provinceName}" (old region: "${oldRegion}") ` +
          `belongs to "${newRegion}", not "${normalizedTarget}". Excluded.`
        );
      }
    }

    return newRegion === normalizedTarget;
  });
}

/**
 * Calculate approximate centroid of a GeoJSON feature
 */
export function getFeatureCentroid(feature: GeoJSON.Feature): { lat: number; lng: number } | null {
  const geometry = feature.geometry;
  if (!geometry) return null;

  let coords: number[][] = [];

  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0] as number[][];
  } else if (geometry.type === 'MultiPolygon') {
    // Use the largest polygon
    let maxLen = 0;
    for (const poly of geometry.coordinates) {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        coords = poly[0] as number[][];
      }
    }
  }

  if (coords.length === 0) return null;

  let sumLat = 0;
  let sumLng = 0;
  for (const coord of coords) {
    sumLng += coord[0];
    sumLat += coord[1];
  }

  return {
    lat: sumLat / coords.length,
    lng: sumLng / coords.length,
  };
}
