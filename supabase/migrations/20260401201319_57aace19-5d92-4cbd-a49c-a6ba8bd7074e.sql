
-- Add monthly rent fields to camps
ALTER TABLE public.camps ADD COLUMN is_rented boolean NOT NULL DEFAULT false;
ALTER TABLE public.camps ADD COLUMN monthly_rent numeric NOT NULL DEFAULT 0;

-- Camp utility costs table
CREATE TABLE public.camp_utilities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  month date NOT NULL,
  utility_type text NOT NULL DEFAULT 'electricity',
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_utilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_utilities" ON public.camp_utilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_utilities" ON public.camp_utilities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_update_utilities" ON public.camp_utilities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_delete_utilities" ON public.camp_utilities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

CREATE TRIGGER update_camp_utilities_updated_at BEFORE UPDATE ON public.camp_utilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Camp supplier costs table
CREATE TABLE public.camp_supplier_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  month date NOT NULL,
  supplier_name text,
  cost_type text NOT NULL DEFAULT 'manpower',
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.camp_supplier_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_supplier_costs" ON public.camp_supplier_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_supplier_costs" ON public.camp_supplier_costs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_update_supplier_costs" ON public.camp_supplier_costs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_delete_supplier_costs" ON public.camp_supplier_costs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

CREATE TRIGGER update_camp_supplier_costs_updated_at BEFORE UPDATE ON public.camp_supplier_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
