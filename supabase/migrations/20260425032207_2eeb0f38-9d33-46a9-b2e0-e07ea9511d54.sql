
CREATE TABLE public.meal_order_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid,
  name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  cutoff_datetime timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meal_cycles_camp ON public.meal_order_cycles(camp_id, is_active);

CREATE TABLE public.meal_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  cycle_id uuid NOT NULL REFERENCES public.meal_order_cycles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted',
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, cycle_id)
);
CREATE INDEX idx_meal_orders_cycle ON public.meal_orders(cycle_id);
CREATE INDEX idx_meal_orders_emp ON public.meal_orders(employee_id);

CREATE TABLE public.meal_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_order_id uuid NOT NULL REFERENCES public.meal_orders(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  preference text NOT NULL CHECK (preference IN ('veg','non_veg')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meal_order_id, meal_date, meal_type)
);
CREATE INDEX idx_meal_items_date ON public.meal_order_items(meal_date, meal_type);

CREATE TABLE public.meal_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  camp_id uuid,
  meal_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  preference text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by uuid,
  is_ordered boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meal_scans_date ON public.meal_scans(meal_date, meal_type);
CREATE INDEX idx_meal_scans_emp ON public.meal_scans(employee_id, meal_date, meal_type);

CREATE TRIGGER trg_meal_cycles_updated BEFORE UPDATE ON public.meal_order_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_meal_orders_updated BEFORE UPDATE ON public.meal_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meal_order_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_meal_cycles" ON public.meal_order_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_meal_cycles" ON public.meal_order_cycles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));
CREATE POLICY "admin_update_meal_cycles" ON public.meal_order_cycles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));
CREATE POLICY "admin_delete_meal_cycles" ON public.meal_order_cycles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "auth_read_meal_orders" ON public.meal_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "emp_or_admin_insert_orders" ON public.meal_orders FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'camp_manager')
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = meal_orders.employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "emp_or_admin_update_orders" ON public.meal_orders FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'camp_manager')
    OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = meal_orders.employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "admin_delete_orders" ON public.meal_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'camp_manager'));

CREATE POLICY "auth_read_meal_items" ON public.meal_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "emp_or_admin_insert_items" ON public.meal_order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_orders mo
      LEFT JOIN public.employees e ON e.id = mo.employee_id
      WHERE mo.id = meal_order_items.meal_order_id
      AND (
        public.has_role(auth.uid(),'super_admin')
        OR public.has_role(auth.uid(),'camp_manager')
        OR e.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "emp_or_admin_update_items" ON public.meal_order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_orders mo
      LEFT JOIN public.employees e ON e.id = mo.employee_id
      WHERE mo.id = meal_order_items.meal_order_id
      AND (
        public.has_role(auth.uid(),'super_admin')
        OR public.has_role(auth.uid(),'camp_manager')
        OR e.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "emp_or_admin_delete_items" ON public.meal_order_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_orders mo
      LEFT JOIN public.employees e ON e.id = mo.employee_id
      WHERE mo.id = meal_order_items.meal_order_id
      AND (
        public.has_role(auth.uid(),'super_admin')
        OR public.has_role(auth.uid(),'camp_manager')
        OR e.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "auth_read_meal_scans" ON public.meal_scans FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_meal_scans" ON public.meal_scans FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'camp_manager')
    OR public.has_role(auth.uid(),'store_keeper')
    OR public.has_role(auth.uid(),'security')
  );
CREATE POLICY "admin_delete_meal_scans" ON public.meal_scans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));
