
-- Insert reference territorial data
INSERT INTO public.regions (id, name, code) VALUES
  ('REG-01', 'Tanger-Tétouan-Al Hoceïma', 'TTA'),
  ('REG-02', 'Oriental', 'ORI'),
  ('REG-03', 'Fès-Meknès', 'FM'),
  ('REG-04', 'Rabat-Salé-Kénitra', 'RSK'),
  ('REG-05', 'Béni Mellal-Khénifra', 'BMK'),
  ('REG-06', 'Casablanca-Settat', 'CS'),
  ('REG-07', 'Marrakech-Safi', 'MS'),
  ('REG-08', 'Drâa-Tafilalet', 'DT'),
  ('REG-09', 'Souss-Massa', 'SM'),
  ('REG-10', 'Guelmim-Oued Noun', 'GON'),
  ('REG-11', 'Laâyoune-Sakia El Hamra', 'LSH'),
  ('REG-12', 'Dakhla-Oued Ed Dahab', 'DOD')
ON CONFLICT (id) DO NOTHING;

-- Insert DRANEF
INSERT INTO public.dranef (id, name, code, region_id) VALUES
  ('DRANEF-RSK', 'DRANEF Rabat-Salé-Kénitra', 'RSK', 'REG-04'),
  ('DRANEF-FM', 'DRANEF Fès-Meknès', 'FM', 'REG-03'),
  ('DRANEF-BMK', 'DRANEF Béni Mellal-Khénifra', 'BMK', 'REG-05'),
  ('DRANEF-TTA', 'DRANEF Tanger-Tétouan-Al Hoceïma', 'TTA', 'REG-01'),
  ('DRANEF-SM', 'DRANEF Souss-Massa', 'SM', 'REG-09')
ON CONFLICT (id) DO NOTHING;

-- Insert DPANEF
INSERT INTO public.dpanef (id, name, code, dranef_id) VALUES
  ('DPANEF-KEN', 'DPANEF Kénitra', 'KEN', 'DRANEF-RSK'),
  ('DPANEF-SAL', 'DPANEF Salé', 'SAL', 'DRANEF-RSK'),
  ('DPANEF-KHE', 'DPANEF Khénifra', 'KHE', 'DRANEF-BMK'),
  ('DPANEF-IFR', 'DPANEF Ifrane', 'IFR', 'DRANEF-FM'),
  ('DPANEF-CHF', 'DPANEF Chefchaouen', 'CHF', 'DRANEF-TTA')
ON CONFLICT (id) DO NOTHING;

-- Insert communes
INSERT INTO public.communes (id, name, dpanef_id) VALUES
  ('COM-KNTR-01', 'Sidi Taibi', 'DPANEF-KEN'),
  ('COM-KNTR-02', 'Sidi Allal Tazi', 'DPANEF-KEN'),
  ('COM-KHE-01', 'Aguelmous', 'DPANEF-KHE'),
  ('COM-KHE-02', 'El Kbab', 'DPANEF-KHE'),
  ('COM-IFR-01', 'Ifrane', 'DPANEF-IFR'),
  ('COM-CHF-01', 'Chefchaouen', 'DPANEF-CHF')
ON CONFLICT (id) DO NOTHING;
