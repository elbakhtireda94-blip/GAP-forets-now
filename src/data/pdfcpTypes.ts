// PDFCP Data Types - Based on real PDFCP Tiqqui structure

export type VoletType = 
  | 'Parcours_Reboisement'
  | 'Regeneration'
  | 'Points_Eau'
  | 'Pistes_Rehabilitation'
  | 'Pistes_Ouverture'
  | 'Activites_Complementaires';

export type TypeOperation = 'Etude' | 'Execution' | 'Etude_Execution';

export type UniteType = 
  | 'ha' 
  | 'km' 
  | 'm3' 
  | 'ruche' 
  | 'plant' 
  | 'four' 
  | 'unite' 
  | 'bloc';

export interface PDFCP {
  id: string;
  titre: string;
  commune: string;
  dranef: string;
  dpanef: string;
  anneeDebut: number;
  anneeFin: number;
  dateCreation: string;
  statut: 'en_cours' | 'valide_dranef' | 'valide_cc' | 'finalise';
  adpResponsable: string;
  objectifs?: string;
  description?: string;
}

export interface PDFCPLigneProgramme {
  id_ligne: string;
  id_pdfcp: string;
  annee: number;
  volet: VoletType;
  type_operation: TypeOperation;
  foret: string;
  perimetre_ou_piste_ou_point: string;
  lieu: string;
  parc_pastoral: string;
  usagers_ou_origine_proposition: string;
  unite: UniteType;
  quantite_prevue: number;
  quantite_realisee: number;
  montant_prevu: number;
  montant_realise: number;
  coord_x_depart?: number;
  coord_y_depart?: number;
  coord_x_arrivee?: number;
  coord_y_arrivee?: number;
  programmation_commentaire: string;
  // Computed fields
  taux_realisation_quantite: number; // Calculated: (quantite_realisee / quantite_prevue) * 100
  taux_realisation_budget: number; // Calculated: (montant_realise / montant_prevu) * 100
}

// Volet configuration for display
export const voletsConfig: Record<VoletType, { label: string; icon: string; color: string }> = {
  'Parcours_Reboisement': {
    label: 'Parcours / Reboisement',
    icon: 'TreePine',
    color: 'hsl(var(--primary))'
  },
  'Regeneration': {
    label: 'Régénération',
    icon: 'Sprout',
    color: 'hsl(var(--secondary))'
  },
  'Points_Eau': {
    label: 'Points d\'eau',
    icon: 'Droplets',
    color: 'hsl(210, 70%, 50%)'
  },
  'Pistes_Rehabilitation': {
    label: 'Réhabilitation Pistes',
    icon: 'Route',
    color: 'hsl(30, 70%, 50%)'
  },
  'Pistes_Ouverture': {
    label: 'Ouverture Pistes',
    icon: 'Construction',
    color: 'hsl(45, 70%, 50%)'
  },
  'Activites_Complementaires': {
    label: 'Activités Complémentaires',
    icon: 'Package',
    color: 'hsl(280, 70%, 50%)'
  }
};

export const uniteOptions: { value: UniteType; label: string }[] = [
  { value: 'ha', label: 'Hectares (ha)' },
  { value: 'km', label: 'Kilomètres (km)' },
  { value: 'm3', label: 'Mètres cubes (m³)' },
  { value: 'ruche', label: 'Ruches' },
  { value: 'plant', label: 'Plants' },
  { value: 'four', label: 'Fours' },
  { value: 'unite', label: 'Unités' },
  { value: 'bloc', label: 'Blocs' },
];

export const typeOperationOptions: { value: TypeOperation; label: string }[] = [
  { value: 'Etude', label: 'Étude' },
  { value: 'Execution', label: 'Exécution' },
  { value: 'Etude_Execution', label: 'Étude + Exécution' },
];

// Helper function to calculate taux de realisation
export const calculateTauxRealisation = (realise: number, prevu: number): number => {
  if (prevu === 0) return 0;
  return Math.round((realise / prevu) * 100);
};

// Mock data for demo
export const mockPDFCPs: PDFCP[] = [
  {
    id: 'pdfcp-1',
    titre: 'Plan d\'action quinquennal de la commune territoriale de Tiqqui',
    commune: 'Tiqqui',
    dranef: 'Souss-Massa',
    dpanef: 'Taroudant',
    anneeDebut: 2024,
    anneeFin: 2028,
    dateCreation: '2024-01-15',
    statut: 'finalise',
    adpResponsable: 'ACHOURI Zineb',
    objectifs: 'Développement durable des ressources forestières et amélioration des conditions de vie des populations riveraines',
    description: 'Programme quinquennal intégré comprenant reboisement, régénération, aménagement des points d\'eau, réhabilitation et ouverture de pistes, et activités complémentaires.'
  }
];

