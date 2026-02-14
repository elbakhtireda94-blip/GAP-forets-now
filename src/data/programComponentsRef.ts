/**
 * Référentiel des Composantes de Programme PDFCP
 * SOURCE DE VÉRITÉ pour les types d'actions et leurs unités
 * 
 * Chaque composante définit:
 * - id: identifiant unique (correspond à ActionType)
 * - label: libellé affiché
 * - default_unit: unité par défaut (auto-remplie à la sélection)
 * - allowed_units: unités autorisées (pour validation)
 * - input_type: type de saisie quantité
 * - category: catégorie pour regroupement
 */

export interface ProgramComponentRef {
  id: string;
  label: string;
  default_unit: string;
  allowed_units: string[];
  input_type: 'number' | 'integer';
  category: string;
}

export const PROGRAM_COMPONENTS_REF: ProgramComponentRef[] = [
  {
    id: 'Reboisement',
    label: 'Reboisement',
    default_unit: 'ha',
    allowed_units: ['ha'],
    input_type: 'number',
    category: 'Forêt',
  },
  {
    id: 'Regeneration',
    label: 'Régénération',
    default_unit: 'ha',
    allowed_units: ['ha'],
    input_type: 'number',
    category: 'Forêt',
  },
  {
    id: 'CMD',
    label: 'Compensation Mise en Défens',
    default_unit: 'ha',
    allowed_units: ['ha'],
    input_type: 'number',
    category: 'Parcours',
  },
  {
    id: 'Pistes',
    label: 'Pistes',
    default_unit: 'km',
    allowed_units: ['km', 'ml'],
    input_type: 'number',
    category: 'Infrastructure',
  },
  {
    id: 'Points_Eau',
    label: 'Points d\'eau',
    default_unit: 'u',
    allowed_units: ['u'],
    input_type: 'integer',
    category: 'Infrastructure',
  },
  {
    id: 'PFNL',
    label: 'Produits Forestiers Non Ligneux',
    default_unit: 'kg',
    allowed_units: ['kg', 'm3'],
    input_type: 'number',
    category: 'Production',
  },
  {
    id: 'Sensibilisation',
    label: 'Sensibilisation',
    default_unit: 'sessions',
    allowed_units: ['sessions', 'u'],
    input_type: 'integer',
    category: 'Social',
  },
  {
    id: 'Sylvopastoralisme',
    label: 'Sylvopastoralisme',
    default_unit: 'ha',
    allowed_units: ['ha'],
    input_type: 'number',
    category: 'Parcours',
  },
  {
    id: 'Apiculture',
    label: 'Apiculture',
    default_unit: 'ruches',
    allowed_units: ['ruches', 'u'],
    input_type: 'integer',
    category: 'Production',
  },
  {
    id: 'Arboriculture',
    label: 'Arboriculture',
    default_unit: 'ha',
    allowed_units: ['ha'],
    input_type: 'number',
    category: 'Agroforesterie',
  },
  {
    id: 'Equipement',
    label: 'Équipement',
    default_unit: 'u',
    allowed_units: ['u'],
    input_type: 'integer',
    category: 'Équipement',
  },
];

/**
 * Récupère la composante par son ID
 */
export const getComponentById = (id: string): ProgramComponentRef | undefined => {
  return PROGRAM_COMPONENTS_REF.find(c => c.id === id);
};

/**
 * Récupère l'unité par défaut pour un type d'action
 */
export const getDefaultUnit = (actionType: string): string => {
  const component = getComponentById(actionType);
  return component?.default_unit || 'u';
};

/**
 * Récupère les unités autorisées pour un type d'action
 */
export const getAllowedUnits = (actionType: string): string[] => {
  const component = getComponentById(actionType);
  return component?.allowed_units || ['u'];
};

/**
 * Vérifie si une unité est valide pour un type d'action
 */
export const isUnitValid = (actionType: string, unit: string): boolean => {
  const allowedUnits = getAllowedUnits(actionType);
  return allowedUnits.includes(unit);
};

/**
 * Valide et retourne l'unité corrigée si nécessaire
 * Retourne { valid: true, unit } si l'unité est correcte
 * Retourne { valid: false, unit: default_unit, expected: default_unit } si incohérente
 */
export const validateUnit = (actionType: string, unit: string): {
  valid: boolean;
  unit: string;
  expected?: string;
} => {
  const component = getComponentById(actionType);
  if (!component) {
    return { valid: true, unit };
  }
  
  if (component.allowed_units.includes(unit)) {
    return { valid: true, unit };
  }
  
  return {
    valid: false,
    unit: component.default_unit,
    expected: component.default_unit,
  };
};

/**
 * Récupère toutes les composantes groupées par catégorie
 */
export const getComponentsByCategory = (): Record<string, ProgramComponentRef[]> => {
  return PROGRAM_COMPONENTS_REF.reduce((acc, component) => {
    if (!acc[component.category]) {
      acc[component.category] = [];
    }
    acc[component.category].push(component);
    return acc;
  }, {} as Record<string, ProgramComponentRef[]>);
};

/**
 * Libellé des unités pour affichage
 */
export const UNIT_LABELS: Record<string, string> = {
  'ha': 'Hectares',
  'km': 'Kilomètres',
  'ml': 'Mètres linéaires',
  'u': 'Unités',
  'm3': 'Mètres cubes',
  'kg': 'Kilogrammes',
  'ruches': 'Ruches',
  'sessions': 'Sessions',
};

export const getUnitLabel = (unit: string): string => {
  return UNIT_LABELS[unit] || unit;
};
