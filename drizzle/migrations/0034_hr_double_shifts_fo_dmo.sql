-- Selvantra HRMS — double shifts for Front Office / Pharmacy (M2 / A2 / N2) and Duty Medical Officers
-- (D1 / D2 / D3), like the MS / AS / NS ones in 0033: pay_days 2 = two days' attendance, the extra day paid,
-- used only where the Shift Planner has them. Applied live 18 Nov 2026. Safe to run more than once.
INSERT INTO public.hr_shifts (code, name, letter, start_time, end_time, allowed_late_min, allowed_extra_late_min,
                              extra_late_max_per_month, sort_order, active, allowed_departments, pay_days)
SELECT v.code, v.name, v.letter, v.st, v.en, 10, 10, 3, v.ord, true, v.depts, 2
  FROM (VALUES
    ('S17', 'Morning + Afternoon 2 (M2 + A2)', 'FA', '08:00', '21:00', 16, ARRAY['DPT2','DPT5']),
    ('S18', 'Afternoon + Night 2 (A2 + N2)',   'FN', '14:00', '08:00', 17, ARRAY['DPT2','DPT5']),
    ('S19', 'Night + Morning 2 (N2 + M2)',     'FM', '20:00', '15:00', 18, ARRAY['DPT2','DPT5']),
    ('S20', 'DMO Shift 1 + 2 (D1 + D2)',       'DA', '08:00', '20:00', 19, ARRAY['DPT6']),
    ('S21', 'DMO Shift 2 + 3 (D2 + D3)',       'DN', '14:00', '08:00', 20, ARRAY['DPT6']),
    ('S22', 'DMO Shift 3 + 1 (D3 + D1)',       'DM', '20:00', '14:00', 21, ARRAY['DPT6'])) AS v(code, name, letter, st, en, ord, depts)
 WHERE NOT EXISTS (SELECT 1 FROM public.hr_shifts s WHERE s.code = v.code OR s.letter = v.letter);