export const mockLignesProgramme: PDFCPLigneProgramme[] = [
  // Parcours / Reboisement
  {
    id_ligne: 'l1',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Parcours_Reboisement',
    type_operation: 'Execution',
    foret: 'Ain Asmama',
    perimetre_ou_piste_ou_point: 'Ida Oussouar',
    lieu: 'Douar Sinit',
    parc_pastoral: 'Douar Sinit Oul Ifawne',
    usagers_ou_origine_proposition: 'Usagers',
    unite: 'ha',
    quantite_prevue: 52,
    quantite_realisee: 48,
    montant_prevu: 520000,
    montant_realise: 480000,
    programmation_commentaire: 'Action retenue dans le cadre du CP 2026',
    taux_realisation_quantite: 92,
    taux_realisation_budget: 92
  },
  {
    id_ligne: 'l2',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Parcours_Reboisement',
    type_operation: 'Execution',
    foret: 'Ain Asmama',
    perimetre_ou_piste_ou_point: 'Inzerki',
    lieu: 'Inzerki',
    parc_pastoral: 'Inzerki',
    usagers_ou_origine_proposition: 'ANEF',
    unite: 'ha',
    quantite_prevue: 200,
    quantite_realisee: 150,
    montant_prevu: 2000000,
    montant_realise: 1500000,
    programmation_commentaire: 'Chêne vert',
    taux_realisation_quantite: 75,
    taux_realisation_budget: 75
  },
  // Régénération
  {
    id_ligne: 'l3',
    id_pdfcp: 'pdfcp-1',
    annee: 2025,
    volet: 'Regeneration',
    type_operation: 'Execution',
    foret: 'Timristine',
    perimetre_ou_piste_ou_point: 'Igui Modal',
    lieu: 'Tiqqi Tamgounsi',
    parc_pastoral: 'Douar Tamgounsi',
    usagers_ou_origine_proposition: 'Usagers',
    unite: 'ha',
    quantite_prevue: 54,
    quantite_realisee: 0,
    montant_prevu: 540000,
    montant_realise: 0,
    programmation_commentaire: 'Thuya',
    taux_realisation_quantite: 0,
    taux_realisation_budget: 0
  },
  // Points d'eau
  {
    id_ligne: 'l4',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Points_Eau',
    type_operation: 'Etude',
    foret: 'Ain Asmama',
    perimetre_ou_piste_ou_point: 'Poste forestier d\'Ain Asmama',
    lieu: 'Ain Asmama',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'ANEF',
    unite: 'm3',
    quantite_prevue: 1,
    quantite_realisee: 1,
    montant_prevu: 50000,
    montant_realise: 45000,
    coord_x_depart: 131412,
    coord_y_depart: 428822,
    programmation_commentaire: 'Etude prévu en 2025',
    taux_realisation_quantite: 100,
    taux_realisation_budget: 90
  },
  {
    id_ligne: 'l5',
    id_pdfcp: 'pdfcp-1',
    annee: 2026,
    volet: 'Points_Eau',
    type_operation: 'Execution',
    foret: 'Ain Asmama',
    perimetre_ou_piste_ou_point: 'Masfour',
    lieu: 'Masfour',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'Usagers',
    unite: 'm3',
    quantite_prevue: 1,
    quantite_realisee: 0,
    montant_prevu: 150000,
    montant_realise: 0,
    coord_x_depart: 128525,
    coord_y_depart: 425008,
    programmation_commentaire: 'Matfia (Ouverture) - Exécution',
    taux_realisation_quantite: 0,
    taux_realisation_budget: 0
  },
  // Pistes Réhabilitation
  {
    id_ligne: 'l6',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Pistes_Rehabilitation',
    type_operation: 'Etude',
    foret: '-',
    perimetre_ou_piste_ou_point: 'Piste Ruché d\'Inzerki',
    lieu: 'Inzerki',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'Usagers',
    unite: 'km',
    quantite_prevue: 4.5,
    quantite_realisee: 4.5,
    montant_prevu: 90000,
    montant_realise: 85000,
    coord_x_depart: 128732,
    coord_y_depart: 428499,
    coord_x_arrivee: 131665,
    coord_y_arrivee: 429269,
    programmation_commentaire: 'Non programmée initialement',
    taux_realisation_quantite: 100,
    taux_realisation_budget: 94
  },
  // Pistes Ouverture
  {
    id_ligne: 'l7',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Pistes_Ouverture',
    type_operation: 'Etude',
    foret: '-',
    perimetre_ou_piste_ou_point: 'Piste Tamgualt-Tazntoute',
    lieu: 'Tamgualt',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'Usagers',
    unite: 'km',
    quantite_prevue: 8.3,
    quantite_realisee: 0,
    montant_prevu: 166000,
    montant_realise: 0,
    coord_x_depart: 420062,
    coord_y_depart: 417876,
    coord_x_arrivee: 128279,
    coord_y_arrivee: 125459,
    programmation_commentaire: 'Etude 2024 en cours',
    taux_realisation_quantite: 0,
    taux_realisation_budget: 0
  },
  // Activités Complémentaires
  {
    id_ligne: 'l8',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Activites_Complementaires',
    type_operation: 'Execution',
    foret: '-',
    perimetre_ou_piste_ou_point: 'Apiculture (Abeille saharienne)',
    lieu: 'Commune Tiqqui',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'Usagers/ODF',
    unite: 'ruche',
    quantite_prevue: 400,
    quantite_realisee: 200,
    montant_prevu: 200000,
    montant_realise: 100000,
    programmation_commentaire: '400 ruches prévues, 200 distribuées',
    taux_realisation_quantite: 50,
    taux_realisation_budget: 50
  },
  {
    id_ligne: 'l9',
    id_pdfcp: 'pdfcp-1',
    annee: 2025,
    volet: 'Activites_Complementaires',
    type_operation: 'Execution',
    foret: '-',
    perimetre_ou_piste_ou_point: 'Fourniture du matériel apicole',
    lieu: 'Commune Tiqqui',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'ODF',
    unite: 'bloc',
    quantite_prevue: 1,
    quantite_realisee: 0,
    montant_prevu: 50000,
    montant_realise: 0,
    programmation_commentaire: 'Prévu 2025',
    taux_realisation_quantite: 0,
    taux_realisation_budget: 0
  },
  {
    id_ligne: 'l10',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Activites_Complementaires',
    type_operation: 'Execution',
    foret: '-',
    perimetre_ou_piste_ou_point: 'Arbres fruitiers (olivier-caroubier-amandier)',
    lieu: 'Commune Tiqqui',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'Usagers',
    unite: 'plant',
    quantite_prevue: 1500,
    quantite_realisee: 1500,
    montant_prevu: 75000,
    montant_realise: 75000,
    programmation_commentaire: 'Distribution complète',
    taux_realisation_quantite: 100,
    taux_realisation_budget: 100
  },
  {
    id_ligne: 'l11',
    id_pdfcp: 'pdfcp-1',
    annee: 2024,
    volet: 'Activites_Complementaires',
    type_operation: 'Execution',
    foret: '-',
    perimetre_ou_piste_ou_point: 'Distribution de fours améliorés',
    lieu: 'Commune Tiqqui',
    parc_pastoral: '-',
    usagers_ou_origine_proposition: 'Usagers',
    unite: 'four',
    quantite_prevue: 200,
    quantite_realisee: 180,
    montant_prevu: 100000,
    montant_realise: 90000,
    programmation_commentaire: 'Distribution en cours',
    taux_realisation_quantite: 90,
    taux_realisation_budget: 90
  },
];

