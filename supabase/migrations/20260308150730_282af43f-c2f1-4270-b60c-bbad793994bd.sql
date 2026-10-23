
-- Food Wastage Tracking Table
CREATE TABLE public.food_wastage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  wastage_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  wasted_qty numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  reason text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.food_wastage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_wastage" ON public.food_wastage FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_wastage" ON public.food_wastage FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "staff_delete_wastage" ON public.food_wastage FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed Ramadan meal templates (Suhoor & Iftar)
INSERT INTO public.meal_menu_templates (meal_type, ingredient_id, qty_per_person)
SELECT 'Suhoor', id, 2 FROM public.ingredients WHERE name = 'Bread'
UNION ALL SELECT 'Suhoor', id, 2 FROM public.ingredients WHERE name = 'Egg'
UNION ALL SELECT 'Suhoor', id, 0.2 FROM public.ingredients WHERE name = 'Milk'
UNION ALL SELECT 'Suhoor', id, 0.005 FROM public.ingredients WHERE name = 'Tea Leaves'
UNION ALL SELECT 'Suhoor', id, 0.015 FROM public.ingredients WHERE name = 'Sugar'
UNION ALL SELECT 'Suhoor', id, 0.1 FROM public.ingredients WHERE name = 'Yogurt'
UNION ALL SELECT 'Suhoor', id, 0.05 FROM public.ingredients WHERE name = 'Rice'
UNION ALL SELECT 'Iftar', id, 0.2 FROM public.ingredients WHERE name = 'Rice'
UNION ALL SELECT 'Iftar', id, 0.25 FROM public.ingredients WHERE name = 'Chicken'
UNION ALL SELECT 'Iftar', id, 2 FROM public.ingredients WHERE name = 'Khubz'
UNION ALL SELECT 'Iftar', id, 0.1 FROM public.ingredients WHERE name = 'Yogurt'
UNION ALL SELECT 'Iftar', id, 0.05 FROM public.ingredients WHERE name = 'Dal (Lentils)'
UNION ALL SELECT 'Iftar', id, 0.05 FROM public.ingredients WHERE name = 'Salad Mix'
UNION ALL SELECT 'Iftar', id, 0.03 FROM public.ingredients WHERE name = 'Onion'
UNION ALL SELECT 'Iftar', id, 0.02 FROM public.ingredients WHERE name = 'Cooking Oil';
