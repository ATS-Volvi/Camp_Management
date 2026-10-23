
-- Mess Facilities table
CREATE TABLE public.mess_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  name text NOT NULL,
  facility_type text NOT NULL DEFAULT 'main_kitchen',
  contractor_name text,
  capacity integer DEFAULT 0,
  license_number text,
  license_expiry date,
  hygiene_cert_expiry date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mess_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_mess_facilities" ON public.mess_facilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_mess_facilities" ON public.mess_facilities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));
CREATE POLICY "admin_update_mess_facilities" ON public.mess_facilities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));
CREATE POLICY "admin_delete_mess_facilities" ON public.mess_facilities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Audit Templates
CREATE TABLE public.audit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  audit_type text NOT NULL DEFAULT 'daily',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_audit_templates" ON public.audit_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_audit_templates" ON public.audit_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));
CREATE POLICY "admin_update_audit_templates" ON public.audit_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));
CREATE POLICY "admin_delete_audit_templates" ON public.audit_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Template checklist items
CREATE TABLE public.audit_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.audit_templates(id) ON DELETE CASCADE,
  category text NOT NULL,
  question text NOT NULL,
  response_type text NOT NULL DEFAULT 'yes_no',
  is_critical boolean NOT NULL DEFAULT false,
  photo_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_template_items" ON public.audit_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_template_items" ON public.audit_template_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));
CREATE POLICY "admin_update_template_items" ON public.audit_template_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager'));
CREATE POLICY "admin_delete_template_items" ON public.audit_template_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Food Safety Audits (actual audit instances)
CREATE TABLE public.food_safety_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.audit_templates(id),
  camp_id uuid NOT NULL REFERENCES public.camps(id),
  mess_facility_id uuid REFERENCES public.mess_facilities(id),
  auditor_id uuid,
  audit_date date NOT NULL DEFAULT CURRENT_DATE,
  audit_type text NOT NULL DEFAULT 'daily',
  status text NOT NULL DEFAULT 'draft',
  total_score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  compliance_pct numeric DEFAULT 0,
  risk_grade text DEFAULT 'pending',
  contractor_name text,
  project_name text,
  auditor_signature text,
  supervisor_signature text,
  ai_summary text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.food_safety_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_audits" ON public.food_safety_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_audits" ON public.food_safety_audits FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager') OR has_role(auth.uid(), 'security'));
CREATE POLICY "staff_update_audits" ON public.food_safety_audits FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager') OR has_role(auth.uid(), 'security'));

-- Audit Responses (individual checklist answers)
CREATE TABLE public.audit_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.food_safety_audits(id) ON DELETE CASCADE,
  template_item_id uuid REFERENCES public.audit_template_items(id),
  category text NOT NULL,
  question text NOT NULL,
  response_type text NOT NULL DEFAULT 'yes_no',
  response_value text,
  rating integer,
  remarks text,
  photo_url text,
  is_compliant boolean DEFAULT true,
  score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_responses" ON public.audit_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_responses" ON public.audit_responses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager') OR has_role(auth.uid(), 'security'));
CREATE POLICY "staff_update_responses" ON public.audit_responses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager') OR has_role(auth.uid(), 'security'));

-- NCR Records (Non-Conformance Reports)
CREATE TABLE public.ncr_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.food_safety_audits(id) ON DELETE CASCADE,
  audit_response_id uuid REFERENCES public.audit_responses(id),
  camp_id uuid NOT NULL REFERENCES public.camps(id),
  ncr_number text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'major',
  assigned_to text,
  target_date date,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid,
  proof_photo_url text,
  correction_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ncr_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_ncr" ON public.ncr_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_ncr" ON public.ncr_records FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager') OR has_role(auth.uid(), 'security'));
CREATE POLICY "staff_update_ncr" ON public.ncr_records FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'camp_manager') OR has_role(auth.uid(), 'security'));
