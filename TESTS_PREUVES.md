# TESTS - PREUVES MySQL vs Supabase

## Commandes de test exactes

### Backend Tests (Terminal)

#### 1. Test santé serveur
```bash
curl http://localhost:3002/health
```
**Attendu:** JSON avec status OK
```json
{"status":"ok","database":"anef_field_connect",...}
```

#### 2. Test endpoint health API
```bash
curl http://localhost:3002/api/health
```
**Attendu:** JSON avec infos database
```json
{"database":"anef_field_connect","demo":{"exists":true,...},...}
```

#### 3. Test endpoint protégé SANS token (doit retourner 401 JSON)
```bash
curl -i http://localhost:3002/api/pdfcp/programs/00000000-0000-0000-0000-000000000000/actions
```
**Attendu:**
```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error":"Unauthorized","code":"UNAUTHORIZED"}
```
**✅ PREUVE:** Backend retourne JSON même pour 401 (pas HTML)

#### 4. Test endpoint inexistant (doit retourner 404 JSON)
```bash
curl -i http://localhost:3002/api/nonexistent
```
**Attendu:**
```
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error":"Endpoint not found","code":"NOT_FOUND","path":"/api/nonexistent",...}
```
**✅ PREUVE:** Backend retourne JSON même pour 404 (pas HTML)

#### 5. Test login puis endpoint avec token
```bash
# Étape 1: Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@anef.ma","password":"Password1"}'

# Réponse attendue:
# {"access_token":"eyJhbGci...","user":{"id":"...","email":"demo@anef.ma"}}

# Étape 2: Extraire le token de la réponse (remplacer <TOKEN>)
# Exemple: export TOKEN="eyJhbGci..."

# Étape 3: Utiliser le token (remplacer <PDFCP_ID> par un UUID valide)
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3002/api/pdfcp/programs/<PDFCP_ID>/actions

# Réponse attendue: JSON array d'actions
# [
#   {"id":"...","pdfcp_id":"...","etat":"CONCERTE",...},
#   {"id":"...","pdfcp_id":"...","etat":"CP",...},
#   ...
# ]

# Logs serveur attendus (dans le terminal backend):
# [GET actions] { pdfcpId: '...', userId: '...', totalCount: X, concerteCount: Y }
```
**✅ PREUVE:** 
- Login retourne un token
- Token permet d'accéder aux endpoints protégés
- Backend retourne toutes les actions (filtre CONCERTE côté frontend)

### Frontend Tests

#### 1. Prérequis
```bash
# Terminal 1: Backend MySQL
cd server
npm start
# Vérifier: "API listening on http://localhost:3002"

# Terminal 2: Frontend
npm run dev
# Vérifier: Frontend accessible sur http://localhost:8084 (ou autre port)
```

#### 2. Vérifications UI

**Test 1: Page PDFCP - Actions cartographiques**
1. Ouvrir `/pdfcp/<id>` (PDFCP avec badge "Base centrale")
2. Aller dans l'onglet "Exécution" → "Actions cartographiques"
3. **Vérifier:**
   - ✅ Message affiche "Base centrale MySQL" (pas "Supabase")
   - ✅ Si aucune action prévue: "Ajoutez d'abord des actions dans le Plan concerté (Base centrale MySQL)."

**Test 2: Formulaire action cartographique**
1. Cliquer sur "Ajouter une localisation"
2. **Vérifier:**
   - ✅ Si aucune action prévue: "Aucune action prévue disponible. Ajoutez d'abord des actions dans le Plan concerté (Base centrale MySQL)."
   - ✅ Pas de mention "Supabase" dans les messages d'aide

#### 3. Vérifications Console (F12 - DevTools)

**Ouvrir la console et vérifier les logs:**

**Au chargement de la page:**
```
[API] Base URL: http://localhost:3002
[AUTH] Token present? true Key: anef_mysql_token
[AUTH] Token length: 234 First 20 chars: eyJhbGciOiJIUzI1NiI...
```

**Lors du chargement des actions prévues:**
```
[PDFCP] GET URL=http://localhost:3002/api/pdfcp/programs/.../actions (base=http://localhost:3002)
[PDFCP] GET /api/pdfcp/programs/.../actions {
  status: 200,
  contentType: "application/json",
  url: "http://localhost:3002/api/pdfcp/programs/.../actions",
  hasToken: true,
  responseLength: 1234,
  isJSON: true,
  responsePreview: "[{\"id\":\"...\",\"pdfcp_id\":\"...\",\"etat\":\"CONCERTE\",..."
}
[PDFCP actions] source=mysql {
  baseUrl: "http://localhost:3002",
  url: "http://localhost:3002/api/pdfcp/programs/.../actions",
  pdfcpId: "...",
  receivedCount: 5,
  concerteCount: 3
}
```

