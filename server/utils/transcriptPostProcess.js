/**
 * Post-traitement gratuit des transcriptions (sans OpenAI).
 * Nettoyage, reformulation administrative, synthèse structurée, extraction d'entités.
 */

// ——— Reformulations basiques (oral → administratif) ———
const REFORMULATIONS = [
  [/\bon a fait\b/gi, 'Nous avons réalisé'],
  [/\bon a réalisé\b/gi, 'Nous avons réalisé'],
  [/\bon a fait\s+/gi, 'Nous avons réalisé '],
  [/\bje suis allé\b/gi, 'Je me suis rendu'],
  [/\bje suis allée\b/gi, 'Je me suis rendue'],
  [/\bj'ai été\b/gi, 'Je me suis rendu'],
  [/\bya\b/g, 'il y a'],
  [/\bil y a eu\b/gi, 'Il a été constaté'],
  [/\bc'était\b/gi, "Il s'agissait de"],
  [/\bça a\b/gi, 'Cela a'],
  [/\bça\b/g, 'cela'],
  [/\bpas de\s+problème\b/gi, 'aucun problème constaté'],
  [/\bcomme prévu\b/gi, 'conformément aux prévisions'],
  [/\bà la fin\b/gi, 'en conclusion'],
  [/\bdu coup\b/gi, 'en conséquence'],
  [/\bdu coup\s+/gi, 'En conséquence, '],
  [/\bben\b/gi, ''],
  [/\beuh\b/gi, ''],
  [/\bheu\b/gi, ''],
  [/\bvoilà\b/gi, ''],
];

function applyReformulations(text) {
  let out = text;
  for (const [re, replacement] of REFORMULATIONS) {
    out = out.replace(re, replacement);
  }
  return out;
}

/**
 * Nettoyage espaces, ponctuation simple, majuscule initiale, reformulation administrative.
 * @param {string} raw - Transcription brute
 * @returns {string} Version française professionnelle
 */
export function toFrenchPro(raw) {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw
    .replace(/\s+/g, ' ')
    .replace(/\s*([.,;:!?])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  text = applyReformulations(text);

  // Ponctuation: point final si absent
  if (text.length > 0 && !/[.!?]$/.test(text)) {
    text += '.';
  }

  // Majuscule initiale
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Espace après ponctuation
  text = text.replace(/([.,;:!?])\s*/g, '$1 ').replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Synthèse structurée par heuristiques (mots-clés).
 * @param {string} text - Texte (idéalement déjà toFrenchPro)
 * @returns {{ contexte: string, objectif: string, deroulement: string[], resultats: string[], risques: string[], actions_suivi: string[] }}
 */
export function buildSummary(text) {
  const result = {
    contexte: '',
    objectif: '',
    deroulement: [],
    resultats: [],
    risques: [],
    actions_suivi: [],
  };

  if (!text || typeof text !== 'string') return result;

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const objectifKeywords = /\b(objectif|objectifs|afin de|but|pour\s+)\b/i;
  const resultatsKeywords = /\b(résultat|résultats|accord|validé|validation|conclu|signé|obtenu)\b/i;
  const risquesKeywords = /\b(conflit|conflits|blocage|refus|opposition|problème|risque|difficulté)\b/i;
  const actionsKeywords = /\b(suivi|prochaine|action|réunion\s+prévue|à\s+prévoir|prochain\s+rendez-vous)\b/i;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (objectifKeywords.test(lower)) {
      result.objectif = result.objectif ? result.objectif + ' ' + sentence : sentence;
    } else if (resultatsKeywords.test(lower)) {
      result.resultats.push(sentence);
    } else if (risquesKeywords.test(lower)) {
      result.risques.push(sentence);
    } else if (actionsKeywords.test(lower)) {
      result.actions_suivi.push(sentence);
    } else {
      result.deroulement.push(sentence);
    }
  }

  if (!result.contexte && sentences.length > 0) {
    result.contexte = sentences[0];
  }

  return result;
}

/**
 * Extraction d'entités métier par mots-clés / motifs simples.
 * @param {string} text - Texte source
 * @returns {{ commune?: string, odf?: string, pdfcp?: string, conflit?: string, opposition?: string }}
 */
export function extractEntities(text) {
  const extracted = {};

  if (!text || typeof text !== 'string') return extracted;

  const lower = text.toLowerCase();

  // Commune: après "commune de" ou "commune" + nom
  const communeMatch = text.match(/\bcommune\s+(?:de\s+)?([a-zàâäéèêëïîôùûçA-Z\-]+(?:\s+[a-zàâäéèêëïîôùûçA-Z\-]+)*)/i);
  if (communeMatch) {
    extracted.commune = communeMatch[1].trim();
  }

  // ODF
  if (/\bodf\b/i.test(text)) {
    const odfMatch = text.match(/\b(?:odf|office)\s*(?:[:\s]+)?([A-Z0-9\-]+)?/i);
    if (odfMatch && odfMatch[1]) extracted.odf = odfMatch[1].trim();
    else extracted.odf = 'mentionné';
  }

  // PDFCP
  if (/\bpdfcp\b/i.test(text)) {
    const pdfcpMatch = text.match(/\bpdfcp\s*(?:[:\s]+)?([A-Z0-9\-]+)?/i);
    if (pdfcpMatch && pdfcpMatch[1]) extracted.pdfcp = pdfcpMatch[1].trim();
    else extracted.pdfcp = 'mentionné';
  }

  // Conflit
  if (/\bconflit\b/i.test(text)) {
    const conflitPhrase = text.split(/[.!?]/).find((p) => /conflit/i.test(p));
    if (conflitPhrase) extracted.conflit = conflitPhrase.trim().replace(/^\s*conflit\s*[:\-]?\s*/i, '');
  }

  // Opposition
  if (/\bopposition\b/i.test(text)) {
    const oppPhrase = text.split(/[.!?]/).find((p) => /opposition/i.test(p));
    if (oppPhrase) extracted.opposition = oppPhrase.trim().replace(/^\s*opposition\s*[:\-]?\s*/i, '');
  }

  return extracted;
}
