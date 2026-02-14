/**
 * Insère les données de démonstration PDFCP dans Supabase.
 * Utilise la clé service_role pour contourner le RLS.
 *
 * Prérequis : dans .env (ou .env.local)
 *   VITE_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Exécution : node scripts/seed-pdfcp-demo.mjs
 * Ou : npm run seed:pdfcp
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    const content = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        const v = m[2].replace(/^["']|["']$/g, '').trim();
        process.env[m[1]] = v;
      }
    }
    break;
  }
  if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL)
    process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Manque VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env ou .env.local');
  console.error('Récupère la clé service_role dans Supabase : Settings > API > service_role (secret)');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO_PROGRAMS = [
  {
    code: 'PDFCP-DEMO-01',
    title: 'PDFCP Démo Sidi Taibi 2024-2028 (Brouillon)',
    description: "Programme de démonstration en brouillon — visible dans le filtre Brouillons pour l'ADP.",
    start_year: 2024,
    end_year: 2028,
    dranef_id: 'DRANEF-RSK',
    dpanef_id: 'DPANEF-KEN',
    commune_id: 'COM-KNTR-01',
    total_budget_dh: 1250000,
    validation_status: 'BROUILLON',
    locked: false,
    status: 'draft',
  },
  {
    code: 'PDFCP-DEMO-02',
    title: 'PDFCP Démo Sidi Allal Tazi 2024-2029 (Concerté ADP)',
    description: 'En attente de validation DPANEF.',
    start_year: 2024,
    end_year: 2029,
    dranef_id: 'DRANEF-RSK',
    dpanef_id: 'DPANEF-KEN',
    commune_id: 'COM-KNTR-02',
    total_budget_dh: 980000,
    validation_status: 'CONCERTE_ADP',
    locked: false,
    status: 'submitted',
  },
  {
    code: 'PDFCP-DEMO-03',
    title: 'PDFCP Démo Kénitra Nord 2023-2027 (Validé DPANEF)',
    description: 'Validé par la DPANEF — en attente validation central.',
    start_year: 2023,
    end_year: 2027,
    dranef_id: 'DRANEF-RSK',
    dpanef_id: 'DPANEF-KEN',
    commune_id: 'COM-KNTR-01',
    total_budget_dh: 2100000,
    validation_status: 'VALIDE_DPANEF',
    locked: false,
    status: 'validated',
  },
  {
    code: 'PDFCP-DEMO-04',
    title: 'PDFCP Démo Aménagement Sidi Taibi 2022-2026 (Validé Central)',
    description: 'Programme validé au niveau central.',
    start_year: 2022,
    end_year: 2026,
    dranef_id: 'DRANEF-RSK',
    dpanef_id: 'DPANEF-KEN',
    commune_id: 'COM-KNTR-01',
    total_budget_dh: 3500000,
    validation_status: 'VALIDE_CENTRAL',
    locked: false,
    status: 'validated',
  },
  {
    code: 'PDFCP-DEMO-05',
    title: 'PDFCP Démo Verrouillé 2021-2025',
    description: 'Programme verrouillé — visible pour tester le rôle ADMIN.',
    start_year: 2021,
    end_year: 2025,
    dranef_id: 'DRANEF-RSK',
    dpanef_id: 'DPANEF-KEN',
    commune_id: 'COM-KNTR-02',
    total_budget_dh: 800000,
    validation_status: 'VERROUILLE',
    locked: true,
    status: 'archived',
  },
  {
    code: 'PDFCP-DEMO-06',
    title: 'PDFCP Démo Second brouillon 2025-2030',
    description: 'Second programme en brouillon pour tests.',
    start_year: 2025,
    end_year: 2030,
    dranef_id: 'DRANEF-RSK',
    dpanef_id: 'DPANEF-KEN',
    commune_id: 'COM-KNTR-02',
    total_budget_dh: 0,
    validation_status: 'BROUILLON',
    locked: false,
    status: 'draft',
  },
];

async function main() {
  console.log('Insertion des programmes PDFCP de démonstration...');
  let inserted = 0;
  let updated = 0;
  for (const row of DEMO_PROGRAMS) {
    const { data: existing } = await supabase.from('pdfcp_programs').select('id').eq('code', row.code).maybeSingle();
    if (existing) {
      const { error } = await supabase.from('pdfcp_programs').update(row).eq('id', existing.id);
      if (error) {
        console.error('Erreur update', row.code, error.message);
        process.exit(1);
      }
      updated++;
      console.log('  Mis à jour:', row.code);
    } else {
      const { error } = await supabase.from('pdfcp_programs').insert(row).select('id').single();
      if (error) {
        console.error('Erreur insert', row.code, error.message);
        process.exit(1);
      }
      inserted++;
      console.log('  Inséré:', row.code);
    }
  }
  console.log('Terminé. Insérés:', inserted, '| Mis à jour:', updated);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
