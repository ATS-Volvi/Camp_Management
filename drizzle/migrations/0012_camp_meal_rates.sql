CREATE TABLE public.camp_meal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  breakfast_rate NUMERIC NOT NULL DEFAULT 0,
  lunch_rate NUMERIC NOT NULL DEFAULT 0,
  dinner_rate NUMERIC NOT NULL DEFAULT 0,
  ramadan_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (camp_id)
);

GRANT SELECT ON public.camp_meal_rates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.camp_meal_rates TO authenticated;
GRANT ALL ON public.camp_meal_rates TO service_role;

ALTER TABLE public.camp_meal_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view camp meal rates" ON public.camp_meal_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage camp meal rates" ON public.camp_meal_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));

CREATE TRIGGER set_camp_meal_rates_updated_at BEFORE UPDATE ON public.camp_meal_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();