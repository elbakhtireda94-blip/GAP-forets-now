# Guide de déploiement sur Vercel

Ce guide explique comment déployer l'application ANEF Field Connect sur Vercel.

## Architecture

- **Frontend** : React/Vite → déployé sur Vercel
- **Backend** : Node/Express + MySQL → déployé séparément (Railway/Render recommandé)

## Prérequis

1. Compte Vercel (gratuit) : https://vercel.com
2. Compte Railway ou Render (pour le backend MySQL)
3. Base de données MySQL hébergée (Railway, PlanetScale, ou autre)

---

## Partie 1 : Déploiement du Backend (MySQL API)

### Option A : Railway (recommandé)

1. **Créer un compte Railway** : https://railway.app
2. **Créer un nouveau projet** → "Deploy from GitHub repo"
3. **Sélectionner le dossier `server/`** comme racine du projet
4. **Ajouter une base MySQL** :
   - Railway Dashboard → "New" → "Database" → "MySQL"
   - Notez les variables de connexion (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)

5. **Variables d'environnement** dans Railway :
   ```
   NODE_ENV=production
   PORT=3000
   MYSQL_HOST=<host fourni par Railway>
   MYSQL_PORT=3306
   MYSQL_USER=<user fourni>
   MYSQL_PASSWORD=<password fourni>
   MYSQL_DATABASE=<nom de la base>
   JWT_SECRET=<générer une clé secrète aléatoire>
   CORS_ORIGIN=https://ton-app.vercel.app
   ```

6. **Build Command** : (laisser vide, Railway détecte automatiquement)
7. **Start Command** : `node index.js`
8. **Déployer** → Railway génère une URL publique (ex: `https://ton-backend.up.railway.app`)

### Option B : Render

1. **Créer un compte Render** : https://render.com
2. **Nouveau Web Service** → Connecter le repo GitHub
3. **Configuration** :
   - Root Directory : `server`
   - Build Command : (vide)
   - Start Command : `node index.js`
   - Environment : Node
4. **Ajouter une base MySQL** : Render Dashboard → "New" → "PostgreSQL" (ou MySQL si disponible)
5. **Variables d'environnement** (même format que Railway)
6. **Déployer** → Render génère une URL (ex: `https://ton-backend.onrender.com`)

### Après déploiement du backend

1. **Exécuter le seed** pour créer les tables et comptes démo :
   ```bash
   # Via Railway CLI ou SSH
   cd server
   node seed.js
   ```

2. **Tester l'API** :
   - Ouvrir `https://ton-backend-url/api/health`
   - Doit retourner `{"ok": true, "db": "mysql"}`

---

## Partie 2 : Déploiement du Frontend sur Vercel

### Méthode 1 : Via l'interface Vercel (recommandé)

1. **Aller sur** https://vercel.com → "Add New Project"
2. **Importer le repository GitHub** (ton repo `adp-territoire-connect-main`)
3. **Configuration du projet** :
   - Framework Preset : **Vite**
   - Root Directory : `./` (racine du projet)
   - Build Command : `npm run build` (déjà dans vercel.json)
   - Output Directory : `dist` (déjà dans vercel.json)
   - Install Command : `npm install`

4. **Variables d'environnement** dans Vercel :
   ```
   VITE_SUPABASE_PROJECT_ID=zfhjfuaqugbnbpftisuf
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_SUPABASE_URL=https://zfhjfuaqugbnbpftisuf.supabase.co
   
   # URL du backend déployé (remplacer par l'URL Railway/Render)
   VITE_MYSQL_API_URL=https://ton-backend.up.railway.app
   
   # Activer le backend MySQL
   VITE_USE_MYSQL_BACKEND=true
   ```

5. **Déployer** → Vercel génère une URL (ex: `https://ton-app.vercel.app`)

### Méthode 2 : Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Dans le dossier racine du projet
cd C:\Users\HP\Documents\code\adp-territoire\adp-territoire-connect-main

# Se connecter
vercel login

# Déployer (première fois)
vercel

