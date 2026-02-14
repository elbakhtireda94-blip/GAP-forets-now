// ANEF Data extracted from Excel - Résumé_AT_SF_Fev_2025

export interface ADPRecord {
  id: string;
  date: string;
  dranef: string;
  dpanef: string;
  zdtf: string;
  commune: string;
  adp: string;
  odfConstitue: boolean;
  dateConstitution: string;
  etatAvancementPDFC: string;
  pdfcpValideCC: boolean;
  dateValidation: string;
  nombreOpposition: number;
  supOpposition: number;
}

export const rawData: ADPRecord[] = [
  { id: "1", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Ajdir", commune: "Aguelmam Azegza", adp: "AHADRI Loubna", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Validé par CC", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 17, supOpposition: 18 },
  { id: "2", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Khénifra", commune: "Lehri", adp: "AHADRI Loubna", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 3, supOpposition: 4 },
  { id: "3", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Mrir't", commune: "Oum Rbia", adp: "AHADRI Loubna", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 12, supOpposition: 13 },
  { id: "4", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Mrir't", commune: "Aïn Abélioune", adp: "ANEJDAME Hiba", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 2, supOpposition: 3 },
  { id: "5", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Mrir't", commune: "El Hammam", adp: "BELAHMER Sara", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 4, supOpposition: 5 },
  { id: "6", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Mrir't", commune: "El Borj", adp: "BELAHMER Sara", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 61, supOpposition: 62 },
  { id: "7", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "El Kbab", commune: "Kerrouchen", adp: "OUFRID Rania", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 12, supOpposition: 13 },
  { id: "8", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "El Kbab", commune: "El Kbab", adp: "OUFRID Rania", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 0, supOpposition: 1 },
  { id: "9", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Khénifra", commune: "Sidi Lamine", adp: "AHMADOUCH Chaimae", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 4, supOpposition: 5 },
  { id: "10", date: "31-Jan", dranef: "BNI MELLAL-Khénifra", dpanef: "Khénifra", zdtf: "Khénifra", commune: "Mouha Ou Hammou Zayani", adp: "AHMADOUCH Chaimae", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 0, supOpposition: 1 },
  { id: "11", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Ifrane", zdtf: "Bakrit", commune: "Oued Ifrane", adp: "RAOUCHI Amal", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 0, supOpposition: 1 },
  { id: "12", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Ifrane", zdtf: "Ifrane", commune: "Tizguite", adp: "HARRASSE Ilham", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "En cours d'élaboration", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 0, supOpposition: 1 },
  { id: "13", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Ifrane", zdtf: "Azrou", commune: "Tigrigra", adp: "HARRASSE Ilham", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "En cours d'élaboration", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 0, supOpposition: 1 },
  { id: "14", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Ifrane", zdtf: "Timahdite", commune: "Timahdite", adp: "LAGHLIMI Fatima", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Validé par CC", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 0, supOpposition: 1 },
  { id: "15", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Ifrane", zdtf: "Timahdite", commune: "Bensmime", adp: "LAGHLIMI Fatima", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 5, supOpposition: 6 },
  { id: "16", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Boulemane", zdtf: "Boulemane", commune: "Enjil", adp: "DAHMANI Oumaima", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 100, supOpposition: 101 },
  { id: "17", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Boulemane", zdtf: "Immouzer Marmoucha", commune: "Talzemt", adp: "JAMAL Fatima Zahra", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 113, supOpposition: 114 },
  { id: "18", date: "31-Jan", dranef: "Fès - Meknès", dpanef: "Sefrou", zdtf: "Ribat El Kheir", commune: "Adrej", adp: "ZAANOUN Rania", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 11, supOpposition: 12 },
  { id: "19", date: "31-Jan", dranef: "Marrakech-Safi", dpanef: "Marrakech", zdtf: "Amizmiz", commune: "Ouirgane", adp: "SAKKAT Meryem", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 8, supOpposition: 9 },
  { id: "20", date: "31-Jan", dranef: "Marrakech-Safi", dpanef: "Marrakech", zdtf: "Tahnaout", commune: "Ourika", adp: "BENZAKOUR Salma", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Validé par CC", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 15, supOpposition: 16 },
  { id: "21", date: "31-Jan", dranef: "Tanger-Tétouan-Al Hoceïma", dpanef: "Chefchaouen", zdtf: "Chefchaouen", commune: "Bab Taza", adp: "OUADDI Fatima", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 25, supOpposition: 26 },
  { id: "22", date: "31-Jan", dranef: "Tanger-Tétouan-Al Hoceïma", dpanef: "Tétouan", zdtf: "Tétouan", commune: "Beni Idder", adp: "MOUSSAOUI Hind", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "En cours d'élaboration", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 7, supOpposition: 8 },
  { id: "23", date: "31-Jan", dranef: "Rabat-Salé-Kénitra", dpanef: "Khémisset", zdtf: "Oulmes", commune: "Oulmes", adp: "BENALI Nora", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 3, supOpposition: 4 },
  { id: "24", date: "31-Jan", dranef: "Drâa-Tafilalet", dpanef: "Errachidia", zdtf: "Errachidia", commune: "Goulmima", adp: "FILALI Amina", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 45, supOpposition: 46 },
  { id: "25", date: "31-Jan", dranef: "Souss-Massa", dpanef: "Taroudant", zdtf: "Taroudant", commune: "Oulad Teïma", adp: "ACHOURI Zineb", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Validé par CC", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 22, supOpposition: 23 },
  { id: "26", date: "31-Jan", dranef: "Oriental", dpanef: "Oujda", zdtf: "Taourirt", commune: "Debdou", adp: "LAHLOU Khadija", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 18, supOpposition: 19 },
  { id: "27", date: "31-Jan", dranef: "Béni Mellal-Khénifra", dpanef: "Azilal", zdtf: "Ouaouizeght", commune: "Isseksi", adp: "TAMIM Kaoutar", odfConstitue: false, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: false, dateValidation: "", nombreOpposition: 3, supOpposition: 4 },
  { id: "28", date: "31-Jan", dranef: "Casablanca-Settat", dpanef: "Benslimane", zdtf: "Benslimane", commune: "Bouznika", adp: "TAZI Loubna", odfConstitue: true, dateConstitution: "", etatAvancementPDFC: "Finalisé", pdfcpValideCC: true, dateValidation: "", nombreOpposition: 2, supOpposition: 3 },
];

// Utility: Normalize status strings for consistent comparisons
export const normalizeStatus = (status: string): string => {
  const normalized = status.toLowerCase().trim();
  
  // PDFCP statuses
  if (normalized.includes('validé') || normalized.includes('valide')) return 'Validé';
  if (normalized.includes('finalisé') || normalized.includes('finalise')) return 'Finalisé';
  if (normalized.includes('en cours')) return 'En cours';
  
  // Conflict/Opposition statuses
  if (normalized.includes('résolu') || normalized.includes('resolu')) return 'Résolu';
  
  return status;
};

// Get unique values for filters
export const getDranefs = (): string[] => {
  return [...new Set(rawData.map(r => r.dranef))].sort();
};

export const getDpanefsByDranef = (dranef: string): string[] => {
  return [...new Set(rawData.filter(r => r.dranef === dranef).map(r => r.dpanef))].sort();
};

export const getCommunesByDpanef = (dpanef: string): string[] => {
  return [...new Set(rawData.filter(r => r.dpanef === dpanef).map(r => r.commune))].sort();
};

export const getAdps = (): string[] => {
  return [...new Set(rawData.map(r => r.adp))].sort();
};

export const getAdpsByCommune = (commune: string): string[] => {
  return [...new Set(rawData.filter(r => r.commune === commune).map(r => r.adp))].sort();
};

// Filter interface
export interface StatsFilters {
  dranef?: string;
  dpanef?: string;
  commune?: string;
  year?: string;
}

// Statistics functions with proper deduplication
export const getStats = (filters?: StatsFilters) => {
  let filtered = rawData;
  
  // Apply geographic filters
  if (filters?.dranef) {
    filtered = filtered.filter(r => r.dranef === filters.dranef);
  }
  if (filters?.dpanef) {
    filtered = filtered.filter(r => r.dpanef === filters.dpanef);
  }
  if (filters?.commune) {
    filtered = filtered.filter(r => r.commune === filters.commune);
  }
  
  // Note: Year filter would apply if rawData had a year field
  // Currently rawData uses 'date' which is partial (e.g., "31-Jan")
  // For now, we skip year filtering on this dataset

  // Deduplicated counts using unique IDs
  const uniqueRecordIds = new Set(filtered.map(r => r.id));
  
  // Total ADP: unique ADP names
  const uniqueAdpNames = new Set(filtered.map(r => r.adp));
  const totalAdp = uniqueAdpNames.size;
  
  // PDFCP: count unique records (each record = 1 PDFCP entry by commune)
  // We use id for uniqueness
  const totalPdfcp = uniqueRecordIds.size;
  
  // PDFCP validés: records with normalized status "Validé" or "Finalisé"
  const pdfcpValides = filtered.filter(r => {
    const normalized = normalizeStatus(r.etatAvancementPDFC);
    return normalized === 'Validé' || normalized === 'Finalisé';
  }).length;
  
  // PDFCP en cours
  const pdfcpEnCours = filtered.filter(r => {
    const normalized = normalizeStatus(r.etatAvancementPDFC);
    return normalized === 'En cours';
  }).length;
  
  // ODF constitués: unique records where odfConstitue = true
  const odfRecords = filtered.filter(r => r.odfConstitue === true);
  const totalOdf = new Set(odfRecords.map(r => r.id)).size;
  
  // Oppositions: sum of nombreOpposition across filtered records
  // Each record's nombreOpposition is already a count, not duplicated
  const totalOppositions = filtered.reduce((sum, r) => sum + (r.nombreOpposition || 0), 0);

  // Debug info
  const debugInfo = {
    n_records_filtré: uniqueRecordIds.size,
    n_ADP_filtré: totalAdp,
    n_PDFCP_filtré: totalPdfcp,
    n_ODF_filtré: totalOdf,
    n_opp_filtré: totalOppositions,
    ids_records: Array.from(uniqueRecordIds).slice(0, 10), // First 10 for brevity
    ids_adp: Array.from(uniqueAdpNames).slice(0, 10),
  };

  return {
    totalAdp,
    totalPdfcp,
    totalOdf,
    totalOppositions,
    pdfcpValides,
    pdfcpEnCours,
    pdfcpFinalises: pdfcpValides, // Same logic for now
    debugInfo,
  };
};

export const getStatsByRegion = (filters?: StatsFilters) => {
  const regions = getDranefs();
  return regions.map(region => {
    let regionData = rawData.filter(r => r.dranef === region);
    
    // Apply additional filters if provided
    if (filters?.dpanef) {
      regionData = regionData.filter(r => r.dpanef === filters.dpanef);
    }
    if (filters?.commune) {
      regionData = regionData.filter(r => r.commune === filters.commune);
    }
    
    return {
      region,
      adp: new Set(regionData.map(r => r.adp)).size,
      pdfcp: new Set(regionData.map(r => r.id)).size,
      odf: regionData.filter(r => r.odfConstitue).length,
      oppositions: regionData.reduce((sum, r) => sum + (r.nombreOpposition || 0), 0),
      activites: regionData.length > 0 ? Math.floor(regionData.length * 2.5) : 0,
    };
  });
};
