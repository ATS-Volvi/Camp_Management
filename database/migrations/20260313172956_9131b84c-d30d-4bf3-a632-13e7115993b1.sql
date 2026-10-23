
-- Cook Requests table
CREATE TABLE public.cook_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id),
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  head_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  issued_by uuid REFERENCES auth.users(id),
  issued_at timestamptz,
  notes text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cook Request Items
CREATE TABLE public.cook_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cook_requests(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  qty_per_person numeric NOT NULL DEFAULT 0,
  required_qty numeric NOT NULL DEFAULT 0,
  approved_qty numeric,
  issued_qty numeric DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id),
  po_number text NOT NULL,
  vendor_name text,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Purchase Order Items
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  required_qty numeric NOT NULL DEFAULT 0,
  ordered_qty numeric NOT NULL DEFAULT 0,
  received_qty numeric DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for cook_requests
ALTER TABLE public.cook_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_cook_requests" ON public.cook_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_cook_requests" ON public.cook_requests FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);
CREATE POLICY "staff_update_cook_requests" ON public.cook_requests FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);

-- RLS for cook_request_items
ALTER TABLE public.cook_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_cook_request_items" ON public.cook_request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_cook_request_items" ON public.cook_request_items FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);
CREATE POLICY "staff_update_cook_request_items" ON public.cook_request_items FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);
CREATE POLICY "staff_delete_cook_request_items" ON public.cook_request_items FOR DELETE TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role)
);

-- RLS for purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_purchase_orders" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);
CREATE POLICY "staff_update_purchase_orders" ON public.purchase_orders FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);

-- RLS for purchase_order_items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_po_items" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff_insert_po_items" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);
CREATE POLICY "staff_update_po_items" ON public.purchase_order_items FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role)
);

-- Triggers for updated_at
CREATE TRIGGER update_cook_requests_updated_at BEFORE UPDATE ON public.cook_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
