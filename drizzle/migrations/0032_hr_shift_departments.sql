-- Selvantra HRMS — department-wise shifts. hr_shifts.allowed_departments lists the department codes
-- (and '@managers' = staff whose role is Manager) a shift is meant for. Empty/null = every department.
-- A staff member whose department (or Manager role) is listed on at least one shift sees and is planned only
-- on those shifts plus the shifts open to everyone; a department listed on no shift keeps seeing all shifts.
-- The rule itself lives in src/hrms/shiftScope.js. Safe to run more than once (the seed only fills empty rows).
ALTER TABLE public.hr_shifts ADD COLUMN IF NOT EXISTS allowed_departments text[];

-- Starting mapping (Nursing, Laboratory, Radiology, OT → MS/AS/NS; Front Office, Pharmacy → M2/A2/N2;
-- Duty Medical Officer → BS/D1/D2/D3; reporting managers → G1/G2/G3). Matched on the badge letters.
UPDATE public.hr_shifts s SET allowed_departments = m.depts
  FROM (VALUES
    ('MS', ARRAY['DPT1','DPT3','DPT4','DPT7']), ('AS', ARRAY['DPT1','DPT3','DPT4','DPT7']), ('NS', ARRAY['DPT1','DPT3','DPT4','DPT7']),
    ('M2', ARRAY['DPT2','DPT5']), ('A2', ARRAY['DPT2','DPT5']), ('N2', ARRAY['DPT2','DPT5']),
    ('BS', ARRAY['DPT6']), ('D1', ARRAY['DPT6']), ('D2', ARRAY['DPT6']), ('D3', ARRAY['DPT6']),
    ('G1', ARRAY['@managers']), ('G2', ARRAY['@managers']), ('G3', ARRAY['@managers'])) AS m(letter, depts)
 WHERE s.letter = m.letter AND (s.allowed_departments IS NULL OR cardinality(s.allowed_departments) = 0);
-- The 4-hour break shift now follows the DMO department instead of a designation list.
UPDATE public.hr_shifts SET allowed_designations = NULL WHERE letter = 'BS' AND allowed_departments = ARRAY['DPT6'];
