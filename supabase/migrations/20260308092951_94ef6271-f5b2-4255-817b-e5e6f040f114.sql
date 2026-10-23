
CREATE TABLE public.designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read designations" ON public.designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage designations" ON public.designations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.designations (name) VALUES
  ('Trainee Engineer'),
  ('Permit Receiver'),
  ('Plumber'),
  ('Tig Welder'),
  ('Static Foreman'),
  ('Static Supervisor'),
  ('Project Manager'),
  ('QA/QC Inspector'),
  ('Safety Officer'),
  ('Electrician'),
  ('SBM'),
  ('BA Technician'),
  ('Hydro Jetter'),
  ('Pipe Fitter'),
  ('Mechanical Fitter');
