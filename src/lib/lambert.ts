/**
 * Utilitaires de conversion Lambert Maroc (Merchich) → WGS84
 * Zones supportées:
 * - EPSG:26191 (Lambert Nord Maroc)
 * - EPSG:26192 (Lambert Sud Maroc)
 * 
 * Point test de référence:
 * X=370918.00 Y=383649.00 (EPSG:26191) → lng≈-6.7968, lat≈34.0440
 */

import proj4 from 'proj4';

// Handle ESM/CJS compatibility for proj4
const proj4Lib = (proj4 as unknown as { default?: typeof proj4 }).default || proj4;

// Définition des projections Lambert Maroc (Merchich → WGS84)
// Source: epsg.io avec paramètres towgs84 pour transformation datum
proj4Lib.defs("EPSG:26191", "+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs");
proj4Lib.defs("EPSG:26192", "+proj=lcc +lat_1=29.7 +lat_0=29.7 +lon_0=-5.4 +k_0=0.999615596 +x_0=500000 +y_0=300000 +ellps=clrk80ign +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs");
proj4Lib.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

export type LambertZone = '26191' | '26192';

export interface LambertPoint {
  x: number;
  y: number;
}

export interface WGS84Point {
  lng: number;
  lat: number;
}

export interface ParseResult {
  success: boolean;
  points: LambertPoint[];
  errors: string[];
}

/**
 * Test de conversion au chargement (dev only)
 * Point test: X=370918 Y=383649 en EPSG:26191 → lng≈-6.7968, lat≈34.0440
 */
export function testLambertConversion(): void {
  if (import.meta.env.DEV) {
    const testX = 370918.00;
    const testY = 383649.00;
    const expectedLng = -6.7968;
    const expectedLat = 34.0440;
    
    try {
      const result = proj4Lib("EPSG:26191", "EPSG:4326", [testX, testY]);
      const [lng, lat] = result as [number, number];
      
      const lngError = Math.abs(lng - expectedLng);
      const latError = Math.abs(lat - expectedLat);
      
      console.log('🗺️ Test conversion Lambert Maroc (EPSG:26191) → WGS84:');
      console.log(`   Input: X=${testX}, Y=${testY}`);
      console.log(`   Output: lng=${lng.toFixed(4)}, lat=${lat.toFixed(4)}`);
      console.log(`   Attendu: lng=${expectedLng}, lat=${expectedLat}`);
      console.log(`   Écart: Δlng=${lngError.toFixed(4)}°, Δlat=${latError.toFixed(4)}°`);
      
      if (lngError < 0.01 && latError < 0.01) {
        console.log('   ✅ Conversion OK (écart < 0.01°)');
      } else {
        console.warn('   ⚠️ Écart significatif détecté');
      }
    } catch (error) {
      console.error('❌ Erreur test conversion Lambert:', error);
    }
  }
}

// Exécuter le test au chargement du module
testLambertConversion();

/**
 * Parse les coordonnées Lambert depuis un texte brut
 * Format attendu: 1 point par ligne, X Y séparés par espace ou virgule
 */
export function parseLambertXY(coordsText: string): ParseResult {
  const lines = coordsText.trim().split('\n').filter(line => line.trim() !== '');
  const points: LambertPoint[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    // Nettoyer la ligne et remplacer les virgules par des espaces
    const cleaned = line.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
    const parts = cleaned.split(' ');

    if (parts.length !== 2) {
      errors.push(`Ligne ${lineNum}: format invalide (attendu: X Y)`);
      return;
    }

    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);

    if (isNaN(x) || isNaN(y)) {
      errors.push(`Ligne ${lineNum}: coordonnées non numériques`);
      return;
    }

    if (x <= 100000) {
      errors.push(`Ligne ${lineNum}: X invalide (doit être > 100000)`);
      return;
    }

    if (y <= 100000) {
      errors.push(`Ligne ${lineNum}: Y invalide (doit être > 100000)`);
      return;
    }

    points.push({ x, y });
  });

  return {
    success: errors.length === 0 && points.length > 0,
    points,
    errors
  };
}

/**
 * Convertit une coordonnée Lambert Maroc vers WGS84
 * @param x - Coordonnée X (Easting) en mètres
 * @param y - Coordonnée Y (Northing) en mètres
 * @param zone - Zone Lambert ('26191' pour Nord, '26192' pour Sud)
 */
