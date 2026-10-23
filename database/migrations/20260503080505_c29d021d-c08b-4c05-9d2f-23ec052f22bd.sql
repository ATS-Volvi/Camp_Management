-- Room Categories Master
CREATE TABLE public.room_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  beds integer NOT NULL DEFAULT 1,
  daily_rate numeric NOT NULL DEFAULT 0,
  category_key text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_room_categories" ON public.room_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_room_categories" ON public.room_categories FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "admin_update_room_categories" ON public.room_categories FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "admin_delete_room_categories" ON public.room_categories FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_room_categories_updated_at BEFORE UPDATE ON public.room_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Designation -> Room Category mapping
CREATE TABLE public.designation_room_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation text NOT NULL,
  room_category_code text NOT NULL REFERENCES public.room_categories(code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (designation, room_category_code)
);
ALTER TABLE public.designation_room_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_designation_mapping" ON public.designation_room_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_designation_mapping" ON public.designation_room_mapping FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "admin_delete_designation_mapping" ON public.designation_room_mapping FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Room allocation overrides (exceptions audit + approval)
CREATE TABLE public.room_allocation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  designation text,
  intended_category_code text,
  assigned_room_id uuid,
  assigned_category_code text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid,
  approved_by uuid,
  approver_name text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_allocation_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_overrides" ON public.room_allocation_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_insert_overrides" ON public.room_allocation_overrides FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'hr_admin'::app_role));
CREATE POLICY "admin_update_overrides" ON public.room_allocation_overrides FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed room categories
INSERT INTO public.room_categories (code, name, beds, daily_rate, category_key) VALUES
  ('RC01', 'Executive Single Room', 1, 200, 'executive_single'),
  ('RC02', 'Executive Twin Sharing', 2, 150, 'executive_twin'),
  ('RC03', 'Supervisor Twin Sharing', 2, 120, 'supervisor_twin'),
  ('RC04', 'Staff 4-Bed Room', 4, 80, 'staff_4bed'),
  ('RC05', 'Skilled Worker 6-Bed Room', 6, 60, 'skilled_6bed'),
  ('RC06', 'General Worker 8-Bed Room', 8, 50, 'general_8bed'),
  ('RC07', 'Guest Single Room', 1, 180, 'guest_single'),
  ('RC08', 'Transit 4-Bed Room', 4, 70, 'transit_4bed');

-- Seed designation mapping
INSERT INTO public.designation_room_mapping (designation, room_category_code) VALUES
  ('Project Manager', 'RC01'),
  ('Project Manager', 'RC07'),
  ('Senior Manager', 'RC01'),
  ('Senior Manager', 'RC02'),
  ('Supervisor', 'RC03'),
  ('Static Supervisor', 'RC03'),
  ('Static Foreman', 'RC03'),
  ('Engineer', 'RC02'),
  ('Engineer', 'RC04'),
  ('Trainee Engineer', 'RC02'),
  ('Trainee Engineer', 'RC04'),
  ('Pipe Fitter', 'RC05'),
  ('SBM', 'RC05'),
  ('BA Technician', 'RC05'),
  ('Mechanical Fitter', 'RC05'),
  ('Electrician', 'RC05'),
  ('Tig Welder', 'RC05'),
  ('Hydro Jetter', 'RC05'),
  ('Plumber', 'RC05'),
  ('Helper', 'RC06'),
  ('General Worker', 'RC06'),
  ('Visitor', 'RC07'),
  ('Guest', 'RC07'),
  ('Transit Staff', 'RC08');