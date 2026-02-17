# Correction définitive : Backend démo injoignable

## Résumé des corrections effectuées

### 1. Port backend unifié
- **Fichier** : `server/index.js`
- **Changement** : `const PORT = Number(process.env.PORT) || 3002;`
- Le port vient de `server/.env` (PORT=3002) ou défaut 3002. Aligné avec `VITE_MYSQL_API_URL`.

### 2. Logs backend clairs
- **Au démarrage** : `✅ Backend running on PORT 3002`
- **Si le port est occupé** :
  ```
  ❌ Backend not running on PORT 3002
     Port 3002 is already in use. Stop the other process or free port 3002.
     Start backend with: cd server && npm run dev
  ```

### 3. Fallback frontend (pas de crash)
- **Fichier** : `src/integrations/mysql-api/client.ts`
- En cas d’échec réseau (fetch) : message utilisateur **"Backend temporairement indisponible. Démarrez le serveur : cd server && npm run dev"**.
- En cas de réponse HTML au lieu de JSON : **"Backend temporairement indisponible. Vérifiez que le serveur tourne sur le port X (cd server && npm run dev)."**
- Détails techniques restent dans la console (console.error) pour le débogage.

### 4. Toasts Auth (page connexion)
- **Fichier** : `src/pages/Auth.tsx`
- Titre : **"Backend temporairement indisponible"** (au lieu de "Backend démo injoignable").
- Description courte : *"Démarrez le serveur : cd server && npm run dev. Vérifiez .env : VITE_MYSQL_API_URL=http://localhost:3002"*.
- L’application ne bloque pas : seul un toast s’affiche.

### 5. Fichiers .env
- **Racine `.env`** : `VITE_MYSQL_API_URL=http://localhost:3002` + commentaire sur la correspondance avec le port backend.
- **server/.env** : `PORT=3002` + commentaire rappelant de garder la cohérence avec `VITE_MYSQL_API_URL`.

---

## Réponse à vos questions

| Question | Réponse |
|----------|--------|
| **Port backend** | **3002** (défini dans `server/.env` ou défaut dans `server/index.js`) |
| **URL exacte pour VITE_MYSQL_API_URL** | **`http://localhost:3002`** (en local). Depuis le réseau : `http://VOTRE_IP:3002` (ex. `http://192.168.11.104:3002`) |
| **Conflit de port** | Si 3002 est occupé, le backend affiche le message ci-dessus. Libérez le port ou changez `PORT` dans `server/.env` et la même valeur dans `VITE_MYSQL_API_URL`. |

---

## Checklist pour que le backend soit joignable

1. **MySQL** (XAMPP ou autre) : service MySQL démarré.
2. **Backend** : dans un terminal, `cd server` puis `npm run dev` → vous devez voir `✅ Backend running on PORT 3002`.
3. **Racine .env** : `VITE_MYSQL_API_URL=http://localhost:3002` (sans slash final).
4. **Frontend** : redémarrer après modification du `.env` (`npm run dev` à la racine).

Aucun code fonctionnel n’a été supprimé ; seules la configuration et la gestion d’erreur ont été corrigées.
