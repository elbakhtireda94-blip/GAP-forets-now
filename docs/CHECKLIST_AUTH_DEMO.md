# Checklist – Auth comptes démo (GAP Forêts)

## Prérequis

- MySQL (XAMPP) démarré, utilisateur `root`, mot de passe vide (ou config dans `server/.env`).
- Base `anef_field_connect` créée (automatique au boot du serveur ou via seed).
- Backend : `cd server && npm run dev` (écoute sur `0.0.0.0:3002`).
- Frontend : `npm run dev` (ex. `http://192.168.11.104:8080`).
- Dans `.env` à la racine : `VITE_MYSQL_API_URL=http://192.168.11.104:3002` (sans slash final), et `VITE_USE_MYSQL_BACKEND=true`.

---

## 1. Seed des comptes démo

```bash
cd server
npm run seed
```

- Vérifier en console : `✓ ADMIN created/updated: demo@anef.ma` et `✓ ADP created/updated: adp.demo@anef.ma`.
- Mot de passe pour tous : **Password1** (P majuscule).

---

## 2. Backend – Health

- **GET** `http://192.168.11.104:3002/health`  
  → Réponse : `{ "ok": true }`.

- **GET** `http://192.168.11.104:3002/api/debug/demo-users`  
  → `demo` et `adp_demo` avec `exists: true`, `hasPassword: true`, `hasProfile: true`.

---

## 3. Backend – Login (JSON uniquement)

- **POST** `http://192.168.11.104:3002/api/auth/login`  
  Headers : `Content-Type: application/json`  
  Body : `{ "email": "demo@anef.ma", "password": "Password1" }`

  → **200** et body JSON : `access_token`, `user: { id, email }` (pas de HTML, pas de redirect).

- Idem avec `adp.demo@anef.ma` / `Password1` → **200** + token.

- En cas d’erreur (mauvais mot de passe, user inconnu) : **401** avec body JSON du type  
  `{ "ok": false, "code": "INVALID_CREDENTIALS", "message": "...", "error": "..." }`.

**Où regarder les logs :** terminal du serveur Node. Vous devez voir par exemple :  
`[AUTH] Login attempt:`, `[AUTH] User found:`, `[AUTH] ✅ Login successful for: demo@anef.ma`.

---

## 4. Frontend – Connexion démo

1. Ouvrir l’app en `http://192.168.11.104:8080` (ou le port Vite affiché).
2. Cliquer **« Démo Production (Admin) »** (remplit `demo@anef.ma` / `Password1`) puis Connexion.  
   → Redirection vers l’app, **pas** de toast « Compte démo indisponible » ou « Email ou mot de passe incorrect ».
3. Se déconnecter, puis **« ADP Démo Terrain »** (`adp.demo@anef.ma` / `Password1`), Connexion.  
   → Même comportement : connexion OK, pas d’erreur.

**En cas de « Unexpected token < » ou réponse HTML :**  
- Vérifier que `VITE_MYSQL_API_URL` pointe bien vers l’IP et le port du backend (ex. `http://192.168.11.104:3002`).  
- Vérifier la console navigateur : message détaillé si le serveur a renvoyé du HTML au lieu de JSON.

---

## 5. Token et appels protégés

- Après login réussi : **localStorage** doit contenir la clé `anef_mysql_token` avec le JWT.
- Ouvrir une page qui appelle une API protégée (ex. PDFCP, Régions).  
  → Plus de « Token manquant » ni **401 Unauthorized** (tant que le token est valide).

**Où regarder :**  
- Application → Local Storage (DevTools).  
- Onglet Network : requêtes vers `.../api/...` avec en-tête `Authorization: Bearer <token>`.

---

## Résumé des corrections apportées

| Zone | Modification |
|------|--------------|
| **Backend auth** | Logs détaillés (email, user found, password check). Réponses toujours JSON avec `ok`, `code`, `message` (+ `error` pour compat). |
| **Seed** | Déjà idempotent (SELECT puis UPDATE ou INSERT). Script `npm run seed` dans `server/package.json`. Bcrypt 10 rounds pour `Password1`. |
| **CORS** | Origines `http://192.168.11.104:*` (8080, 8081, 8082, 8084, 5173) ajoutées. |
| **Frontend** | Client API : utilisation de `message` en plus de `error` pour les erreurs. Message explicite si réponse HTML au lieu de JSON. |
| **DB** | `ensureDatabaseExists()` au boot (déjà en place). Pas de changement module GEO. |
