// Morocco regions data utilities
// Official 12 regions of Morocco (ADM1)

export const MOROCCO_REGIONS = [
  'Tanger-Tétouan-Al Hoceïma',
  'Oriental',
  'Fès-Meknès',
  'Rabat-Salé-Kénitra',
  'Béni Mellal-Khénifra',
  'Casablanca-Settat',
  'Marrakech-Safi',
  'Drâa-Tafilalet',
  'Souss-Massa',
  'Guelmim-Oued Noun',
  'Laâyoune-Sakia El Hamra',
  'Dakhla-Oued Ed Dahab',
] as const;

export type MoroccoRegion = typeof MOROCCO_REGIONS[number];

// Mapping of normalized keys to official region names
const REGION_ALIASES: Record<string, MoroccoRegion> = {
  // Tanger-Tétouan-Al Hoceïma
  'tanger': 'Tanger-Tétouan-Al Hoceïma',
  'tanger-tetouan-al hoceima': 'Tanger-Tétouan-Al Hoceïma',
  'tanger-tetouan-al hoceïma': 'Tanger-Tétouan-Al Hoceïma',
  'tanger tetouan al hoceima': 'Tanger-Tétouan-Al Hoceïma',
  'tangier-tetouan-al hoceima': 'Tanger-Tétouan-Al Hoceïma',
  'nord': 'Tanger-Tétouan-Al Hoceïma',
  'dranef nord': 'Tanger-Tétouan-Al Hoceïma',
  
  // Oriental
  'oriental': 'Oriental',
  'est': 'Oriental',
  'oujda': 'Oriental',
  'dranef est': 'Oriental',
  
  // Fès-Meknès
  'fes': 'Fès-Meknès',
  'fès': 'Fès-Meknès',
  'fes-meknes': 'Fès-Meknès',
  'fès-meknès': 'Fès-Meknès',
  'fes meknes': 'Fès-Meknès',
  'centre-nord': 'Fès-Meknès',
  'dranef centre-nord': 'Fès-Meknès',
  
  // Rabat-Salé-Kénitra
  'rabat': 'Rabat-Salé-Kénitra',
  'rabat-sale-kenitra': 'Rabat-Salé-Kénitra',
  'rabat-salé-kénitra': 'Rabat-Salé-Kénitra',
  'rabat sale kenitra': 'Rabat-Salé-Kénitra',
  'nord-ouest': 'Rabat-Salé-Kénitra',
  'dranef nord-ouest': 'Rabat-Salé-Kénitra',
  
  // Béni Mellal-Khénifra
  'beni': 'Béni Mellal-Khénifra',
  'beni-mellal': 'Béni Mellal-Khénifra',
  'beni mellal-khenifra': 'Béni Mellal-Khénifra',
  'béni mellal-khénifra': 'Béni Mellal-Khénifra',
  'beni mellal khenifra': 'Béni Mellal-Khénifra',
  'centre': 'Béni Mellal-Khénifra',
  'dranef centre': 'Béni Mellal-Khénifra',
  
  // Casablanca-Settat
  'casa': 'Casablanca-Settat',
  'casablanca': 'Casablanca-Settat',
  'casablanca-settat': 'Casablanca-Settat',
  'casablanca settat': 'Casablanca-Settat',
  'atlantique': 'Casablanca-Settat',
  'dranef atlantique': 'Casablanca-Settat',
  
  // Marrakech-Safi
  'marrakech': 'Marrakech-Safi',
  'marrakech-safi': 'Marrakech-Safi',
  'marrakech safi': 'Marrakech-Safi',
  'sud-ouest': 'Marrakech-Safi',
  'dranef sud-ouest': 'Marrakech-Safi',
  
  // Drâa-Tafilalet
  'draa': 'Drâa-Tafilalet',
  'drâa': 'Drâa-Tafilalet',
  'draa-tafilalet': 'Drâa-Tafilalet',
  'drâa-tafilalet': 'Drâa-Tafilalet',
  'draa tafilalet': 'Drâa-Tafilalet',
  'sud-est': 'Drâa-Tafilalet',
  'dranef sud-est': 'Drâa-Tafilalet',
  
  // Souss-Massa
  'souss': 'Souss-Massa',
  'souss-massa': 'Souss-Massa',
  'souss massa': 'Souss-Massa',
  'agadir': 'Souss-Massa',
  'sud': 'Souss-Massa',
  'dranef sud': 'Souss-Massa',
  
  // Guelmim-Oued Noun
  'guelmim': 'Guelmim-Oued Noun',
  'guelmim-oued noun': 'Guelmim-Oued Noun',
  'guelmim oued noun': 'Guelmim-Oued Noun',
  'guelmim-oued-noun': 'Guelmim-Oued Noun',
  'sud-profond': 'Guelmim-Oued Noun',
  'dranef sud profond': 'Guelmim-Oued Noun',
  
  // Laâyoune-Sakia El Hamra
  'laayoune': 'Laâyoune-Sakia El Hamra',
  'laâyoune': 'Laâyoune-Sakia El Hamra',
  'laayoune-sakia el hamra': 'Laâyoune-Sakia El Hamra',
  'laâyoune-sakia el hamra': 'Laâyoune-Sakia El Hamra',
  'laayoune sakia el hamra': 'Laâyoune-Sakia El Hamra',
  'sahara-nord': 'Laâyoune-Sakia El Hamra',
  'dranef sahara nord': 'Laâyoune-Sakia El Hamra',
  
  // Dakhla-Oued Ed Dahab
  'dakhla': 'Dakhla-Oued Ed Dahab',
  'dakhla-oued ed dahab': 'Dakhla-Oued Ed Dahab',
  'dakhla-oued ed-dahab': 'Dakhla-Oued Ed Dahab',
  'dakhla oued ed dahab': 'Dakhla-Oued Ed Dahab',
  'oued ed-dahab': 'Dakhla-Oued Ed Dahab',
  'sahara-sud': 'Dakhla-Oued Ed Dahab',
  'dranef sahara sud': 'Dakhla-Oued Ed Dahab',
};

