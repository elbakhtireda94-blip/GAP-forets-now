/**
 * Spatial utilities for Morocco map data processing.
 * Handles point-in-polygon, province name cleaning, and province-to-region mapping.
 */

import type { FeatureCollection, Feature, Geometry } from 'geojson';

// --- Province name cleaning ---

/**
 * Clean raw geoBoundaries province names.
 * Removes prefixes like "Province de", "Préfecture de", Arabic text, etc.
 * Examples:
 *   "Province de Khémisset إقليم الخميسات" → "Khémisset"
 *   "Rhamna Province" → "Rhamna"
 *   "Préfecture de Casablanca عمالة الدار البيضاء" → "Casablanca"
 */
export function cleanProvinceName(rawName: string): string {
  if (!rawName) return '';

  let name = rawName;

  // Remove Arabic text (U+0600–U+06FF, U+0750–U+077F, U+FE70–U+FEFF ranges)
  name = name.replace(/[\u0600-\u06FF\u0750-\u077F\uFE70-\uFEFF]+/g, '').trim();

  // Remove common French prefixes
  name = name
    .replace(/^Pr[ée]fecture\s+d[eu']\s*/i, '')
    .replace(/^Province\s+d[eu']\s*/i, '')
    .replace(/^Pr[ée]fecture\s+/i, '')
    .replace(/^Province\s+/i, '')
    .trim();

  // Remove trailing "Province" or "Prefecture"
  name = name
    .replace(/\s+Province$/i, '')
    .replace(/\s+Pr[ée]fecture$/i, '')
    .trim();

  return name;
}

// --- Point-in-polygon (ray casting) ---

/**
 * Check if a point is inside a polygon using the ray casting algorithm.
 * @param point [lng, lat]
 * @param ring Array of [lng, lat] coordinates forming a closed ring
 */
function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect = (yi > py) !== (yj > py)
      && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is inside a GeoJSON geometry (Polygon or MultiPolygon).
 */
function pointInGeometry(point: [number, number], geometry: Geometry): boolean {
  if (geometry.type === 'Polygon') {
    // Check outer ring (index 0), ignore holes for simplicity
    return pointInRing(point, geometry.coordinates[0] as number[][]);
  }

  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (pointInRing(point, polygon[0] as number[][])) {
        return true;
      }
    }
  }

  return false;
}

// --- Centroid computation ---

/**
 * Calculate approximate centroid of a GeoJSON feature.
 * Uses the largest polygon ring for MultiPolygon geometries.
 * @returns [lng, lat] or null
 */
export function computeCentroid(feature: Feature): [number, number] | null {
  const geometry = feature.geometry;
  if (!geometry) return null;

  let coords: number[][] = [];

  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0] as number[][];
  } else if (geometry.type === 'MultiPolygon') {
    let maxLen = 0;
    for (const poly of geometry.coordinates) {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        coords = poly[0] as number[][];
      }
    }
  }

  if (coords.length === 0) return null;

  let sumLng = 0;
  let sumLat = 0;
  for (const coord of coords) {
    sumLng += coord[0];
    sumLat += coord[1];
  }

  return [sumLng / coords.length, sumLat / coords.length];
}

// --- Province-to-region mapping ---

/**
 * Compute province-to-region mapping by checking which region polygon
 * contains each province's centroid.
 * Both datasets must come from the same source for spatial consistency.
 * 
 * @returns Map<shapeID, regionShapeName> where regionShapeName is the
 *          normalized official region name
 */
export function computeProvinceRegionMapping(
  regionsData: FeatureCollection,
  provincesData: FeatureCollection
): Map<string, string> {
  const mapping = new Map<string, string>();

  for (const province of provincesData.features) {
    const props = province.properties || {};
    const shapeID = props.shapeID as string;

    if (!shapeID || !province.geometry) continue;

    const centroid = computeCentroid(province);
    if (!centroid) continue;

    // Find which region contains this centroid
    for (const region of regionsData.features) {
      if (!region.geometry) continue;

      const regionName = (region.properties?.shapeName as string) || '';

      if (pointInGeometry(centroid, region.geometry)) {
        mapping.set(shapeID, regionName);
        break;
      }
    }

    // Log unmapped provinces in development
    if (!mapping.has(shapeID) && import.meta.env.DEV) {
      const name = cleanProvinceName(props.shapeName as string || '');
      console.warn(`[GeoUtils] Province "${name}" (${shapeID}) could not be mapped to any region`);
    }
  }

  return mapping;
}

/**
 * Filter province features that belong to a specific region.
 * Uses pre-computed mapping for O(1) lookups.
 */
export function filterProvincesForRegion(
  features: Feature[],
  targetRegion: string,
  mapping: Map<string, string>
): Feature[] {
  return features.filter(feature => {
    const shapeID = (feature.properties?.shapeID as string) || '';
    const regionName = mapping.get(shapeID);
    return regionName === targetRegion;
  });
}

/**
 * Get clean province name from geoBoundaries feature properties.
 */
export function getProvinceDisplayName(props: Record<string, unknown>): string {
  const raw = (props.shapeName as string) || '';
  return cleanProvinceName(raw);
}

/**
 * Get region name from geoBoundaries feature properties.
 */
export function getRegionDisplayName(props: Record<string, unknown>): string {
  return (props.shapeName as string) || '';
}
