# Checklist - Accès réseau (IP 10.7.2.42)

## Problème résolu

Le frontend était accessible via IP (`http://10.7.2.42:8080`) mais l'API pointait vers `localhost`, ce qui faisait échouer le login.

## Modifications appliquées

1. ✅ **Frontend:** Détection automatique si frontend accessible via IP mais API pointe vers localhost
2. ✅ **Backend:** Écoute sur `0.0.0.0` (accessible depuis le réseau) au lieu de `localhost` uniquement
3. ✅ **CORS:** Ajout de `http://10.7.2.42:8080` dans `allowedOrigins`

## Configuration requise

### 1. Mettre à jour `.env` (racine du projet)

```env
VITE_MYSQL_API_URL=http://10.7.2.42:3002
```

**Important:** Remplacez `3002` par le port réel du backend (vérifiez dans les logs du serveur).

### 2. Redémarrer le frontend

Après modification de `.env`, redémarrer le serveur de développement:
```bash
npm run dev
```

## Checklist de test

### Étape 1: Vérifier le backend

1. **Démarrer le backend:**
   ```bash
   cd server
   npm start
   ```

2. **Vérifier les logs:**
   ```
   API listening on http://localhost:3002 (localhost)
   API accessible from network: http://10.7.2.42:3002
   ```

3. **Tester `/health` via IP:**
   ```bash
   curl http://10.7.2.42:3002/health
   ```
   **Attendu:** `{"ok":true}`

4. **Tester `/api/health` via IP:**
   ```bash
   curl http://10.7.2.42:3002/api/health
   ```
   **Attendu:** `{"ok":true,"db":"mysql"}`

### Étape 2: Vérifier le frontend

1. **Ouvrir le frontend via IP:**
   ```
   http://10.7.2.42:8080
   ```

2. **Ouvrir la console (F12):**
   - Vérifier le log: `[API] Base URL: http://10.7.2.42:3002`
   - Si vous voyez un warning `⚠️ Frontend accessible via IP mais API pointe vers localhost!`, c'est que `.env` n'est pas à jour

### Étape 3: Tester le login

1. **Tenter de se connecter avec:**
   - Email: `adp.demo@anef.ma`
   - Password: `Password1`

2. **Vérifier dans la console:**
   ```
   [AUTH] Login attempt for: adp.demo@anef.ma
   [AUTH] Login successful, storing token...
   [AUTH] ✓ Token stored successfully
   ```

3. **Si le login échoue:**
   - Vérifier que le backend est démarré
   - Vérifier que `VITE_MYSQL_API_URL` dans `.env` pointe vers `http://10.7.2.42:3002`
   - Vérifier les logs backend pour voir les erreurs

### Étape 4: Vérifier les utilisateurs démo

Si le login échoue avec "Invalid email or password":

1. **Vérifier que les utilisateurs existent:**
   ```bash
   curl http://10.7.2.42:3002/api/debug/demo-users
   ```

2. **Si `hasProfile: false`, exécuter seed:**
   ```bash
   cd server
   node seed.js
   ```

3. **Vérifier à nouveau:**
   ```bash
   curl http://10.7.2.42:3002/api/debug/demo-users
   ```
   **Attendu:** `hasProfile: true` pour les deux comptes démo

## Dépannage

### Problème: "Failed to fetch" ou "Network error"

**Causes possibles:**
1. Backend non démarré → Démarrer `cd server && npm start`
2. Mauvais port dans `VITE_MYSQL_API_URL` → Vérifier le port dans les logs backend
3. Firewall bloque le port → Vérifier les règles de firewall Windows

**Solution:**
- Vérifier les logs backend pour voir sur quel port il écoute
- Mettre à jour `.env` avec le bon port
- Redémarrer le frontend

### Problème: "CORS error" ou "Origin not allowed"

**Cause:** L'origine n'est pas dans `allowedOrigins`

**Solution:** Vérifier que `http://10.7.2.42:8080` est dans `allowedOrigins` (déjà fait)

### Problème: "401 Unauthorized" au login

**Causes possibles:**
1. Utilisateur n'existe pas → Exécuter `node seed.js`
2. Mot de passe incorrect → Utiliser `Password1` (P majuscule)
3. Token non sauvegardé → Vérifier localStorage dans DevTools

**Solution:**
- Vérifier `/api/debug/demo-users`
- Exécuter `node seed.js` si nécessaire
- Vérifier localStorage: DevTools → Application → Local Storage → `anef_mysql_token`

## Résultat attendu

✅ Backend accessible depuis le réseau (`http://10.7.2.42:3002`)  
✅ Frontend utilise l'URL réseau pour l'API  
✅ Login fonctionne avec `adp.demo@anef.ma`  
✅ CORS autorise les requêtes depuis `http://10.7.2.42:8080`
