/**
 * Moteur de post-traitement des transcriptions.
 * Abstraction compatible future IA locale (ex. llama.cpp) : enhanceTranscript() peut être
 * remplacé par un appel modèle sans changer les routes.
 */
import { toFrenchPro, buildSummary, extractEntities } from '../utils/transcriptPostProcess.js';

/**
 * Améliore une transcription brute : FR pro + synthèse (règles pour l'instant, modèle local possible plus tard).
 * @param {string} rawText - Transcription brute (ex. sortie Whisper local)
 * @returns {Promise<{ frenchPro: string, summary: { contexte: string, objectif: string, deroulement: string[], resultats: string[], risques: string[], actions_suivi: string[] }, extracted: object }>}
 */
export async function enhanceTranscript(rawText) {
  const frenchPro = toFrenchPro(rawText);
  const summary = buildSummary(frenchPro);
  const extracted = extractEntities(frenchPro);
  return {
    frenchPro,
    summary,
    extracted,
  };
}
