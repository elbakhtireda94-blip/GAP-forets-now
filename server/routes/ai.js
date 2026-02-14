import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../auth.js';
import { enhanceTranscript } from '../services/aiEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router({ mergeParams: true });

// Rate limiting: simple in-memory store (reset every hour)
const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 10; // Max 10 transcriptions per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

// Configure multer for audio uploads (memory storage for OpenAI route)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format audio non supporté. Formats acceptés: webm, mp4, mpeg, wav, ogg, mp3'));
    }
  },
});

// Multer for local transcription (saves to tmp/)
const tmpDir = join(__dirname, '..', 'tmp');
// Ensure tmp directory exists
fs.mkdir(tmpDir, { recursive: true }).catch((err) => {
  console.warn('[ai.js] Failed to create tmp dir:', err.message);
});

const uploadToTmp = multer({
  dest: tmpDir,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format audio non supporté. Formats acceptés: webm, mp4, mpeg, wav, ogg, mp3'));
    }
  },
});

// Rate limit middleware
function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > userLimit.resetAt) {
    userLimit.count = 0;
    userLimit.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  userLimit.count++;
  rateLimitStore.set(userId, userLimit);
  return true;
}

/**
 * Optional auth middleware: require auth in production, allow unauthenticated in dev
 * Note: req.auth is set by authMiddleware in index.js, so we check if it exists
 */
function optionalAuth(req, res, next) {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  // If auth exists, use it (from authMiddleware)
  if (req.auth?.userId) {
    return next();
  }
  
  // In dev mode, allow unauthenticated requests with a dummy userId
  if (isDev) {
    req.auth = { userId: 'dev-user-' + Date.now() };
    return next();
  }
  
  // In production, require authentication
  return requireAuth(req, res, next);
}

/**
 * POST /ai/transcribe
 * Transcribe audio and generate professional French version + structured summary
 */
