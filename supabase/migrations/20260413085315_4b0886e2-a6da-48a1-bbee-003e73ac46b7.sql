
-- Price history table
CREATE TABLE public.ingredient_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  invoice_reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_ingredient ON public.ingredient_price_history(ingredient_id, effective_date DESC);

ALTER TABLE public.ingredient_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_price_history" ON public.ingredient_price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_price_history" ON public.ingredient_price_history FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);

-- Catering invoices table
CREATE TABLE public.catering_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  invoice_number TEXT,
  vendor_name TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  file_url TEXT,
  parsed_data JSONB,
  parsing_status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catering_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_invoices" ON public.catering_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_invoices" ON public.catering_invoices FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);
CREATE POLICY "staff_update_invoices" ON public.catering_invoices FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);

-- Consumption logs table
CREATE TABLE public.catering_consumption_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  consumed_qty NUMERIC NOT NULL DEFAULT 0,
  unit_cost_at_time NUMERIC NOT NULL DEFAULT 0,
  consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL,
  request_id UUID REFERENCES public.cook_requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumption_logs_camp_date ON public.catering_consumption_logs(camp_id, consumption_date DESC);

ALTER TABLE public.catering_consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_consumption" ON public.catering_consumption_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_consumption" ON public.catering_consumption_logs FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);
