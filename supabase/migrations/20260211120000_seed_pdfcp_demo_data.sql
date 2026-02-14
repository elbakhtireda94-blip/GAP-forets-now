-- =============================================
-- Données de démonstration PDFCP (pour vérifier la cohérence des logiques)
-- Périmètre: DRANEF-RSK / DPANEF-KEN / communes COM-KNTR-01 et COM-KNTR-02
-- (visible par demo-adp, demo-dpanef, demo-dranef, demo-dg)
-- =============================================

INSERT INTO public.pdfcp_programs (
  code,
  title,
  description,
  start_year,
  end_year,
  dranef_id,
  dpanef_id,
  commune_id,
  total_budget_dh,
  validation_status,
  locked,
  status,
  created_at,
  updated_at
) VALUES
  -- 1) Brouillon (ADP peut compléter et soumettre)
  (
    'PDFCP-DEMO-01',
    'PDFCP Démo Sidi Taibi 2024-2028 (Brouillon)',
    'Programme de démonstration en brouillon — visible dans le filtre Brouillons pour l''ADP.',
    2024,
    2028,
    'DRANEF-RSK',
    'DPANEF-KEN',
    'COM-KNTR-01',
    1250000,
    'BROUILLON',
    false,
    'draft',
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  -- 2) Concerté ADP (DPANEF peut valider → filtre "À valider" pour DPANEF)
  (
    'PDFCP-DEMO-02',
    'PDFCP Démo Sidi Allal Tazi 2024-2029 (Concerté ADP)',
    'En attente de validation DPANEF.',
    2024,
    2029,
    'DRANEF-RSK',
    'DPANEF-KEN',
    'COM-KNTR-02',
    980000,
    'CONCERTE_ADP',
    false,
    'submitted',
    now() - interval '4 days',
    now() - interval '2 days'
  ),
  -- 3) Validé DPANEF (Central/DRANEF peut valider → "À valider" pour DRANEF/NATIONAL)
  (
    'PDFCP-DEMO-03',
    'PDFCP Démo Kénitra Nord 2023-2027 (Validé DPANEF)',
    'Validé par la DPANEF — en attente validation central.',
    2023,
    2027,
    'DRANEF-RSK',
    'DPANEF-KEN',
    'COM-KNTR-01',
    2100000,
    'VALIDE_DPANEF',
    false,
    'validated',
    now() - interval '10 days',
    now() - interval '1 day'
  ),
  -- 4) Validé Central (terminé, plus d''action requise)
  (
    'PDFCP-DEMO-04',
    'PDFCP Démo Aménagement Sidi Taibi 2022-2026 (Validé Central)',
    'Programme validé au niveau central.',
    2022,
    2026,
    'DRANEF-RSK',
    'DPANEF-KEN',
    'COM-KNTR-01',
    3500000,
    'VALIDE_CENTRAL',
    false,
    'validated',
    now() - interval '30 days',
    now() - interval '5 days'
  ),
  -- 5) Verrouillé (ADMIN peut déverrouiller)
  (
    'PDFCP-DEMO-05',
    'PDFCP Démo Verrouillé 2021-2025',
    'Programme verrouillé — visible pour tester le rôle ADMIN.',
    2021,
    2025,
    'DRANEF-RSK',
    'DPANEF-KEN',
    'COM-KNTR-02',
    800000,
    'VERROUILLE',
    true,
    'archived',
    now() - interval '60 days',
    now() - interval '20 days'
  ),
  -- 6) Un second brouillon (pour voir plusieurs dans la liste ADP)
  (
    'PDFCP-DEMO-06',
    'PDFCP Démo Second brouillon 2025-2030',
    'Second programme en brouillon pour tests.',
    2025,
    2030,
    'DRANEF-RSK',
    'DPANEF-KEN',
    'COM-KNTR-02',
    0,
    'BROUILLON',
    false,
    'draft',
    now() - interval '1 day',
    now()
  )
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  start_year = EXCLUDED.start_year,
  end_year = EXCLUDED.end_year,
  commune_id = EXCLUDED.commune_id,
  total_budget_dh = EXCLUDED.total_budget_dh,
  validation_status = EXCLUDED.validation_status,
  locked = EXCLUDED.locked,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
