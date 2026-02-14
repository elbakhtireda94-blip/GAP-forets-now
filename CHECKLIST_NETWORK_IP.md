# Checklist - Configuration réseau IP (10.7.2.42)

## Configuration requise

### 1. Démarrer le backend et noter le port

```bash
cd server
npm start
```

**Chercher dans les logs:**
```
API listening on 0.0.0.0:PORT (network accessible)
API accessible from network: http://10.7.2.42:PORT
```

**Notez le PORT réel** (peut être 3002, 3004, 3005, 3006 selon disponibilité)

### 2. Mettre à jour `.env` (racine du projet)

Remplacez `PORT` par le port réel noté ci-dessus:

```env
VITE_MYSQL_API_URL=http://10.7.2.42:PORT
```

**Exemple si port = 3002:**
```env
VITE_MYSQL_API_URL=http://10.7.2.42:3002
```

**Important:** Pas de slash final (`/`)

### 3. Redémarrer le frontend

Après modification de `.env`, redémarrer le serveur de développement:
```bash
npm run dev
```

## Checklist de test

### ✅ Test 1: Backend accessible via IP

```bash
# Remplacer PORT par le port réel (ex: 3002)
curl http://10.7.2.42:PORT/health
```

**Attendu:**
```json
{"ok":true}
```

**Si échec:**
- Vérifier que le backend est démarré
- Vérifier que le port est correct
- Vérifier le firewall Windows (port doit être ouvert)

### ✅ Test 2: API health endpoint

```bash
curl http://10.7.2.42:PORT/api/health
```

**Attendu:**
```json
{"ok":true,"db":"mysql"}
```

### ✅ Test 3: Frontend console

1. Ouvrir le frontend: `http://10.7.2.42:8080` (ou port Vite utilisé)
2. Ouvrir DevTools (F12) → Console
3. Vérifier le log:
   ```
   [API] Base URL: http://10.7.2.42:PORT
   ```
4. **Si vous voyez `localhost` au lieu de `10.7.2.42`:**
   - Vérifier que `.env` est bien modifié
   - Redémarrer le serveur de développement (`npm run dev`)
   - Vider le cache du navigateur si nécessaire

### ✅ Test 4: Login démo

1. Aller sur la page de login
2. Email: `adp.demo@anef.ma`
3. Password: `Password1` (P majuscule)
4. Cliquer sur "Se connecter"

**Vérifier dans la console:**
```
[AUTH] Login attempt for: adp.demo@anef.ma
[AUTH] Login successful, storing token...
[AUTH] ✓ Token stored successfully
```

**Si login échoue:**

#### 4a. Vérifier les utilisateurs démo

```bash
curl http://10.7.2.42:PORT/api/debug/demo-users
```

**Attendu:**
```json
{
  "database": "anef_field_connect",
  "demo": {
    "exists": true,
    "hasPassword": true,
    "hasProfile": true
  },
  "adp_demo": {
    "exists": true,
    "hasPassword": true,
    "hasProfile": true
  }
}
```

#### 4b. Si `hasProfile: false`, exécuter seed

```bash
cd server
node seed.js
```

**Attendu:**
```
✅ Database 'anef_field_connect' already exists
✅ MySQL connecté
📦 Seeding users...
✅ User demo@anef.ma created
✅ User adp.demo@anef.ma created
...
✅ Seed completed successfully
```

#### 4c. Retester login

Après `node seed.js`, retester le login avec `adp.demo@anef.ma` / `Password1`

### ✅ Test 5: Vérifier CORS

Si vous voyez une erreur CORS dans la console:

1. Vérifier que `http://10.7.2.42:8080` (ou votre port Vite) est dans `allowedOrigins`
2. Vérifier les logs backend pour voir l'origine rejetée
3. Ajouter l'origine manquante dans `server/index.js` si nécessaire

## Résumé des ports

- **Backend:** Port détecté dans les logs (3002 par défaut, ou 3004/3005/3006 si occupé)
- **Frontend:** Port Vite (8080, 8084, 8089, etc. selon disponibilité)
- **IP machine:** `10.7.2.42` (vérifier avec `ipconfig` si différent)

## Dépannage rapide

| Problème | Solution |
|----------|----------|
| `Failed to fetch` | Vérifier `VITE_MYSQL_API_URL` dans `.env` et redémarrer frontend |
| `401 Unauthorized` | Vérifier `/api/debug/demo-users` et exécuter `node seed.js` si nécessaire |
| `CORS error` | Vérifier que l'origine est dans `allowedOrigins` |
| Backend non accessible | Vérifier firewall Windows et que le backend écoute sur `0.0.0.0` |

## Configuration finale attendue

✅ Backend écoute sur `0.0.0.0:PORT`  
✅ `.env` contient `VITE_MYSQL_API_URL=http://10.7.2.42:PORT`  
✅ CORS autorise `http://10.7.2.42:8080` et ports Vite (8084, 8089)  
✅ `/health` répond via IP  
✅ Login fonctionne avec `adp.demo@anef.ma`
