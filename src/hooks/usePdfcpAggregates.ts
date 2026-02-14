/**
 * Hook centralisé pour les agrégats PDFCP
 * SOURCE UNIQUE DE VÉRITÉ pour tous les KPIs, composantes et comparatifs
 * 
 * RÈGLE CRITIQUE (Architecture stable à 3 niveaux):
 * 
 * === NIVEAU PROGRAMME (ADMINISTRATIF) ===
 * Source: pdfcp.components (DatabaseContext)
 * Utilisé pour: Budget Global, Composantes, Liste PDFCP, Édition
 * 
 * === NIVEAU OPÉRATIONNEL – PRÉVU (Planification) ===
 * Source: data.pdfc_prevus (DatabaseContext) - saisies par année/localisation
 * Utilisé pour: Total Prévu, tableaux comparatifs "Prévu"
 * 
 * === NIVEAU OPÉRATIONNEL – CP (Programmation annuelle) ===
 * Source: data.pdfc_cps (DatabaseContext)
 * Utilisé pour: Total CP, tableaux "Programmé (CP)"
 * 
 * === NIVEAU OPÉRATIONNEL – EXÉCUTÉ (Réalisé) ===
 * Source: data.pdfc_exec (DatabaseContext)
 * Utilisé pour: Total Exécuté, % exec, tableaux "Exécuté"
 */

import { useMemo } from 'react';
import { useDatabase, PDFC, PDFCComponent, PdfcpLignePrevue, PdfcpLigneCP, PdfcpActionExec } from '@/contexts/DatabaseContext';
import {
  buildLignesComparatif,
  LigneComparatif,
  ActionType,
  PDFCPPrevu,
  CPProgramme,
  ActionExecutee,
  zones,
} from '@/data/comparatifTypes';
import { loadAlertes, AlerteTerrain, filterAlertesByFilters } from '@/data/alertesTypes';
import { isYearInWindow } from '@/lib/formatters';

