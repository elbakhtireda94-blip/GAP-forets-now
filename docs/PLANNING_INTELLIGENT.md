# Comment fonctionne le Planning Intelligent

Le **Planning Intelligent** est une page **Cockpit DG** (aide à la décision) pour la direction. Elle agrège plannings mensuels, activités terrain, KPIs, priorités, alertes et un dossier de synthèse pour le DG.

---

## 1. Objectif

- Donner une **vue consolidée** du mois (ou année) : ce qui est planifié, où, avec quels moyens.
- Afficher des **KPIs** (couverture territoriale, ateliers, PDFCP, logistique).
- Proposer un **score d’impact** et un **niveau de risque opérationnel**.
- Mettre en avant les **Top 5 priorités** du mois avec justifications.
- Fournir un **Assistant Décisionnel** : alertes (rouge / orange / vert) et recommandations (réorganiser, mutualiser, prioriser).
- Produire un **Dossier DG** (synthèse) copiable ou exportable en PDF / impression.

---

## 2. Données utilisées

### Source des données

- **Plannings** et **éléments de planning** : stockés dans le **contexte local** (`DatabaseContext`) en `data.plannings` et `data.planning_items` (pour l’instant pas d’API MySQL dédiée au planning).
- **Activités terrain** : saisies dans « Activités » et récupérées via `getActivities()` du même contexte.
- **Référentiels** : noms DRANEF, DPANEF, ADP, commune via `getDranefName`, `getDpanefName`, `getAdpName`, `getCommuneName`.

### Mode démo

- S’il **n’existe pas de planning** pour le mois/année sélectionné, la page passe en **mode démo** :
  - Données fournies par le hook **`usePlanningDemoData(month, year)`** : KPIs, priorités, alertes, recommandations, sections du Dossier DG.
  - Quelques **événements de planning fictifs** (ex. Atelier ODF Azrou, Médiation conflit pastoral, Suivi reboisement PDFCP) pour illustrer le calendrier et la liste.

---

## 3. Structure de la page (blocs)

| Bloc | Rôle |
|------|------|
| **En-tête** | Mois / année, DRANEF / DPANEF / ADP, **score Impact (0–100)**, risque opérationnel, bouton « Générer note DG (PDF/Print) ». |
| **4 cartes KPI** | Couverture territoriale (communes, douars/UST, % zones prioritaires) ; Animation & médiation (ateliers, réunions ODF, conflits, médiations) ; PDFCP/PDFC (actions, % jalons) ; Logistique (véhicules, km, carburant, budget, efficience). |
| **Carte & Priorités** | Zone pour carte (pour l’instant placeholder) + **Top 5 priorités** du mois avec objectif, justification, impact attendu, besoin logistique, risque. |
| **Planning mensuel** | Vue **liste** ou **calendrier**. Liste = activités du planning (+ démo si pas de données). Calendrier = jours avec événements (planning + activités terrain) ; clic sur un jour = détail du jour. |
| **Assistant Décisionnel** | **Alertes** (rouge / orange / vert) avec titre, description, suggestion ; **Recommandations** (réorganiser, mutualiser, prioriser) avec « Pourquoi ». |
| **Dossier DG** | Synthèse en 6 sections (contexte, actions par axe, impacts, risques, besoins logistiques, décisions attendues). Boutons **Copier** et **Exporter / Imprimer**. |

---

## 4. Calcul du score d’impact (mode réel)

Quand un **planning existe** pour le mois choisi, le score est calculé à partir des **éléments de planning** (`PlanningItem`) :

- **Impact participatif (30 %)** : part d’ateliers / réunions ODF.
- **Avancement PDFCP (25 %)** : part d’éléments liés à un PDFCP.
- **Gestion des conflits (20 %)** : part de médiations + base.
- **Efficience logistique (15 %)** : valeur fixe 70 (à affiner si besoin).
- **Qualité livrables (10 %)** : part d’éléments avec `expected_deliverables` renseignés.

Le **total** est une moyenne pondérée, plafonnée à 100.

---

## 5. Types d’éléments de planning

Définis dans `src/types/planning.ts` :

- `atelier`, `transect`, `mediation`, `reunion_odf`, `diagnostic`, `suivi_pdfcp`, `sensibilisation`, `coordination`, `reunion_commune`, `autre`.

Chaque élément peut avoir : date, commune, UST, PDFCP lié, objectifs, livrables attendus, logistique (véhicule, carburant, budget), risques (social, accès, météo, sécurité, conflit), distance estimée, etc.

---

## 6. Workflow du planning (modèle)

Dans les types, un planning a un **statut** :

`BROUILLON` → `SOUMIS` → `AJUSTEMENT_DPANEF` → `VALIDÉ` ou `RETOURNÉ`.

L’écran Planning Intelligent **n’affiche pas** ce workflow ; il se concentre sur la **visualisation et l’aide à la décision** (KPIs, impact, priorités, alertes, dossier DG). La création/édition des plannings se fait ailleurs (contexte / formulaires dédiés si présents).

---

## 7. Accès

- **Menu** : entrée « Planning Intelligent » (ou équivalent).
- **RBAC** : accessible aux niveaux **ADMIN, NATIONAL, REGIONAL, PROVINCIAL, LOCAL** (`planning_intelligent` dans `src/lib/rbac.ts`).

---

## 8. Fichiers principaux

| Fichier | Rôle |
|---------|------|
| `src/pages/PlanningIntelligent.tsx` | Page Cockpit DG : sélection mois/année, KPIs, carte & priorités, planning liste/calendrier, assistant, dossier DG. |
| `src/types/planning.ts` | Types : `Planning`, `PlanningItem`, `PlanningPriority`, alertes, recommandations, score d’impact. |
| `src/hooks/usePlanningDemoData.ts` | Données démo (KPIs, priorités, alertes, recommandations, Dossier DG) pour le mode sans planning. |
| `src/contexts/DatabaseContext.tsx` | Stockage et lecture des `plannings` et `planning_items`, plus `getActivities()` pour le calendrier. |

---

## 9. En résumé

- Le Planning Intelligent **consomme** les plannings et activités déjà en base (contexte local).
- Il **calcule** le score d’impact et les KPIs à partir des éléments du planning quand il y en a un.
- En **absence de planning** pour le mois, il affiche un **mode démo** avec données fictives pour la démonstration.
- Il **ne modifie pas** les plannings ; il sert à **visualiser, analyser et exporter** (Dossier DG) pour la direction.
