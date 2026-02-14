# ANEF Field Connect — GAP Forêts

## Présentation générale
**ANEF Field Connect** est une application web institutionnelle dédiée au suivi de l'animation territoriale,
à la gestion des **Plans de Développement Forestier Communaux Participatifs (PDFCP)**
et au pilotage des **Contrats Programmes** aux niveaux **DRANEF, DPANEF et communes territoriales**.

---

## Objectifs
- Centraliser les actions prévues dans les PDFCP
- Suivre la programmation et la réalisation des Contrats Programmes
- Faciliter la saisie terrain par les Agents de Développement de Partenariat (ADP)
- Améliorer la lisibilité des données pour la prise de décision
- Assurer une consolidation nationale fiable et homogène

---

## Technologies utilisées
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Lovable Cloud (Supabase)
- TanStack React Query

---

## Configuration pour la production

### 1. Variables d'environnement (automatiques)

Les variables suivantes sont **configurées automatiquement** par Lovable Cloud :

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (anon key) |

> ⚠ **Sans ces variables**, l'application affiche un écran de blocage et ne démarre pas.

### 2. Appliquer les migrations

Avant le premier déploiement, les migrations SQL sont appliquées automatiquement par Lovable Cloud.

### 3. Créer le premier compte ADMIN

1. Créez un compte utilisateur via la page de connexion (`/auth`)
2. Accédez à `/admin/supabase-status`
3. Si aucun ADMIN n'existe, un bouton **"Me définir ADMIN"** apparaît
4. Cliquez dessus — une Edge Function sécurisée attribue le rôle ADMIN via la table `user_roles`
5. La page recharge et affiche "1 administrateur trouvé"

> ⚠ Ce bouton n'est disponible que lorsque **0 administrateurs** existent.
> Une fois un ADMIN créé, les suivants doivent être promus par un ADMIN existant.

### 4. Vérifier la connexion

Connectez-vous avec le compte ADMIN et accédez à :
**Menu → Statut Backend** (`/admin/supabase-status`)

Cette page vérifie :
- ✅ Variables d'environnement
- ✅ Session d'authentification
- ✅ Lecture des tables (profiles, regions) — avec gestion gracieuse si table absente
- ✅ Nombre d'administrateurs (via `user_roles`)
- ✅ Accès aux programmes PDFCP

### 5. Mode démo

Le panneau de connexion rapide (comptes démo) est **uniquement visible en développement** (`npm run dev`).
En production, seule l'authentification standard est disponible.

---

## Installation locale (développement)

### Prérequis
- Node.js ≥ 18
- npm

### Étapes

```bash
git clone <URL_DU_REPO>
cd anef-field-connect
npm install
npm run dev
```

L'application est accessible sur `http://localhost:8080`.

### Option : backend MySQL

Pour utiliser une base MySQL au lieu de Supabase :

1. Créer la base et exécuter les schémas dans `supabase/schema-mysql.sql` puis `supabase/schema-mysql-auth.sql`.
2. Démarrer l’API Node.js : `cd server && npm install && npm run dev` (voir `server/README.md`).
3. Dans le `.env` du projet frontend, ajouter :
   - `VITE_USE_MYSQL_BACKEND=true`
   - `VITE_MYSQL_API_URL=http://localhost:3001`
4. Redémarrer le frontend (`npm run dev`). La connexion et le Cahier Journal utilisent alors MySQL.

---

## Architecture RBAC

Les rôles sont stockés dans la table `user_roles` et déterminés par la fonction SQL `get_user_scope()`.

| Rôle | Périmètre | Droits |
|---|---|---|
| **ADMIN** | National | Contrôle total, verrouillage/déverrouillage |
| **NATIONAL** | National | Consultation globale |
| **REGIONAL** | DRANEF | Validation DRANEF, consultation régionale |
| **PROVINCIAL** | DPANEF | Validation DPANEF, consultation provinciale |
| **LOCAL** | Commune(s) | Saisie terrain, validation ADP |

---

## Workflow de validation PDFCP

```
BROUILLON → CONCERTE_ADP → VALIDE_DPANEF → VALIDE_CENTRAL → VERROUILLE
```

- Tant que le statut ≠ `VERROUILLE`, les modifications sont autorisées selon le rôle.
- Seul un **ADMIN** peut verrouiller ou déverrouiller (avec motif obligatoire).

### Données de démonstration PDFCP

La migration `20260211120000_seed_pdfcp_demo_data.sql` insère **6 programmes PDFCP** dans le périmètre des comptes démo (DRANEF-RSK / DPANEF-KEN / communes Sidi Taibi et Sidi Allal Tazi) pour vérifier la cohérence des logiques :

| Code          | Statut          | Rôle concerné / Filtre à tester                          |
|---------------|------------------|----------------------------------------------------------|
| PDFCP-DEMO-01 | Brouillon       | ADP : filtre « Brouillons », « À valider » (soumettre)   |
| PDFCP-DEMO-02 | Concerté ADP    | DPANEF : filtre « À valider »                            |
| PDFCP-DEMO-03 | Validé DPANEF   | DRANEF / National : filtre « À valider »                 |
| PDFCP-DEMO-04 | Validé Central  | Tous : filtre « Validés »                                |
| PDFCP-DEMO-05 | Verrouillé      | ADMIN : déverrouiller si besoin                          |
| PDFCP-DEMO-06 | Brouillon       | ADP : second brouillon dans la liste                     |

**Pour charger les données (recommandé) :**

1. Dans le **Dashboard Supabase** : **Settings → API** → copier la clé **service_role** (secret).
2. Ajouter dans votre fichier **`.env`** (à la racine du projet) :
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJ...  # la clé copiée
   ```
   (Si `VITE_SUPABASE_URL` n’est pas dans `.env`, l’ajouter aussi avec l’URL du projet.)
3. À la racine du projet, exécuter :
   ```bash
   npm run seed:pdfcp
   ```
   Le script insère ou met à jour les 6 programmes PDFCP de démo.

Alternative : appliquer la migration SQL `supabase/migrations/20260211120000_seed_pdfcp_demo_data.sql` via `supabase db push` (après `supabase link`) ou en collant son contenu dans le **SQL Editor** du dashboard Supabase.

Ensuite : se connecter avec un compte démo (ex. `demo-adp@anef.ma` / `demo2026`) et ouvrir **Programmes PDFCP** pour vérifier les filtres et le détail par programme.

---

## Licence
© 2026 ANEF — Agence Nationale des Eaux et Forêts du Maroc
