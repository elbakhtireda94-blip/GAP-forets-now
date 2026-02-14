# 🔍 Guide de débogage - Erreur "Email ou mot de passe incorrect"

## ✅ Checklist de vérification

### 1️⃣ Vérifier que MySQL est démarré dans XAMPP
- Ouvrir le panneau de contrôle XAMPP
- Vérifier que MySQL est **vert** (démarré)
- Si rouge, cliquer sur **Start**

### 2️⃣ Vérifier que le backend est démarré
```powershell
cd server
npm run dev
```

Vous devriez voir :
```
🔍 Checking MySQL database...
✅ Database 'anef_field_connect' already exists

🔍 Testing MySQL connection...
✅ MySQL connecté
   Host: 127.0.0.1:3306
   Database: anef_field_connect

API listening on http://localhost:3002
```

### 3️⃣ Vérifier que le script seed a été exécuté
```powershell
cd server
node seed.js
```

Vous devriez voir :
```
✅ DEMO environment seeded successfully!

📝 Login credentials (password: Password1):

   ADMIN:
     admin@anef.ma

   DRANEF:
     dranef.rsk@anef.ma
     dranef.bmk@anef.ma

   DPANEF:
     dpanef.rabat@anef.ma
     dpanef.bm@anef.ma

   ADP:
     adp.temara@anef.ma
     adp.kasba@anef.ma
```

### 4️⃣ Vérifier les comptes dans la base de données
```sql
-- Se connecter à MySQL via XAMPP phpMyAdmin ou ligne de commande
USE anef_field_connect;
SELECT email, id FROM users;
```

Vous devriez voir au moins :
- admin@anef.ma
- dranef.rsk@anef.ma
- dranef.bmk@anef.ma
- dpanef.rabat@anef.ma
- dpanef.bm@anef.ma
- adp.temara@anef.ma
- adp.kasba@anef.ma

### 5️⃣ Vérifier la console du navigateur
Ouvrir la console (F12) et regarder les logs lors de la tentative de connexion :

**Logs attendus :**
```
[Auth Page] Attempting login via AuthContext...
[AUTH] Attempting login for: admin@anef.ma
[API POST] http://localhost:3002/api/auth/login
[API] Has token: false
[API POST] Status: 200 OK
[AUTH] Login successful, storing token...
[AUTH] ✓ Token stored successfully
```

**Si erreur :**
```
[API POST] Status: 401 Unauthorized
[AUTH] Login failed: Invalid email or password
```

### 6️⃣ Vérifier les logs du backend
Dans le terminal où tourne `npm run dev`, vous devriez voir :

**Succès :**
```
[AUTH] Login attempt: { email: 'admin@anef...', hasPassword: true }
[AUTH] Normalized email: admin@anef.ma
[AUTH] User found, comparing password...
[AUTH] ✅ Login successful for: admin@anef.ma
```

**Échec :**
```
[AUTH] Login attempt: { email: 'admin@anef...', hasPassword: true }
[AUTH] Normalized email: admin@anef.ma
[AUTH] User not found: admin@anef.ma
```
OU
```
[AUTH] Password mismatch for: admin@anef.ma
```

## 🔧 Solutions selon l'erreur

### Erreur : "User not found"
**Cause :** Le script seed n'a pas été exécuté ou a échoué.

**Solution :**
```powershell
cd server
node seed.js
```

### Erreur : "Password mismatch"
**Cause :** Le mot de passe saisi ne correspond pas à celui dans la base.

**Solution :**
- Vérifier que vous utilisez exactement : `Password1` (avec majuscule P)
- Réexécuter le seed pour réinitialiser les mots de passe :
```powershell
cd server
node seed.js
```

### Erreur : "ECONNREFUSED" ou "Failed to fetch"
**Cause :** Le backend n'est pas démarré ou n'est pas accessible.

**Solution :**
1. Vérifier que le backend tourne sur `http://localhost:3002`
2. Tester : `http://localhost:3002/health` → doit retourner `{ ok: true }`
3. Vérifier `.env` : `VITE_MYSQL_API_URL=http://localhost:3002`

### Erreur : "Cannot proceed without database"
**Cause :** MySQL n'est pas démarré ou la connexion échoue.

**Solution :**
1. Démarrer MySQL dans XAMPP
2. Vérifier `server/.env` :
   ```
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=
   ```

## 📋 Comptes de test

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@anef.ma` | `Password1` | ADMIN |
| `dranef.rsk@anef.ma` | `Password1` | DRANEF |
| `dranef.bmk@anef.ma` | `Password1` | DRANEF |
| `dpanef.rabat@anef.ma` | `Password1` | DPANEF |
| `dpanef.bm@anef.ma` | `Password1` | DPANEF |
| `adp.temara@anef.ma` | `Password1` | ADP |
| `adp.kasba@anef.ma` | `Password1` | ADP |

## 🚀 Commandes rapides

```powershell
# 1. Démarrer MySQL dans XAMPP (panneau de contrôle)

# 2. Démarrer le backend
cd server
npm run dev

# 3. Dans un autre terminal, exécuter le seed
cd server
node seed.js

# 4. Vérifier que tout fonctionne
# Ouvrir http://localhost:3002/api/debug/db
# Doit retourner : { ok: true, connection: 'active', ... }
```
