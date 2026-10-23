
-- ==========================================
-- MESS & CATERING MODULE - DATABASE SCHEMA
-- ==========================================

-- 1. Ingredient Master
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  unit text NOT NULL DEFAULT 'kg',
  category text NOT NULL DEFAULT 'Miscellaneous',
  unit_cost numeric NOT NULL DEFAULT 0,
  reorder_level numeric NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Meal Menu Templates (standard qty per person per meal)
CREATE TABLE public.meal_menu_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type text NOT NULL,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  qty_per_person numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meal_type, ingredient_id)
);

-- 3. Daily Meal Plans
CREATE TABLE public.daily_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  total_occupants integer NOT NULL DEFAULT 0,
  breakfast_count integer NOT NULL DEFAULT 0,
  lunch_count integer NOT NULL DEFAULT 0,
  dinner_count integer NOT NULL DEFAULT 0,
  adjustment_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(camp_id, plan_date)
);

-- 4. Grocery Requests (Cook workflow)
CREATE TABLE public.grocery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  request_date date NOT NULL,
  meal_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  requested_by uuid,
  approved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Grocery Request Items
CREATE TABLE public.grocery_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.grocery_requests(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  calculated_qty numeric NOT NULL DEFAULT 0,
  requested_qty numeric NOT NULL DEFAULT 0,
  approved_qty numeric,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Catering Stock (per camp per ingredient)
CREATE TABLE public.catering_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  opening_stock numeric NOT NULL DEFAULT 0,
  stock_in numeric NOT NULL DEFAULT 0,
  stock_out numeric NOT NULL DEFAULT 0,
  balance numeric GENERATED ALWAYS AS (opening_stock + stock_in - stock_out) STORED,
  min_level numeric NOT NULL DEFAULT 5,
  expiry_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(camp_id, ingredient_id)
);

-- 7. Catering GRN (Goods Receipt Notes)
CREATE TABLE public.catering_grn (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  grn_number text NOT NULL,
  vendor_name text,
  grn_date date NOT NULL DEFAULT CURRENT_DATE,
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. GRN Items
CREATE TABLE public.catering_grn_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL REFERENCES public.catering_grn(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Catering Issues (Issue Slips)
CREATE TABLE public.catering_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.grocery_requests(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  cook_name text,
  issued_by uuid,
  total_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Issue Items
CREATE TABLE public.catering_issue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.catering_issues(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id),
  issued_qty numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_menu_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_issue_items ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "auth_read_ingredients" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_templates" ON public.meal_menu_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_meal_plans" ON public.daily_meal_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_requests" ON public.grocery_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_request_items" ON public.grocery_request_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_stock" ON public.catering_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_grn" ON public.catering_grn FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_grn_items" ON public.catering_grn_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_issues" ON public.catering_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_issue_items" ON public.catering_issue_items FOR SELECT TO authenticated USING (true);

-- Admin/Manager write for master data
CREATE POLICY "admin_manage_ingredients" ON public.ingredients FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_update_ingredients" ON public.ingredients FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_delete_ingredients" ON public.ingredients FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "admin_manage_templates" ON public.meal_menu_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_update_templates" ON public.meal_menu_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_delete_templates" ON public.meal_menu_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

CREATE POLICY "admin_manage_meal_plans" ON public.daily_meal_plans FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));
CREATE POLICY "admin_update_meal_plans" ON public.daily_meal_plans FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role));

-- Cook (camp_manager) and storekeeper can manage requests
CREATE POLICY "staff_insert_requests" ON public.grocery_requests FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "staff_update_requests" ON public.grocery_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "staff_insert_request_items" ON public.grocery_request_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "staff_update_request_items" ON public.grocery_request_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "staff_delete_request_items" ON public.grocery_request_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'camp_manager'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));

-- Storekeeper manages stock, GRN, issues
CREATE POLICY "sk_manage_stock" ON public.catering_stock FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "sk_update_stock" ON public.catering_stock FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));

CREATE POLICY "sk_manage_grn" ON public.catering_grn FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "sk_manage_grn_items" ON public.catering_grn_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));

