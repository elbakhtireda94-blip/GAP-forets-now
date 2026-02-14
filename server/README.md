# ANEF Field Connect — MySQL API backend

Node.js (Express) API that connects to the MySQL database so the frontend can use MySQL instead of Supabase. **Stack: JavaScript only** (no TypeScript in server; all `.js` files must be valid Node.js).

## Setup

1. **MySQL**: Create the database and run the schema.
   ```bash
   mysql -u root -p < ../supabase/schema-mysql.sql
   mysql -u root -p < ../supabase/schema-mysql-auth.sql
   ```
   The second file adds `password_hash` to the `users` table for login.

2. **Create a user and profile** (replace with your values):
   ```bash
   node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword', 10));"
   ```
   Then in MySQL:
   ```sql
   INSERT INTO users (id, email, password_hash) VALUES (UUID(), 'admin@anef.ma', 'PASTE_HASH_HERE');
   SET @uid = (SELECT id FROM users WHERE email = 'admin@anef.ma' LIMIT 1);
   INSERT INTO profiles (id, user_id, email, full_name) VALUES (UUID(), @uid, 'admin@anef.ma', 'Admin');
   INSERT INTO user_roles (id, user_id, role) VALUES (UUID(), @uid, 'ADMIN');
   ```

3. **Environment**: Copy `.env.example` to `.env` and set:
   - `MYSQL_*` — MySQL connection
   - `JWT_SECRET` — Secret for JWT (change in production)
   - `CORS_ORIGIN` — Frontend URL (e.g. `http://localhost:8080`)

4. **Install and run**:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   API runs at `http://localhost:3001` (or 3002/3003 if 3001 is in use; see console log).

   **Lancement (2 terminaux)**  
   - **Terminal 1 (API):** `cd server && npm run dev`  
   - **Terminal 2 (frontend):** `npm run dev`  

   Dans le `.env` à la **racine du projet** (pas dans `server/`) :  
   `VITE_MYSQL_API_URL=http://localhost:3001`  
   (Si le serveur affiche un autre port, ex. 3002, utiliser `VITE_MYSQL_API_URL=http://localhost:3002`.)

5. **Seed fake data** (optional):
   ```bash
   npm run seed
   ```
   Creates regions/dranef/dpanef/communes, 4 users (admin, regional, provincial, adp), and sample PDFCP, cahier journal, activities, conflicts, organizations. All user passwords: **Password1**.

## Frontend

In the project root `.env` add:
```
VITE_USE_MYSQL_BACKEND=true
VITE_MYSQL_API_URL=http://localhost:3001
```
Then run the Vite app and log in with the MySQL user (email + password).

## Validation (checklist)

1. **a)** `cd server && npm run dev` → la console affiche **`API listening on http://localhost:3001`** (ou le port utilisé).
2. **b)** GET `http://localhost:3001/health` (navigateur ou curl) → réponse **`{ "ok": true }`**. Fonctionne même si MySQL n’est pas connecté.
3. **c)** POST `http://localhost:3001/ai/transcribe` avec un fichier audio (multipart) → le serveur logue **method + req.file.size** et renvoie du JSON (`ok`, `size`, `mimetype`, `filename` en mode temporaire si `OPENAI_API_KEY` absent).
