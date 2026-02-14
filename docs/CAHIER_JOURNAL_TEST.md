# Plan de Test — Cahier Journal (Audio + Transcription Locale)

## 🎯 Objectif

Tester le module complet d'enregistrement audio + transcription locale Whisper (100% gratuit) dans le Cahier Journal.

---

## ✅ Prérequis

### 1. Installer les dépendances Node
```bash
npm install
cd server && npm install && cd ..
```

### 2. Vérifier les prérequis Whisper (optionnel pour tester l'enregistrement)
```powershell
.\server\check-whisper.ps1
```

Si des composants manquent, suivre `docs/LOCAL_WHISPER_SETUP.md`.

---

## 🚀 Lancement

### Option A : Lancer tout en une commande
```bash
npm run dev:all
```

### Option B : Lancer séparément
**Terminal 1 (Backend):**
```bash
npm run dev:server
```
→ Attendre: `API listening on http://localhost:3002` (ou 3001/3003)

**Terminal 2 (Frontend):**
```bash
npm run dev:frontend
```
→ Ouvrir l'URL affichée (ex: `http://localhost:8081`)

---

## 📋 Checklist de Test

### Étape 1 : Vérifier le backend
- [ ] Ouvrir `http://localhost:3002/health` (ou le port affiché)
- [ ] Réponse attendue: `{"ok":true}`

### Étape 2 : Tester l'enregistrement audio
1. [ ] Ouvrir le frontend (`http://localhost:8081` ou port affiché)
2. [ ] Aller dans **Cahier Journal** → **Nouvelle entrée**
3. [ ] Cliquer sur **"🎙️ Enregistrer un message vocal"**
4. [ ] Autoriser l'accès au microphone si demandé
5. [ ] Parler quelques secondes (ex: "Bonjour, ceci est un test d'enregistrement audio")
6. [ ] Cliquer sur **"Arrêter"**
7. [ ] **Vérifier:**
   - Message "Enregistrement terminé" visible
   - Durée affichée (ex: "00:05")
   - Taille affichée (ex: "74 KB")
   - Type affichée (ex: "audio/webm;codecs=opus")
   - Lecteur audio `<audio controls>` visible et fonctionnel
   - Console navigateur: `[useVoiceRecorder] Recording stopped, blob created: { size: X, ... }`
   - Console navigateur: `[useVoiceRecorder] Audio ready for transcription (blob.size > 0): true`

### Étape 3 : Tester la transcription (nécessite Python + faster-whisper)
1. [ ] Après l'enregistrement, le panneau **"Transcription intelligente"** doit apparaître
2. [ ] Cliquer sur **"Transcrire"**
3. [ ] **Vérifier logs backend:**
   - `[POST /ai/transcribe-local] method: POST path: /transcribe-local`
   - `[POST /ai/transcribe-local] req.file.size: X mimetype: Y tmp: ...`
   - `[Whisper Local] Transcript length: X`
4. [ ] **Vérifier réponse:**
   - Panneau affiche 3 onglets: **Brut** / **FR Pro** / **Synthèse**
   - Onglet **Brut**: texte transcrit visible
   - Onglet **FR Pro**: version française professionnelle
   - Onglet **Synthèse**: structure avec contexte, objectif, déroulement, résultats, risques, actions_suivi
5. [ ] Cliquer sur **"Insérer"** pour **FR Pro** → doit remplir le champ description

### Étape 4 : Tester les erreurs (si Python manque)
1. [ ] Si Python/faster-whisper non installé, cliquer **"Transcrire"**
2. [ ] **Vérifier:**
   - Toast d'erreur clair affiché
   - Message mentionne Python/faster-whisper/FFmpeg
   - Bouton "Transcrire" reste disponible (pas de crash)

---

## 🔍 Logs à surveiller

### Frontend (Console navigateur)
```
[useVoiceRecorder] startRecording
[useVoiceRecorder] Starting recording with mimeType: audio/webm;codecs=opus
[useVoiceRecorder] Recording stopped, blob created: { size: X, type: Y, chunksCount: Z, sizeKB: W }
[useVoiceRecorder] Object URL created: blob:http://localhost:8081/...
[useVoiceRecorder] Audio ready for transcription (blob.size > 0): true
[TranscriptionPanel] API_BASE_URL: http://localhost:3002
[TranscriptionPanel] Final URL used: http://localhost:3002/ai/transcribe-local
[TranscriptionPanel] Blob size: X Has token: true/false
[TranscriptionPanel] Response status: 200 for URL: ...
```

### Backend (Terminal serveur)
```
API listening on http://localhost:3002
[POST /ai/transcribe-local] method: POST path: /transcribe-local
[POST /ai/transcribe-local] req.file.size: X mimetype: Y tmp: server/tmp/...
[Whisper Local] Transcript length: X
```

---

## ⚠️ Dépannage

### Erreur "Python non trouvé"
→ Installer Python depuis https://www.python.org/downloads/ (cocher "Add to PATH")

### Erreur "faster-whisper non installé"
→ `pip install faster-whisper`

### Erreur "FFmpeg non trouvé"
→ Télécharger depuis https://ffmpeg.org/download.html et ajouter au PATH

### Erreur "Serveur indisponible ou CORS"
→ Vérifier que le backend tourne sur le port affiché
→ Vérifier `.env` racine: `VITE_MYSQL_API_URL=http://localhost:3002` (ou le bon port)

### Transcription vide
→ Vérifier que l'audio est valide (format supporté: webm, mp4, wav, etc.)
→ Vérifier logs backend pour erreurs Python

---

## ✅ Critères de succès

- [x] Enregistrement audio fonctionne (durée, taille, lecteur visible)
- [x] Blob créé avec `size > 0`
- [x] Backend `/health` répond `{ok:true}`
- [x] Transcription retourne JSON valide (si Python installé)
- [x] Onglets Brut/FR Pro/Synthèse affichent du contenu
- [x] Bouton "Insérer FR Pro" remplit la description
- [x] Erreurs affichées clairement si prérequis manquants

---

## 📝 Notes

- L'enregistrement audio fonctionne **sans Python** (testable immédiatement)
- La transcription nécessite **Python + faster-whisper + FFmpeg**
- Les fichiers tmp sont automatiquement supprimés après traitement
- Rate limiting: 10 transcriptions/heure par utilisateur