// =====================================================
// HELPER: Parse budget_dh robuste (supporte tous formats)
// Gère: espaces, virgules, points de milliers, espaces insécables
// Ex: "30.880.000" -> 30880000, "1 500,50" -> 1500.50
// =====================================================
function parseBudgetDh(value: number | string | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  let str = String(value).trim();
  
  // Remove all spaces (including non-breaking spaces)
  str = str.replace(/[\s\u00A0]+/g, '');
  
  // Detect European format: 1.234.567,89 vs US format: 1,234,567.89
  // If we have both dots and commas, determine which is decimal separator
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  
  if (hasComma && hasDot) {
    // Check which comes last - that's likely the decimal separator
    const lastCommaIdx = str.lastIndexOf(',');
    const lastDotIdx = str.lastIndexOf('.');
    
    if (lastCommaIdx > lastDotIdx) {
      // European: 1.234.567,89 -> remove dots, replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,234,567.89 -> remove commas
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma: could be decimal (1,5) or thousands (1,000)
    // If comma is followed by exactly 2-3 digits at end, it's likely decimal
    if (/,\d{1,2}$/.test(str)) {
      str = str.replace(',', '.');
    } else {
      // It's a thousands separator, remove it
      str = str.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Only dots: could be decimal or thousands separator
    // Multiple dots = thousands separator (30.880.000)
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots = thousands separators
      str = str.replace(/\./g, '');
    }
    // Single dot: keep as is (could be 1500.50 or ambiguous)
  }
  
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// =====================================================
// HELPER: Normalize component type to ActionType
// Case-insensitive + accent-insensitive, with fallback permissif
// =====================================================
function normalizeToActionType(type: string): ActionType | null {
  if (!type) return null;
  const normalized = type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  const mappings: Record<string, ActionType> = {
    'reboisement': 'Reboisement',
    'cmd': 'CMD',
    'compensation mise en defens': 'CMD',
    'compensation': 'CMD',
    'mise en defens': 'CMD',
    'pfnl': 'PFNL',
    'produits forestiers non ligneux': 'PFNL',
    'sensibilisation': 'Sensibilisation',
    'sylvopastoralisme': 'Sylvopastoralisme',
    'sylvo': 'Sylvopastoralisme',
    'points d\'eau': 'Points_Eau',
    'points_eau': 'Points_Eau',
    'points deau': 'Points_Eau',
    'point d\'eau': 'Points_Eau',
    'pistes': 'Pistes',
    'piste': 'Pistes',
    'regeneration': 'Regeneration',
    'régénération': 'Regeneration',
    'apiculture': 'Apiculture',
    'arboriculture': 'Arboriculture',
    'equipement': 'Equipement',
    'équipement': 'Equipement',
    'activites complementaires': 'Equipement',
  };
  
  return mappings[normalized] || null;
}

// =====================================================
// HELPER: Fallback permissif - retourne le type original si non mappé
// =====================================================
function getActionTypeWithFallback(type: string): ActionType {
  const normalized = normalizeToActionType(type);
  if (normalized) return normalized;
  // Fallback: capitalize first letter
  const fallback = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return fallback as ActionType;
}

// =====================================================
// HELPER: Get commune_code from commune_id
// Uses zones.json as reference, fallback to commune_id itself
// =====================================================
function getCommuneCodeFromId(communeId: string): string {
  // First, check if communeId is already a valid commune_code in zones
  const directMatch = zones.find(z => z.commune_code === communeId);
  if (directMatch) return communeId;
  
  // Check if commune name matches
  const byName = zones.find(z => 
    z.commune.toLowerCase() === communeId.toLowerCase() ||
    z.commune_code.toLowerCase() === communeId.toLowerCase()
  );
  if (byName) return byName.commune_code;
  
  // Fallback: return the communeId as-is (permissive)
  return communeId;
}

// Calculate total budget from PDFCP components (PROGRAMME)
function getTotalBudget(components: PDFCComponent[] | undefined): number {
  if (!components || components.length === 0) return 0;
  return components.reduce((sum, c) => sum + parseBudgetDh(c.budget_dh), 0);
}

// =====================================================
// HELPER: Generate fallback PDFCPPrevu from PDFCP components
// Used when no operational lines have been entered
// =====================================================
function generateFallbackPrevusFromComponents(
  pdfcp: PDFC,
  communeCode: string
): PDFCPPrevu[] {
  if (!pdfcp.components || pdfcp.components.length === 0) return [];
  
  return pdfcp.components.map((comp, idx) => {
    // Determine unite and quantite from component data
    let unite: string = 'u';
    let quantite: number = 0;
    
    if (comp.surface_ha && comp.surface_ha > 0) {
      unite = 'ha';
      quantite = comp.surface_ha;
    } else if ((comp as any).longueur_km && (comp as any).longueur_km > 0) {
      unite = 'km';
      quantite = (comp as any).longueur_km;
    } else if ((comp as any).nombre && (comp as any).nombre > 0) {
      unite = 'u';
      quantite = (comp as any).nombre;
    }
    
    const actionType = getActionTypeWithFallback(comp.type);
    
    return {
      id: `AUTO-${pdfcp.id}-${idx}`,
      commune_code: communeCode,
      perimetre_id: `PER-AUTO-${pdfcp.id}-${idx}`,
      site_id: `SITE-AUTO-${pdfcp.id}-${idx}`,
      action_type: actionType,
      annee: pdfcp.year_start, // Année par défaut
      unite: unite,
      quantite_prevue: quantite,
      budget_prevu: parseBudgetDh(comp.budget_dh),
    };
  });
}

// =====================================================
// Convert PdfcpLignePrevue (DatabaseContext) to PDFCPPrevu format
// =====================================================
function lignePrevueToPDFCPPrevu(ligne: PdfcpLignePrevue, communeCode: string): PDFCPPrevu {
  const actionType = getActionTypeWithFallback(ligne.action_type);
  const perimetreId = `PER-${ligne.id}`;
  const siteId = `SITE-${ligne.id}`;
  
  return {
    id: ligne.id,
    commune_code: communeCode,
    perimetre_id: perimetreId,
    site_id: siteId,
    action_type: actionType,
    annee: ligne.annee,
    unite: ligne.unite || 'ha',
    quantite_prevue: ligne.quantite_physique,
    budget_prevu: parseBudgetDh(ligne.budget_prevu_dh),
  };
}

// =====================================================
// Convert PdfcpLigneCP (DatabaseContext) to CPProgramme format
// =====================================================
function ligneCpToCPProgramme(ligne: PdfcpLigneCP, communeCode: string): CPProgramme {
  const actionType = getActionTypeWithFallback(ligne.action_type);
  const perimetreId = `PER-${ligne.id}`;
  const siteId = `SITE-${ligne.id}`;
  
  return {
    id: ligne.id,
    commune_code: communeCode,
    perimetre_id: perimetreId,
    site_id: siteId,
    action_type: actionType,
    annee: ligne.annee,
    unite: ligne.unite || 'ha',
    quantite_programmee: ligne.quantite_programmee,
    budget_programme: ligne.budget_programme_dh,
    reference_cp: ligne.reference_cp || `CP-${ligne.annee}`,
  };
}

// =====================================================
// Convert PdfcpActionExec (DatabaseContext) to ActionExecutee format
// =====================================================
function actionExecToActionExecutee(action: PdfcpActionExec, communeCode: string): ActionExecutee {
  const actionType = getActionTypeWithFallback(action.action_type);
  const perimetreId = `PER-${action.id}`;
  const siteId = `SITE-${action.id}`;
  
  return {
    id: action.id,
    commune_code: communeCode,
    perimetre_id: perimetreId,
    site_id: siteId,
    action_type: actionType,
    annee: action.annee,
    date_realisation: action.date_realisation || new Date().toISOString().split('T')[0],
    quantite_realisee: action.quantite_realisee,
    cout_reel: action.cout_reel_dh,
    statut: action.statut || 'termine',
    preuve_url: action.preuve_url,
    observations: action.observations,
  };
}

export interface PdfcpComposante {
  type: string;
  label: string;
  surface_ha: number;
  budget_dh: number;
  unite?: string;
}

export interface ComparatifTotals {
  totalPrevu: number;
  totalCP: number;
  totalExecute: number;
  tauxVsPdfcp: number;
  tauxVsCp: number;
}

/**
 * Écart entre PROGRAMME et OPÉRATIONNEL
 */
export interface EcartBudget {
  delta: number;
  ratio: number;
  isCoherent: boolean;
  message: string;
}

export interface PdfcpAggregates {
  pdfcp: PDFC | null;
  
  // === NIVEAU PROGRAMME (ADMINISTRATIF) - Source: pdfcp.components ===
  pdfcpComposantes: PdfcpComposante[];
  budgetGlobal: number;
  composantesCount: number;
  
  // === NIVEAU OPÉRATIONNEL (EXÉCUTION) - Sources: pdfc_prevus, pdfc_cps, pdfc_exec ===
  lignesComparatif: LigneComparatif[];
  allLignes: LigneComparatif[];
  comparatifTotals: ComparatifTotals;
  
  // Lignes saisies (pour les formulaires)
  lignesPrevues: PdfcpLignePrevue[];
  lignesCps: PdfcpLigneCP[];
  lignesExec: PdfcpActionExec[];
  
  // === ÉCART AUTOMATIQUE ===
  ecart: EcartBudget;
  
  allowedActionTypes: string[] | undefined;
  communeCode: string;
  
  alertes: AlerteTerrain[];
  filteredAlertes: AlerteTerrain[];
  alertesCount: number;
  
  debug: {
    pdfcpId: string | undefined;
    communeId: string | undefined;
    communeCode: string;
    yearStart: number | undefined;
    yearEnd: number | undefined;
    nbLignesTotal: number;
    nbLignesInWindow: number;
    nbLignesPrevues: number;
    nbLignesCps: number;
    nbLignesExec: number;
    useFallback: boolean;
    pdfcpComponentsRaw: PDFCComponent[] | undefined;
    budgetProgramme: number;
    budgetOperationnel: number;
    ecart: EcartBudget;
  };
}

export function usePdfcpAggregates(pdfcpId: string | undefined): PdfcpAggregates {
  const { 
    pdfcs, 
    getPdfcPrevusByPdfcId, 
    getPdfcCpsByPdfcId,
    getPdfcExecByPdfcId,
    getCommuneName 
  } = useDatabase();
  
  // 1. Load PDFCP from database - depend on pdfcs array for reactivity
  const pdfcp = useMemo(() => {
    if (!pdfcpId) return null;
    return pdfcs.find(p => p.id === pdfcpId) || null;
  }, [pdfcpId, pdfcs]);
  
  // 2. Determine commune_code using robust mapping via zones.json
  const communeCode = useMemo(() => {
    if (!pdfcp) return '';
    return getCommuneCodeFromId(pdfcp.commune_id);
  }, [pdfcp]);
  
  // 3. === PDFCP COMPONENTS FROM DATABASE (NIVEAU PROGRAMME) ===
  const pdfcpComposantes = useMemo((): PdfcpComposante[] => {
    if (!pdfcp?.components) return [];
    return pdfcp.components.map(c => ({
      type: c.type,
      label: c.type,
      surface_ha: c.surface_ha || 0,
      budget_dh: parseBudgetDh(c.budget_dh),
    }));
  }, [pdfcp?.components]);
  
  const budgetGlobal = useMemo(() => getTotalBudget(pdfcp?.components), [pdfcp?.components]);
  const composantesCount = pdfcpComposantes.length;
  
  // 4. === LIGNES SAISIES (NIVEAU OPÉRATIONNEL) ===
  const lignesPrevues = useMemo(() => {
    if (!pdfcpId) return [];
    return getPdfcPrevusByPdfcId(pdfcpId);
  }, [pdfcpId, getPdfcPrevusByPdfcId]);
  
  const lignesCps = useMemo(() => {
    if (!pdfcpId) return [];
    return getPdfcCpsByPdfcId(pdfcpId);
  }, [pdfcpId, getPdfcCpsByPdfcId]);
  
  const lignesExec = useMemo(() => {
    if (!pdfcpId) return [];
    return getPdfcExecByPdfcId(pdfcpId);
  }, [pdfcpId, getPdfcExecByPdfcId]);
  
  // 5. Derive allowed action types from PDFCP components (permissive fallback)
  const allowedActionTypes = useMemo(() => {
    if (!pdfcp?.components || pdfcp.components.length === 0) return undefined;
    
    const allowed = new Set<string>();
    pdfcp.components.forEach(comp => {
      const actionType = getActionTypeWithFallback(comp.type);
      allowed.add(actionType);
    });
    
    return allowed.size > 0 ? Array.from(allowed) : undefined;
  }, [pdfcp?.components]);
  
  // 6. Load alertes
  const alertes = useMemo(() => loadAlertes(), []);
  
  // 7. Filter alertes for this PDFCP's commune
  const filteredAlertes = useMemo(() => {
    if (!communeCode) return [];
    return filterAlertesByFilters(alertes, { commune_code: communeCode });
  }, [alertes, communeCode]);
  
  const alertesCount = filteredAlertes.filter(a => a.statut !== 'resolue').length;
  
  // 8. === CONVERT LIGNES PRÉVUES TO PDFCPPrevu FORMAT (avec FALLBACK AUTO) ===
  const useFallback = lignesPrevues.length === 0 && (pdfcp?.components?.length ?? 0) > 0;
  
  const dynamicPrevus = useMemo((): PDFCPPrevu[] => {
    if (!pdfcp || !communeCode) return [];
    
    // Priorité aux lignes saisies
    if (lignesPrevues.length > 0) {
      return lignesPrevues.map(lp => lignePrevueToPDFCPPrevu(lp, communeCode));
    }
    
    // Fallback: générer depuis les composantes programme
    if (pdfcp.components && pdfcp.components.length > 0) {
      return generateFallbackPrevusFromComponents(pdfcp, communeCode);
    }
    
    return [];
  }, [pdfcp, communeCode, lignesPrevues]);
  
  // 9. Convert CP lines to CPProgramme format
  const dynamicCps = useMemo((): CPProgramme[] => {
    if (!communeCode) return [];
    return lignesCps.map(lc => ligneCpToCPProgramme(lc, communeCode));
  }, [lignesCps, communeCode]);
  
  // 10. Convert Exec lines to ActionExecutee format
  const dynamicExec = useMemo((): ActionExecutee[] => {
    if (!communeCode) return [];
    return lignesExec.map(le => actionExecToActionExecutee(le, communeCode));
  }, [lignesExec, communeCode]);
  
  // 11. Build custom labels map for saisies ET fallback AUTO
  const customLabels = useMemo(() => {
    const map = new Map<string, { commune: string; perimetre: string; site: string }>();
    
    // Labels pour les lignes prévues saisies
    lignesPrevues.forEach(lp => {
      const key = `${communeCode}|PER-${lp.id}|SITE-${lp.id}`;
      map.set(key, {
        commune: lp.commune_label || getCommuneName(lp.commune_id || '') || communeCode,
        perimetre: lp.perimetre_label || 'N/A',
        site: lp.site_label || 'N/A',
      });
    });
    
    // Labels pour les lignes CP saisies
    lignesCps.forEach(lc => {
      const key = `${communeCode}|PER-${lc.id}|SITE-${lc.id}`;
      map.set(key, {
        commune: lc.commune_label || getCommuneName(lc.commune_id || '') || communeCode,
        perimetre: lc.perimetre_label || 'N/A',
        site: lc.site_label || 'N/A',
      });
    });
    
    // Labels pour les lignes Exec saisies
    lignesExec.forEach(le => {
      const key = `${communeCode}|PER-${le.id}|SITE-${le.id}`;
      map.set(key, {
        commune: le.commune_label || getCommuneName(le.commune_id || '') || communeCode,
        perimetre: le.perimetre_label || 'N/A',
        site: le.site_label || 'N/A',
      });
    });
    
    // Labels pour les lignes AUTO (fallback depuis components)
    if (pdfcp?.components && lignesPrevues.length === 0) {
      pdfcp.components.forEach((comp, idx) => {
        const key = `${communeCode}|PER-AUTO-${pdfcp.id}-${idx}|SITE-AUTO-${pdfcp.id}-${idx}`;
        map.set(key, {
          commune: getCommuneName(pdfcp.commune_id) || communeCode,
          perimetre: 'Programme',
          site: comp.type,
        });
      });
    }
    
    return map;
  }, [lignesPrevues, lignesCps, lignesExec, communeCode, getCommuneName, pdfcp]);
  
  // 12. === BUILD COMPARATIF LINES ===
  const allLignes = useMemo(() => {
    if (!pdfcp || !communeCode) return [];
    
    if (dynamicPrevus.length === 0) return [];
    
    return buildLignesComparatif(alertes, {
      communeCode: communeCode,
      allowedActionTypes: allowedActionTypes as ActionType[] | undefined,
      overridePrevus: dynamicPrevus,
      overrideCps: dynamicCps,
      overrideExec: dynamicExec,
      customLabels: customLabels,
    });
  }, [alertes, pdfcp, communeCode, allowedActionTypes, dynamicPrevus, dynamicCps, dynamicExec, customLabels]);
  
  // 13. Filter lignes to only those within PDFCP year window
  const lignesComparatif = useMemo(() => {
    if (!pdfcp) return [];
    return allLignes.filter(l => 
      isYearInWindow(l.annee, pdfcp.year_start, pdfcp.year_end)
    );
  }, [allLignes, pdfcp]);
  
  // 14. Calculate COMPARATIF totals (NIVEAU OPÉRATIONNEL) - 3 sources distinctes
  const comparatifTotals = useMemo((): ComparatifTotals => {
    // Calculate totals from the actual source data (not comparatif)
    // to ensure accurate calculations
    const yearStart = pdfcp?.year_start ?? 0;
    const yearEnd = pdfcp?.year_end ?? 9999;
    
    // Total Prévu from lignes prévues (or fallback)
    const totalPrevu = dynamicPrevus
      .filter(p => p.annee >= yearStart && p.annee <= yearEnd)
      .reduce((sum, p) => sum + p.budget_prevu, 0);
    
    // Total CP from lignes CP
    const totalCP = dynamicCps
      .filter(c => c.annee >= yearStart && c.annee <= yearEnd)
      .reduce((sum, c) => sum + c.budget_programme, 0);
    
    // Total Exécuté from lignes Exec
    const totalExecute = dynamicExec
      .filter(e => e.annee >= yearStart && e.annee <= yearEnd)
      .reduce((sum, e) => sum + e.cout_reel, 0);
    
    const tauxVsPdfcp = totalPrevu > 0 ? Math.round((totalExecute / totalPrevu) * 100) : 0;
    const tauxVsCp = totalCP > 0 ? Math.round((totalExecute / totalCP) * 100) : 0;
    
    return { totalPrevu, totalCP, totalExecute, tauxVsPdfcp, tauxVsCp };
  }, [pdfcp, dynamicPrevus, dynamicCps, dynamicExec]);
  
  // 15. === CALCUL AUTOMATIQUE DE L'ÉCART (AUDIT INTELLIGENT) ===
  const ecart = useMemo((): EcartBudget => {
    const budgetProgramme = budgetGlobal;
    const budgetOperationnel = comparatifTotals.totalPrevu;
    const delta = budgetOperationnel - budgetProgramme;
    const ratio = Math.abs(delta) / Math.max(1, budgetProgramme);
    
    // Cas 1: Fallback AUTO actif (lignesPrevues vides mais components existent)
    if (lignesPrevues.length === 0 && (pdfcp?.components?.length ?? 0) > 0) {
      return {
        delta: 0,
        ratio: 0,
        isCoherent: true,
        message: 'ℹ️ Prévu non saisi : basé automatiquement sur les composantes du programme',
      };
    }
    
    // Cas 2: Aucune composante ET aucune ligne prévue
    if (lignesPrevues.length === 0 && (!pdfcp?.components || pdfcp.components.length === 0)) {
      return {
        delta: 0,
        ratio: 0,
        isCoherent: false,
        message: '⚠️ Aucune composante programme / aucune ligne prévue',
      };
    }
    
    // Cas 3: Lignes saisies -> calcul delta/ratio normal
    const isCoherent = ratio <= 0.01; // 1% tolerance
    
    let message: string;
    if (isCoherent) {
      message = '✅ Données cohérentes';
    } else if (delta > 0) {
      message = `⚠️ Écart détecté: +${delta.toLocaleString()} DH`;
    } else {
      message = `⚠️ Écart détecté: ${delta.toLocaleString()} DH`;
    }
    
    return { delta, ratio, isCoherent, message };
  }, [budgetGlobal, comparatifTotals.totalPrevu, lignesPrevues.length, pdfcp?.components]);
  
  // 16. Debug info
  const debug = useMemo(() => ({
    pdfcpId,
    communeId: pdfcp?.commune_id,
    communeCode,
    yearStart: pdfcp?.year_start,
    yearEnd: pdfcp?.year_end,
    nbLignesTotal: allLignes.length,
    nbLignesInWindow: lignesComparatif.length,
    nbLignesPrevues: lignesPrevues.length,
    nbLignesCps: lignesCps.length,
    nbLignesExec: lignesExec.length,
    useFallback,
    pdfcpComponentsRaw: pdfcp?.components,
    budgetProgramme: budgetGlobal,
    budgetOperationnel: comparatifTotals.totalPrevu,
    ecart,
  }), [pdfcpId, pdfcp, communeCode, allLignes.length, lignesComparatif.length, lignesPrevues.length, lignesCps.length, lignesExec.length, useFallback, budgetGlobal, comparatifTotals.totalPrevu, ecart]);
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PDFCP] PROGRAMME:', pdfcpId, 'budget=', budgetGlobal, 'composantes=', composantesCount);
    console.log('[PDFCP] OPERATIONNEL:', pdfcpId, 'prevues=', lignesPrevues.length, 'cps=', lignesCps.length, 'exec=', lignesExec.length, 'fallback=', useFallback);
    console.log('[PDFCP] TOTALS:', 'prévu=', comparatifTotals.totalPrevu, 'cp=', comparatifTotals.totalCP, 'exec=', comparatifTotals.totalExecute);
    console.log('[PDFCP] ECART:', ecart.message);
  }
  
  return {
    pdfcp,
    // === NIVEAU PROGRAMME (ADMINISTRATIF) ===
    pdfcpComposantes,
    budgetGlobal,
    composantesCount,
    // === NIVEAU OPÉRATIONNEL (EXÉCUTION) ===
    lignesComparatif,
    allLignes,
    comparatifTotals,
    lignesPrevues,
    lignesCps,
    lignesExec,
    // === ÉCART AUTOMATIQUE ===
    ecart,
    // Autres
    allowedActionTypes,
    communeCode,
    alertes,
    filteredAlertes,
    alertesCount,
    debug,
  };
}