/**
 * Normalize a string by removing accents, extra spaces, and converting to lowercase
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[-_]+/g, ' ') // Replace dashes/underscores with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Extract region name from GeoJSON properties
 * Handles various property naming conventions including TopoJSON format
 */
export function getRegionNameFromProperties(props: Record<string, unknown>): string {
  return (
    (props['name:en'] as string) || // TopoJSON format from morocco-map
    (props.NAME_1 as string) ||
    (props.shapeName as string) ||
    (props.region as string) ||
    (props.admin1Name as string) ||
    (props.name as string) ||
    (props.nom as string) ||
    (props.NAME as string) ||
    ''
  );
}

/**
 * Normalize a region name to match one of the 12 official Morocco regions
 * Returns the official region name or null if no match found
 */
export function normalizeRegionName(input: string): MoroccoRegion | null {
  if (!input) return null;
  
  const normalized = normalizeString(input);
  
  // Direct match in aliases
  if (REGION_ALIASES[normalized]) {
    return REGION_ALIASES[normalized];
  }
  
  // Try to find a partial match
  for (const [alias, region] of Object.entries(REGION_ALIASES)) {
    const normalizedAlias = normalizeString(alias);
    if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
      return region;
    }
  }
  
  // Check if input already matches an official region name (with accent normalization)
  for (const region of MOROCCO_REGIONS) {
    if (normalizeString(region) === normalized) {
      return region;
    }
  }
  
  return null;
}

/**
 * Get the region key for data lookup
 */
export function getRegionKey(regionName: string): string {
  const normalized = normalizeRegionName(regionName);
  return normalized || regionName;
}

// Log unmatched regions in development (once per session)
const loggedUnmatched = new Set<string>();

export function logUnmatchedRegion(regionName: string): void {
  if (process.env.NODE_ENV === 'development' && !loggedUnmatched.has(regionName)) {
    loggedUnmatched.add(regionName);
    console.warn(`[MoroccoMap] Unmatched region: "${regionName}"`);
  }
}
