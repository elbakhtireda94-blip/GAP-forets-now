# 🚀 Démarrage Rapide — Cahier Journal (Audio + Transcription)

## Installation (une seule fois)

```bash
# 1. Installer les dépendances Node
npm install
cd server && npm install && cd ..

# 2. Installer concurrently (pour lancer front + back ensemble)
npm install --save-dev concurrently
```

## Optionnel : Installer Whisper Local (pour la transcription)

```powershell
# Vérifier les prérequis
.\server\check-whisper.ps1

# Si des composants manquent, suivre:
# docs/LOCAL_WHISPER_SETUP.md
```

---

## 🎯 Lancer l'Application

### Option A : Tout en une commande (recommandé)
```bash
npm run dev:all
```

Cela lance:
- **Frontend** (Vite) → `http://localhost:8081` (ou 5173)
- **Backend** (Express) → `http://localhost:3001` (ou 3002/3003)

### Option B : Séparément
**Terminal 1:**
```bash
npm run dev:server
```

**Terminal 2:**
```bash
npm run dev:frontend
```

---

## ✅ Test Rapide

1. **Ouvrir** `http://localhost:8081` (ou le port affiché)
2. **Aller dans** Cahier Journal → Nouvelle entrée
3. **Cliquer** "🎙️ Enregistrer un message vocal"
4. **Parler** quelques secondes
5. **Arrêter** l'enregistrement
6. **Vérifier:** Durée + Taille + Lecteur audio visible
7. **Cliquer** "Transcrire" (nécessite Python + faster-whisper)

---

## 📋 Checklist Complète

Voir `docs/CAHIER_JOURNAL_TEST.md` pour le plan de test détaillé.

---

## ⚙️ Configuration

### .env (racine du projet)
```env
VITE_MYSQL_API_URL=http://localhost:3002
```
*(Ajuster le port si le serveur utilise 3001 ou 3003)*

---

## 🆘 Dépannage

### "concurrently n'est pas reconnu"
```bash
npm install --save-dev concurrently
```

### "Port déjà utilisé"
Le serveur essaie automatiquement 3002, 3003. Vérifier la console pour le port utilisé.

### "Python non trouvé" (pour transcription)
→ Installer Python depuis https://www.python.org/downloads/
→ Vérifier avec: `.\server\check-whisper.ps1`

### "Serveur indisponible ou CORS"
→ Vérifier que le backend tourne (voir console)
→ Vérifier `.env` avec le bon port

---

## 📚 Documentation

- **Test Plan:** `docs/CAHIER_JOURNAL_TEST.md`
- **Installation Whisper:** `docs/LOCAL_WHISPER_SETUP.md`
- **Backend:** `server/README.md`
- **Transcription Locale:** `server/README_TRANSCRIPTION_LOCALE.md`