router.post('/transcribe', optionalAuth, upload.single('audio'), async (req, res) => {
  try {
    const userId = req.auth?.userId || 'anonymous';

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier audio fourni' });
    }

    const audioFile = req.file;
    // Sanity log: method + file size on every hit
    console.log('[POST /ai/transcribe] method:', req.method, 'req.file.size:', audioFile.size, 'mimetype:', audioFile.mimetype, 'filename:', audioFile.originalname);

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: 'Limite de transcription atteinte',
        message: `Maximum ${RATE_LIMIT_MAX} transcriptions par heure. Réessayez plus tard.`,
      });
    }

    const metadata = {
      commune: req.body.commune || null,
      axis: req.body.axis || null,
      type: req.body.type || null,
    };

    // If no OpenAI key: return temporary JSON (valid TranscriptionResult shape so frontend does not crash)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn('OPENAI_API_KEY not set; returning temporary response');
      return res.json({
        ok: true,
        size: audioFile.size,
        mimetype: audioFile.mimetype,
        filename: audioFile.originalname,
        language_detected: 'fr',
        raw_transcript: `[Mode démo] Fichier reçu (${audioFile.size} octets). Configurez OPENAI_API_KEY pour la transcription.`,
        french_pro: `[Mode démo] Fichier reçu (${audioFile.size} octets). Configurez OPENAI_API_KEY pour la transcription.`,
        summary: {
          contexte: '',
          objectif: '',
          deroulement: [],
          resultats: [],
          risques: [],
          actions_suivi: [],
        },
        extracted: {},
        warning: 'Transcription non configurée (OPENAI_API_KEY manquant). Fichier reçu.',
      });
    }

    // Step 1: Speech-to-text with Whisper
    const transcriptionResult = await transcribeWithWhisper(audioFile, openaiApiKey);
    
    if (!transcriptionResult.success) {
      return res.status(500).json({
        error: 'Erreur de transcription',
        message: transcriptionResult.error || 'Impossible de transcrire l\'audio',
      });
    }

    const { language_detected, raw_transcript } = transcriptionResult;

    // Step 2: Post-processing with GPT to generate French Pro + Summary
    const postProcessResult = await postProcessWithGPT(
      raw_transcript,
      language_detected,
      metadata,
      openaiApiKey
    );

    if (!postProcessResult.success) {
      // Return at least the raw transcript if post-processing fails
      return res.json({
        language_detected,
        raw_transcript,
        french_pro: raw_transcript, // Fallback to raw if post-processing fails
        summary: {
          contexte: '',
          objectif: '',
          deroulement: [],
          resultats: [],
          risques: [],
          actions_suivi: [],
        },
        extracted: {},
        warning: 'Le post-traitement a échoué, seule la transcription brute est disponible.',
      });
    }

    // Return complete result
    res.json({
      language_detected,
      raw_transcript,
      french_pro: postProcessResult.french_pro,
      summary: postProcessResult.summary,
      extracted: postProcessResult.extracted,
    });

  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({
      error: 'Erreur serveur',
      message: err.message || 'Une erreur est survenue lors de la transcription',
    });
  }
});

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(audioFile, apiKey) {
  try {
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
      filename: audioFile.originalname || 'audio.webm',
      contentType: audioFile.mimetype,
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'fr'); // Prefer French, but auto-detect if not French
    formData.append('response_format', 'verbose_json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Whisper API error:', response.status, errorData);
      return {
        success: false,
        error: errorData.error?.message || `API error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      language_detected: data.language || 'fr',
      raw_transcript: data.text || '',
    };
  } catch (err) {
    console.error('Whisper transcription error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors de la transcription',
    };
  }
}

/**
 * Post-process transcript with GPT to generate French Pro + structured summary
 */
async function postProcessWithGPT(rawTranscript, languageDetected, metadata, apiKey) {
  try {
    const systemPrompt = `Tu es un assistant spécialisé dans la rédaction professionnelle pour l'ANEF (Agence Nationale des Eaux et Forêts) au Maroc.

Règles strictes:
1. Si l'audio est en arabe/darija, traduis en français professionnel.
2. Ton institutionnel ANEF: clair, concis, professionnel.
3. Ne pas inventer de faits non mentionnés dans la transcription.
4. Extraire les risques/oppositions seulement si explicitement mentionnés.
5. Format FR Pro: paragraphe court + puces si utile.

Structure de sortie JSON:
{
  "french_pro": "Texte en français professionnel (paragraphe + puces si nécessaire)",
  "summary": {
    "contexte": "Contexte de l'activité en 1-2 phrases",
    "objectif": "Objectif principal en 1 phrase",
    "deroulement": ["Étape 1", "Étape 2", ...],
    "resultats": ["Résultat 1", "Résultat 2", ...],
    "risques": ["Risque 1 si mentionné", ...],
    "actions_suivi": ["Action 1", "Action 2", ...]
  },
  "extracted": {
    "commune": "Nom de commune si mentionné",
    "odf": "Nom ODF si mentionné",
    "pdfcp": "Référence PDFCP si mentionné",
    "conflit": "Description conflit si mentionné",
    "opposition": "Description opposition si mentionné"
  }
}`;

    const userPrompt = `Transcription brute (langue détectée: ${languageDetected}):
${rawTranscript}

Métadonnées disponibles:
- Commune: ${metadata.commune || 'Non spécifiée'}
- Axe: ${metadata.axis || 'Non spécifié'}
- Type: ${metadata.type || 'Non spécifié'}

Génère la version française professionnelle et la synthèse structurée au format JSON strict.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use cheaper model for post-processing
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GPT API error:', response.status, errorData);
      return {
        success: false,
        error: errorData.error?.message || `API error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return {
        success: false,
        error: 'Réponse GPT vide',
      };
    }

    try {
      const parsed = JSON.parse(content);
      
      // Validate structure
      if (!parsed.french_pro || !parsed.summary) {
        return {
          success: false,
          error: 'Structure de réponse GPT invalide',
        };
      }

      return {
        success: true,
        french_pro: parsed.french_pro,
        summary: {
          contexte: parsed.summary.contexte || '',
          objectif: parsed.summary.objectif || '',
          deroulement: Array.isArray(parsed.summary.deroulement) ? parsed.summary.deroulement : [],
          resultats: Array.isArray(parsed.summary.resultats) ? parsed.summary.resultats : [],
          risques: Array.isArray(parsed.summary.risques) ? parsed.summary.risques : [],
          actions_suivi: Array.isArray(parsed.summary.actions_suivi) ? parsed.summary.actions_suivi : [],
        },
        extracted: parsed.extracted || {},
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        success: false,
        error: 'Erreur de parsing de la réponse GPT',
      };
    }
  } catch (err) {
    console.error('GPT post-processing error:', err);
    return {
      success: false,
      error: err.message || 'Erreur lors du post-traitement',
    };
  }
}

// ——— Whisper local (gratuit) : faster-whisper via Python ———
/**
 * Obtient la transcription brute depuis l'audio via faster-whisper (Python).
 * @param {{ path: string, originalname?: string, mimetype?: string }} file - Fichier audio (multer tmp)
 * @param {string} lang - Langue (défaut: "fr")
 * @returns {Promise<{ raw_transcript: string, language_detected: string }>}
 */
async function getRawTranscriptFromAudio(file, lang = 'fr') {
  const scriptPath = join(__dirname, '..', 'whisper_local.py');
  const audioPath = file.path;

  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonCmd, [scriptPath, audioPath, lang], {
      cwd: join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // Supprimer le fichier tmp même en cas d'erreur
      fs.unlink(audioPath).catch((err) => {
        console.warn('[transcribe-local] Failed to delete tmp file:', err.message);
      });

      if (code !== 0) {
        console.error('[Whisper Local] Python script error (code:', code, '):', stderr);
        let errorMsg = stderr || 'Unknown error';
        if (stderr.includes('faster-whisper non installé') || stderr.includes('No module named')) {
          errorMsg = 'faster-whisper non installé. Installez avec: pip install faster-whisper';
        } else if (stderr.includes('ffmpeg') || stderr.includes('FFmpeg')) {
          errorMsg = 'FFmpeg non trouvé. Installez FFmpeg depuis https://ffmpeg.org/download.html et ajoutez-le au PATH.';
        }
        reject(new Error(`Whisper local failed: ${errorMsg}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        resolve({
          raw_transcript: result.raw_transcript || '',
          language_detected: result.language_detected || lang,
        });
      } catch (parseErr) {
        console.error('[Whisper Local] JSON parse error:', parseErr, 'stdout:', stdout);
        reject(new Error('Failed to parse Whisper output'));
      }
    });

    proc.on('error', (err) => {
      // Supprimer le fichier tmp en cas d'erreur de spawn
      fs.unlink(audioPath).catch(() => {});
      console.error('[Whisper Local] Spawn error:', err);
      if (err.code === 'ENOENT') {
        reject(new Error(`Python non trouvé. Installez Python depuis https://www.python.org/downloads/ et ajoutez-le au PATH.`));
      } else {
        reject(new Error(`Failed to run Whisper: ${err.message}`));
      }
    });
  });
}