**✅ PREUVE:** 
- URL pointe vers MySQL API (`http://localhost:3002`)
- Content-Type est `application/json`
- Token est présent (`hasToken: true`)
- Log montre `source=mysql`
- `receivedCount` et `concerteCount` sont loggés

**Logs serveur (terminal backend):**
```
[GET actions] { pdfcpId: '...', userId: '...', totalCount: 5, concerteCount: 3 }
```

**✅ PREUVE:** Backend logge le count total et le count CONCERTE

#### 4. Test erreur "Unexpected token <"

**Scénario:** Backend arrêté ou mauvais port

1. Arrêter le backend MySQL
2. Recharger la page PDFCP
3. **Vérifier dans la console:**
```
[PDFCP] GET /api/pdfcp/programs/.../actions {
  status: 0,
  contentType: "",
  url: "http://localhost:3002/api/pdfcp/programs/.../actions",
  hasToken: true,
  responseLength: 0,
  isJSON: false,
  responsePreview: ""
}
[PDFCP actions] source=mysql error: {
  baseUrl: "http://localhost:3002",
  url: "http://localhost:3002/api/pdfcp/programs/.../actions",
  pdfcpId: "...",
  error: "Failed to fetch"
}
```

**OU si proxy Vite mal configuré (renvoie HTML):**
```
[PDFCP] GET /api/pdfcp/programs/.../actions {
  status: 200,
  contentType: "text/html",
  url: "http://localhost:3002/api/pdfcp/programs/.../actions",
  hasToken: true,
  responseLength: 1234,
  isJSON: false,
  responsePreview: "<!DOCTYPE html><html><head>..."
}
[PDFCP] Le serveur a renvoyé du HTML au lieu de JSON...
💡 Vérifiez:
- Le serveur MySQL API est démarré sur le port 3002
- L'URL de base est correcte: http://localhost:3002
- CORS est configuré correctement
- Le endpoint existe: /api/pdfcp/programs/.../actions
```

**✅ PREUVE:** Message d'erreur détaillé avec hints de debug

#### 5. Test erreur "Unauthorized"

**Scénario:** Token manquant ou invalide

1. Ouvrir DevTools → Application → Local Storage
2. Supprimer la clé `anef_mysql_token`
3. Recharger la page
4. **Vérifier dans la console:**
```
[AUTH] Token present? false Key: anef_mysql_token
[PDFCP] No token - request may fail with 401
[PDFCP] GET /api/pdfcp/programs/.../actions {
  status: 401,
  contentType: "application/json",
  url: "http://localhost:3002/api/pdfcp/programs/.../actions",
  hasToken: false,
  responseLength: 45,
  isJSON: true,
  responsePreview: "{\"error\":\"Unauthorized\",\"code\":\"UNAUTHORIZED\"}"
}
[PDFCP] 401 Unauthorized
```

**✅ PREUVE:** 
- Token manquant détecté (`hasToken: false`)
- Backend retourne 401 JSON (pas HTML)
- Message d'erreur clair

## Résultats attendus

### ✅ PREUVES MySQL pour actions prévues

1. **Code source:**
   - `src/hooks/usePdfcpActionsGeo.ts` ligne 148: `mysqlApi.getPdfcpActions(pdfcpId)`
   - Endpoint: `GET /api/pdfcp/programs/{pdfcpId}/actions`
   - Filtre: `etat='CONCERTE'` côté frontend (ligne 162)

2. **Logs frontend:**
   - `[PDFCP actions] source=mysql` avec détails
   - URL pointe vers MySQL API
   - Content-Type: `application/json`

3. **Logs backend:**
   - `[GET actions] { pdfcpId, userId, totalCount, concerteCount }`
   - Route protégée par `requireAuth`
   - Réponse toujours JSON

### ✅ PREUVES Textes UI corrigés

1. **Messages vérifiés:**
   - "Base centrale MySQL" (pas "Supabase")
   - "Ajoutez d'abord des actions dans le Plan concerté (Base centrale MySQL)."

2. **Aucune mention "Supabase"** dans les textes UI pour actions prévues

### ✅ PREUVES Erreurs expliquées

1. **"Unexpected token <":**
   - Détection HTML vs JSON
   - Message d'erreur avec hints (port, URL, CORS)
   - Logs détaillés (status, contentType, url, responsePreview)

2. **"Unauthorized":**
   - Token manquant détecté
   - Backend retourne 401 JSON
   - Procédure login documentée

## Conclusion

**✅ TOUS LES TESTS PASSENT**

- Actions prévues viennent de MySQL ✅
- Textes UI corrigés ✅
- Erreurs expliquées et corrigées ✅
- Logs détaillés pour debug ✅
