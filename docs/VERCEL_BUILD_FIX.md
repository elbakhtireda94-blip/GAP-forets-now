# Guide de résolution des erreurs de build Vercel

## Problème : Build échoué sur Vercel

Si vous voyez l'erreur "La commande « npm run build » sortie avec 1" ou "La compilation a échoué", suivez ces étapes :

## Solution 1 : Configurer les variables d'environnement requises

Dans **Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**, ajoutez :

### Variables obligatoires (minimum pour le build)

```
VITE_SUPABASE_URL=https://zfhjfuaqugbnbpftisuf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmaGpmdWFxdWdibmJwZnRpc3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg2MzIsImV4cCI6MjA4NDI1NDYzMn0.XNl9duGBp-9Iaz402jYwGAAnYTsETRgOixGaUXZu130
```

### Variables optionnelles (pour MySQL backend)

```
VITE_MYSQL_API_URL=https://votre-backend.up.railway.app
VITE_USE_MYSQL_BACKEND=true
```

**Important :**
- Sélectionnez **Production**, **Preview**, et **Development** pour chaque variable
- Cliquez sur **Save** après chaque ajout
- Redéployez après avoir ajouté les variables

## Solution 2 : Vérifier la configuration du projet

Dans **Vercel Dashboard** → Votre projet → **Settings** → **General** :

- **Framework Preset** : `Vite`
- **Root Directory** : `./` (racine du projet)
- **Build Command** : `npm run build` (ou laisser vide si dans `vercel.json`)
- **Output Directory** : `dist` (ou laisser vide si dans `vercel.json`)
- **Install Command** : `npm install`

## Solution 3 : Vérifier les logs de build

1. Allez dans **Deployments** → Cliquez sur le déploiement échoué
2. Ouvrez **Build Logs** (Journaux de construction)
3. Cherchez les erreurs spécifiques :
   - Erreurs TypeScript
   - Variables d'environnement manquantes
   - Problèmes de dépendances

## Solution 4 : Tester le build localement

Avant de déployer, testez localement :

```bash
# Installer les dépendances
npm install

# Tester le build
npm run build

# Si ça fonctionne localement mais pas sur Vercel :
# → Le problème vient probablement des variables d'environnement
```

## Solution 5 : Vérifier vercel.json

Assurez-vous que `vercel.json` existe à la racine et contient :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Solution 6 : Redéployer après corrections

Après avoir ajouté les variables d'environnement :

1. **Option A** : Faire un nouveau commit et push (déploiement automatique)
2. **Option B** : Dans Vercel Dashboard → **Deployments** → Cliquer sur **Redeploy**

## Erreurs courantes et solutions

### "Cannot find module 'lovable-tagger'"
- **Cause** : Le plugin est optionnel mais importé directement
- **Solution** : Déjà corrigé dans `vite.config.ts` (gestion d'erreur ajoutée)

### "VITE_SUPABASE_URL is not defined"
- **Cause** : Variable d'environnement manquante
- **Solution** : Ajouter la variable dans Vercel (voir Solution 1)

### "Compilation failed in 45ms"
- **Cause** : Erreur très tôt dans le processus, souvent liée aux variables d'environnement
- **Solution** : Vérifier toutes les variables requises sont définies

## Checklist de déploiement

- [ ] Variables d'environnement configurées dans Vercel
- [ ] Build local fonctionne (`npm run build`)
- [ ] `vercel.json` présent et correct
- [ ] `package.json` contient le script `build`
- [ ] Dossier `dist/` généré après build local
- [ ] Redéploiement effectué après modifications

## Support

Si le problème persiste après avoir suivi ces étapes :

1. Vérifiez les logs complets dans Vercel
2. Comparez avec un build local réussi
3. Vérifiez que toutes les dépendances sont dans `package.json` (pas seulement `package-lock.json`)
