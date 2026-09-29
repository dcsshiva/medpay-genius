-- WestMed Payroll System — data from the approved HRMS prototype (cycle 25 Aug – 24 Sep 2026).
-- Idempotent: rows that already exist are left untouched.

INSERT INTO public.hr_units (code, name, sort_order) VALUES
  ('U1', 'Head Office - Villupuram', 0),
  ('U2', 'Branch Clinic - Thirubuvanai', 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.hr_departments (code, name, sort_order) VALUES
  ('DPT1', 'Administration', 0),
  ('DPT2', 'Diagnostics', 1),
  ('DPT3', 'Front Office', 2),
  ('DPT4', 'Housekeeping', 3),
  ('DPT5', 'Medical', 4),
  ('DPT6', 'Nursing', 5),
  ('DPT7', 'Operation Theatre', 6),
  ('DPT8', 'Pharmacy', 7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.hr_designations (code, name, sort_order) VALUES
  ('DSG1', 'ANM', 0),
  ('DSG2', 'Acc.  Mngr.', 1),
  ('DSG3', 'DMO', 2),
  ('DSG4', 'DMTA', 3),
  ('DSG5', 'Electrician', 4),
  ('DSG6', 'FDE', 5),
  ('DSG7', 'HK', 6),
  ('DSG8', 'HR Mngr.', 7),
  ('DSG9', 'HR Traine', 8),
  ('DSG10', 'Jr.Exe.', 9),
  ('DSG11', 'Lab tech.', 10),
  ('DSG12', 'NS', 11),
  ('DSG13', 'OPD', 12),
  ('DSG14', 'OT', 13),
  ('DSG15', 'Operating Mngr', 14),
  ('DSG16', 'PCC', 15),
  ('DSG17', 'Pharm.', 16),
  ('DSG18', 'Purch. & Accts', 17),
  ('DSG19', 'SN', 18),
  ('DSG20', 'SN (ER)', 19),
  ('DSG21', 'SN (ICU)', 20),
  ('DSG22', 'SNR.MARKT.EXEC', 21),
  ('DSG23', 'Trainee', 22),
  ('DSG24', 'X-Ray Tech', 23)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.hr_shifts (code, letter, name, start_time, end_time, allowed_late_min, allowed_extra_late_min, extra_late_max_per_month, sort_order) VALUES
  ('S1', 'G', 'General Shift', '09:00', '18:00', 15, 15, 3, 0),
  ('S2', 'S', 'Second Shift', '14:00', '23:00', 15, 15, 3, 1),
  ('S3', 'N', 'Night Shift', '20:00', '05:00', 15, 15, 3, 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.hr_holidays (date, name) VALUES
  ('2026-08-28', 'Company Foundation Day'),
  ('2026-09-14', 'Ganesh Chaturthi')
ON CONFLICT (date) DO NOTHING;

INSERT INTO public.hr_task_templates (id, title, description, sort_order) VALUES
  ('TT1', 'Sanitize OT / ward equipment', 'Sanitize and log all operation theatre / ward equipment per the standard checklist.', 0),
  ('TT2', 'Inventory count', 'Physically count stock and reconcile against the system quantity; report discrepancies.', 1),
  ('TT3', 'CCTV maintenance check', 'Verify every CCTV camera is powered, aligned and recording; report any faults.', 2),
  ('TT4', 'Monthly stock audit', 'Audit pharmacy / stores stock levels and flag any shortages or expiring items.', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hr_staff (emp_no, db_ref, name, role, reporting_manager, designation_code, department_code, unit_code, shift_code, net_salary, monthly_cl, monthly_permission_hours, pf_applicable, esi_applicable, ot_eligible, other_deduction, phone, email, dob, doj, address, unit_history, active) VALUES
  ('21002', 'STF1', 'S RAJARAM', 'Staff', '2100259', 'DSG2', 'DPT1', 'U1', 'S1', 44000.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100220', 'STF2', 'PARTHASARATHI', 'Staff', '2100259', 'DSG15', 'DPT1', 'U1', 'S1', 25000.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100259', 'STF3', 'NIVEDHA V', 'Manager', '', 'DSG8', 'DPT1', 'U1', 'S1', 21800.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100266', 'STF4', 'BASKAR', 'Staff', '2100259', 'DSG18', 'DPT1', 'U1', 'S1', 21800.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100341', 'STF5', 'PRESHILLA', 'Staff', '2100259', 'DSG9', 'DPT1', 'U1', 'S1', 13000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100369', 'STF6', 'Sandhiyapragash A', 'Staff', '2100259', 'DSG4', 'DPT1', 'U1', 'S1', 16000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100371', 'STF7', 'SENTHIL MURUGAN', 'Staff', '2100259', 'DSG22', 'DPT6', 'U1', 'S1', 35001.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100229', 'STF8', 'AJITHKUMAR', 'Staff', '2100259', 'DSG5', 'DPT1', 'U1', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100201', 'STF9', 'GOPI', 'Staff', '2100259', 'DSG10', 'DPT1', 'U1', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('1200083', 'STF10', 'SIVA', 'Staff', '2100259', 'DSG16', 'DPT1', 'U1', 'S1', 13906.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100270', 'STF11', 'ABHINAYA', 'Staff', '2100259', 'DSG13', 'DPT3', 'U2', 'S1', 11000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100276', 'STF12', 'GOMATHY', 'Staff', '2100259', 'DSG13', 'DPT3', 'U2', 'S1', 9704.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100288', 'STF13', 'A AROKIAMARY', 'Staff', '2100259', 'DSG6', 'DPT3', 'U2', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100293', 'STF14', 'PAVITHRA P', 'Staff', '2100259', 'DSG6', 'DPT3', 'U2', 'S1', 13000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100320', 'STF15', 'MOORTHI', 'Staff', '2100259', 'DSG6', 'DPT3', 'U2', 'S1', 12206.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100344', 'STF16', 'KALPANA', 'Staff', '2100259', 'DSG6', 'DPT3', 'U2', 'S1', 9000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100367', 'STF17', 'DHIPIKA', 'Staff', '2100259', 'DSG6', 'DPT3', 'U2', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100174', 'STF18', 'HARIHARAN', 'Staff', '2100259', 'DSG24', 'DPT2', 'U1', 'S1', 11000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100169', 'STF19', 'V ANANDH', 'Staff', '2100259', 'DSG24', 'DPT2', 'U1', 'S1', 11000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100375', 'STF20', 'SALATH ASHWIN', 'Staff', '2100259', 'DSG24', 'DPT2', 'U1', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('21043', 'STF21', 'M NITHYA', 'Staff', '2100259', 'DSG11', 'DPT2', 'U1', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100196', 'STF22', 'ARCHANA KUMARI', 'Staff', '2100259', 'DSG11', 'DPT2', 'U1', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100275', 'STF23', 'INDUMATHI S', 'Staff', '2100259', 'DSG11', 'DPT2', 'U1', 'S1', 12000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100347', 'STF24', 'S DEVI KEERTHANA', 'Staff', '2100259', 'DSG11', 'DPT2', 'U1', 'S1', 10500.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100392', 'STF25', 'KAVIPRIYA', 'Staff', '2100259', 'DSG11', 'DPT2', 'U1', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100126', 'STF26', 'GLORIA MARY', 'Staff', '2100259', 'DSG12', 'DPT6', 'U1', 'S1', 36300.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100103', 'STF27', 'RAMYA RAMESH', 'Staff', '2100259', 'DSG21', 'DPT6', 'U1', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100099', 'STF28', 'T DHINAKARAN', 'Staff', '2100259', 'DSG20', 'DPT6', 'U1', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100122', 'STF29', 'DHARANI', 'Staff', '2100259', 'DSG20', 'DPT6', 'U1', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100182', 'STF30', 'AKSHAYA', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 11000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100186', 'STF31', 'VASUKI', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 16844.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100185', 'STF32', 'GOKULAKRISHNAN', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 11000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100227', 'STF33', 'VINITHA', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100235', 'STF34', 'PRIYA', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 13110.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100108', 'STF35', 'SUBASRI', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 21429.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100246', 'STF36', 'GAYATHIRI', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 15215.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100243', 'STF37', 'M MUTHAMIZH', 'Staff', '2100259', 'DSG1', 'DPT6', 'U1', 'S1', 9000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100260', 'STF38', 'SWETHA G', 'Staff', '2100259', 'DSG1', 'DPT6', 'U1', 'S1', 9000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100271', 'STF39', 'SRUTHIGA', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 9000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100272', 'STF40', 'J KEERTHANA', 'Staff', '2100259', 'DSG1', 'DPT6', 'U1', 'S1', 12000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100289', 'STF41', 'AGALYA', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 9000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100366', 'STF42', 'S RAMANI', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 12000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100353', 'STF43', 'SWETHA M', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 9000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100373', 'STF44', 'ASHOK KUMAR', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100378', 'STF45', 'DEVAKUMAR', 'Staff', '2100259', 'DSG14', 'DPT7', 'U1', 'S1', 23002.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100372', 'STF46', 'DHARSHAN', 'Staff', '2100259', 'DSG14', 'DPT7', 'U1', 'S1', 14002.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100380', 'STF47', 'VERONIC MARY', 'Staff', '2100259', 'DSG1', 'DPT6', 'U1', 'S1', 12000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100385', 'STF48', 'ARAVINDAN', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100388', 'STF49', 'JAGAN', 'Staff', '2100259', 'DSG14', 'DPT7', 'U1', 'S1', 30000.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100389', 'STF50', 'ABIRAMI', 'Staff', '2100259', 'DSG19', 'DPT6', 'U1', 'S1', 9000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100164', 'STF51', 'V SWETHA', 'Staff', '2100259', 'DSG17', 'DPT8', 'U1', 'S1', 16500.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100263', 'STF52', 'SIVASANKARAN', 'Staff', '2100259', 'DSG17', 'DPT8', 'U1', 'S1', 18000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100267', 'STF53', 'SABARINATHAN', 'Staff', '2100259', 'DSG23', 'DPT1', 'U1', 'S1', 14647.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100172', 'STF54', 'R KARPAGAM', 'Staff', '2100259', 'DSG7', 'DPT4', 'U2', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100261', 'STF55', 'THAMIZHARASI', 'Staff', '2100259', 'DSG7', 'DPT4', 'U2', 'S1', 9085.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100269', 'STF56', 'VALLI', 'Staff', '2100259', 'DSG7', 'DPT4', 'U2', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100381', 'STF57', 'SIVASANGARI', 'Staff', '2100259', 'DSG7', 'DPT4', 'U2', 'S1', 10000.0, 1, 4, true, true, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U2", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true),
  ('2100253', 'STF58', 'DR. RADHIKA', 'Staff', '2100259', 'DSG3', 'DPT5', 'U1', 'S1', 50000.0, 1, 4, true, false, false, 0, '', '', NULL, NULL, '', '[{"unitCode": "U1", "effectiveFrom": "2026-08-25", "note": "Initial assignment"}]'::jsonb, true)
ON CONFLICT (emp_no) DO NOTHING;

-- (demo attendance removed — attendance now comes only from the biometric import)

INSERT INTO public.hr_tasks (id, title, description, assigned_to, assigned_by, created_date, due_date, priority, status, employee_response_note, completion_note, completion_date, review_note, reviewed_by, reviewed_on, template_id) VALUES
  ('T001', 'Sanitize OT equipment checklist', '', '2100289', '21002', '2026-09-01', '2026-09-07', 'High', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T002', 'Update inventory count - pharmacy', '', '2100371', '2100220', '2026-09-18', '2026-09-21', 'Low', 'Review', '', 'Completed as assigned.', '2026-09-21', 'Submitted for admin review.', NULL, NULL, NULL),
  ('T003', 'CCTV maintenance check', '', '2100369', '21002', '2026-09-08', '2026-09-18', 'Low', 'Review', '', 'Completed as assigned.', '2026-09-18', 'Submitted for admin review.', NULL, NULL, NULL),
  ('T004', 'Ambulance service log review', '', '2100372', '2100220', '2026-09-18', '2026-09-26', 'Medium', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T005', 'Sanitize OT equipment checklist', '', '2100263', '21002', '2026-09-06', '2026-09-14', 'Low', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T006', 'Update employee ID cards', '', '2100388', '2100259', '2026-09-04', '2026-09-07', 'Medium', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T007', 'Housekeeping audit - ICU wing', '', '2100271', '2100259', '2026-09-02', '2026-09-11', 'Low', 'Review', '', 'Completed as assigned.', '2026-09-11', 'Submitted for admin review.', NULL, NULL, NULL),
  ('T008', 'Verify biometric device sync', '', '2100246', '2100259', '2026-09-12', '2026-09-17', 'Medium', 'Done', '', 'Completed as assigned.', '2026-09-17', 'Verified, closed.', NULL, NULL, NULL),
  ('T009', 'Update employee ID cards', '', '2100369', '21002', '2026-09-04', '2026-09-12', 'Low', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T010', 'Prepare weekly duty roster', '', '2100347', '2100259', '2026-09-07', '2026-09-13', 'High', 'Done', '', 'Completed as assigned.', '2026-09-13', 'Completed on time, no issues.', NULL, NULL, NULL),
  ('T011', 'Housekeeping audit - ICU wing', '', '2100289', '21002', '2026-09-18', '2026-09-23', 'Medium', 'Open', '', '', NULL, '', NULL, NULL, NULL),
  ('T012', 'Update inventory count - pharmacy', '', '2100289', '2100220', '2026-09-18', '2026-09-23', 'Low', 'Review', '', 'Completed as assigned.', '2026-09-23', 'Submitted for admin review.', NULL, NULL, NULL),
  ('T013', 'Restock first-aid kits - all floors', '', '2100267', '21002', '2026-09-11', '2026-09-19', 'High', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T014', 'Housekeeping audit - ICU wing', '', '2100381', '2100220', '2026-09-11', '2026-09-16', 'High', 'Review', '', 'Completed as assigned.', '2026-09-16', 'Submitted for admin review.', NULL, NULL, NULL),
  ('T015', 'CCTV maintenance check', '', '2100182', '21002', '2026-09-09', '2026-09-13', 'High', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T016', 'Update employee ID cards', '', '2100367', '2100220', '2026-09-19', '2026-09-27', 'Low', 'Done', '', 'Completed as assigned.', '2026-09-27', 'Good work, approved.', NULL, NULL, NULL),
  ('T017', 'Sanitize OT equipment checklist', '', '2100201', '2100220', '2026-09-16', '2026-09-19', 'High', 'Done', '', 'Completed as assigned.', '2026-09-19', 'Verified, closed.', NULL, NULL, NULL),
  ('T018', 'New joiner onboarding checklist', '', '2100270', '2100220', '2026-09-14', '2026-09-17', 'Medium', 'Accepted', 'Accepted, working on it.', '', NULL, '', NULL, NULL, NULL),
  ('T019', 'Follow up on pending GST invoices', '', '2100235', '2100259', '2026-09-18', '2026-09-20', 'High', 'Review', '', 'Completed as assigned.', '2026-09-20', 'Submitted for admin review.', NULL, NULL, NULL),
  ('T020', 'Lab equipment calibration check', '', '2100381', '2100220', '2026-09-09', '2026-09-16', 'Low', 'Open', '', '', NULL, '', NULL, NULL, NULL),
  ('T021', 'Follow up on pending GST invoices', '', '2100182', '21002', '2026-09-09', '2026-09-19', 'High', 'Done', '', 'Completed as assigned.', '2026-09-19', 'Completed on time, no issues.', NULL, NULL, NULL),
  ('T022', 'Patient feedback form collection', '', '2100375', '2100220', '2026-09-17', '2026-09-22', 'High', 'Open', '', '', NULL, '', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hr_leaves (id, emp_no, type, applied_on, date, hours, reason, status, reporting_manager, alt_emp_no, decided_by, decided_on) VALUES
  ('L001', '2100389', 'CL', '2026-09-03', '2026-09-04', NULL, 'Family function', 'Approved', '', '', NULL, NULL),
  ('L002', '2100235', 'CL', '2026-09-16', '2026-09-18', NULL, 'Not feeling well', 'Rejected', '', '', NULL, NULL),
  ('L003', '21002', 'Permission', '2026-09-07', '2026-09-09', 3, 'Child''s school event', 'Rejected', '', '', NULL, NULL),
  ('L004', '2100271', 'Permission', '2026-09-21', '2026-09-25', 3, 'Doctor appointment', 'Approved', '', '', NULL, NULL),
  ('L005', '21043', 'CL', '2026-09-08', '2026-09-09', NULL, 'Family function', 'Pending', '', '', NULL, NULL),
  ('L006', '2100185', 'CL', '2026-09-01', '2026-09-02', NULL, 'Family function', 'Pending', '', '', NULL, NULL),
  ('L007', '2100220', 'CL', '2026-09-02', '2026-09-03', NULL, 'Family function', 'Rejected', '', '', NULL, NULL),
  ('L008', '2100229', 'Permission', '2026-09-16', '2026-09-21', 1, 'Personal errand', 'Pending', '', '', NULL, NULL),
  ('L009', '2100347', 'CL', '2026-09-16', '2026-09-18', NULL, 'Personal work', 'Rejected', '', '', NULL, NULL),
  ('L010', '2100375', 'CL', '2026-09-14', '2026-09-18', NULL, 'Travel', 'Approved', '', '', NULL, NULL),
  ('L011', '2100344', 'CL', '2026-09-21', '2026-09-22', NULL, 'Personal work', 'Rejected', '', '', NULL, NULL),
  ('L012', '2100266', 'Permission', '2026-09-11', '2026-09-13', 1, 'Bank work', 'Rejected', '', '', NULL, NULL),
  ('L013', '2100385', 'CL', '2026-09-18', '2026-09-22', NULL, 'Family function', 'Approved', '', '', NULL, NULL),
  ('L014', '2100243', 'Permission', '2026-09-15', '2026-09-19', 1, 'Doctor appointment', 'Pending', '', '', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.hr_task_seq', GREATEST((SELECT COALESCE(max(substring(id from '^T(\d+)$')::int), 0) FROM public.hr_tasks), 1));
SELECT setval('public.hr_leave_seq', GREATEST((SELECT COALESCE(max(substring(id from '^L(\d+)$')::int), 0) FROM public.hr_leaves), 1));
