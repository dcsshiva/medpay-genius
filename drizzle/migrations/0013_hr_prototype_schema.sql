-- WestMed Payroll System — database model of the approved HRMS prototype.
-- One table per prototype collection, keyed by the same codes the prototype uses
-- (DPT1, DSG1, U1, S1, staff code, T001, L001…) so screens and logic map 1:1.
-- Times are kept as 'HH:MM' text exactly as the biometric export / prototype uses them.

-- ───────────────────────── masters ─────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_units (
  code text PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.hr_departments (
  code text PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.hr_designations (
  code text PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.hr_shifts (
  code text PRIMARY KEY,                       -- S1, S2 …
  name text NOT NULL,
  letter text NOT NULL DEFAULT '',
  start_time text NOT NULL,                    -- 'HH:MM'
  end_time text NOT NULL,
  allowed_late_min integer NOT NULL DEFAULT 15,
  allowed_extra_late_min integer NOT NULL DEFAULT 15,
  extra_late_max_per_month integer NOT NULL DEFAULT 3,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.hr_holidays (
  date date PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.hr_task_templates (
  id text PRIMARY KEY,                         -- TT1, TT2 …
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
-- Payroll settings: the prototype's PAYROLL_SETTINGS object, stored as-is
CREATE TABLE IF NOT EXISTS public.hr_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payroll jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────── staff ─────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_staff (
  emp_no text PRIMARY KEY,                     -- Code / Login ID (biometric number)
  db_ref text UNIQUE,                          -- Staff Ref STF… (permanent internal key)
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Staff' CHECK (role IN ('Staff', 'Manager')),
  reporting_manager text NOT NULL DEFAULT '',  -- emp_no of the manager ('' = none)
  designation_code text,
  department_code text,
  unit_code text,
  shift_code text,
  net_salary numeric(12,2) NOT NULL DEFAULT 0, -- monthly gross used by the payroll engine
  monthly_cl numeric(4,1) NOT NULL DEFAULT 1,
  monthly_permission_hours numeric(4,1) NOT NULL DEFAULT 4,
  pf_applicable boolean NOT NULL DEFAULT true,
  esi_applicable boolean NOT NULL DEFAULT false,
  ot_eligible boolean NOT NULL DEFAULT false,
  other_deduction numeric(12,2) NOT NULL DEFAULT 0,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  dob date,
  doj date,
  address text NOT NULL DEFAULT '',
  unit_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  user_id uuid UNIQUE,                         -- Supabase auth account used to sign in
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_staff_unit_idx ON public.hr_staff (unit_code);
CREATE INDEX IF NOT EXISTS hr_staff_mgr_idx ON public.hr_staff (reporting_manager);

-- ───────────────────────── attendance / roster ─────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_attendance (
  emp_no text NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('P', 'A', 'WO', 'CL', 'H')),
  in_time text,                                -- 'HH:MM'
  out_time text,
  perm_min integer,
  PRIMARY KEY (emp_no, date)
);
CREATE INDEX IF NOT EXISTS hr_attendance_date_idx ON public.hr_attendance (date);

CREATE TABLE IF NOT EXISTS public.hr_roster (
  emp_no text NOT NULL,
  date date NOT NULL,
  shift_code text NOT NULL,
  PRIMARY KEY (emp_no, date)
);

-- ───────────────────────── tasks / leave ─────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.hr_task_seq;
CREATE SEQUENCE IF NOT EXISTS public.hr_leave_seq;

CREATE TABLE IF NOT EXISTS public.hr_tasks (
  id text PRIMARY KEY DEFAULT ('T' || lpad(nextval('public.hr_task_seq')::text, 3, '0')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  assigned_to text NOT NULL,
  assigned_by text NOT NULL,
  created_date date,
  due_date date,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Accepted', 'Rejected', 'Review', 'Done', 'Closed', 'InProgress')),
  employee_response_note text NOT NULL DEFAULT '',
  completion_note text NOT NULL DEFAULT '',
  completion_date date,
  review_note text NOT NULL DEFAULT '',
  reviewed_by text,
  reviewed_on date,
  template_id text
);
CREATE INDEX IF NOT EXISTS hr_tasks_assigned_to_idx ON public.hr_tasks (assigned_to);

CREATE TABLE IF NOT EXISTS public.hr_leaves (
  id text PRIMARY KEY DEFAULT ('L' || lpad(nextval('public.hr_leave_seq')::text, 3, '0')),
  emp_no text NOT NULL,
  type text NOT NULL CHECK (type IN ('CL', 'Permission')),
  applied_on date,
  date date NOT NULL,
  hours integer,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reporting_manager text NOT NULL DEFAULT '',
  alt_emp_no text NOT NULL DEFAULT '',
  decided_by text,
  decided_on date
);
CREATE INDEX IF NOT EXISTS hr_leaves_emp_idx ON public.hr_leaves (emp_no);

-- ───────────────────────── single active session ─────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_active_sessions (
  account uuid PRIMARY KEY,
  device_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────── helper functions ─────────────────────────
CREATE OR REPLACE FUNCTION public.hr_is_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_designation(_uid, 'admin') OR public.has_designation(_uid, 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.hr_my_emp(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT emp_no FROM public.hr_staff WHERE user_id = _uid AND active LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.hr_is_manager(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hr_staff WHERE user_id = _uid AND active AND role = 'Manager')
$$;

CREATE OR REPLACE FUNCTION public.hr_can_manage(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.hr_is_admin(_uid) OR public.hr_is_manager(_uid)
$$;

-- Who is signed in: role = 'admin' | 'manager' | 'staff' | 'none'
CREATE OR REPLACE FUNCTION public.hr_whoami()
RETURNS TABLE (role text, emp_no text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE WHEN public.hr_is_admin(auth.uid()) THEN 'admin'
         WHEN s.role = 'Manager' THEN 'manager'
         WHEN s.emp_no IS NOT NULL THEN 'staff'
         ELSE 'none' END,
    s.emp_no,
    COALESCE(s.name, (SELECT p.full_name FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1), 'Administrator')
  FROM (SELECT 1) one
  LEFT JOIN public.hr_staff s ON s.user_id = auth.uid() AND s.active
$$;
GRANT EXECUTE ON FUNCTION public.hr_whoami() TO authenticated;

-- Latest date that has attendance (used to open the most recent pay cycle)
CREATE OR REPLACE FUNCTION public.hr_latest_attendance_date()
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT max(date) FROM public.hr_attendance
$$;
GRANT EXECUTE ON FUNCTION public.hr_latest_attendance_date() TO authenticated;

-- Staff directory without salary / personal fields (for every signed-in user)
CREATE OR REPLACE VIEW public.hr_staff_directory AS
  SELECT emp_no, db_ref, name, role, reporting_manager, designation_code, department_code,
         unit_code, shift_code, active
  FROM public.hr_staff
  WHERE active;
GRANT SELECT ON public.hr_staff_directory TO authenticated;

-- ───────────────────────── grants + RLS ─────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_units','hr_departments','hr_designations','hr_shifts','hr_holidays',
                           'hr_task_templates','hr_settings','hr_staff','hr_attendance','hr_roster',
                           'hr_tasks','hr_leaves','hr_active_sessions']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON SEQUENCE public.hr_task_seq, public.hr_leave_seq TO authenticated;

-- Masters & settings: everyone signed in reads, admin writes
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_units','hr_departments','hr_designations','hr_shifts','hr_holidays',
                           'hr_task_templates','hr_settings']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "hr read" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "hr admin write" ON public.%I', t);
    EXECUTE format('CREATE POLICY "hr read" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "hr admin write" ON public.%I FOR ALL TO authenticated USING (public.hr_is_admin(auth.uid())) WITH CHECK (public.hr_is_admin(auth.uid()))', t);
  END LOOP;
END $$;

-- Staff: admin & managers read all, staff read own row; admin writes
DROP POLICY IF EXISTS "hr staff read" ON public.hr_staff;
CREATE POLICY "hr staff read" ON public.hr_staff FOR SELECT TO authenticated
  USING (public.hr_can_manage(auth.uid()) OR user_id = auth.uid());
DROP POLICY IF EXISTS "hr staff admin write" ON public.hr_staff;
CREATE POLICY "hr staff admin write" ON public.hr_staff FOR ALL TO authenticated
  USING (public.hr_is_admin(auth.uid())) WITH CHECK (public.hr_is_admin(auth.uid()));

-- Attendance: admin/manager read+write (leave approval writes CL); staff read own
DROP POLICY IF EXISTS "hr att read" ON public.hr_attendance;
CREATE POLICY "hr att read" ON public.hr_attendance FOR SELECT TO authenticated
  USING (public.hr_can_manage(auth.uid()) OR emp_no = public.hr_my_emp(auth.uid()));
DROP POLICY IF EXISTS "hr att manage" ON public.hr_attendance;
CREATE POLICY "hr att manage" ON public.hr_attendance FOR ALL TO authenticated
  USING (public.hr_can_manage(auth.uid())) WITH CHECK (public.hr_can_manage(auth.uid()));

-- Roster: admin writes; admin/manager read all; staff read own
DROP POLICY IF EXISTS "hr roster read" ON public.hr_roster;
CREATE POLICY "hr roster read" ON public.hr_roster FOR SELECT TO authenticated
  USING (public.hr_can_manage(auth.uid()) OR emp_no = public.hr_my_emp(auth.uid()));
DROP POLICY IF EXISTS "hr roster admin" ON public.hr_roster;
CREATE POLICY "hr roster admin" ON public.hr_roster FOR ALL TO authenticated
  USING (public.hr_is_admin(auth.uid())) WITH CHECK (public.hr_is_admin(auth.uid()));

-- Tasks: admin/manager everything; staff read + update their own (accept / reject / finish)
DROP POLICY IF EXISTS "hr tasks read" ON public.hr_tasks;
CREATE POLICY "hr tasks read" ON public.hr_tasks FOR SELECT TO authenticated
  USING (public.hr_can_manage(auth.uid()) OR assigned_to = public.hr_my_emp(auth.uid()));
DROP POLICY IF EXISTS "hr tasks manage" ON public.hr_tasks;
CREATE POLICY "hr tasks manage" ON public.hr_tasks FOR ALL TO authenticated
  USING (public.hr_can_manage(auth.uid())) WITH CHECK (public.hr_can_manage(auth.uid()));
DROP POLICY IF EXISTS "hr tasks staff update" ON public.hr_tasks;
CREATE POLICY "hr tasks staff update" ON public.hr_tasks FOR UPDATE TO authenticated
  USING (assigned_to = public.hr_my_emp(auth.uid()))
  WITH CHECK (assigned_to = public.hr_my_emp(auth.uid()));

-- Leave: admin/manager everything; staff read own + ones they cover, and apply for themselves
DROP POLICY IF EXISTS "hr leaves read" ON public.hr_leaves;
CREATE POLICY "hr leaves read" ON public.hr_leaves FOR SELECT TO authenticated
  USING (public.hr_can_manage(auth.uid())
         OR emp_no = public.hr_my_emp(auth.uid())
         OR alt_emp_no = public.hr_my_emp(auth.uid()));
DROP POLICY IF EXISTS "hr leaves manage" ON public.hr_leaves;
CREATE POLICY "hr leaves manage" ON public.hr_leaves FOR ALL TO authenticated
  USING (public.hr_can_manage(auth.uid())) WITH CHECK (public.hr_can_manage(auth.uid()));
DROP POLICY IF EXISTS "hr leaves staff apply" ON public.hr_leaves;
CREATE POLICY "hr leaves staff apply" ON public.hr_leaves FOR INSERT TO authenticated
  WITH CHECK (emp_no = public.hr_my_emp(auth.uid()) AND status = 'Pending');

-- Single active session: each account manages its own row
DROP POLICY IF EXISTS "hr session own" ON public.hr_active_sessions;
CREATE POLICY "hr session own" ON public.hr_active_sessions FOR ALL TO authenticated
  USING (account = auth.uid()) WITH CHECK (account = auth.uid());
ALTER TABLE public.hr_active_sessions REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_active_sessions;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Default payroll settings (prototype defaults — confirm statutory rates with the accountant)
INSERT INTO public.hr_settings (id, payroll) VALUES (1, '{
  "cycleStartDay": 25,
  "pf":  {"enabled": true, "rate": 12},
  "esi": {"enabled": true, "rate": 0.75, "ceiling": 21000},
  "pt":  {"enabled": true, "slabs": [
            {"upto": 21000, "amount": 0}, {"upto": 30000, "amount": 135}, {"upto": 45000, "amount": 315},
            {"upto": 60000, "amount": 690}, {"upto": 75000, "amount": 1025}, {"upto": 99999999, "amount": 1250}]},
  "ot":  {"enabled": true, "multiplier": 1.5, "graceMin": 15}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
