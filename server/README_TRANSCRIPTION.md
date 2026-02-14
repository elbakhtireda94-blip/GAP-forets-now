# Transcription Intelligente - Documentation

## Vue d'ensemble

La fonctionnalité de transcription intelligente permet aux ADP de transcrire leurs enregistrements audio (français, arabe, darija) et d'obtenir automatiquement :
1. Une transcription brute (verbatim)
2. Une version française professionnelle (ton ANEF)
3. Une synthèse structurée (contexte, objectif, déroulement, résultats, risques, actions)

## Configuration Backend

### 1. Variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important** : Ne jamais mettre la clé API dans le frontend. Tout passe par le serveur Node.js.

### 2. Installation des dépendances

```bash
cd server
npm install multer form-data node-fetch
```

Les dépendances sont déjà ajoutées dans `package.json` :
- `multer`: Gestion des uploads de fichiers audio
- `form-data`: Construction de FormData pour les appels API OpenAI
- `node-fetch`: Appels HTTP vers l'API OpenAI

### 3. Démarrage du serveur

```bash
npm run dev
# ou
npm start
```

Le serveur doit être accessible sur `http://localhost:3001` (ou le port configuré dans `.env`).

## Endpoint API

### POST `/api/ai/transcribe`

**Authentification** : Requis (Bearer token)

**Content-Type** : `multipart/form-data`

**Body** :
- `audio` (file, required): Fichier audio (webm, mp4, mpeg, wav, ogg, mp3)
- `commune` (string, optional): ID de la commune
- `axis` (string, optional): Axe d'activité (PDFCP, ODF, ANIMATION_TERRITORIALE)
- `type` (string, optional): Type d'activité

**Limites** :
- Taille max : 25 MB
- Rate limit : 10 transcriptions par heure par utilisateur

**Réponse succès** (200) :
```json
{
  "language_detected": "fr",
  "raw_transcript": "Transcription brute...",
  "french_pro": "Version française professionnelle...",
  "summary": {
    "contexte": "...",
    "objectif": "...",
    "deroulement": ["...", "..."],
    "resultats": ["...", "..."],
    "risques": ["..."],
    "actions_suivi": ["...", "..."]
  },
  "extracted": {
    "commune": "...",
    "odf": "...",
    "pdfcp": "...",
    "conflit": "...",
    "opposition": "..."
  }
}
```

**Erreurs** :
- `400`: Aucun fichier audio fourni
- `429`: Limite de transcription atteinte
- `500`: Erreur serveur (API OpenAI, configuration manquante, etc.)

## Utilisation Frontend

### Dans JournalEntryForm

1. L'utilisateur enregistre un audio avec `VoiceRecorder`
2. Après l'enregistrement, le `TranscriptionPanel` apparaît automatiquement
3. L'utilisateur clique sur "Transcrire l'audio"
4. Le panel affiche 3 onglets :
   - **Brut** : Transcription verbatim
   - **FR Pro** : Version française professionnelle (par défaut)
   - **Synthèse** : Structure organisée avec contexte, objectif, résultats, etc.
5. Boutons d'action :
   - "Insérer FR Pro dans description" : Copie le texte FR Pro dans le champ description
   - "Insérer Synthèse" : Insère la synthèse formatée

### Composants

- `TranscriptionPanel` : Composant principal avec onglets et gestion de l'état
- `VoiceRecorder` : Enregistreur audio (modifié pour exposer le blob)
- `useVoiceRecorder` : Hook modifié avec callback `onAudioBlobReady`

## Pipeline de traitement

1. **Upload audio** → Serveur Node.js
2. **Speech-to-text** → OpenAI Whisper API
   - Détection automatique de langue (fr, ar, ber)
   - Transcription brute
3. **Post-processing** → OpenAI GPT-4o-mini
   - Traduction si nécessaire (ar/darija → fr)
   - Réécriture en français professionnel ANEF
   - Extraction de la structure (contexte, objectif, résultats, risques, actions)
   - Extraction d'entités (commune, ODF, PDFCP, conflits, oppositions)
4. **Retour** → Frontend avec tous les résultats

## Rate Limiting

- **Limite** : 10 transcriptions par heure par utilisateur
- **Stockage** : En mémoire (reset toutes les heures)
- **Réponse 429** : Message d'erreur explicite avec suggestion de réessayer plus tard

## Gestion des erreurs

### Backend
- Validation du fichier audio (format, taille)
- Vérification de la clé API OpenAI
- Gestion des erreurs API OpenAI avec messages explicites
- Fallback : Si le post-processing échoue, retourne au moins la transcription brute

### Frontend
- Affichage des erreurs avec toast notifications
- Messages d'erreur utilisateur-friendly
- Possibilité de réessayer ou d'utiliser la transcription brute si disponible

## Coûts OpenAI

- **Whisper** : ~$0.006 par minute d'audio
- **GPT-4o-mini** : ~$0.00015 par 1K tokens (post-processing)

**Estimation** : Pour un audio de 2 minutes :
- Whisper : ~$0.012
- GPT post-processing : ~$0.001-0.002
- **Total** : ~$0.013-0.014 par transcription

## Sécurité

- ✅ Clé API OpenAI uniquement côté serveur
- ✅ Authentification requise (Bearer token)
- ✅ Rate limiting par utilisateur
- ✅ Validation des fichiers uploadés
- ✅ Pas d'exposition de données sensibles dans les logs

## Notes de développement

- Le rate limiting utilise un Map en mémoire (reset toutes les heures)
- Pour la production, considérer Redis ou une base de données pour le rate limiting distribué
- Les fichiers audio sont traités en mémoire (pas de stockage permanent)
- Le prompt GPT est optimisé pour le contexte ANEF (ton professionnel, extraction structurée)
