# Raisonnement PDFCP dans l’application

Ce document décrit la **logique métier** des PDFCP (Plan de Développement Forestier Communal Participatif), en particulier le lien entre **actions prévues**, **actions cartographiques** et les indicateurs **Prévu / Réalisé / Reste** affichés dans le formulaire « Nouvelle action cartographique ».

---

## 1. Les trois couches d’actions PDFCP

Les actions d’un PDFCP sont enregistrées dans la table **`pdfcp_actions`** avec un champ **`etat`** qui distingue trois niveaux :

| État      | Rôle métier                          | Rôle dans l’app                         |
|-----------|--------------------------------------|-----------------------------------------|
| **CONCERTE** | Plan concerté (ce qui est prévu)     | **Source du « Prévu »** pour la carto   |
| **CP**       | Programme / engagement              | Comparatif Prévu vs CP vs Réalisé       |
| **EXECUTE**  | Exécution terrain                    | Réalisations effectives                 |

- Les lignes **CONCERTE** sont les **actions prévues** : elles définissent *ce qui doit être fait* (quantité en ha ou km, budget, année).
- Les **actions cartographiques** (table `pdfcp_actions_geo`) ne sont liées qu’aux actions **CONCERTE** : chaque action carto pointe vers une action prévue via **`planned_action_id`**.

---

## 2. Actions prévues (Plan concerté)

Une **action prévue** est une ligne `pdfcp_actions` avec `etat = 'CONCERTE'`. Elle contient notamment :

- **action_key** / **action_label** : type d’action (ex. Reboisement, DRS, Piste)
- **year** : année
- **unite** : `ha` (hectares) ou `km` (kilomètres)
- **physique** : quantité **prévue** (ex. 10 ha, 5 km)
- **financier** : budget prévu

C’est la **référence** pour le suivi : tout ce qui est « réalisé » (carto) est comparé à ce **Prévu**.

---

## 3. Actions cartographiques

Une **action cartographique** est une **localisation** sur la carte associée à une action prévue :

- **planned_action_id** : lien obligatoire vers une ligne `pdfcp_actions` (CONCERTE)
- **surface_realisee_ha** : surface réalisée (si l’unité de l’action prévue est en ha)
- **longueur_realisee_km** : longueur réalisée (si l’unité est en km)
- **geom_type** : Point, LineString ou Polygone
- **geometry** : coordonnées (Lambert, etc.)

Plusieurs actions cartographiques peuvent être rattachées à **la même** action prévue (plusieurs polygones de reboisement, plusieurs tronçons de piste, etc.). Le **Réalisé** est la **somme** de ces surfaces ou longueurs.

---

## 4. Calcul Prévu / Réalisé / Reste (modal « Nouvelle action cartographique »)

Dans le formulaire **« Nouvelle action cartographique »**, quand vous choisissez une **Action prévue (PDFCP)** dans la liste, les valeurs affichées sont calculées ainsi :

| Indicateur | Signification | Calcul dans le code |
|------------|----------------|---------------------|
| **Prévu**  | Quantité prévue pour cette action (plan concerté) | `physique` de la ligne `pdfcp_actions` (CONCERTE) |
| **Réalisé** | Quantité déjà « réalisée » via la cartographie | Somme des `surface_realisee_ha` (ou `longueur_realisee_km` si unite = km) de toutes les actions carto dont `planned_action_id` = cette action prévue |
| **Reste**  | Ce qu’il reste à réaliser pour atteindre le prévu | `max(0, Prévu - Réalisé)` |

- Si **Reste = 0** : la quantité prévue est déjà entièrement couverte par les géométries saisies (barre verte à 100 %).
- Si **Reste > 0** : on peut encore ajouter des actions cartographiques pour cette même action prévue (dans la limite du Reste, avec une tolérance de dépassement configurée).

**Fichier concerné** : `src/hooks/usePdfcpActionsGeo.ts` (calcul de `plannedActionsWithProgress` : `cumul_realise`, `reste`, `taux_realisation`).

---

## 5. Flux global : de la saisie à la carte

1. **Saisie d’une action (Plan concerté)**  
   L’agent ajoute une ligne dans l’onglet Plan concerté (action, année, quantité en ha/km, budget). Cette ligne est une **action prévue** (CONCERTE).

2. **Proposition cartographique**  
   Après enregistrement, l’app peut proposer d’ouvrir le formulaire **« Nouvelle action cartographique »** avec cette action **déjà présélectionnée**. L’agent peut accepter tout de suite ou plus tard.

3. **Saisie d’une ou plusieurs géométries**  
   Dans le formulaire carto, l’agent choisit l’action prévue (ou elle est déjà choisie), saisit un titre, le type de géométrie (point, ligne, polygone), les coordonnées et la surface ou longueur réalisée. Chaque enregistrement est une **action cartographique** liée à l’action prévue.

4. **Mise à jour du Réalisé et du Reste**  
   À chaque nouvelle action carto enregistrée pour une même action prévue, le **Réalisé** augmente et le **Reste** diminue. Quand Réalisé ≥ Prévu, Reste = 0 (affichage en rouge dans l’interface pour indiquer que le prévu est atteint).

---

## 6. Résumé pour l’écran « Nouvelle action cartographique »

- **Action prévue (PDFCP)** : une des lignes **Plan concerté** (CONCERTE) du PDFCP. Elle définit le **Prévu** (quantité en ha ou km).
- **Prévu / Réalisé / Reste** :  
  - **Prévu** = quantité planifiée ;  
  - **Réalisé** = cumul des surfaces/longueurs des actions carto déjà créées pour cette action prévue ;  
  - **Reste** = Prévu − Réalisé (plancher à 0).
- **Titre / Type de géométrie** : décrivent la **nouvelle** action cartographique que l’utilisateur est en train de créer, qui viendra s’ajouter au **Réalisé** de l’action prévue sélectionnée.

Voir aussi : `docs/logique-saisie-action-cartographie.md` (lien saisie action ↔ cartographie) et `docs/logique-metier-gap-forets.md` (vision globale PDFCP et acteurs).