// Helper functions
export const getLignesByVolet = (lignes: PDFCPLigneProgramme[], volet: VoletType): PDFCPLigneProgramme[] => {
  return lignes.filter(l => l.volet === volet);
};

export const getLignesByAnnee = (lignes: PDFCPLigneProgramme[], annee: number): PDFCPLigneProgramme[] => {
  return lignes.filter(l => l.annee === annee);
};

export const getTotalsByVolet = (lignes: PDFCPLigneProgramme[], volet: VoletType) => {
  const voletLignes = getLignesByVolet(lignes, volet);
  return {
    count: voletLignes.length,
    quantitePrevue: voletLignes.reduce((sum, l) => sum + l.quantite_prevue, 0),
    quantiteRealisee: voletLignes.reduce((sum, l) => sum + l.quantite_realisee, 0),
    montantPrevu: voletLignes.reduce((sum, l) => sum + l.montant_prevu, 0),
    montantRealise: voletLignes.reduce((sum, l) => sum + l.montant_realise, 0),
    tauxQuantite: calculateTauxRealisation(
      voletLignes.reduce((sum, l) => sum + l.quantite_realisee, 0),
      voletLignes.reduce((sum, l) => sum + l.quantite_prevue, 0)
    ),
    tauxBudget: calculateTauxRealisation(
      voletLignes.reduce((sum, l) => sum + l.montant_realise, 0),
      voletLignes.reduce((sum, l) => sum + l.montant_prevu, 0)
    )
  };
};