CREATE POLICY "sk_manage_issues" ON public.catering_issues FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));
CREATE POLICY "sk_manage_issue_items" ON public.catering_issue_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'store_keeper'::app_role));

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.daily_meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.grocery_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON public.catering_stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SEED DEFAULT INGREDIENTS
-- ==========================================
INSERT INTO public.ingredients (name, unit, category, unit_cost, reorder_level) VALUES
('Rice', 'kg', 'Rice & Grains', 3.5, 50),
('Bread', 'pieces', 'Rice & Grains', 0.5, 200),
('Khubz', 'pieces', 'Rice & Grains', 0.5, 200),
('Chicken', 'kg', 'Meat & Poultry', 18, 30),
('Mutton', 'kg', 'Meat & Poultry', 35, 20),
('Egg', 'pieces', 'Dairy', 0.8, 500),
('Milk', 'liters', 'Dairy', 5, 50),
('Yogurt', 'kg', 'Dairy', 8, 20),
('Tea Leaves', 'kg', 'Beverages', 25, 5),
('Sugar', 'kg', 'Spices', 4, 20),
('Cooking Oil', 'liters', 'Miscellaneous', 8, 20),
('Dal (Lentils)', 'kg', 'Rice & Grains', 6, 30),
('Onion', 'kg', 'Vegetables', 3, 30),
('Tomato', 'kg', 'Vegetables', 4, 25),
('Potato', 'kg', 'Vegetables', 2.5, 30),
('Salad Mix', 'kg', 'Vegetables', 5, 15),
('Jam', 'kg', 'Miscellaneous', 12, 5),
('Salt', 'kg', 'Spices', 1.5, 10),
('Chili Powder', 'kg', 'Spices', 15, 3),
('Turmeric', 'kg', 'Spices', 20, 3),
('Curry Powder', 'kg', 'Spices', 18, 3);

-- Seed default meal menu templates
-- Breakfast templates
INSERT INTO public.meal_menu_templates (meal_type, ingredient_id, qty_per_person)
SELECT 'Breakfast', id, 2 FROM public.ingredients WHERE name = 'Bread'
UNION ALL SELECT 'Breakfast', id, 2 FROM public.ingredients WHERE name = 'Egg'
UNION ALL SELECT 'Breakfast', id, 0.005 FROM public.ingredients WHERE name = 'Tea Leaves'
UNION ALL SELECT 'Breakfast', id, 0.2 FROM public.ingredients WHERE name = 'Milk'
UNION ALL SELECT 'Breakfast', id, 0.02 FROM public.ingredients WHERE name = 'Jam'
UNION ALL SELECT 'Breakfast', id, 0.015 FROM public.ingredients WHERE name = 'Sugar';

-- Lunch templates
INSERT INTO public.meal_menu_templates (meal_type, ingredient_id, qty_per_person)
SELECT 'Lunch', id, 0.15 FROM public.ingredients WHERE name = 'Rice'
UNION ALL SELECT 'Lunch', id, 0.2 FROM public.ingredients WHERE name = 'Chicken'
UNION ALL SELECT 'Lunch', id, 0.05 FROM public.ingredients WHERE name = 'Dal (Lentils)'
UNION ALL SELECT 'Lunch', id, 0.05 FROM public.ingredients WHERE name = 'Salad Mix'
UNION ALL SELECT 'Lunch', id, 0.03 FROM public.ingredients WHERE name = 'Onion'
UNION ALL SELECT 'Lunch', id, 0.02 FROM public.ingredients WHERE name = 'Tomato'
UNION ALL SELECT 'Lunch', id, 0.02 FROM public.ingredients WHERE name = 'Cooking Oil';

-- Dinner templates
INSERT INTO public.meal_menu_templates (meal_type, ingredient_id, qty_per_person)
SELECT 'Dinner', id, 0.12 FROM public.ingredients WHERE name = 'Rice'
UNION ALL SELECT 'Dinner', id, 2 FROM public.ingredients WHERE name = 'Khubz'
UNION ALL SELECT 'Dinner', id, 0.15 FROM public.ingredients WHERE name = 'Chicken'
UNION ALL SELECT 'Dinner', id, 0.1 FROM public.ingredients WHERE name = 'Yogurt'
UNION ALL SELECT 'Dinner', id, 0.03 FROM public.ingredients WHERE name = 'Onion'
UNION ALL SELECT 'Dinner', id, 0.02 FROM public.ingredients WHERE name = 'Cooking Oil'
UNION ALL SELECT 'Dinner', id, 0.003 FROM public.ingredients WHERE name = 'Curry Powder';
