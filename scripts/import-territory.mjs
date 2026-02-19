/**
 * Import référentiel communes (DRANEF / DPANEF / ZDTF / Commune) depuis CSV vers Supabase.
 * Idempotent: upsert par clé unique, relançable sans doublons.
 *
 * Prérequis: migration referentiel appliquée (referentiel.dranef, dpanef, zdtf, commune).
 * Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ou .env / .env.local).
 * CSV: data/communes_hierarchie_preparee.csv ou TERRITORY_CSV_PATH.
 *
 * Exécution: npm run import:territory
 */

import 'dotenv/config';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Charger .env.local (dotenv/config a déjà chargé .env)
dotenv.config({ path: resolve(root, '.env.local') });

const url = (process.env.VITE_SUPABASE_URL || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

function failEnv(message) {
  console.error('');
  console.error('❌', message);
  console.error('');
  console.error('À faire :');
  console.error('  1. Créer ou éditer .env.local à la racine du projet.');
  console.error('  2. Définir VITE_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co');
  console.error('  3. Définir SUPABASE_SERVICE_ROLE_KEY= votre clé service_role (Supabase → Project Settings → API → Regenerate si besoin).');
  console.error('  4. Ne jamais committer .env.local ni exposer la clé service_role.');
  console.error('');
  process.exit(1);
}

if (!url || !url.startsWith('https://')) {
  failEnv('VITE_SUPABASE_URL manquante ou invalide (doit commencer par https://).');
}
if (!serviceKey || serviceKey.length < 50) {
  const len = serviceKey ? serviceKey.length : 0;
  failEnv(`SUPABASE_SERVICE_ROLE_KEY manquante ou invalide (longueur actuelle: ${len}, attendu >= 50).`);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const SCHEMA = 'referentiel';

function csvPath() {
  const envPath = process.env.TERRITORY_CSV_PATH;
  if (envPath) {
    const p = resolve(root, envPath);
    if (existsSync(p)) return p;
    return envPath;
  }
  const candidates = [
    resolve(root, 'data', 'communes_hierarchie_preparee.csv'),
    resolve(root, 'src', 'data', 'communes_hierarchie_preparee.csv', 'communes_hierarchie_preparee.csv'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return resolve(root, 'data', 'communes_hierarchie_preparee.csv');
}

function ref(table) {
  return supabase.schema(SCHEMA).from(table);
}

async function upsertDranef(name) {
  const { data: existing } = await ref('dranef').select('id').eq('name', name).maybeSingle();
  if (existing) return existing.id;
  const { data: inserted, error } = await ref('dranef').insert({ name }).select('id').single();
  if (error) throw error;
  return inserted.id;
}

async function upsertDpanef(dranefId, name) {
  const { data: existing } = await ref('dpanef').select('id').eq('dranef_id', dranefId).eq('name', name).maybeSingle();
  if (existing) return existing.id;
  const { data: inserted, error } = await ref('dpanef').insert({ dranef_id: dranefId, name }).select('id').single();
  if (error) throw error;
  return inserted.id;
}

async function upsertZdtf(dpanefId, name) {
  const { data: existing } = await ref('zdtf').select('id').eq('dpanef_id', dpanefId).eq('name', name).maybeSingle();
  if (existing) return existing.id;
  const { data: inserted, error } = await ref('zdtf').insert({ dpanef_id: dpanefId, name }).select('id').single();
  if (error) throw error;
  return inserted.id;
}

async function upsertCommune(payload) {
  const { error } = await ref('commune').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

async function run() {
  const csvFile = csvPath();
  if (!existsSync(csvFile)) {
    console.error('Fichier CSV introuvable:', csvFile);
    console.error('Créez data/communes_hierarchie_preparee.csv ou définissez TERRITORY_CSV_PATH.');
    process.exit(1);
  }

  const raw = readFileSync(csvFile, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });

  const stats = { rows: rows.length, dranef: 0, dpanef: 0, zdtf: 0, commune: 0, errors: [] };
  const dranefByName = new Map();
  const dpanefByKey = new Map();
  const zdtfByKey = new Map();

  console.log('Référentiel communes — import depuis', csvFile);
  console.log('Lignes CSV:', stats.rows);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const communeId = (row.commune_id || '').trim();
    const dranefName = (row.DRANEF || '').trim();
    const dpanefName = (row.DPANEF || '').trim();
    const zdtfName = (row.ZDTF || '').trim();
    const communeName = (row.Commune || '').trim();
    const flag = String(row.Commune_flag || '').toLowerCase() === 'true';
    const note = (row.Commune_note || '').trim() || null;

    if (!communeId || !dranefName || !dpanefName || !zdtfName || !communeName) {
      stats.errors.push(`Ligne ${i + 2}: champs requis manquants (commune_id, DRANEF, DPANEF, ZDTF, Commune)`);
      continue;
    }

    try {
      let dranefId = dranefByName.get(dranefName);
      if (dranefId == null) {
        dranefId = await upsertDranef(dranefName);
        dranefByName.set(dranefName, dranefId);
        stats.dranef++;
      }

      const dpanefKey = `${dranefId}:${dpanefName}`;
      let dpanefId = dpanefByKey.get(dpanefKey);
      if (dpanefId == null) {
        dpanefId = await upsertDpanef(dranefId, dpanefName);
        dpanefByKey.set(dpanefKey, dpanefId);
        stats.dpanef++;
      }

      const zdtfKey = `${dpanefId}:${zdtfName}`;
      let zdtfId = zdtfByKey.get(zdtfKey);
      if (zdtfId == null) {
        zdtfId = await upsertZdtf(dpanefId, zdtfName);
        zdtfByKey.set(zdtfKey, zdtfId);
        stats.zdtf++;
      }

      await upsertCommune({
        id: communeId,
        zdtf_id: zdtfId,
        name: communeName,
        is_flagged: flag,
        note,
      });
      stats.commune++;
    } catch (err) {
      stats.errors.push(`Ligne ${i + 2}: ${err.message}`);
    }
  }

  console.log('Résultat:');
  console.log('  DRANEF insérés/identifiés:', stats.dranef);
  console.log('  DPANEF insérés/identifiés:', stats.dpanef);
  console.log('  ZDTF insérés/identifiés:', stats.zdtf);
  console.log('  Communes upsertées:', stats.commune);
  if (stats.errors.length) {
    console.error('Erreurs:', stats.errors.length);
    stats.errors.slice(0, 20).forEach((e) => console.error('  ', e));
    if (stats.errors.length > 20) console.error('  ... et', stats.errors.length - 20, 'autres');
  } else {
    console.log('Import terminé sans erreur.');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
