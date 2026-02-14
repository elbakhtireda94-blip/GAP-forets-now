// Catalogue des actions disponibles pour les PDFCP
export interface ActionCatalogItem {
  key: string;
  label: string;
  uniteDefault: string;
  category?: string;
}

export const ACTION_CATALOG: ActionCatalogItem[] = [
  { key: 'reboisement', label: 'Reboisement', uniteDefault: 'ha', category: 'Forêt' },
  { key: 'regeneration', label: 'Régénération', uniteDefault: 'ha', category: 'Forêt' },
  { key: 'mise_en_defens', label: 'Compensation de mise en défens', uniteDefault: 'ha', category: 'Parcours' },
  { key: 'fours_ameliores', label: 'Fours améliorés', uniteDefault: 'unité', category: 'Équipement' },
  { key: 'pistes', label: 'Pistes forestières', uniteDefault: 'km', category: 'Infrastructure' },
  { key: 'points_eau', label: 'Points d\'eau', uniteDefault: 'unité', category: 'Infrastructure' },
  { key: 'cmd', label: 'Contrôle mise en défens (CMD)', uniteDefault: 'ha', category: 'Parcours' },
  { key: 'plantations_fruitieres', label: 'Plantations fruitières', uniteDefault: 'ha', category: 'Agroforesterie' },
  { key: 'ruches', label: 'Ruches', uniteDefault: 'unité', category: 'Équipement' },
  { key: 'formation', label: 'Formation / Sensibilisation', uniteDefault: 'session', category: 'Social' },
];

export const getActionLabel = (key: string): string => {
  const action = ACTION_CATALOG.find(a => a.key === key);
  return action?.label || key;
};

export const getActionUnite = (key: string): string => {
  const action = ACTION_CATALOG.find(a => a.key === key);
  return action?.uniteDefault || 'unité';
};
