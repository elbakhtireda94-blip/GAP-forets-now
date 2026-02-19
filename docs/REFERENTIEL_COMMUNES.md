# Référentiel communes (DRANEF / DPANEF / ZDTF / Commune)

Import, schéma Supabase et page admin pour le référentiel territorial. **Aucune donnée ADP** dans cette phase.

---

## 1. Fichier SQL (migration)

- **Fichier** : `supabase/migrations/20260211000000_referentiel_communes.sql`
- **Contenu** : schéma `referentiel` avec 4 tables (`dranef`, `dpanef`, `zdtf`, `commune`), index, RLS (SELECT anon+authenticated, INSERT/UPDATE/DELETE authenticated).

### Où exécuter le SQL

- **Supabase Dashboard** : SQL Editor → coller le contenu du fichier → Run.
- **CLI Supabase** : `supabase db push` si vous utilisez les migrations en local.

### Exposer le schéma dans l’API

Par défaut, l’API Supabase n’expose que le schéma `public`. Pour que la page et le script utilisent `referentiel` :

1. Supabase Dashboard → **Settings** → **API** → **Exposed schemas**.
2. Ajouter `referentiel` aux schémas exposés (ou activer “Expose all schemas” en dev).

---

## 2. Script d’import (idempotent)

- **Script** : `scripts/import-territory.mjs`
- **Commande** : `npm run import:territory`

### Variables d’environnement

À définir dans `.env` ou `.env.local` (à la racine du projet) :

- `VITE_SUPABASE_URL` : URL du projet Supabase (ex. `https://xxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` : clé **service_role** (Settings → API → service_role, secret). Ne pas utiliser la clé anon pour l’import.

Optionnel :

- `TERRITORY_CSV_PATH` : chemin relatif au projet vers le CSV. Par défaut : `data/communes_hierarchie_preparee.csv`.

### Fichier CSV source

- **Chemin par défaut** : `data/communes_hierarchie_preparee.csv` (créer le dossier `data/` à la racine si besoin).
- **Fallback** : `src/data/communes_hierarchie_preparee.csv/communes_hierarchie_preparee.csv` si le fichier existe à cet emplacement.
- **Colonnes attendues** : `commune_id`, `DRANEF`, `DPANEF`, `ZDTF`, `Commune`, `Commune_flag`, `Commune_note` (UTF-8).

Copier le CSV dans `data/communes_hierarchie_preparee.csv` puis lancer :

```bash
npm run import:territory
```

Le script fait des upserts (pas de doublons) et affiche le nombre de lignes traitées et d’éventuelles erreurs.

---

## 3. Page UI

- **Route** : `/admin/referentiel-communes`
- **Accès** : utilisateurs avec scope **ADMIN** (menu « Référentiel communes » dans la section Admin).

Fonctionnalités :

- 4 filtres en cascade : **DRANEF** → **DPANEF** → **ZDTF** → (liste des communes filtrée).
- **Recherche** sur le nom de commune.
- **Table** : DRANEF | DPANEF | ZDTF | Commune | Badge si `is_flagged`.
- Pagination (50 lignes par page), loader, empty state, bouton « Réinitialiser les filtres ».

---

## 4. Récapitulatif

| Élément        | Emplacement / commande |
|----------------|-------------------------|
| SQL            | `supabase/migrations/20260211000000_referentiel_communes.sql` → à exécuter dans Supabase (Dashboard ou CLI). |
| Exposer schéma | Settings → API → Exposed schemas → ajouter `referentiel`. |
| Import         | `npm run import:territory` (après avoir mis le CSV dans `data/communes_hierarchie_preparee.csv`). |
| Env            | `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (et optionnellement `TERRITORY_CSV_PATH`). |
| Page           | Menu Admin → Référentiel communes, ou URL `/admin/referentiel-communes`. |
