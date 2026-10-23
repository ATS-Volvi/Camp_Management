
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

INSERT INTO public.departments (name, code) VALUES
  ('Heavy Equipment Rental Department', 'HERD'),
  ('Modular Building Services', 'MBS'),
  ('Project Support Division', 'PSD'),
  ('Plant Maintenance and Turn Around', 'PMTA'),
  ('Rotating Service Division', 'RSD'),
  ('Industrial Service Support Division', 'ISSD'),
  ('Valves Service Department', 'VSD'),
  ('Technical Service Support Division', 'TSSD'),
  ('Electrical and Instrumentation Division', 'EI'),
  ('Catering Service Division', 'CSD');
