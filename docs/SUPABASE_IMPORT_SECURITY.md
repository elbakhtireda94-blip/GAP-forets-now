# Sécurité Supabase — script d’import territoire

## 1. Clé `SUPABASE_SERVICE_ROLE_KEY`

- **Ne jamais exposer cette clé publiquement** (réseaux sociaux, dépôt Git, logs, frontend).
- Elle donne un accès total à votre projet Supabase (contournement RLS, lecture/écriture de toutes les tables).
- Utilisez-la **uniquement** dans des scripts côté serveur ou en local (ex. `scripts/import-territory.mjs`), jamais dans le code frontend (Vite, React, navigateur).

## 2. Régénération de la clé (recommandé avant import)

1. Ouvrir **Supabase** → votre projet.
2. **Project Settings** (icône engrenage) → **API**.
3. Dans la section **Project API keys**, trouver **`service_role`** (secret).
4. Cliquer sur **Regenerate** pour générer une nouvelle clé.
5. Copier la nouvelle clé **une seule fois** et la coller dans **`.env.local`** (voir ci‑dessous). Ne pas l’afficher ni la stocker dans un fichier versionné ou frontend.

## 3. Où configurer les variables

- **Fichier** : `.env.local` à la **racine du projet** (même niveau que `package.json`).
- Ce fichier **ne doit pas être commité** (il est listé dans `.gitignore`).
- Ne jamais mettre `SUPABASE_SERVICE_ROLE_KEY` dans un fichier utilisé par le frontend (ex. clé publique uniquement dans `.env` pour `VITE_*`).

## 4. Résumé

| Variable                     | Où la mettre      | Exposer en frontend ? |
|-----------------------------|-------------------|------------------------|
| `VITE_SUPABASE_URL`         | .env ou .env.local| Oui (préfixe VITE_)    |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (anon) | .env ou .env.local | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | .env.local uniquement (scripts) | **Non** |
