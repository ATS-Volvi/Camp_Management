CREATE TABLE public.block_floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_number integer NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, floor_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_floors TO authenticated;
GRANT ALL ON public.block_floors TO service_role;
ALTER TABLE public.block_floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read floors" ON public.block_floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert floors" ON public.block_floors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));
CREATE POLICY "Admins update floors" ON public.block_floors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));
CREATE POLICY "Admins delete floors" ON public.block_floors FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));
CREATE POLICY "Camp managers update buildings" ON public.buildings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'camp_manager'));
CREATE TRIGGER block_floors_updated_at BEFORE UPDATE ON public.block_floors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();