CREATE TABLE public.camp_room_meal_rates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
 room_category public.room_category NOT NULL,
 breakfast_rate numeric NOT NULL DEFAULT 0 CHECK (breakfast_rate >= 0),
 lunch_rate numeric NOT NULL DEFAULT 0 CHECK (lunch_rate >= 0),
 dinner_rate numeric NOT NULL DEFAULT 0 CHECK (dinner_rate >= 0),
 ramadan_rate numeric NOT NULL DEFAULT 0 CHECK (ramadan_rate >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(camp_id, room_category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_room_meal_rates TO authenticated;
GRANT ALL ON public.camp_room_meal_rates TO service_role;
ALTER TABLE public.camp_room_meal_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view room meal rates" ON public.camp_room_meal_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage room meal rates" ON public.camp_room_meal_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'camp_manager')) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'camp_manager'));
CREATE TRIGGER camp_room_meal_rates_updated_at BEFORE UPDATE ON public.camp_room_meal_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();