export function lambertToWGS84(x: number, y: number, zone: LambertZone): WGS84Point | null {
  try {
    const epsg = `EPSG:${zone}`;
    const result = proj4Lib(epsg, "EPSG:4326", [x, y]);
    const [lng, lat] = result as [number, number];
    
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      console.error('Conversion impossible: résultat non fini');
      return null;
    }
    
    // Validation coordonnées Maroc (lat 20..36, lng -14..-1)
    if (lat < 20 || lat > 36 || lng < -14 || lng > -1) {
      console.warn(`⚠️ Coordonnées hors Maroc: lng=${lng.toFixed(4)}, lat=${lat.toFixed(4)}`);
      console.warn('   → Vérifier la zone Lambert ou l\'ordre X/Y');
    }
    
    return { lng, lat };
  } catch (error) {
    console.error('Erreur conversion Lambert → WGS84:', error);
    return null;
  }
}

/**
 * Convertit un tableau de points Lambert vers WGS84
 */
export function convertPointsToWGS84(points: LambertPoint[], zone: LambertZone): WGS84Point[] {
  const wgs84Points: WGS84Point[] = [];
  
  for (const point of points) {
    const converted = lambertToWGS84(point.x, point.y, zone);
    if (converted) {
      wgs84Points.push(converted);
    }
  }
  
  return wgs84Points;
}

/**
 * Calcule le centroïde d'un ensemble de points WGS84
 * - Pour 1 point: retourne le point
 * - Pour plusieurs points: centre de la bounding box
 */
export function calculateCentroid(points: WGS84Point[]): WGS84Point {
  if (points.length === 0) {
    return { lng: 0, lat: 0 };
  }
  
  if (points.length === 1) {
    return { ...points[0] };
  }
  
  // Calcul du centre de la bounding box
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  for (const point of points) {
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
  }
  
  return {
    lng: (minLng + maxLng) / 2,
    lat: (minLat + maxLat) / 2
  };
}

/**
 * Calcule la distance haversine entre deux points WGS84 (en km)
 */
export function haversineDistance(p1: WGS84Point, p2: WGS84Point): number {
  const R = 6371; // Rayon de la Terre en km
  const toRad = (deg: number) => deg * Math.PI / 180;
  
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Construit un GeoJSON à partir des points WGS84
 */
export function buildGeoJSON(
  points: WGS84Point[], 
  geomType: 'Point' | 'Polygon' | 'LineString'
): GeoJSON.Geometry | null {
  if (points.length === 0) {
    return null;
  }
  
  if (geomType === 'Point') {
    if (points.length !== 1) {
      console.error('Un Point doit contenir exactement 1 coordonnée');
      return null;
    }
    return {
      type: 'Point',
      coordinates: [points[0].lng, points[0].lat]
    };
  }
  
  if (geomType === 'LineString') {
    if (points.length !== 2) {
      console.error('Une Piste (LineString) doit contenir exactement 2 points');
      return null;
    }
    return {
      type: 'LineString',
      coordinates: points.map(p => [p.lng, p.lat])
    };
  }
  
  if (geomType === 'Polygon') {
    if (points.length < 3) {
      console.error('Un Polygon doit contenir au moins 3 points');
      return null;
    }
    
    // Créer les coordonnées du polygone [lng, lat]
    const coords: [number, number][] = points.map(p => [p.lng, p.lat]);
    
    // Fermer le polygone si nécessaire (premier = dernier)
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([first[0], first[1]]);
    }
    
    return {
      type: 'Polygon',
      coordinates: [coords]
    };
  }
  
  return null;
}

/**
 * Valide les coordonnées selon le type de géométrie
 */
export function validateGeometry(
  points: LambertPoint[], 
  geomType: 'Point' | 'Polygon' | 'LineString'
): { valid: boolean; error?: string } {
  if (geomType === 'Point') {
    if (points.length !== 1) {
      return { valid: false, error: 'Point: une seule ligne X Y requise' };
    }
  }
  
  if (geomType === 'LineString') {
    if (points.length !== 2) {
      return { valid: false, error: 'Une piste doit contenir exactement 2 points (départ et arrivée)' };
    }
  }
  
  if (geomType === 'Polygon') {
    if (points.length < 3) {
      return { valid: false, error: 'Minimum 3 points requis pour un polygone' };
    }
  }
  
  return { valid: true };
}
