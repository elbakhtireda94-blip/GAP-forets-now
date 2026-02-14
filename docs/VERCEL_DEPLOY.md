# Déploiement frontend sur Vercel

## 1. Vérifications effectuées

- **Projet** : Vite + React (TypeScript). Build : `npm run build` → sortie dans `dist/`.
- **Scripts package.json** : `dev` (vite), `build` (vite build), `preview` (vite preview) — OK.
- **vercel.json** : ajouté avec `buildCommand`, `outputDirectory: "dist"`, `framework: "vite"` et **rewrites SPA** (toutes les routes → `/index.html`).
- **URLs backend** : toutes les appels API passent par `getMySQLApiUrl()` (basé sur `VITE_MYSQL_API_URL`). Aucune URL backend en dur dans le code.

## 2. Variables d’environnement à configurer sur Vercel

Dans **Vercel** → projet → **Settings** → **Environment Variables**, ajouter :

| Variable | Valeur | Environnement |
|----------|--------|----------------|
| `VITE_MYSQL_API_URL` | URL publique de votre backend (ex. `https://api.votredomaine.com` ou `https://votre-backend.herokuapp.com`) | Production, Preview, Development |
| `VITE_USE_MYSQL_BACKEND` | `true` | Production, Preview, Development |

**Important** :  
- Pas de slash final pour `VITE_MYSQL_API_URL`.  
- Le backend doit autoriser l’origine Vercel (CORS) : ajouter `https://votre-app.vercel.app` (et vos preview URLs) dans la config CORS du serveur.

## 3. Commandes à lancer pour déployer

### Option A : Déploiement via l’interface Vercel

1. Aller sur [vercel.com](https://vercel.com), se connecter.
2. **Add New** → **Project**.
3. Importer le dépôt Git du projet (GitHub / GitLab / Bitbucket).
4. **Root Directory** : laisser à la racine (le frontend est à la racine).
5. **Framework Preset** : Vite (détecté automatiquement).
6. **Build Command** : `npm run build` (ou laisser vide, pris depuis `vercel.json`).
7. **Output Directory** : `dist` (ou laisser vide, pris depuis `vercel.json`).
8. Ajouter les variables d’environnement (voir tableau ci-dessus).
9. Cliquer sur **Deploy**.

### Option B : Déploiement via Vercel CLI

```bash
# À la racine du projet (adp-territoire-connect-main)
npm i -g vercel
vercel login
vercel
# Suivre les questions (link au projet existant ou nouveau projet)
# Puis, en production :
vercel --prod
```

Les variables d’environnement peuvent être définies dans le dashboard Vercel ou avec `vercel env add VITE_MYSQL_API_URL` (etc.).

## 4. Checklist finale

- [ ] Build local OK : `npm run build` (génère `dist/` sans erreur).
- [ ] Preview local OK : `npm run preview` puis ouvrir l’URL indiquée.
- [ ] `vercel.json` présent à la racine avec rewrites SPA.
- [ ] Variables Vercel : `VITE_MYSQL_API_URL` et `VITE_USE_MYSQL_BACKEND=true`.
- [ ] Backend déployé et accessible en HTTPS ; CORS autorise le domaine Vercel.
- [ ] Après déploiement : tester la page de login et un appel API (ex. connexion démo).

## 5. Note

Le répertoire `server/` n’est pas déployé sur Vercel (frontend uniquement). Le backend doit être hébergé ailleurs (Railway, Render, VPS, etc.) et son URL renseignée dans `VITE_MYSQL_API_URL`.
