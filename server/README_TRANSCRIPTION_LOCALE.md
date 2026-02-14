# Transcription Locale (100% Gratuite)

Module de transcription audio avec **faster-whisper** (Python) + post-traitement par règles (sans OpenAI).

## Prérequis

### 1. Python 3.8+
```bash
python --version  # ou python3 --version
```

### 2. faster-whisper
```bash
pip install faster-whisper
```

### 3. FFmpeg (requis par faster-whisper)
- **Windows**: Télécharger depuis https://ffmpeg.org/download.html
  - Ajouter `ffmpeg.exe` au PATH ou placer dans `C:\Windows\System32`
- **Linux/Mac**: `sudo apt install ffmpeg` ou `brew install ffmpeg`

Vérifier:
```bash
ffmpeg -version
```

## Installation

### Backend (Node.js)
```bash
cd server
npm install
npm run dev
```

Le serveur écoute sur `http://localhost:3001` (ou 3002/3003 si 3001 est occupé).

### Frontend (Vite)
```bash
npm run dev
```

Le frontend tourne sur `http://localhost:8081` (ou 5173 selon config).

## Configuration

### .env (racine du projet)
```env
VITE_MYSQL_API_URL=http://localhost:3001
```

Si le serveur utilise un autre port (ex. 3002), mettre:
```env
VITE_MYSQL_API_URL=http://localhost:3002
```

### .env (server/)
```env
PORT=3001
# Pas besoin d'OPENAI_API_KEY pour la transcription locale
```

## Utilisation

1. **Enregistrer un audio** dans le formulaire Cahier Journal
2. Cliquer sur **"Transcrire"** dans le panneau de transcription
3. Le backend:
   - Sauvegarde l'audio dans `server/tmp/`
   - Appelle `whisper_local.py` avec faster-whisper
   - Post-traite le texte (FR Pro + synthèse structurée)
   - Retourne le JSON au frontend
   - Supprime le fichier tmp automatiquement

## Endpoints

- `GET /health` → `{ ok: true }`
- `POST /ai/transcribe-local` → Transcription locale (gratuite)
- `POST /api/ai/transcribe-local` → Même handler (compatibilité)

## Format de réponse

```json
{
  "language_detected": "fr",
  "raw_transcript": "Texte brut de Whisper",
  "french_pro": "Version française professionnelle",
  "summary": {
    "contexte": "...",
    "objectif": "...",
    "deroulement": ["...", "..."],
    "resultats": ["...", "..."],
    "risques": ["..."],
    "actions_suivi": ["..."]
  },
  "extracted": {
    "commune": "...",
    "odf": "...",
    "pdfcp": "...",
    "conflit": "...",
    "opposition": "..."
  },
  "warning": "Mode gratuit : synthèse basée sur règles (sans IA cloud)."
}
```

## Dépannage

### Erreur "faster-whisper non installé"
```bash
pip install faster-whisper
```

### Erreur "ffmpeg not found"
Installer FFmpeg et l'ajouter au PATH.

### Erreur "Failed to run Whisper"
Vérifier que Python est accessible (`python` ou `python3` selon OS).

### Transcription vide
- Vérifier que le fichier audio est valide (format supporté: webm, mp4, wav, etc.)
- Vérifier les logs backend: `[Whisper Local] Transcript length: X`
- Tester directement: `python server/whisper_local.py test.wav fr`

### Port déjà utilisé
Le serveur essaie automatiquement 3002, 3003. Vérifier la console:
```
API listening on http://localhost:3002
```

## Architecture

- **Frontend**: `TranscriptionPanel.tsx` → POST `/ai/transcribe-local`
- **Backend**: `routes/ai.js` → `whisper_local.py` → `utils/transcriptPostProcess.js`
- **Post-processing**: `services/aiEngine.js` → `enhanceTranscript()`

## Tests

1. **Health check**: `http://localhost:3001/health` → `{ ok: true }`
2. **Enregistrer audio** → Vérifier `audioBlob.size > 0` dans console
3. **Transcrire** → Vérifier logs backend: `[POST /ai/transcribe-local] req.file.size: X`
4. **Insérer "FR Pro"** → Doit remplir la description

## Notes

- Les fichiers tmp sont automatiquement supprimés après traitement (même en cas d'erreur)
- Rate limiting: 10 transcriptions/heure par utilisateur
- Auth optionnelle en DEV (pas de token requis)
- Compatible avec l'interface `TranscriptionResult` existante