# Suivre les prompts :
# - Set up and deploy? Y
# - Which scope? (ton compte)
# - Link to existing project? N
# - Project name? (nom du projet)
# - Directory? ./
# - Override settings? N

# Déployer en production
vercel --prod
```

---

## Partie 3 : Configuration finale

### 1. Mettre à jour CORS dans le backend

Dans Railway/Render, mettre à jour `CORS_ORIGIN` :
```
CORS_ORIGIN=https://ton-app.vercel.app
```

Redéployer le backend pour appliquer les changements.

### 2. Vérifier les variables d'environnement Vercel

Dans Vercel Dashboard → Ton projet → Settings → Environment Variables, vérifier :
- `VITE_MYSQL_API_URL` pointe vers le backend déployé
- `VITE_USE_MYSQL_BACKEND=true`

### 3. Redéployer le frontend

Après modification des variables d'environnement, redéployer :
- Vercel Dashboard → "Deployments" → "Redeploy" (ou push un commit)

---

## Partie 4 : Vérification

1. **Frontend** : Ouvrir `https://ton-app.vercel.app`
   - La page de login doit s'afficher
   - Console navigateur : vérifier que `VITE_MYSQL_API_URL` est correct

2. **Backend** : Tester `https://ton-backend-url/api/health`
   - Doit retourner `{"ok": true, "db": "mysql"}`

3. **Connexion** : Tester avec un compte démo :
   - Email : `demo@anef.ma`
   - Password : `Password1`

---

## Troubleshooting

### Erreur "Cannot connect to backend"

- Vérifier que `VITE_MYSQL_API_URL` dans Vercel pointe vers le bon backend
- Vérifier que le backend est bien déployé et accessible
- Vérifier CORS : `CORS_ORIGIN` dans le backend doit inclure l'URL Vercel

### Erreur "Database connection failed"

- Vérifier les variables MySQL dans Railway/Render
- Vérifier que la base de données MySQL est bien créée et accessible
- Exécuter `node server/seed.js` pour créer les tables

### Erreur "Build failed" sur Vercel

- Vérifier que `package.json` a bien le script `build`
- Vérifier les dépendances dans `package.json`
- Voir les logs de build dans Vercel Dashboard → Deployments

### Variables d'environnement non prises en compte

- Les variables Vercel doivent commencer par `VITE_` pour être accessibles dans le frontend
- Redéployer après modification des variables
- Vérifier dans la console navigateur : `console.log(import.meta.env.VITE_MYSQL_API_URL)`

---

## Structure recommandée pour production

```
Frontend (Vercel)
├── URL: https://anef-field-connect.vercel.app
└── Variables:
    ├── VITE_MYSQL_API_URL=https://anef-api.up.railway.app
    └── VITE_USE_MYSQL_BACKEND=true

Backend (Railway/Render)
├── URL: https://anef-api.up.railway.app
└── Variables:
    ├── MYSQL_HOST=...
    ├── MYSQL_DATABASE=...
    └── CORS_ORIGIN=https://anef-field-connect.vercel.app
```

---

## Commandes utiles

```bash
# Déployer le frontend sur Vercel
vercel --prod

# Voir les logs du backend (Railway)
railway logs

# Voir les logs du backend (Render)
# Via le dashboard Render → Logs

# Exécuter le seed en production (Railway)
railway run node seed.js

# Exécuter le seed en production (Render)
# Via le dashboard Render → Shell
```

---

## Coûts estimés

- **Vercel** : Gratuit (plan Hobby) pour le frontend
- **Railway** : $5/mois (plan Starter) pour le backend + MySQL
- **Render** : Gratuit (plan Free) avec limitations, ou $7/mois (Starter)

---

## Notes importantes

1. **MySQL en production** : Utiliser une base MySQL hébergée (Railway, PlanetScale, ou autre). Ne pas utiliser XAMPP en production.

2. **Variables sensibles** : Ne jamais commiter les `.env` avec des secrets. Utiliser les variables d'environnement de Vercel/Railway.

3. **HTTPS** : Vercel et Railway/Render fournissent HTTPS automatiquement.

4. **Redéploiement automatique** : Connecter GitHub → chaque push déclenche un redéploiement automatique.
