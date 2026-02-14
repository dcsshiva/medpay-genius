
CREATE TABLE public.branches_master (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_name text NOT NULL,
  branch_code text NOT NULL UNIQUE,
  branch_location text NOT NULL,
  contact_number text,
  contact_email text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.branches_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage branches" ON public.branches_master FOR ALL USING (has_designation(auth.uid(), 'admin'::app_designation));
CREATE POLICY "Managers can manage branches" ON public.branches_master FOR ALL USING (has_designation(auth.uid(), 'manager'::app_designation));
CREATE POLICY "Anyone can view active branches" ON public.branches_master FOR SELECT USING (is_active = true);
