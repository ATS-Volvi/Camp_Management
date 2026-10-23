
CREATE TABLE public.weekly_menu_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type text NOT NULL,
  dish_name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_weekly_menu_camp_day ON public.weekly_menu_config(camp_id, day_of_week, meal_type);

-- Enable RLS
ALTER TABLE public.weekly_menu_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "auth_read_weekly_menu" ON public.weekly_menu_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_insert_weekly_menu" ON public.weekly_menu_config
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

CREATE POLICY "admin_update_weekly_menu" ON public.weekly_menu_config
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

CREATE POLICY "admin_delete_weekly_menu" ON public.weekly_menu_config
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
