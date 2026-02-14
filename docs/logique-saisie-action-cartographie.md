# Lien saisie action PDFCP ↔ cartographie

## Contexte

- **Actions PDFCP** : saisies dans les onglets Plan concerté / CP / Exécution (quantités, budgets, années).
- **Actions cartographiques** : module séparé qui lie une géométrie (point/ligne/polygone) à une **action prévue** (`planned_action_id` = ligne dans `pdfcp_actions`). Disponible uniquement pour les PDFCP en base centrale (id UUID Supabase).

## Objectif

Que **la saisie d’une action** concerne aussi la cartographie, de façon **simple pour les agents terrain** : un flux clair, pas de double saisie inutile.

---

## Option retenue : « Une action enregistrée → proposition carto »

### Principe

1. L’agent saisit une action comme aujourd’hui (Plan concerté, CP ou Exécution).
2. **Dès qu’une ligne Plan concerté est enregistrée**, le formulaire **Actions cartographiques** s’ouvre automatiquement avec cette action **déjà présélectionnée**. L’agent peut alors remplir la partie carte (coordonnées Lambert, surface/longueur, etc.) ou fermer et faire plus tard.
4. Si **Plus tard** : rien de plus ; il pourra ajouter la localisation plus tard via le module carto en choisissant la même action.

### Avantages

- Un seul flux mental : **je saisis une action → on me propose tout de suite la carte**.
- Pas de formulaire unique trop long (surtout sur mobile).
- La carto reste **optionnelle** (terrain sans géolocalisation possible).
- Réutilisation du formulaire carto existant (pas de doublon).
- Les agents qui préfèrent tout saisir d’abord peuvent ignorer la proposition et utiliser le module carto ensuite.

### Complément

- Dans le module **Actions cartographiques**, garder la possibilité d’**ajouter une localisation** à n’importe quelle action prévue (pour les saisies « Plus tard » ou les PDFCP déjà chargés en base).

---

## Condition d’usage

Cette logique s’applique aux **PDFCP enregistrés en base centrale** (id = UUID Supabase) :

- Les lignes Plan/CP/Exécution sont alors dans `pdfcp_actions`.
- Le module carto lit les « actions prévues » depuis cette même table et peut ouvrir le formulaire avec `planned_action_id` = id de la ligne qu’on vient de créer.

Pour les PDFCP **uniquement en base locale** (id non-UUID), le message actuel reste pertinent : *« Actions cartographiques disponibles uniquement pour les PDFCP enregistrés dans la base centrale. »*  
Pour activer la carto, il faut que le PDFCP soit enregistré en base centrale (id UUID).

---

## Résumé pour les agents terrain

| Étape | Action |
|-------|--------|
| 1 | Saisir une action (Plan / CP / Exécution) comme d’habitude. |
| 2 | Après enregistrement : choisir **« Ajouter la localisation »** ou **« Plus tard »**. |
| 3 | Si « Ajouter la localisation » : remplir uniquement la partie carte (type de géométrie, coordonnées, surface/longueur). |
| 4 | Sinon : possible d’ajouter la carte plus tard dans le bloc « Actions cartographiques » en sélectionnant la même action. |

Une seule saisie d’action ; la cartographie est une **étape optionnelle immédiate ou différée**, sans refaire la saisie des données action.
