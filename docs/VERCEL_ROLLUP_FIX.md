# Résolution de l'erreur Rollup sur Vercel

## Erreur
```
[vite] : Rollup n'a pas réussi à résoudre l'import de « /src/main.tsx » depuis « /vercel/path0/index.html ».
```

## Cause
Cette erreur survient généralement lorsque Vercel essaie de résoudre les chemins avant que Vite ne traite le fichier `index.html`. Le chemin `/src/main.tsx` dans `index.html` est correct pour Vite, mais Vercel pourrait avoir des problèmes avec la résolution.

## Solutions

### Solution 0 : Configuration Vite corrigée (déjà appliquée)

Le fichier `vite.config.ts` a été mis à jour avec :
- Configuration explicite du point d'entrée dans `rollupOptions.input`
- Configuration du `root` directory
- Gestion robuste du plugin `lovable-tagger`

**Vérifiez que votre `vite.config.ts` contient** :
```typescript
build: {
  outDir: "dist",
  assetsDir: "assets",
  rollupOptions: {
    input: {
      main: path.resolve(__dirname, "index.html"),
    },
  },
}
```

### Solution 1 : Vérifier la configuration Vercel

Dans **Vercel Dashboard** → Votre projet → **Settings** → **General** :

1. **Root Directory** : Doit être `./` (racine du projet) ou laisser vide
2. **Framework Preset** : `Vite` (détecté automatiquement)
3. **Build Command** : `npm run build` (ou laisser vide si dans `vercel.json`)
4. **Output Directory** : `dist` (ou laisser vide si dans `vercel.json`)

### Solution 2 : Vérifier que index.html est à la racine

Le fichier `index.html` doit être à la racine du projet, pas dans un sous-dossier.

Structure correcte :
```
projet/
├── index.html          ← Doit être ici
├── src/
│   └── main.tsx
├── package.json
├── vite.config.ts
└── vercel.json
```

### Solution 3 : Vérifier vercel.json

Assurez-vous que `vercel.json` contient :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Solution 4 : Vérifier les variables d'environnement

Assurez-vous que toutes les variables d'environnement requises sont configurées dans Vercel :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_MYSQL_API_URL` (optionnel)
- `VITE_USE_MYSQL_BACKEND` (optionnel)

### Solution 5 : Nettoyer et redéployer

1. Dans Vercel Dashboard → **Settings** → **General** → **Remove Project**
2. Recréer le projet en important depuis GitHub
3. Vérifier que toutes les configurations sont correctes
4. Redéployer

### Solution 6 : Vérifier le build local

Avant de déployer, testez localement :

```bash
npm run build
```

Si le build local fonctionne mais pas sur Vercel, le problème vient probablement de la configuration Vercel ou des variables d'environnement.

## Vérifications supplémentaires

1. **Vérifier que `index.html` contient** :
   ```html
   <script type="module" src="/src/main.tsx"></script>
   ```
   (Ce chemin est correct pour Vite et sera transformé lors du build)

2. **Vérifier que `vite.config.ts` existe** et contient la configuration correcte

3. **Vérifier que `package.json` contient** :
   ```json
   {
     "scripts": {
       "build": "vite build"
     }
   }
   ```

## Si le problème persiste

1. Vérifier les logs complets dans Vercel Dashboard → **Deployments** → Cliquer sur le déploiement échoué → **Build Logs**
2. Comparer avec un build local réussi
3. Vérifier que toutes les dépendances sont dans `package.json` (pas seulement `package-lock.json`)