/**
 * POST /ai/transcribe-local et POST /api/ai/transcribe-local
 * Transcription 100 % gratuite : Whisper local (faster-whisper Python) + post-traitement par règles (sans OpenAI).
 */
router.post('/transcribe-local', optionalAuth, uploadToTmp.single('audio'), async (req, res) => {
  let tmpFilePath = null;
  try {
    const userId = req.auth?.userId || 'anonymous';

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier audio fourni' });
    }

    tmpFilePath = req.file.path;
    const lang = req.body.lang || 'fr';

    console.log('[POST /ai/transcribe-local] method:', req.method, 'path:', req.path);
    console.log('[POST /ai/transcribe-local] req.file.size:', req.file.size, 'mimetype:', req.file.mimetype, 'tmp:', tmpFilePath);

    if (!checkRateLimit(userId)) {
      // Nettoyer tmp même en cas de rate limit
      if (tmpFilePath) {
        fs.unlink(tmpFilePath).catch(() => {});
      }
      return res.status(429).json({
        error: 'Limite de transcription atteinte',
        message: `Maximum ${RATE_LIMIT_MAX} transcriptions par heure. Réessayez plus tard.`,
      });
    }

    const data = await getRawTranscriptFromAudio(req.file, lang);
    const raw = data.raw_transcript || '';
    console.log('[Whisper Local] Transcript length:', raw.length);

    if (!raw || raw.length === 0) {
      console.warn('[transcribe-local] Transcription vide reçue');
      throw new Error('Transcription vide. Vérifiez que faster-whisper est installé (pip install faster-whisper) et que FFmpeg est disponible.');
    }

    const { frenchPro, summary, extracted } = await enhanceTranscript(raw);

    res.json({
      language_detected: data.language_detected || 'fr',
      raw_transcript: raw,
      french_pro: frenchPro,
      summary,
      extracted,
      warning: 'Mode gratuit : synthèse basée sur règles (sans IA cloud).',
    });
  } catch (err) {
    console.error('[transcribe-local] error:', err);
    // Nettoyer tmp en cas d'erreur
    if (tmpFilePath) {
      fs.unlink(tmpFilePath).catch(() => {});
    }
    const errorMessage = err.message || 'Erreur lors de la transcription locale';
    console.error('[transcribe-local] Error details:', {
      message: errorMessage,
      hasPython: process.platform === 'win32' ? 'checking python...' : 'checking python3...',
    });
    res.status(500).json({
      error: 'Erreur serveur',
      message: errorMessage,
      hint: errorMessage.includes('Python') || errorMessage.includes('faster-whisper') || errorMessage.includes('FFmpeg')
        ? 'Vérifiez les prérequis avec: .\\server\\check-whisper.ps1'
        : undefined,
    });
  }
});

export default router;
